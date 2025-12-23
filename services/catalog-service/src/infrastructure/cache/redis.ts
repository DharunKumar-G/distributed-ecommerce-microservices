import Redis from 'ioredis';
import { logger } from '../monitoring/logger';

const REDIS_HOST = process.env.REDIS_HOST || 'localhost';
const REDIS_PORT = parseInt(process.env.REDIS_PORT || '6379');

export const redisClient = new Redis({
  host: REDIS_HOST,
  port: REDIS_PORT,
  retryStrategy: (times) => {
    const delay = Math.min(times * 50, 2000);
    return delay;
  }
});

export async function initRedis(): Promise<void> {
  redisClient.on('connect', () => {
    logger.info('Connected to Redis');
  });

  redisClient.on('error', (error) => {
    logger.error('Redis error:', error);
  });
}
