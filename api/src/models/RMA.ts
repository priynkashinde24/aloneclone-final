import mongoose, { Schema, Document, Model } from 'mongoose';

/**
 * RMA (Return Merchandise Authorization) Model
 * 
 * PURPOSE:
 * - Handle customer return requests
 * - Support multi-origin and partial returns
 * - Coordinate inventory, refunds, and credit notes
 * - Be auditable, policy-driven, and safe
 * 
 * RULES:
 * - One RMA per return action
 * - Supports partial & multi-origin returns
 * - Status transitions are controlled
 * - Refund amount ≤ paid amount
 */

export interface IRMAItem {
  globalVariantId: mongoose.Types.ObjectId | string;
  quantity: number;
  originId: mongoose.Types.ObjectId | string; // Origin from which item was shipped
  shipmentId?: mongoose.Types.ObjectId | string; // Shipment group reference
  reason: string; // Return reason (e.g., "defective", "wrong_item", "not_as_described")
  condition: 'sealed' | 'opened' | 'damaged'; // Item condition
  originalPrice: number; // Price at time of order (snapshot)
  refundAmount?: number; // Calculated refund for this item
  returnShipping?: {
    payer: 'customer' | 'supplier' | 'reseller' | 'platform';
    amount: number;
    ruleSnapshot: {
      ruleId: mongoose.Types.ObjectId | string;
      scope: 'sku' | 'category' | 'global';
      payer: string;
      chargeType: string;
      chargeValue: number;
    };
  }; // Return shipping cost snapshot (frozen at approval)
}

export interface IRMA extends Document {
  storeId: mongoose.Types.ObjectId;
  orderId: mongoose.Types.ObjectId;
  rmaNumber: string; // Unique RMA number (RMA-{STORECODE}-{YYYY}-{SEQ})
  customerId?: mongoose.Types.ObjectId | string;
  items: IRMAItem[];
  status: 'requested' | 'approved' | 'rejected' | 'pickup_scheduled' | 'picked_up' | 'received' | 'refunded' | 'closed';
  refundMethod: 'original' | 'wallet' | 'cod_adjustment';
  refundAmount: number; // Total refund amount
  refundStatus?: 'pending' | 'processing' | 'completed' | 'failed';
  rejectionReason?: string;
  approvedBy?: mongoose.Types.ObjectId | string;
  approvedAt?: Date;
  rejectedBy?: mongoose.Types.ObjectId | string;
  rejectedAt?: Date;
  receivedAt?: Date;
  refundedAt?: Date;
  creditNoteId?: mongoose.Types.ObjectId | string; // Link to credit note
  metadata?: Record<string, any>;
  createdAt: Date;
  updatedAt: Date;
}

const RMAItemSchema: Schema = new Schema(
  {
    globalVariantId: {
      type: Schema.Types.ObjectId,
      ref: 'ProductVariant',
      required: true,
    },
    quantity: {
      type: Number,
      required: true,
      min: 1,
    },
    originId: {
      type: Schema.Types.ObjectId,
      ref: 'SupplierOrigin',
      required: true,
    },
    shipmentId: {
      type: Schema.Types.ObjectId,
      default: null,
    },
    reason: {
      type: String,
      required: true,
      trim: true,
    },
    condition: {
      type: String,
      enum: ['sealed', 'opened', 'damaged'],
      required: true,
    },
    originalPrice: {
      type: Number,
      required: true,
      min: 0,
    },
    refundAmount: {
      type: Number,
      default: 0,
      min: 0,
    },
    returnShipping: {
      payer: {
        type: String,
        enum: ['customer', 'supplier', 'reseller', 'platform'],
      },
      amount: {
        type: Number,
        min: 0,
      },
      ruleSnapshot: {
        ruleId: { type: Schema.Types.ObjectId },
        scope: {
          type: String,
          enum: ['sku', 'category', 'global'],
        },
        payer: { type: String },
        chargeType: { type: String },
        chargeValue: { type: Number },
      },
    },
  },
  { _id: false }
);

const RMASchema: Schema = new Schema(
  {
    storeId: {
      type: Schema.Types.ObjectId,
      ref: 'Store',
      required: [true, 'Store ID is required'],
      index: true,
    },
    orderId: {
      type: Schema.Types.ObjectId,
      ref: 'Order',
      required: [true, 'Order ID is required'],
      index: true,
    },
    rmaNumber: {
      type: String,
      required: [true, 'RMA number is required'],
      unique: true,
      trim: true,
      index: true,
    },
    customerId: {
      type: Schema.Types.ObjectId,
      ref: 'User',
      default: null,
      index: true,
    },
    items: {
      type: [RMAItemSchema],
      required: true,
      validate: {
        validator: (items: IRMAItem[]) => items.length > 0,
        message: 'RMA must have at least one item',
      },
    },
    status: {
      type: String,
      enum: ['requested', 'approved', 'rejected', 'pickup_scheduled', 'picked_up', 'received', 'refunded', 'closed'],
      default: 'requested',
      required: true,
      index: true,
    },
    refundMethod: {
      type: String,
      enum: ['original', 'wallet', 'cod_adjustment'],
      required: true,
    },
    refundAmount: {
      type: Number,
      required: true,
      min: 0,
    },
    refundStatus: {
      type: String,
      enum: ['pending', 'processing', 'completed', 'failed'],
      default: null,
    },
    rejectionReason: {
      type: String,
      trim: true,
    },
    approvedBy: {
      type: Schema.Types.ObjectId,
      ref: 'User',
      default: null,
    },
    approvedAt: {
      type: Date,
      default: null,
    },
    rejectedBy: {
      type: Schema.Types.ObjectId,
      ref: 'User',
      default: null,
    },
    rejectedAt: {
      type: Date,
      default: null,
    },
    receivedAt: {
      type: Date,
      default: null,
    },
    refundedAt: {
      type: Date,
      default: null,
    },
    creditNoteId: {
      type: Schema.Types.ObjectId,
      ref: 'CreditNote',
      default: null,
    },
    metadata: {
      type: Schema.Types.Mixed,
      default: {},
    },
  },
  {
    timestamps: true,
  }
);

// Compound indexes
RMASchema.index({ storeId: 1, orderId: 1 });
RMASchema.index({ storeId: 1, customerId: 1, status: 1 });
RMASchema.index({ storeId: 1, status: 1, createdAt: -1 });
RMASchema.index({ orderId: 1, status: 1 });

export const RMA: Model<IRMA> =
  mongoose.models.RMA || mongoose.model<IRMA>('RMA', RMASchema);
