import bcrypt from 'bcryptjs';
import crypto from 'crypto';
import { FastifyInstance } from 'fastify';
import { UserModel, IUser, IUserInput } from '../models/User';
import { EmailService } from './email';

/**
 * Authentication service class
 */
export class AuthService {
  private fastify: FastifyInstance;
  private emailService: EmailService;
  private readonly SALT_ROUNDS = 12;
  private readonly RESET_TOKEN_EXPIRY = 24 * 60 * 60 * 1000; // 24 hours

  constructor(fastify: FastifyInstance) {
    this.fastify = fastify;
    this.emailService = new EmailService(fastify);
  }

  /**
   * Register a new user
   */
  async register(userData: IUserInput): Promise<{ user: Omit<IUser, 'password'>, token: string }> {
    // Check if user already exists
    const existingUser = await UserModel.findOne({ email: userData.email.toLowerCase() });
    if (existingUser) {
      throw new Error('User with this email already exists');
    }

    // Hash password
    const hashedPassword = await bcrypt.hash(userData.password, this.SALT_ROUNDS);

    // Create user
    const user = await UserModel.create({
      email: userData.email.toLowerCase(),
      password: hashedPassword,
      name: userData.name
    });

    // Generate JWT token
    const token = this.fastify.jwt.sign({ userId: user._id });

    // Send welcome email
    try {
      await this.emailService.sendWelcomeEmail(user.email, user.name || 'User');
    } catch (error) {
      this.fastify.log.warn('Failed to send welcome email');
      // Don't fail registration if email fails
    }

    // Return user without password
    const { password, ...userWithoutPassword } = user.toObject();
    return { user: userWithoutPassword, token };
  }

  /**
   * Login user
   */
  async login(email: string, password: string): Promise<{ user: Omit<IUser, 'password'>, token: string }> {
    // Find user by email
    const user = await UserModel.findOne({ email: email.toLowerCase() });
    if (!user) {
      throw new Error('Invalid email or password');
    }

    // Verify password
    const isValidPassword = await bcrypt.compare(password, user.password);
    if (!isValidPassword) {
      throw new Error('Invalid email or password');
    }

    // Generate JWT token
    const token = this.fastify.jwt.sign({ userId: user._id });

    // Return user without password
    const { password: _, ...userWithoutPassword } = user.toObject();
    return { user: userWithoutPassword, token };
  }

  /**
   * Generate password reset token
   */
  async generateResetToken(email: string): Promise<string> {
    const user = await UserModel.findOne({ email: email.toLowerCase() });
    if (!user) {
      // Don't reveal if user exists or not
      return 'reset-token-mock';
    }

    // Generate reset token
    const resetToken = crypto.randomBytes(32).toString('hex');
    const resetTokenExpiry = new Date(Date.now() + this.RESET_TOKEN_EXPIRY);

    // Save reset token to user
    await UserModel.updateOne(
      { _id: user._id },
      { 
        resetPasswordToken: resetToken,
        resetPasswordExpires: resetTokenExpiry
      }
    );

    // Send password reset email
    try {
      await this.emailService.sendPasswordResetEmail(email, resetToken);
    } catch (error) {
      this.fastify.log.error('Failed to send password reset email');
      // Remove the reset token if email fails
      await UserModel.updateOne(
        { _id: user._id },
        { 
          resetPasswordToken: undefined,
          resetPasswordExpires: undefined
        }
      );
      throw new Error('Failed to send password reset email. Please try again later.');
    }

    return resetToken;
  }

  /**
   * Reset password using token
   */
  async resetPassword(token: string, newPassword: string): Promise<boolean> {
    const user = await UserModel.findOne({
      resetPasswordToken: token,
      resetPasswordExpires: { $gt: new Date() }
    });

    if (!user) {
      throw new Error('Invalid or expired reset token');
    }

    // Hash new password
    const hashedPassword = await bcrypt.hash(newPassword, this.SALT_ROUNDS);

    // Update password and clear reset token
    await UserModel.updateOne(
      { _id: user._id },
      {
        password: hashedPassword,
        resetPasswordToken: undefined,
        resetPasswordExpires: undefined
      }
    );

    return true;
  }

  /**
   * Get user by ID
   */
  async getUserById(userId: string): Promise<Omit<IUser, 'password'> | null> {
    const user = await UserModel.findById(userId).select('-password');
    return user ? user.toObject() : null;
  }

  /**
   * Verify JWT token and get user
   */
  async verifyToken(token: string): Promise<Omit<IUser, 'password'> | null> {
    try {
      const decoded = this.fastify.jwt.verify(token) as { userId: string };
      return await this.getUserById(decoded.userId);
    } catch (error) {
      return null;
    }
  }

  /**
   * Verify email service connection
   */
  async verifyEmailService(): Promise<boolean> {
    return await this.emailService.verifyConnection();
  }
}

