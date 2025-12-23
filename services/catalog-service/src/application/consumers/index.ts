import { consumer } from '../../infrastructure/messaging/kafka';
import { logger } from '../../infrastructure/monitoring/logger';

export async function startEventConsumers(): Promise<void> {
  try {
    // Subscribe to order completed events to update product reviews/ratings
    await consumer.subscribe({ topic: 'order-completed', fromBeginning: false });

    await consumer.run({
      eachMessage: async ({ topic, partition, message }: { topic: string; partition: number; message: any }) => {
        logger.info(`Received message from ${topic} [${partition}]`);
        
        if (message.value) {
          const event = JSON.parse(message.value.toString());
          // Handle order completed event
          // Could update product popularity, ratings, etc.
          logger.info('Processing order completed event', event);
        }
      }
    });

    logger.info('Event consumers started');
  } catch (error) {
    logger.error('Failed to start event consumers:', error);
    throw error;
  }
}
