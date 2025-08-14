import { FastifyInstance } from 'fastify';

export default async function routes(fastify: FastifyInstance) {
  fastify.get('/health', async () => ({ status: 'ok', time: new Date().toISOString() }));
}
