import express from 'express';
import cors from 'cors';
import { connectMongoDB } from './infrastructure/database/mongodb';
import { connectElasticsearch } from './infrastructure/search/elasticsearch';
import { initKafka } from './infrastructure/messaging/kafka';
import { initRedis } from './infrastructure/cache/redis';
import { initMetrics } from './infrastructure/monitoring/metrics';
import { initTracing } from './infrastructure/monitoring/tracing';
import { logger } from './infrastructure/monitoring/logger';
import { productRouter } from './api/routes/product.routes';
import { metricsRouter } from './api/routes/metrics.routes';
import { healthRouter } from './api/routes/health.routes';
import { startEventConsumers } from './application/consumers';
import dotenv from 'dotenv';

dotenv.config();

const app = express();
const PORT = process.env.PORT || 8083;

async function startServer() {
  try {
    // Initialize infrastructure
    await connectMongoDB();
    await connectElasticsearch();
    await initKafka();
    await initRedis();
    initMetrics();
    initTracing('catalog-service');

    // Middleware
    app.use(cors()); // Enable CORS for all routes
    app.use(express.json());
    app.use(express.urlencoded({ extended: true }));

    // Routes
    app.use('/health', healthRouter);
    app.use('/metrics', metricsRouter);
    app.use('/api/catalog', productRouter);

    // Start Kafka consumers
    await startEventConsumers();

    // Start server
    app.listen(PORT, () => {
      logger.info(`Catalog Service listening on port ${PORT}`);
    });

    // Graceful shutdown
    process.on('SIGINT', async () => {
      logger.info('Shutting down gracefully...');
      process.exit(0);
    });

  } catch (error) {
    logger.error('Failed to start server:', error);
    process.exit(1);
  }
}

startServer();
