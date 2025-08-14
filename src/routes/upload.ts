import { FastifyInstance } from "fastify";
import { v4 as uuidv4 } from "uuid";
import pdf from "pdf-parse";
import * as cheerio from "cheerio";
import { DocumentModel } from "../models/Document";

export default async function uploadRoutes(fastify: FastifyInstance) {
  fastify.post("/api/upload", async function (req, reply) {
    const contentType = req.headers["content-type"];

    // Check if it's a URL upload
    if (contentType?.includes("application/json")) {
      const body = (await req.body) as {
        url: string;
        role?: string;
        department?: string;
      };
      if (!body.url) {
        reply.code(400);
        return { error: "Missing URL" };
      }

      const htmlText = await fetchAndExtractText(body.url);
      return await processAndUpsert(fastify, htmlText, {
        role: body.role || "student",
        department: body.department || "general",
        namespace: "esut-2025",
        sourceType: "URL",
        sourceUrl: body.url,
      });
    }

    // Otherwise, treat as file upload
    const mp = await req.file();
    if (!mp) {
      reply.code(400);
      return { error: "No file uploaded" };
    }

    const fileBuffer = await mp.toBuffer();
    let rawText = "";

    if (mp.mimetype === "application/pdf") {
      const pdfData = await pdf(fileBuffer);
      rawText = pdfData.text.replace(/\n\s*\n/g, "\n").trim();
    } else {
      reply.code(400);
      return { error: "Unsupported file type" };
    }

    return await processAndUpsert(fastify, rawText, {
      role: (mp.fields?.role as any)?.value || "student",
      department: (mp.fields?.department as any)?.value || "general",
      namespace: "esut-2025",
      sourceType: "PDF",
      fileName: mp.filename,
    });
  });
}

// --- Crawl & clean HTML ---
async function fetchAndExtractText(url: string): Promise<string> {
  const res = await fetch(url);
  if (!res.ok) throw new Error(`Failed to fetch ${url}: ${res.status}`);
  const html = await res.text();

  const $ = cheerio.load(html);
  $("script, style, nav, header, footer").remove(); // remove noise
  const text = $("body").text().replace(/\s+/g, " ").trim();
  return text;
}

// --- Shared ingestion logic ---
async function processAndUpsert(
  fastify: FastifyInstance,
  rawText: string,
  opts: {
    role: string;
    department: string;
    namespace: string;
    sourceType: "PDF" | "URL";
    sourceUrl?: string;
    fileName?: string;
  }
) {
  const chunks = chunkText(rawText, 1000, 150);
  const docId = uuidv4();

  // 1) Insert into Mongo
  const docRecord = await DocumentModel.create({
    title: opts.fileName || opts.sourceUrl || "Untitled Document",
    sourceType: opts.sourceType,
    sourceUrl: opts.sourceUrl,
    fileName: opts.fileName,
    namespace: opts.namespace,
    role: opts.role,
    department: opts.department,
    chunkCount: chunks.length,
  });

  // 2) Upsert into Pinecone
  const vectors = [];
  for (let i = 0; i < chunks.length; i++) {
    const chunk = chunks[i];
    const vector = await fastify.embeddings.embedQuery(chunk?.text || "");
    vectors.push({
      id: `${docRecord._id}_${i}`,
      values: vector,
      metadata: {
        document_id: docRecord._id.toString(),
        chunk_index: i,
        text: chunk?.text || "",
        access_role: opts.role,
        department: opts.department,
      },
    });
  }

  await fastify.pinecone.namespace(opts.namespace).upsert(vectors);

  return {
    status: "ok",
    documentId: docRecord._id.toString(),
    chunks: chunks.length,
    dbEntry: docRecord,
  };
}

// --- Chunker ---
function chunkText(text: string, chunkSize: number, overlap: number) {
  const tokens = text.split(/\s+/);
  const chunks = [];
  let start = 0;

  while (start < tokens.length) {
    const end = Math.min(start + chunkSize, tokens.length);
    const chunk = tokens.slice(start, end).join(" ");
    chunks.push({ text: chunk });
    start += chunkSize - overlap;
  }
  return chunks;
}
