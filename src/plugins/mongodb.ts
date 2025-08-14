import fp from 'fastify-plugin';
import mongoose from 'mongoose';

export default fp(async (fastify) => {
  const MONGO_URI = process.env.MONGO_URI || 'mongodb://localhost:27017/esut_bpa';
  await mongoose.connect(MONGO_URI);
  fastify.decorate('mongoose', mongoose);
  fastify.decorate('mongo', { db: mongoose.connection.db });

  fastify.addHook('onClose', async (app) => {
    await app.mongoose.connection.close();
  });
});

declare module 'fastify' {
  interface FastifyInstance {
    mongoose: typeof mongoose;
    mongo: {
      db: any;
    };
  }
}
