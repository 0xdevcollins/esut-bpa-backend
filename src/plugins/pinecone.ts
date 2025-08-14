import fp from 'fastify-plugin';
import { Pinecone } from '@pinecone-database/pinecone';

export default fp(async (fastify) => {
  const client = new Pinecone({ apiKey: fastify.config.PINECONE_API_KEY });
  const index = client.index(fastify.config.PINECONE_INDEX);
  fastify.decorate('pinecone', index);
});

declare module 'fastify' {
  interface FastifyInstance {
    pinecone: ReturnType<Pinecone['index']>;
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
