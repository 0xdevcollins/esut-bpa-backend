import { FastifyInstance } from 'fastify';
import { z } from 'zod';
import { AuthService } from '../services/auth';

/**
 * Validation schemas
 */
const registerSchema = z.object({
  email: z.string().email('Invalid email format'),
  password: z.string().min(6, 'Password must be at least 6 characters'),
  name: z.string().optional()
});

const loginSchema = z.object({
  email: z.string().email('Invalid email format'),
  password: z.string().min(1, 'Password is required')
});

const forgotPasswordSchema = z.object({
  email: z.string().email('Invalid email format')
});

const resetPasswordSchema = z.object({
  token: z.string().min(1, 'Token is required'),
  password: z.string().min(6, 'Password must be at least 6 characters')
});

/**
 * Authentication routes
 */
export default async function authRoutes(fastify: FastifyInstance) {
  const authService = new AuthService(fastify);

  /**
   * Register new user
   */
  fastify.post('/api/auth/register', async (req, reply) => {
    try {
      // Validate input
      const validatedData = registerSchema.parse(req.body);

      // Register user
      const result = await authService.register(validatedData);

      // Set JWT cookie
      reply.setCookie('token', result.token, {
        httpOnly: true,
        secure: process.env.NODE_ENV === 'production',
        sameSite: 'strict',
        maxAge: 24 * 60 * 60 * 1000 // 1 day
      });

      return reply.send({
        success: true,
        user: result.user,
        token: result.token
      });
    } catch (error) {
      if (error instanceof z.ZodError) {
        return reply.code(400).send({
          success: false,
          error: 'Validation error',
          details: error.errors
        });
      }

      if (error instanceof Error) {
        return reply.code(400).send({
          success: false,
          error: error.message
        });
      }

      fastify.log.error(error);
      return reply.code(500).send({
        success: false,
        error: 'Internal server error'
      });
    }
  });

  /**
   * Login user
   */
  fastify.post('/api/auth/login', async (req, reply) => {
    try {
      // Validate input
      const validatedData = loginSchema.parse(req.body);

      // Login user
      const result = await authService.login(validatedData.email, validatedData.password);

      // Set JWT cookie
      reply.setCookie('token', result.token, {
        httpOnly: true,
        secure: process.env.NODE_ENV === 'production',
        sameSite: 'strict',
        maxAge: 24 * 60 * 60 * 1000 // 1 day
      });

      return reply.send({
        success: true,
        user: result.user,
        token: result.token
      });
    } catch (error) {
      if (error instanceof z.ZodError) {
        return reply.code(400).send({
          success: false,
          error: 'Validation error',
          details: error.errors
        });
      }

      if (error instanceof Error) {
        return reply.code(401).send({
          success: false,
          error: error.message
        });
      }

      fastify.log.error(error);
      return reply.code(500).send({
        success: false,
        error: 'Internal server error'
      });
    }
  });

  /**
   * Forgot password
   */
  fastify.post('/api/auth/forgot-password', async (req, reply) => {
    try {
      // Validate input
      const validatedData = forgotPasswordSchema.parse(req.body);

      // Generate reset token
      await authService.generateResetToken(validatedData.email);

      return reply.send({
        success: true,
        message: 'If an account with that email exists, a password reset link has been sent.'
      });
    } catch (error) {
      if (error instanceof z.ZodError) {
        return reply.code(400).send({
          success: false,
          error: 'Validation error',
          details: error.errors
        });
      }

      fastify.log.error(error);
      return reply.code(500).send({
        success: false,
        error: 'Internal server error'
      });
    }
  });

  /**
   * Reset password
   */
  fastify.post('/api/auth/reset-password', async (req, reply) => {
    try {
      // Validate input
      const validatedData = resetPasswordSchema.parse(req.body);

      // Reset password
      await authService.resetPassword(validatedData.token, validatedData.password);

      return reply.send({
        success: true,
        message: 'Password has been reset successfully'
      });
    } catch (error) {
      if (error instanceof z.ZodError) {
        return reply.code(400).send({
          success: false,
          error: 'Validation error',
          details: error.errors
        });
      }

      if (error instanceof Error) {
        return reply.code(400).send({
          success: false,
          error: error.message
        });
      }

      fastify.log.error(error);
      return reply.code(500).send({
        success: false,
        error: 'Internal server error'
      });
    }
  });

  /**
   * Logout user
   */
  fastify.post('/api/auth/logout', async (req, reply) => {
    // Clear JWT cookie
    reply.clearCookie('token');
    
    return reply.send({
      success: true,
      message: 'Logged out successfully'
    });
  });

  /**
   * Get current user
   */
  fastify.get('/api/auth/me', async (req, reply) => {
    try {
      const token = req.cookies.token || req.headers.authorization?.replace('Bearer ', '');
      
      if (!token) {
        return reply.code(401).send({
          success: false,
          error: 'No token provided'
        });
      }

      const user = await authService.verifyToken(token);
      
      if (!user) {
        return reply.code(401).send({
          success: false,
          error: 'Invalid token'
        });
      }

      return reply.send({
        success: true,
        user
      });
    } catch (error) {
      fastify.log.error(error);
      return reply.code(500).send({
        success: false,
        error: 'Internal server error'
      });
    }
  });
}

