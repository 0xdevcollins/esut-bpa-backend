import fp from 'fastify-plugin';
import mongoose from 'mongoose';

export default fp(async (fastify) => {
  const MONGO_URI = process.env.MONGO_URI || 'mongodb://localhost:27017/esut_bpa';
  
  try {
    // Set Mongoose options for better connection handling
    const mongooseOptions = {
      maxPoolSize: 10,
      serverSelectionTimeoutMS: 5000,
      socketTimeoutMS: 45000,
      bufferCommands: false,
    };

    // Connect to MongoDB
    await mongoose.connect(MONGO_URI, mongooseOptions);
    
    // Log successful connection
    fastify.log.info('MongoDB connected successfully');
    
    // Decorate fastify with mongoose and mongo
    fastify.decorate('mongoose', mongoose);
    fastify.decorate('mongo', { 
      db: mongoose.connection.db,
      ObjectId: mongoose.Types.ObjectId 
    });

    // Handle connection events
    mongoose.connection.on('error', (err: Error) => {
      fastify.log.error('MongoDB connection error: %s', err.message);
    });

    mongoose.connection.on('disconnected', () => {
      fastify.log.warn('MongoDB disconnected');
    });

    mongoose.connection.on('reconnected', () => {
      fastify.log.info('MongoDB reconnected');
    });

    // Graceful shutdown
    fastify.addHook('onClose', async (app) => {
      try {
        await app.mongoose.connection.close();
        fastify.log.info('MongoDB connection closed');
      } catch (err) {
        const error = err as Error;
        fastify.log.error('Error closing MongoDB connection: %s', error.message);
      }
    });

  } catch (error) {
    const err = error as Error;
    fastify.log.error('Failed to connect to MongoDB: %s', err.message);
    throw error;
  }
}, {
  name: 'mongodb'
});

declare module 'fastify' {
  interface FastifyInstance {
    mongoose: typeof mongoose;
    mongo: {
      db: any;
      ObjectId: typeof mongoose.Types.ObjectId;
    };
  }
}
