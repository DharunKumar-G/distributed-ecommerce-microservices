import { Product, IProduct } from '../../domain/models/Product';
import { ProductEvent } from '../../domain/models/ProductEvent';
import { elasticsearchClient } from '../../infrastructure/search/elasticsearch';
import { redisClient } from '../../infrastructure/cache/redis';
import { logger } from '../../infrastructure/monitoring/logger';
import { productMetrics } from '../../infrastructure/monitoring/metrics';
import { v4 as uuidv4 } from 'uuid';

export class ProductCommandService {
  
  async createProduct(data: Partial<IProduct>): Promise<IProduct> {
    try {
      // Create product in MongoDB (Write Model)
      const product = new Product({
        ...data,
        productId: data.productId || uuidv4(),
        version: 1
      });
      
      await product.save();

      // Store event for event sourcing
      await this.storeEvent('ProductCreated', product.productId, product.toObject(), 1);

      // Index in Elasticsearch (Read Model)
      await this.indexProduct(product);

      // Clear cache
      await this.invalidateCache(product.productId);

      productMetrics.productsCreated.inc();
      logger.info(`Product created: ${product.productId}`);

      return product;
    } catch (error) {
      logger.error('Failed to create product:', error);
      throw error;
    }
  }

  async updateProduct(productId: string, data: Partial<IProduct>): Promise<IProduct | null> {
    try {
      const product = await Product.findOne({ productId });
      
      if (!product) {
        return null;
      }

      // Update product
      Object.assign(product, data);
      product.version += 1;
      await product.save();

      // Store event
      await this.storeEvent('ProductUpdated', productId, data, product.version);

      // Update Elasticsearch index
      await this.indexProduct(product);

      // Clear cache
      await this.invalidateCache(productId);

      productMetrics.productsUpdated.inc();
      logger.info(`Product updated: ${productId}`);

      return product;
    } catch (error) {
      logger.error('Failed to update product:', error);
      throw error;
    }
  }

  async deleteProduct(productId: string): Promise<boolean> {
    try {
      const product = await Product.findOne({ productId });
      
      if (!product) {
        return false;
      }

      // Soft delete
      product.isActive = false;
      product.version += 1;
      await product.save();

      // Store event
      await this.storeEvent('ProductDeleted', productId, { isActive: false }, product.version);

      // Remove from Elasticsearch
      await elasticsearchClient.delete({
        index: 'products',
        id: productId
      }).catch(err => logger.error('Failed to delete from ES:', err));

      // Clear cache
      await this.invalidateCache(productId);

      productMetrics.productsDeleted.inc();
      logger.info(`Product deleted: ${productId}`);

      return true;
    } catch (error) {
      logger.error('Failed to delete product:', error);
      throw error;
    }
  }

  async updateStock(productId: string, quantity: number): Promise<boolean> {
    try {
      const product = await Product.findOne({ productId });
      
      if (!product) {
        return false;
      }

      product.stock = quantity;
      product.version += 1;
      await product.save();

      // Store event
      await this.storeEvent('StockUpdated', productId, { stock: quantity }, product.version);

      // Update Elasticsearch
      await elasticsearchClient.update({
        index: 'products',
        id: productId,
        body: {
          doc: { stock: quantity }
        }
      }).catch(err => logger.error('Failed to update stock in ES:', err));

      // Clear cache
      await this.invalidateCache(productId);

      return true;
    } catch (error) {
      logger.error('Failed to update stock:', error);
      throw error;
    }
  }

  private async storeEvent(eventType: string, aggregateId: string, payload: any, version: number): Promise<void> {
    const event = new ProductEvent({
      eventId: uuidv4(),
      eventType,
      aggregateId,
      aggregateType: 'Product',
      payload,
      metadata: {
        timestamp: new Date(),
        source: 'catalog-service'
      },
      version
    });

    await event.save();
  }

  private async indexProduct(product: IProduct): Promise<void> {
    try {
      await elasticsearchClient.index({
        index: 'products',
        id: product.productId,
        body: {
          productId: product.productId,
          name: product.name,
          description: product.description,
          price: product.price,
          category: product.category,
          brand: product.brand,
          stock: product.stock,
          images: product.images,
          tags: product.tags,
          rating: product.rating,
          reviewCount: product.reviewCount,
          isActive: product.isActive,
          createdAt: product.createdAt,
          updatedAt: product.updatedAt
        }
      });
    } catch (error) {
      logger.error('Failed to index product in Elasticsearch:', error);
    }
  }

  private async invalidateCache(productId: string): Promise<void> {
    const keys = [
      `product:${productId}`,
      'products:list:*',
      'products:search:*',
      'products:category:*'
    ];

    for (const key of keys) {
      if (key.includes('*')) {
        const pattern = key;
        const matchingKeys = await redisClient.keys(pattern);
        if (matchingKeys.length > 0) {
          await redisClient.del(...matchingKeys);
        }
      } else {
        await redisClient.del(key);
      }
    }
  }
}

export const productCommandService = new ProductCommandService();
