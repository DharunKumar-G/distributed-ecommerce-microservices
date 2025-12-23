import { Client } from '@elastic/elasticsearch';
import { logger } from '../monitoring/logger';

const ELASTICSEARCH_URL = process.env.ELASTICSEARCH_URL || 'http://localhost:9200';

export const elasticsearchClient = new Client({
  node: ELASTICSEARCH_URL
});

export async function connectElasticsearch(): Promise<void> {
  try {
    const info = await elasticsearchClient.info();
    logger.info(`Connected to Elasticsearch ${info.version.number}`);

    // Create products index if it doesn't exist
    const indexExists = await elasticsearchClient.indices.exists({ index: 'products' });
    
    if (!indexExists) {
      await elasticsearchClient.indices.create({
        index: 'products',
        body: {
          mappings: {
            properties: {
              productId: { type: 'keyword' },
              name: { type: 'text', analyzer: 'standard' },
              description: { type: 'text' },
              price: { type: 'float' },
              category: { type: 'keyword' },
              brand: { type: 'keyword' },
              stock: { type: 'integer' },
              images: { type: 'keyword' },
              tags: { type: 'keyword' },
              rating: { type: 'float' },
              reviewCount: { type: 'integer' },
              isActive: { type: 'boolean' },
              createdAt: { type: 'date' },
              updatedAt: { type: 'date' }
            }
          },
          settings: {
            number_of_shards: 3,
            number_of_replicas: 1
          }
        }
      });
      logger.info('Created products index in Elasticsearch');
    }
  } catch (error) {
    logger.error('Elasticsearch connection error:', error);
    throw error;
  }
}
