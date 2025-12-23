import mongoose, { Schema, Document } from 'mongoose';

export interface IProduct extends Document {
  productId: string;
  name: string;
  description: string;
  price: number;
  category: string;
  brand: string;
  stock: number;
  images: string[];
  attributes: Map<string, any>;
  tags: string[];
  rating: number;
  reviewCount: number;
  isActive: boolean;
  createdAt: Date;
  updatedAt: Date;
  version: number;
}

const ProductSchema = new Schema({
  productId: { type: String, required: true, unique: true, index: true },
  name: { type: String, required: true, index: true },
  description: { type: String, required: true },
  price: { type: Number, required: true, min: 0 },
  category: { type: String, required: true, index: true },
  brand: { type: String, required: true, index: true },
  stock: { type: Number, required: true, min: 0, default: 0 },
  images: [{ type: String }],
  attributes: { type: Map, of: Schema.Types.Mixed },
  tags: [{ type: String, index: true }],
  rating: { type: Number, min: 0, max: 5, default: 0 },
  reviewCount: { type: Number, min: 0, default: 0 },
  isActive: { type: Boolean, default: true, index: true },
  version: { type: Number, default: 0 }
}, {
  timestamps: true,
  collection: 'products'
});

// Indexing for search performance
ProductSchema.index({ name: 'text', description: 'text', tags: 'text' });
ProductSchema.index({ category: 1, price: 1 });
ProductSchema.index({ brand: 1, category: 1 });

export const Product = mongoose.model<IProduct>('Product', ProductSchema);
