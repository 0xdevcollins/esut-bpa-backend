import { FastifyInstance } from "fastify";
import { retrieveAndAnswer } from "../services/rag";
import { ObjectId } from "mongodb";
import { v4 as uuidv4 } from "uuid";
import { AuthService } from "../services/auth";

export default async function routes(fastify: FastifyInstance) {
  const authService = new AuthService(fastify);

  fastify.post("/api/chat", async (req, reply) => {
    try {
      const { query, role, conversationId } = req.body as {
        query: string;
        role: string;
        conversationId?: string;
      };

      if (!query || !role) {
        return reply.code(400).send({ error: "Missing 'query' or 'role'" });
      }

      // Check if user is authenticated
      let userId: string | null = null;
      let sessionId: string | null = null;
      
      try {
        const token = req.cookies.token || req.headers.authorization?.replace('Bearer ', '');
        if (token) {
          const user = await authService.verifyToken(token);
          if (user) {
            userId = user._id;
          }
        }
      } catch (error) {
        // User is not authenticated, will use session ID
      }

      // If not authenticated, generate or get session ID from cookie
      if (!userId) {
        sessionId = req.cookies.sessionId || uuidv4();
        if (!req.cookies.sessionId) {
          reply.setCookie('sessionId', sessionId, {
            httpOnly: true,
            secure: process.env.NODE_ENV === 'production',
            sameSite: 'strict',
            maxAge: 30 * 24 * 60 * 60 * 1000 // 30 days
          });
        }
      }

      // Get or create conversation
      let conversation;
      if (conversationId) {
        const queryFilter: any = { _id: new ObjectId(conversationId) };
        
        // If authenticated, ensure user owns the conversation
        if (userId) {
          queryFilter.userId = userId;
        } else {
          queryFilter.sessionId = sessionId;
        }
        
        conversation = await fastify.mongo.db
          .collection("conversations")
          .findOne(queryFilter);
      }
      
      if (!conversation) {
        const newConv: any = {
          role,
          messages: [],
          createdAt: new Date(),
          updatedAt: new Date(),
        };

        // Set user identifier
        if (userId) {
          newConv.userId = userId;
        } else {
          newConv.sessionId = sessionId;
        }

        const { insertedId } = await fastify.mongo.db
          .collection("conversations")
          .insertOne(newConv);
        conversation = { _id: insertedId, ...newConv };
      }

      // Prepare history (last 5 messages)
      const history = conversation.messages
        .slice(-5)
        .map((m: any) => `${m.sender}: ${m.text}`)
        .join("\n");

      // Get RAG response with conversation history
      const result = await retrieveAndAnswer(
        fastify,
        query,
        role || "student",
        history
      );

      // Save user message to conversation
      await fastify.mongo.db.collection("conversations").updateOne(
        { _id: conversation._id },
        {
          $push: {
            messages: { sender: "user", text: query, timestamp: new Date() },
          },
        }
      );

      // Save assistant response to conversation
      await fastify.mongo.db.collection("conversations").updateOne(
        { _id: conversation._id },
        {
          $push: {
            messages: {
              sender: "assistant",
              text: result.answer,
              timestamp: new Date(),
            },
          },
          $set: { updatedAt: new Date() },
        }
      );

      // Return response with conversation context
      return reply.send({
        conversationId: conversation._id,
        answer: result.answer,
        citations: result.citations,
        history: [
          ...conversation.messages,
          { sender: "user", text: query },
          { sender: "assistant", text: result.answer },
        ],
        meta: {
          ...result.meta,
          isAuthenticated: !!userId,
          userId: userId || null,
          sessionId: sessionId || null
        },
      });
    } catch (err) {
      fastify.log.error(err);
      const errorMessage = err instanceof Error ? err.message : "Unknown error";
      return reply.code(500).send({ error: "Server error", message: errorMessage });
    }
  });
}
