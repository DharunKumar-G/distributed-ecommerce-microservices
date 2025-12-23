import mongoose from 'mongoose';
import { logger } from '../monitoring/logger';

const MONGO_URI = process.env.MONGO_URI || 'mongodb://ecommerce:ecommerce123@localhost:27017/catalog_db?authSource=admin';

export async function connectMongoDB(): Promise<void> {
  try {
    await mongoose.connect(MONGO_URI);
    logger.info('Connected to MongoDB');
  } catch (error) {
    logger.error('MongoDB connection error:', error);
    throw error;
  }
}

export { mongoose };
