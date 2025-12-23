import { register, Counter, Histogram, Gauge } from 'prom-client';

export let productMetrics: {
  productsCreated: Counter;
  productsUpdated: Counter;
  productsDeleted: Counter;
  productQueries: Counter;
  searchQueries: Counter;
  cacheHits: Counter;
  cacheMisses: Counter;
  queryDuration: Histogram;
  searchDuration: Histogram;
  activeProducts: Gauge;
};

export function initMetrics(): void {
  productMetrics = {
    productsCreated: new Counter({
      name: 'products_created_total',
      help: 'Total number of products created'
    }),

    productsUpdated: new Counter({
      name: 'products_updated_total',
      help: 'Total number of products updated'
    }),

    productsDeleted: new Counter({
      name: 'products_deleted_total',
      help: 'Total number of products deleted'
    }),

    productQueries: new Counter({
      name: 'product_queries_total',
      help: 'Total number of product queries',
      labelNames: ['type']
    }),

    searchQueries: new Counter({
      name: 'search_queries_total',
      help: 'Total number of search queries'
    }),

    cacheHits: new Counter({
      name: 'cache_hits_total',
      help: 'Total number of cache hits'
    }),

    cacheMisses: new Counter({
      name: 'cache_misses_total',
      help: 'Total number of cache misses'
    }),

    queryDuration: new Histogram({
      name: 'query_duration_seconds',
      help: 'Duration of database queries',
      buckets: [0.001, 0.005, 0.01, 0.05, 0.1, 0.5, 1, 2, 5]
    }),

    searchDuration: new Histogram({
      name: 'search_duration_seconds',
      help: 'Duration of search queries',
      buckets: [0.01, 0.05, 0.1, 0.5, 1, 2, 5]
    }),

    activeProducts: new Gauge({
      name: 'active_products',
      help: 'Number of active products'
    })
  };
}

export function getMetricsRegistry() {
  return register;
}
