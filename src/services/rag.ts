import { RunnableSequence } from "@langchain/core/runnables";
import { PromptTemplate } from "@langchain/core/prompts";
import { Document } from "@langchain/core/documents";
import { FastifyInstance } from "fastify";

export async function retrieveAndAnswer(
  fastify: FastifyInstance,
  query: string,
  role: string,
  conversationHistory?: string
) {
  try {
    // 1. Embed query
    const vector = await fastify.embeddings.embedQuery(query);

    // 2. Retrieve from Pinecone
    const results = await fastify.pinecone.namespace("esut-2025").query({
      topK: 5,
      vector,
      filter: {
        access_role: {
          $in:
            role === "student"
              ? ["public", "student"]
              : ["public", "student", "staff"],
        },
      },
      includeMetadata: true,
    });

    // 3. No matches → safe fallback
    if (!results.matches.length) {
      return {
        answer: "I don't have a verified source for that.",
        citations: [],
        meta: { tokensUsed: 0, sourceCount: 0 },
      };
    }

    // 4. Convert matches to Document objects
    const docs = results.matches.map(
      (match) =>
        new Document({
          pageContent: String(match.metadata?.text || ""),
          metadata: match.metadata || {},
        })
    );

    // 5. Summarize & Compress Context
    const summarizerPrompt = new PromptTemplate({
      inputVariables: ["doc", "question"],
      template: `
You are an AI assistant helping condense ESUT documents.
Given the following document text, extract ONLY the key facts relevant to answering the question.

Document:
{doc}

Question:
{question}

Summary (max 5 bullet points):
`,
    });

    const summarizerChain = RunnableSequence.from([
      summarizerPrompt,
      fastify.llm,
    ]);

    const compressedContexts = [];
    for (const doc of docs) {
      try {
        const summary = await summarizerChain.invoke({
          doc: doc.pageContent.slice(0, 3000),
          question: query,
        });
        compressedContexts.push(String(summary.content || "").trim());
      } catch (error) {
        // Fallback to original content if summarization fails
        compressedContexts.push(doc.pageContent.slice(0, 1000));
      }
    }

    const finalContext = compressedContexts.join("\n\n");

    const answerPrompt = new PromptTemplate({
      inputVariables: ["context", "question", "history"],
      template: `
You are ESUT's Business Process Agent (BPA).
Answer ONLY using the provided ESUT context.
Rules:
- Do NOT guess or invent info.
- Always cite sources in [brackets] using title or filename.
- If unsure, say exactly: "I don't have a verified source for that."
- Keep answers concise unless more detail is requested.
- Consider conversation history for context and continuity.

Previous conversation:
{history}

Context:
{context}

Question:
{question}

Answer:
`,
    });

    // 7. Final Answer Chain
    const answerChain = RunnableSequence.from([answerPrompt, fastify.llm]);
    const response = await answerChain.invoke({
      context: finalContext,
      question: query,
      history: conversationHistory || "No previous conversation",
    });

    // 8. Structured Response for Frontend
    return {
      answer: String(response.content || "").trim(),
      citations: docs.map((d) => ({
        title: d.metadata?.title || "Unknown Source",
        url: d.metadata?.source || null,
        page: d.metadata?.page || null,
      })),
      meta: {
        tokensUsed: null, // LangChain doesn't expose token usage in this context
        sourceCount: docs.length,
        roleUsed: role,
        query,
      },
    };
  } catch (err) {
    fastify.log.error(err);
    const errorMessage = err instanceof Error ? err.message : "Unknown error";
    return {
      answer: "An error occurred while retrieving your answer.",
      citations: [],
      meta: { error: true, message: errorMessage },
    };
  }
}
