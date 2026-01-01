import mongoose, { Schema, Document, Model } from 'mongoose';

/**
 * Shipping Label Model
 * 
 * PURPOSE:
 * - Store shipping label data per order
 * - Include courier, address, order, barcode info
 * - Freeze label once generated
 * - Support manual & API-based couriers
 * 
 * RULES:
 * - One label per order (initially)
 * - Immutable once generated
 * - Cancellation creates new label (future)
 */

export interface IShippingLabel extends Document {
  storeId: mongoose.Types.ObjectId;
  orderId: mongoose.Types.ObjectId;
  courierId: mongoose.Types.ObjectId;
  courierName: string;
  courierCode: string;
  labelNumber: string; // Unique: LBL-{STORECODE}-{YYYY}-{SEQ}
  awbNumber?: string | null; // Airway Bill Number (from courier API)
  pickupAddress: {
    name: string;
    street: string;
    city: string;
    state: string;
    zip: string;
    country: string;
    phone?: string;
  };
  deliveryAddress: {
    name: string;
    street: string;
    city: string;
    state: string;
    zip: string;
    country: string;
    phone?: string;
  };
  packageDetails: {
    weight: number; // kg
    dimensions?: {
      length?: number; // cm
      width?: number; // cm
      height?: number; // cm
    };
  };
  orderDetails: {
    orderNumber: string;
    orderId: string;
    itemCount: number;
    codAmount?: number | null; // If COD order
    prepaidAmount?: number | null; // If prepaid
  };
  pdfUrl: string; // URL to generated PDF
  status: 'generated' | 'cancelled';
  generatedAt: Date;
  generatedBy: mongoose.Types.ObjectId; // User who generated
  cancelledAt?: Date | null;
  cancelledBy?: mongoose.Types.ObjectId | null;
  createdAt: Date;
  updatedAt: Date;
}

const AddressSchema: Schema = new Schema(
  {
    name: { type: String, required: true },
    street: { type: String, required: true },
    city: { type: String, required: true },
    state: { type: String, required: true },
    zip: { type: String, required: true },
    country: { type: String, required: true },
    phone: { type: String },
  },
  { _id: false }
);

const PackageDetailsSchema: Schema = new Schema(
  {
    weight: { type: Number, required: true, min: 0 },
    dimensions: {
      length: { type: Number, min: 0 },
      width: { type: Number, min: 0 },
      height: { type: Number, min: 0 },
    },
  },
  { _id: false }
);

const OrderDetailsSchema: Schema = new Schema(
  {
    orderNumber: { type: String, required: true },
    orderId: { type: String, required: true },
    itemCount: { type: Number, required: true, min: 1 },
    codAmount: { type: Number, min: 0, default: null },
    prepaidAmount: { type: Number, min: 0, default: null },
  },
  { _id: false }
);

const ShippingLabelSchema: Schema = new Schema(
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
    courierId: {
      type: Schema.Types.ObjectId,
      ref: 'Courier',
      required: [true, 'Courier ID is required'],
      index: true,
    },
    courierName: {
      type: String,
      required: [true, 'Courier name is required'],
    },
    courierCode: {
      type: String,
      required: [true, 'Courier code is required'],
    },
    labelNumber: {
      type: String,
      required: [true, 'Label number is required'],
      unique: true,
      trim: true,
      index: true,
    },
    awbNumber: {
      type: String,
      default: null,
      trim: true,
      index: true,
    },
    pickupAddress: {
      type: AddressSchema,
      required: true,
    },
    deliveryAddress: {
      type: AddressSchema,
      required: true,
    },
    packageDetails: {
      type: PackageDetailsSchema,
      required: true,
    },
    orderDetails: {
      type: OrderDetailsSchema,
      required: true,
    },
    pdfUrl: {
      type: String,
      required: [true, 'PDF URL is required'],
    },
    status: {
      type: String,
      enum: ['generated', 'cancelled'],
      default: 'generated',
      index: true,
    },
    generatedAt: {
      type: Date,
      required: true,
      default: Date.now,
    },
    generatedBy: {
      type: Schema.Types.ObjectId,
      ref: 'User',
      required: true,
    },
    cancelledAt: {
      type: Date,
      default: null,
    },
    cancelledBy: {
      type: Schema.Types.ObjectId,
      ref: 'User',
      default: null,
    },
  },
  {
    timestamps: true,
  }
);

// Compound indexes
ShippingLabelSchema.index({ storeId: 1, orderId: 1, status: 1 });
ShippingLabelSchema.index({ orderId: 1, status: 1 });
ShippingLabelSchema.index({ courierId: 1, status: 1 });
ShippingLabelSchema.index({ labelNumber: 1 }, { unique: true });

// Ensure one active label per order
ShippingLabelSchema.index(
  { orderId: 1, status: 1 },
  { unique: true, partialFilterExpression: { status: 'generated' } }
);

export const ShippingLabel: Model<IShippingLabel> =
  mongoose.models.ShippingLabel || mongoose.model<IShippingLabel>('ShippingLabel', ShippingLabelSchema);

