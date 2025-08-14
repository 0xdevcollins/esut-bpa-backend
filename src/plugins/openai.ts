import fp from 'fastify-plugin';
import { ChatOpenAI, OpenAIEmbeddings } from '@langchain/openai';

export default fp(async (fastify) => {
  const llm = new ChatOpenAI({
    modelName: 'gpt-4o-mini',
    temperature: 0,
    openAIApiKey: fastify.config.OPENAI_API_KEY
  });

  const embeddings = new OpenAIEmbeddings({
    model: 'text-embedding-3-small',
    openAIApiKey: fastify.config.OPENAI_API_KEY
  });

  fastify.decorate('llm', llm);
  fastify.decorate('embeddings', embeddings);
});

declare module 'fastify' {
  interface FastifyInstance {
    llm: import('@langchain/openai').ChatOpenAI;
    embeddings: import('@langchain/openai').OpenAIEmbeddings;
  }
}
