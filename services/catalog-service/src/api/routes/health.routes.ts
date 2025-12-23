import { Router, Request, Response } from 'express';
import { mongoose } from '../../infrastructure/database/mongodb';
import { elasticsearchClient } from '../../infrastructure/search/elasticsearch';
import { redisClient } from '../../infrastructure/cache/redis';

export const healthRouter = Router();

healthRouter.get('/', async (req: Request, res: Response) => {
  const health = {
    status: 'healthy',
    timestamp: new Date().toISOString(),
    services: {
      mongodb: 'unknown',
      elasticsearch: 'unknown',
      redis: 'unknown'
    }
  };

  try {
    // Check MongoDB
    health.services.mongodb = mongoose.connection.readyState === 1 ? 'healthy' : 'unhealthy';

    // Check Elasticsearch
    try {
      await elasticsearchClient.ping();
      health.services.elasticsearch = 'healthy';
    } catch {
      health.services.elasticsearch = 'unhealthy';
    }

    // Check Redis
    try {
      await redisClient.ping();
      health.services.redis = 'healthy';
    } catch {
      health.services.redis = 'unhealthy';
    }

    const allHealthy = Object.values(health.services).every(s => s === 'healthy');
    res.status(allHealthy ? 200 : 503).json(health);
  } catch (error) {
    health.status = 'unhealthy';
    res.status(503).json(health);
  }
});
