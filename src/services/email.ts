import nodemailer from 'nodemailer';
import { FastifyInstance } from 'fastify';

export class EmailService {
  private transporter: nodemailer.Transporter;
  private fastify: FastifyInstance;

  constructor(fastify: FastifyInstance) {
    this.fastify = fastify;
    
    // Create transporter
    this.transporter = nodemailer.createTransport({
      host: fastify.config.SMTP_HOST,
      port: parseInt(fastify.config.SMTP_PORT),
      secure: false, // true for 465, false for other ports
      auth: {
        user: fastify.config.SMTP_USER,
        pass: fastify.config.SMTP_PASS,
      },
    });
  }

  /**
   * Send password reset email
   */
  async sendPasswordResetEmail(email: string, resetToken: string): Promise<void> {
    const resetUrl = `${this.fastify.config.APP_URL}/reset-password?token=${resetToken}`;
    
    const mailOptions = {
      from: this.fastify.config.SMTP_FROM,
      to: email,
      subject: 'Password Reset Request',
      html: `
        <div style="font-family: Arial, sans-serif; max-width: 600px; margin: 0 auto;">
          <h2 style="color: #333;">Password Reset Request</h2>
          <p>You requested a password reset for your account.</p>
          <p>Click the button below to reset your password:</p>
          <div style="text-align: center; margin: 30px 0;">
            <a href="${resetUrl}" 
               style="background-color: #007bff; color: white; padding: 12px 24px; text-decoration: none; border-radius: 5px; display: inline-block;">
              Reset Password
            </a>
          </div>
          <p>If the button doesn't work, copy and paste this link into your browser:</p>
          <p style="word-break: break-all; color: #666;">${resetUrl}</p>
          <p>This link will expire in 24 hours.</p>
          <p>If you didn't request this password reset, please ignore this email.</p>
          <hr style="margin: 30px 0; border: none; border-top: 1px solid #eee;">
          <p style="color: #666; font-size: 12px;">
            This is an automated email. Please do not reply to this message.
          </p>
        </div>
      `,
      text: `
        Password Reset Request
        
        You requested a password reset for your account.
        
        Click the link below to reset your password:
        ${resetUrl}
        
        This link will expire in 24 hours.
        
        If you didn't request this password reset, please ignore this email.
      `
    };

    try {
      await this.transporter.sendMail(mailOptions);
      this.fastify.log.info(`Password reset email sent to ${email}`);
    } catch (error) {
      this.fastify.log.error(`Failed to send password reset email to ${email}`);
      throw new Error('Failed to send password reset email');
    }
  }

  /**
   * Send welcome email
   */
  async sendWelcomeEmail(email: string, name: string): Promise<void> {
    const mailOptions = {
      from: this.fastify.config.SMTP_FROM,
      to: email,
      subject: 'Welcome to ESUT BPA',
      html: `
        <div style="font-family: Arial, sans-serif; max-width: 600px; margin: 0 auto;">
          <h2 style="color: #333;">Welcome to ESUT BPA!</h2>
          <p>Hello ${name},</p>
          <p>Thank you for registering with ESUT BPA. Your account has been successfully created.</p>
          <p>You can now log in to your account and start using our services.</p>
          <div style="text-align: center; margin: 30px 0;">
            <a href="${this.fastify.config.APP_URL}/login" 
               style="background-color: #28a745; color: white; padding: 12px 24px; text-decoration: none; border-radius: 5px; display: inline-block;">
              Login to Your Account
            </a>
          </div>
          <p>If you have any questions, please don't hesitate to contact our support team.</p>
          <hr style="margin: 30px 0; border: none; border-top: 1px solid #eee;">
          <p style="color: #666; font-size: 12px;">
            This is an automated email. Please do not reply to this message.
          </p>
        </div>
      `,
      text: `
        Welcome to ESUT BPA!
        
        Hello ${name},
        
        Thank you for registering with ESUT BPA. Your account has been successfully created.
        
        You can now log in to your account and start using our services.
        
        Login URL: ${this.fastify.config.APP_URL}/login
        
        If you have any questions, please don't hesitate to contact our support team.
      `
    };

    try {
      await this.transporter.sendMail(mailOptions);
      this.fastify.log.info(`Welcome email sent to ${email}`);
    } catch (error) {
      this.fastify.log.error(`Failed to send welcome email to ${email}`);
      // Don't throw error for welcome email as it's not critical
    }
  }

  /**
   * Verify email configuration
   */
  async verifyConnection(): Promise<boolean> {
    try {
      await this.transporter.verify();
      this.fastify.log.info('Email service connection verified');
      return true;
    } catch (error) {
      this.fastify.log.error('Email service connection failed');
      return false;
    }
  }
}
