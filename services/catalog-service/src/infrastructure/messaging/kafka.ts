import { Kafka, Producer, Consumer } from 'kafkajs';
import { logger } from '../monitoring/logger';

const KAFKA_BROKERS = (process.env.KAFKA_BROKERS || 'localhost:9092').split(',');

export const kafka = new Kafka({
  clientId: 'catalog-service',
  brokers: KAFKA_BROKERS,
  retry: {
    retries: 5,
    initialRetryTime: 300
  }
});

export let producer: Producer;
export let consumer: Consumer;

export async function initKafka(): Promise<void> {
  try {
    producer = kafka.producer();
    await producer.connect();
    logger.info('Kafka producer connected');

    consumer = kafka.consumer({ groupId: 'catalog-service-group' });
    await consumer.connect();
    logger.info('Kafka consumer connected');
  } catch (error) {
    logger.error('Kafka connection error:', error);
    throw error;
  }
}

export async function publishEvent(topic: string, key: string, value: any): Promise<void> {
  try {
    await producer.send({
      topic,
      messages: [{
        key,
        value: JSON.stringify(value),
        timestamp: Date.now().toString()
      }]
    });
    logger.info(`Event published to ${topic}`, { key });
  } catch (error) {
    logger.error('Failed to publish event:', error);
    throw error;
  }
}
