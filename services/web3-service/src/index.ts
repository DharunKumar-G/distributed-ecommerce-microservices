import express from 'express';
import cors from 'cors';
import mongoose from 'mongoose';
import dotenv from 'dotenv';
import { walletRouter } from './api/walletRoutes';
import paymentRouter from './api/paymentRoutes';
import nftRouter from './api/nftRoutes';
import { logger } from './services/logger';
import { web3Provider } from './services/web3Provider';

dotenv.config();

const app = express();
const PORT = process.env.PORT || 8087;

// Middleware
app.use(cors());
app.use(express.json());
app.use(express.urlencoded({ extended: true }));

// Health check
app.get('/health', (req, res) => {
  res.json({
    status: 'healthy',
    service: 'web3-service',
    timestamp: new Date().toISOString(),
    chains: web3Provider.getAllSupportedChains()
  });
});

// API Routes
app.use('/api/web3/wallet', walletRouter);
app.use('/api/web3/payment', paymentRouter);
app.use('/api/web3/nft', nftRouter);

// Error handling
app.use((err: any, req: express.Request, res: express.Response, next: express.NextFunction) => {
  logger.error('Unhandled error:', err);
  res.status(500).json({ error: 'Internal server error' });
});

// Connect to MongoDB and start server
async function startServer() {
  try {
    // Connect to MongoDB
    const mongoUri = process.env.MONGO_URI || 'mongodb://ecommerce:ecommerce123@mongodb:27017/web3_db?authSource=admin';
    await mongoose.connect(mongoUri);
    logger.info('Connected to MongoDB');

    // Start server
    app.listen(PORT, () => {
      logger.info(`Web3 Service listening on port ${PORT}`);
      logger.info(`Supported chains: ${web3Provider.getAllSupportedChains().join(', ')}`);
    });
  } catch (error) {
    logger.error('Failed to start server:', error);
    process.exit(1);
  }
}

// Handle shutdown
process.on('SIGTERM', async () => {
  logger.info('SIGTERM received, shutting down gracefully');
  await mongoose.connection.close();
  process.exit(0);
});

startServer();
