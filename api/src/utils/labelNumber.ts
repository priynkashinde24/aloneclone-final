import mongoose from 'mongoose';
import { Store } from '../models/Store';

/**
 * Label Number Generator
 * 
 * PURPOSE:
 * - Generate unique, sequential label numbers per store per year
 * - Format: LBL-{STORECODE}-{YYYY}-{SEQ}
 * - Atomic increment using MongoDB
 * 
 * RULES:
 * - Generated at label creation
 * - One sequence per store per year
 * - Thread-safe (atomic increment)
 */

interface LabelNumberCounter {
  storeId: mongoose.Types.ObjectId;
  year: number;
  sequence: number;
  updatedAt: Date;
}

const LabelNumberCounterSchema = new mongoose.Schema({
  storeId: { type: mongoose.Schema.Types.ObjectId, required: true, index: true },
  year: { type: Number, required: true },
  sequence: { type: Number, required: true, default: 0 },
  updatedAt: { type: Date, default: Date.now },
});

// Unique constraint: One counter per store per year
LabelNumberCounterSchema.index({ storeId: 1, year: 1 }, { unique: true });

const LabelNumberCounter =
  mongoose.models.LabelNumberCounter ||
  mongoose.model<LabelNumberCounter & mongoose.Document>('LabelNumberCounter', LabelNumberCounterSchema);

/**
 * Generate label number for a store
 * 
 * Format: LBL-{STORECODE}-{YYYY}-{SEQ}
 * Example: LBL-ABC-2024-0001
 * 
 * @param storeId - Store ID
 * @returns Label number string
 */
export async function generateLabelNumber(
  storeId: mongoose.Types.ObjectId | string
): Promise<string> {
  const storeObjId = typeof storeId === 'string' ? new mongoose.Types.ObjectId(storeId) : storeId;

  // Get store to retrieve store code
  const store = await Store.findById(storeObjId).select('code storeCode name').lean();
  if (!store) {
    throw new Error(`Store not found: ${storeId}`);
  }

  // Get current year
  const year = new Date().getFullYear();

  // Get or create counter for this store + year
  const counter = await LabelNumberCounter.findOneAndUpdate(
    { storeId: storeObjId, year },
    {
      $inc: { sequence: 1 },
      $set: { updatedAt: new Date() },
    },
    {
      upsert: true,
      new: true,
      setDefaultsOnInsert: true,
    }
  );

  // Format label number
  const storeCode = (store as any).code || (store as any).storeCode || 'STORE';
  const sequence = counter.sequence.toString().padStart(4, '0');
  const labelNumber = `LBL-${storeCode.toUpperCase()}-${year}-${sequence}`;

  return labelNumber;
}

