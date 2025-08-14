import { Schema, model } from 'mongoose';

const documentSchema = new Schema({
  title: { type: String, required: true },
  sourceType: { type: String, enum: ['PDF', 'URL'], required: true },
  sourceUrl: { type: String },
  fileName: { type: String },
  namespace: { type: String, required: true },
  role: { type: String, default: 'student' },
  department: { type: String, default: 'general' },
  version: { type: Number, default: 1 },
  effectiveDate: { type: Date },
  chunkCount: { type: Number, default: 0 }
}, { timestamps: true });

export const DocumentModel = model('Document', documentSchema);
