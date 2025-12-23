import mongoose, { Schema, Document } from 'mongoose';

export interface IProductEvent extends Document {
  eventId: string;
  eventType: string;
  aggregateId: string;
  aggregateType: string;
  payload: any;
  metadata: any;
  version: number;
  createdAt: Date;
}

const ProductEventSchema = new Schema({
  eventId: { type: String, required: true, unique: true, index: true },
  eventType: { type: String, required: true, index: true },
  aggregateId: { type: String, required: true, index: true },
  aggregateType: { type: String, required: true },
  payload: { type: Schema.Types.Mixed, required: true },
  metadata: { type: Schema.Types.Mixed },
  version: { type: Number, required: true }
}, {
  timestamps: { createdAt: true, updatedAt: false },
  collection: 'product_events'
});

ProductEventSchema.index({ aggregateId: 1, version: 1 }, { unique: true });
ProductEventSchema.index({ eventType: 1, createdAt: -1 });

export const ProductEvent = mongoose.model<IProductEvent>('ProductEvent', ProductEventSchema);
