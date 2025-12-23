import { Router, Request, Response } from 'express';
import { cryptoPaymentService } from '../services/cryptoPaymentService';
import { logger } from '../services/logger';

const router = Router();

/**
 * POST /api/web3/payment/create
 * Create a new crypto payment request
 */
router.post('/create', async (req: Request, res: Response) => {
  try {
    const { orderId, amount, currency, cryptoCurrency, chainId } = req.body;

    if (!orderId || !amount) {
      return res.status(400).json({ error: 'orderId and amount are required' });
    }

    const payment = await cryptoPaymentService.createPayment(
      orderId,
      parseFloat(amount),
      currency || 'USD',
      cryptoCurrency || 'MATIC',
      chainId || 137
    );

    res.json(payment);
  } catch (error: any) {
    logger.error('Create payment error:', error);
    res.status(500).json({ error: error.message || 'Failed to create payment' });
  }
});

/**
 * POST /api/web3/payment/verify
 * Verify a crypto payment transaction
 */
router.post('/verify', async (req: Request, res: Response) => {
  try {
    const { paymentId, txHash } = req.body;

    if (!paymentId || !txHash) {
      return res.status(400).json({ error: 'paymentId and txHash are required' });
    }

    const result = await cryptoPaymentService.verifyPayment(paymentId, txHash);
    res.json(result);
  } catch (error: any) {
    logger.error('Verify payment error:', error);
    res.status(400).json({ error: error.message || 'Failed to verify payment' });
  }
});

/**
 * GET /api/web3/payment/prices/current
 * Get current crypto prices
 */
router.get('/prices/current', async (req: Request, res: Response) => {
  try {
    const cryptos = ['ETH', 'MATIC', 'USDC', 'USDT', 'BTC'];
    const prices: Record<string, number> = {};

    for (const crypto of cryptos) {
      prices[crypto] = await cryptoPaymentService.getCryptoPrice(crypto);
    }

    res.json({
      prices,
      timestamp: new Date().toISOString(),
      source: 'CoinGecko'
    });
  } catch (error: any) {
    logger.error('Get prices error:', error);
    res.status(500).json({ error: 'Failed to fetch prices' });
  }
});

/**
 * POST /api/web3/payment/calculate
 * Calculate crypto amount from USD
 */
router.post('/calculate', async (req: Request, res: Response) => {
  try {
    const { amount, cryptoCurrency } = req.body;

    if (!amount || !cryptoCurrency) {
      return res.status(400).json({ error: 'amount and cryptoCurrency are required' });
    }

    const cryptoAmount = await cryptoPaymentService.calculateCryptoAmount(
      parseFloat(amount),
      cryptoCurrency
    );

    const price = await cryptoPaymentService.getCryptoPrice(cryptoCurrency);

    res.json({
      usdAmount: parseFloat(amount),
      cryptoAmount,
      cryptoCurrency,
      price,
      timestamp: new Date().toISOString()
    });
  } catch (error: any) {
    logger.error('Calculate amount error:', error);
    res.status(500).json({ error: error.message || 'Failed to calculate amount' });
  }
});

/**
 * GET /api/web3/payment/supported
 * Get supported cryptocurrencies
 */
router.get('/supported', async (req: Request, res: Response) => {
  try {
    const cryptos = cryptoPaymentService.getSupportedCryptos();
    res.json({ cryptos });
  } catch (error: any) {
    logger.error('Get supported cryptos error:', error);
    res.status(500).json({ error: 'Failed to get supported cryptocurrencies' });
  }
});

/**
 * GET /api/web3/payment/gas/:chainId
 * Estimate gas cost for a chain
 */
router.get('/gas/:chainId', async (req: Request, res: Response) => {
  try {
    const chainId = parseInt(req.params.chainId);
    const gasCost = await cryptoPaymentService.estimateGasCost(chainId);
    res.json(gasCost);
  } catch (error: any) {
    logger.error('Estimate gas error:', error);
    res.status(500).json({ error: 'Failed to estimate gas cost' });
  }
});

/**
 * GET /api/web3/payment/order/:orderId
 * Get all payments for an order
 */
router.get('/order/:orderId', async (req: Request, res: Response) => {
  try {
    const { orderId } = req.params;
    const payments = await cryptoPaymentService.getOrderPayments(orderId);
    res.json({ payments, count: payments.length });
  } catch (error: any) {
    logger.error('Get order payments error:', error);
    res.status(500).json({ error: error.message || 'Failed to get payments' });
  }
});

/**
 * GET /api/web3/payment/:paymentId
 * Get payment status (MUST BE LAST - catch-all route)
 */
router.get('/:paymentId', async (req: Request, res: Response) => {
  try {
    const { paymentId } = req.params;
    const payment = await cryptoPaymentService.getPaymentStatus(paymentId);
    res.json(payment);
  } catch (error: any) {
    logger.error('Get payment status error:', error);
    res.status(404).json({ error: error.message || 'Payment not found' });
  }
});

export default router;
