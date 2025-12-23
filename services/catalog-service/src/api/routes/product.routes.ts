import { Router, Request, Response } from 'express';
import { productCommandService } from '../../application/services/ProductCommandService';
import { productQueryService } from '../../application/services/ProductQueryService';
import { logger } from '../../infrastructure/monitoring/logger';
import { productMetrics } from '../../infrastructure/monitoring/metrics';

export const productRouter = Router();

// Create product (Command)
productRouter.post('/', async (req: Request, res: Response) => {
  try {
    const product = await productCommandService.createProduct(req.body);
    res.status(201).json(product);
  } catch (error) {
    logger.error('Failed to create product:', error);
    res.status(500).json({ error: 'Failed to create product' });
  }
});

// Update product (Command)
productRouter.put('/:productId', async (req: Request, res: Response) => {
  try {
    const product = await productCommandService.updateProduct(req.params.productId, req.body);
    if (!product) {
      return res.status(404).json({ error: 'Product not found' });
    }
    res.json(product);
  } catch (error) {
    logger.error('Failed to update product:', error);
    res.status(500).json({ error: 'Failed to update product' });
  }
});

// Delete product (Command)
productRouter.delete('/:productId', async (req: Request, res: Response) => {
  try {
    const deleted = await productCommandService.deleteProduct(req.params.productId);
    if (!deleted) {
      return res.status(404).json({ error: 'Product not found' });
    }
    res.status(204).send();
  } catch (error) {
    logger.error('Failed to delete product:', error);
    res.status(500).json({ error: 'Failed to delete product' });
  }
});

// Get product by ID (Query)
productRouter.get('/:productId', async (req: Request, res: Response) => {
  try {
    productMetrics.productQueries.inc({ type: 'by_id' });
    const product = await productQueryService.getProductById(req.params.productId);
    if (!product) {
      return res.status(404).json({ error: 'Product not found' });
    }
    res.json(product);
  } catch (error) {
    logger.error('Failed to get product:', error);
    res.status(500).json({ error: 'Failed to get product' });
  }
});

// List products (Query)
productRouter.get('/', async (req: Request, res: Response) => {
  try {
    productMetrics.productQueries.inc({ type: 'list' });
    const { category, brand, minPrice, maxPrice, page = 1, limit = 20 } = req.query;
    
    const filters: any = {};
    if (category) filters.category = category;
    if (brand) filters.brand = brand;
    if (minPrice) filters.minPrice = minPrice;
    if (maxPrice) filters.maxPrice = maxPrice;

    const result = await productQueryService.listProducts(
      filters,
      parseInt(page as string),
      parseInt(limit as string)
    );
    
    res.json(result);
  } catch (error) {
    logger.error('Failed to list products:', error);
    res.status(500).json({ error: 'Failed to list products' });
  }
});

// Search products (Query)
productRouter.get('/search/:query', async (req: Request, res: Response) => {
  try {
    productMetrics.searchQueries.inc();
    const { query } = req.params;
    const { category, brand, minPrice, maxPrice, page = 1, limit = 20 } = req.query;
    
    const filters: any = {};
    if (category) filters.category = category;
    if (brand) filters.brand = brand;
    if (minPrice) filters.minPrice = minPrice;
    if (maxPrice) filters.maxPrice = maxPrice;

    const startTime = Date.now();
    const result = await productQueryService.searchProducts(
      query,
      filters,
      parseInt(page as string),
      parseInt(limit as string)
    );
    productMetrics.searchDuration.observe((Date.now() - startTime) / 1000);
    
    res.json(result);
  } catch (error) {
    logger.error('Failed to search products:', error);
    res.status(500).json({ error: 'Failed to search products' });
  }
});

// Get featured products (Query)
productRouter.get('/featured/list', async (req: Request, res: Response) => {
  try {
    const { limit = 10 } = req.query;
    const products = await productQueryService.getFeaturedProducts(parseInt(limit as string));
    res.json({ products });
  } catch (error) {
    logger.error('Failed to get featured products:', error);
    res.status(500).json({ error: 'Failed to get featured products' });
  }
});

// Get popular products (Query)
productRouter.get('/popular/list', async (req: Request, res: Response) => {
  try {
    const { limit = 10 } = req.query;
    const products = await productQueryService.getPopularProducts(parseInt(limit as string));
    res.json({ products });
  } catch (error) {
    logger.error('Failed to get popular products:', error);
    res.status(500).json({ error: 'Failed to get popular products' });
  }
});

// Get categories (Query)
productRouter.get('/meta/categories', async (req: Request, res: Response) => {
  try {
    const categories = await productQueryService.getCategories();
    res.json({ categories });
  } catch (error) {
    logger.error('Failed to get categories:', error);
    res.status(500).json({ error: 'Failed to get categories' });
  }
});

// Get brands (Query)
productRouter.get('/meta/brands', async (req: Request, res: Response) => {
  try {
    const brands = await productQueryService.getBrands();
    res.json({ brands });
  } catch (error) {
    logger.error('Failed to get brands:', error);
    res.status(500).json({ error: 'Failed to get brands' });
  }
});
