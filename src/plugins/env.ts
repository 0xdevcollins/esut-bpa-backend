import fp from 'fastify-plugin';
import fastifyEnv from '@fastify/env';

const schema = {
  type: 'object',
  required: ['PORT', 'OPENAI_API_KEY', 'PINECONE_API_KEY', 'PINECONE_INDEX', 'PINECONE_ENV', 'MONGO_URI'],
  properties: {
    PORT: { type: 'string', default: '3000' },
    OPENAI_API_KEY: { type: 'string' },
    PINECONE_API_KEY: { type: 'string' },
    PINECONE_INDEX: { type: 'string' },
    PINECONE_ENV: { type: 'string' },
    MONGO_URI: { type: 'string' },
    JWT_SECRET: { type: 'string', default: 'your-super-secret-jwt-key-change-in-production' },
    COOKIE_SECRET: { type: 'string', default: 'your-super-secret-cookie-key-change-in-production' },
    NODE_ENV: { type: 'string', default: 'development' },
    // Email configuration
    SMTP_HOST: { type: 'string', default: 'smtp.gmail.com' },
    SMTP_PORT: { type: 'string', default: '587' },
    SMTP_USER: { type: 'string' },
    SMTP_PASS: { type: 'string' },
    SMTP_FROM: { type: 'string' },
    APP_URL: { type: 'string', default: 'http://localhost:3000' }
  }
};

export default fp(async (fastify) => {
  await fastify.register(fastifyEnv, {
    schema,
    dotenv: true
  });
});

declare module 'fastify' {
  interface FastifyInstance {
    config: {
      PORT: string;
      OPENAI_API_KEY: string;
      PINECONE_API_KEY: string;
      PINECONE_INDEX: string;
      PINECONE_ENV: string;
      MONGO_URI: string;
      JWT_SECRET: string;
      COOKIE_SECRET: string;
      NODE_ENV: string;
      SMTP_HOST: string;
      SMTP_PORT: string;
      SMTP_USER: string;
      SMTP_PASS: string;
      SMTP_FROM: string;
      APP_URL: string;
    };
  }
}
