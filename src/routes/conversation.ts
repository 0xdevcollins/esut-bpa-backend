import { FastifyInstance } from 'fastify';
import { ObjectId } from 'mongodb';
import { AuthService } from '../services/auth';

export default async function conversationRoutes(fastify: FastifyInstance) {
  const authService = new AuthService(fastify);
  
  // List all conversations for a user (requires authentication)
  fastify.get('/api/conversations', async (req, reply) => {
    try {
      // Check if user is authenticated
      const token = req.cookies.token || req.headers.authorization?.replace('Bearer ', '');
      
      if (!token) {
        return reply.code(401).send({ 
          error: 'Authentication required',
          message: 'You must be logged in to view conversations'
        });
      }

      const user = await authService.verifyToken(token);
      if (!user) {
        return reply.code(401).send({ 
          error: 'Invalid token',
          message: 'Please log in again'
        });
      }

      // Get conversations for authenticated user
      const conversations = await fastify.mongo.db.collection('conversations')
        .find({ userId: user._id })
        .project({ messages: 0 }) // don't return full messages here
        .sort({ updatedAt: -1 })
        .toArray();
      
      reply.send({
        success: true,
        conversations,
        count: conversations.length
      });
    } catch (err) {
      fastify.log.error(err);
      reply.code(500).send({ error: 'Server error' });
    }
  });

  // Get full conversation by ID (requires authentication)
  fastify.get('/api/conversations/:id', async (req, reply) => {
    try {
      // Check if user is authenticated
      const token = req.cookies.token || req.headers.authorization?.replace('Bearer ', '');
      
      if (!token) {
        return reply.code(401).send({ 
          error: 'Authentication required',
          message: 'You must be logged in to view conversations'
        });
      }

      const user = await authService.verifyToken(token);
      if (!user) {
        return reply.code(401).send({ 
          error: 'Invalid token',
          message: 'Please log in again'
        });
      }

      const { id } = req.params as { id: string };
      
      // Get conversation and ensure user owns it
      const conversation = await fastify.mongo.db.collection('conversations')
        .findOne({ 
          _id: new ObjectId(id),
          userId: user._id
        });
      
      if (!conversation) {
        return reply.code(404).send({ 
          error: 'Conversation not found',
          message: 'Conversation does not exist or you do not have access to it'
        });
      }
      
      reply.send({
        success: true,
        conversation
      });
    } catch (err) {
      fastify.log.error(err);
      reply.code(500).send({ error: 'Server error' });
    }
  });

  // Delete conversation (requires authentication)
  fastify.delete('/api/conversations/:id', async (req, reply) => {
    try {
      // Check if user is authenticated
      const token = req.cookies.token || req.headers.authorization?.replace('Bearer ', '');
      
      if (!token) {
        return reply.code(401).send({ 
          error: 'Authentication required',
          message: 'You must be logged in to delete conversations'
        });
      }

      const user = await authService.verifyToken(token);
      if (!user) {
        return reply.code(401).send({ 
          error: 'Invalid token',
          message: 'Please log in again'
        });
      }

      const { id } = req.params as { id: string };
      
      // Delete conversation and ensure user owns it
      const result = await fastify.mongo.db.collection('conversations')
        .deleteOne({ 
          _id: new ObjectId(id),
          userId: user._id
        });
      
      if (!result.deletedCount) {
        return reply.code(404).send({ 
          error: 'Conversation not found',
          message: 'Conversation does not exist or you do not have access to it'
        });
      }
      
      reply.send({ 
        success: true,
        message: 'Conversation deleted successfully'
      });
    } catch (err) {
      fastify.log.error(err);
      reply.code(500).send({ error: 'Server error' });
    }
  });
}
