import { Product, IProduct } from '../../domain/models/Product';
import { elasticsearchClient } from '../../infrastructure/search/elasticsearch';
import { redisClient } from '../../infrastructure/cache/redis';
import { logger } from '../../infrastructure/monitoring/logger';

const CACHE_TTL = 3600; // 1 hour

export class ProductQueryService {
  
  async getProductById(productId: string): Promise<IProduct | null> {
    try {
      // Try cache first
      const cached = await redisClient.get(`product:${productId}`);
      if (cached) {
        return JSON.parse(cached);
      }

      // Get from MongoDB
      const product = await Product.findOne({ productId, isActive: true });
      
      if (product) {
        // Cache the result
        await redisClient.setex(
          `product:${productId}`,
          CACHE_TTL,
          JSON.stringify(product)
        );
      }

      return product;
    } catch (error) {
      logger.error('Failed to get product:', error);
      throw error;
    }
  }

  async listProducts(filters: any = {}, page: number = 1, limit: number = 20): Promise<any> {
    try {
      const cacheKey = `products:list:${JSON.stringify(filters)}:${page}:${limit}`;
      
      // Try cache first
      const cached = await redisClient.get(cacheKey);
      if (cached) {
        return JSON.parse(cached);
      }

      const query: any = { isActive: true };
      
      if (filters.category) query.category = filters.category;
      if (filters.brand) query.brand = filters.brand;
      if (filters.minPrice || filters.maxPrice) {
        query.price = {};
        if (filters.minPrice) query.price.$gte = parseFloat(filters.minPrice);
        if (filters.maxPrice) query.price.$lte = parseFloat(filters.maxPrice);
      }

      const skip = (page - 1) * limit;
      
      const [products, total] = await Promise.all([
        Product.find(query)
          .skip(skip)
          .limit(limit)
          .sort({ createdAt: -1 })
          .lean(),
        Product.countDocuments(query)
      ]);

      const result = {
        products,
        pagination: {
          page,
          limit,
          total,
          pages: Math.ceil(total / limit)
        }
      };

      // Cache the result
      await redisClient.setex(cacheKey, CACHE_TTL, JSON.stringify(result));

      return result;
    } catch (error) {
      logger.error('Failed to list products:', error);
      throw error;
    }
  }

  async searchProducts(query: string, filters: any = {}, page: number = 1, limit: number = 20): Promise<any> {
    try {
      const cacheKey = `products:search:${query}:${JSON.stringify(filters)}:${page}:${limit}`;
      
      // Try cache first
      const cached = await redisClient.get(cacheKey);
      if (cached) {
        return JSON.parse(cached);
      }

      const must: any[] = [
        {
          multi_match: {
            query,
            fields: ['name^3', 'description', 'tags^2', 'brand'],
            fuzziness: 'AUTO'
          }
        },
        {
          term: { isActive: true }
        }
      ];

      if (filters.category) {
        must.push({ term: { category: filters.category } });
      }

      if (filters.brand) {
        must.push({ term: { brand: filters.brand } });
      }

      if (filters.minPrice || filters.maxPrice) {
        const range: any = {};
        if (filters.minPrice) range.gte = parseFloat(filters.minPrice);
        if (filters.maxPrice) range.lte = parseFloat(filters.maxPrice);
        must.push({ range: { price: range } });
      }

      const from = (page - 1) * limit;

      const response = await elasticsearchClient.search({
        index: 'products',
        body: {
          from,
          size: limit,
          query: {
            bool: { must }
          },
          sort: [
            { _score: { order: 'desc' } },
            { createdAt: { order: 'desc' } }
          ]
        }
      });

      const products = response.hits.hits.map((hit: any) => ({
        ...hit._source,
        _score: hit._score
      }));

      const total = typeof response.hits.total === 'number' 
        ? response.hits.total 
        : response.hits.total?.value || 0;

      const result = {
        products,
        pagination: {
          page,
          limit,
          total,
          pages: Math.ceil(total / limit)
        },
        query
      };

      // Cache the result
      await redisClient.setex(cacheKey, CACHE_TTL, JSON.stringify(result));

      return result;
    } catch (error) {
      logger.error('Failed to search products:', error);
      throw error;
    }
  }

  async getProductsByCategory(category: string, page: number = 1, limit: number = 20): Promise<any> {
    return this.listProducts({ category }, page, limit);
  }

  async getProductsByBrand(brand: string, page: number = 1, limit: number = 20): Promise<any> {
    return this.listProducts({ brand }, page, limit);
  }

  async getFeaturedProducts(limit: number = 10): Promise<IProduct[]> {
    try {
      const cacheKey = `products:featured:${limit}`;
      
      // Try cache first
      const cached = await redisClient.get(cacheKey);
      if (cached) {
        return JSON.parse(cached);
      }

      const products = await Product.find({ isActive: true })
        .sort({ rating: -1, reviewCount: -1 })
        .limit(limit)
        .lean() as unknown as IProduct[];

      // Cache for 30 minutes
      await redisClient.setex(cacheKey, 1800, JSON.stringify(products));

      return products;
    } catch (error) {
      logger.error('Failed to get featured products:', error);
      throw error;
    }
  }

  async getPopularProducts(limit: number = 10): Promise<IProduct[]> {
    try {
      const cacheKey = `products:popular:${limit}`;
      
      const cached = await redisClient.get(cacheKey);
      if (cached) {
        return JSON.parse(cached);
      }

      const products = await Product.find({ isActive: true })
        .sort({ reviewCount: -1, rating: -1 })
        .limit(limit)
        .lean() as unknown as IProduct[];

      await redisClient.setex(cacheKey, 1800, JSON.stringify(products));

      return products;
    } catch (error) {
      logger.error('Failed to get popular products:', error);
      throw error;
    }
  }

  async getCategories(): Promise<string[]> {
    try {
      const cacheKey = 'products:categories';
      
      const cached = await redisClient.get(cacheKey);
      if (cached) {
        return JSON.parse(cached);
      }

      const categories = await Product.distinct('category', { isActive: true });

      await redisClient.setex(cacheKey, 3600, JSON.stringify(categories));

      return categories;
    } catch (error) {
      logger.error('Failed to get categories:', error);
      throw error;
    }
  }

  async getBrands(): Promise<string[]> {
    try {
      const cacheKey = 'products:brands';
      
      const cached = await redisClient.get(cacheKey);
      if (cached) {
        return JSON.parse(cached);
      }

      const brands = await Product.distinct('brand', { isActive: true });

      await redisClient.setex(cacheKey, 3600, JSON.stringify(brands));

      return brands;
    } catch (error) {
      logger.error('Failed to get brands:', error);
      throw error;
    }
  }
}

export const productQueryService = new ProductQueryService();
