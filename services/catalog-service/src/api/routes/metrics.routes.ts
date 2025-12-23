import { Router, Request, Response } from 'express';
import { getMetricsRegistry } from '../../infrastructure/monitoring/metrics';

export const metricsRouter = Router();

metricsRouter.get('/', async (req: Request, res: Response) => {
  try {
    res.set('Content-Type', getMetricsRegistry().contentType);
    res.end(await getMetricsRegistry().metrics());
  } catch (error) {
    res.status(500).json({ error: 'Failed to get metrics' });
  }
});
