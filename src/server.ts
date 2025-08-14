import fastify from 'fastify';
import env from './plugins/env';
import pinecone from './plugins/pinecone';
import openai from './plugins/openai';
import chatRoutes from './routes/chat';
import healthRoutes from './routes/health';
import mongoPlugin from './plugins/mongodb';
import multipart from '@fastify/multipart';
import uploadRoutes from './routes/upload';
import conversationRoutes from './routes/conversation';
import authRoutes from './routes/auth';
import jwtPlugin from './plugins/jwt';
import cookiePlugin from './plugins/cookie';
import cors from '@fastify/cors';

const app = fastify({
  logger: {
    transport: {
      target: 'pino-pretty',
      options: { colorize: true }
    }
  }
});

const setup = async () => {
  await app.register(cors, {
    origin: '*',
    methods: ['GET', 'POST', 'PUT', 'DELETE', 'OPTIONS'],
    allowedHeaders: ['Content-Type', 'Authorization'],
  });
  await app.register(env);
  await app.register(mongoPlugin);
  await app.register(cookiePlugin);
  await app.register(jwtPlugin);
  await app.register(pinecone);
  await app.register(openai);
  await app.register(multipart, {
    limits: {
      fieldNameSize: 100, // Max field name size in bytes
      fieldSize: 100,     // Max field value size in bytes
      fields: 10,         // Max number of non-file fields
      fileSize: 10000000, // For multipart forms, the max file size in bytes (10MB)
      files: 1,           // Max number of file fields
      headerPairs: 2000   // Max number of header key=>value pairs
    }
  });

  app.register(healthRoutes);
  app.register(authRoutes);
  app.register(chatRoutes);
  app.register(uploadRoutes);
  app.register(conversationRoutes);
};

const start = async () => {
  try {
    await setup();
    await app.listen({ port: Number(app.config.PORT), host: '0.0.0.0' });
    app.log.info(`🚀 Server running at http://localhost:${app.config.PORT}`);
  } catch (err) {
    app.log.error(err);
    process.exit(1);
  }
};

start();
