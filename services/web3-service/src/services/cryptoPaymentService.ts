import { ethers } from 'ethers';
import { v4 as uuidv4 } from 'uuid';
import axios from 'axios';
import { CryptoPayment } from '../models';
import { web3Provider } from './web3Provider';
import { logger } from './logger';

export class CryptoPaymentService {
  private priceCache: Map<string, { price: number; timestamp: number }> = new Map();
  private readonly CACHE_TTL = 60000; // 1 minute

  /**
   * Get crypto price in USD
   */
  async getCryptoPrice(cryptoCurrency: string): Promise<number> {
    const cacheKey = cryptoCurrency.toUpperCase();
    const cached = this.priceCache.get(cacheKey);
    
    if (cached && Date.now() - cached.timestamp < this.CACHE_TTL) {
      return cached.price;
    }

    try {
      // Use CoinGecko API (free, no API key needed)
      const coinMap: Record<string, string> = {
        'ETH': 'ethereum',
        'MATIC': 'matic-network',
        'USDC': 'usd-coin',
        'USDT': 'tether',
        'BTC': 'bitcoin'
      };

      const coinId = coinMap[cacheKey] || cacheKey.toLowerCase();
      const response = await axios.get(
        `https://api.coingecko.com/api/v3/simple/price?ids=${coinId}&vs_currencies=usd`
      );

      const price = response.data[coinId]?.usd || 0;
      
      if (price > 0) {
        this.priceCache.set(cacheKey, { price, timestamp: Date.now() });
      }

      return price;
    } catch (error: any) {
      // Check if it's a rate limit error (429)
      if (error.response?.status === 429) {
        logger.warn(`CoinGecko rate limit hit for ${cacheKey}, using fallback price`);
      } else {
        logger.error(`Failed to fetch crypto price for ${cacheKey}:`, {
          message: error.message,
          status: error.response?.status
        });
      }
      
      // Fallback prices (approximate) - for demo purposes
      const fallbackPrices: Record<string, number> = {
        'ETH': 2000,
        'MATIC': 0.8,
        'USDC': 1,
        'USDT': 1,
        'BTC': 40000
      };
      
      const fallbackPrice = fallbackPrices[cacheKey] || 0;
      
      // Cache fallback price to avoid repeated API calls
      if (fallbackPrice > 0) {
        this.priceCache.set(cacheKey, { price: fallbackPrice, timestamp: Date.now() });
      }
      
      return fallbackPrice;
    }
  }

  /**
   * Calculate crypto amount from USD
   */
  async calculateCryptoAmount(usdAmount: number, cryptoCurrency: string): Promise<string> {
    const price = await this.getCryptoPrice(cryptoCurrency);
    
    if (price === 0) {
      throw new Error(`Unable to get price for ${cryptoCurrency}`);
    }

    const cryptoAmount = usdAmount / price;
    return cryptoAmount.toFixed(8); // 8 decimal places for crypto
  }

  /**
   * Create a crypto payment request
   */
  async createPayment(
    orderId: string,
    amount: number,
    currency: string = 'USD',
    cryptoCurrency: string = 'MATIC',
    chainId: number = 137
  ): Promise<any> {
    try {
      const paymentId = uuidv4();
      
      // Calculate crypto amount
      const cryptoAmount = await this.calculateCryptoAmount(amount, cryptoCurrency);

      // Generate payment wallet address
      // In production, use a dedicated hot wallet or payment processor
      // For development, create a random wallet (YOU SHOULD NEVER DO THIS IN PRODUCTION!)
      let walletAddress: string;
      try {
        const signer = web3Provider.getSigner(chainId);
        walletAddress = await signer.getAddress();
      } catch (error) {
        // If no signer configured, create a temporary wallet for demo purposes
        logger.warn('No payment wallet configured, creating temporary wallet (DEV ONLY)');
        const tempWallet = ethers.Wallet.createRandom();
        walletAddress = tempWallet.address;
      }

      // Set expiration (30 minutes)
      const expiresAt = new Date(Date.now() + 30 * 60 * 1000);

      // Create payment record
      const payment = await CryptoPayment.create({
        orderId,
        paymentId,
        amount,
        currency,
        cryptoAmount,
        cryptoCurrency,
        walletAddress,
        status: 'pending',
        confirmations: 0,
        requiredConfirmations: cryptoCurrency === 'BTC' ? 6 : 3,
        chainId,
        expiresAt
      });

      logger.info(`Crypto payment created: ${paymentId} for order ${orderId}`);

      return {
        paymentId,
        orderId,
        amount,
        currency,
        cryptoAmount,
        cryptoCurrency,
        walletAddress,
        chainId,
        chainName: web3Provider.getChainName(chainId),
        expiresAt,
        status: 'pending',
        qrCode: this.generatePaymentQR(walletAddress, cryptoAmount, cryptoCurrency)
      };
    } catch (error) {
      logger.error('Failed to create crypto payment:', error);
      throw error;
    }
  }

  /**
   * Verify payment transaction
   */
  async verifyPayment(paymentId: string, txHash: string): Promise<any> {
    try {
      const payment = await CryptoPayment.findOne({ paymentId });
      
      if (!payment) {
        throw new Error('Payment not found');
      }

      if (payment.status === 'confirmed') {
        return { status: 'confirmed', message: 'Payment already confirmed' };
      }

      if (new Date() > payment.expiresAt) {
        payment.status = 'expired';
        await payment.save();
        throw new Error('Payment expired');
      }

      // Get transaction receipt
      const receipt = await web3Provider.getTransactionReceipt(txHash, payment.chainId);
      
      if (!receipt) {
        throw new Error('Transaction not found');
      }

      // Verify transaction details
      const tx = await web3Provider.getTransaction(txHash, payment.chainId);
      
      if (!tx) {
        throw new Error('Transaction not found');
      }

      // Check if transaction is to the correct address
      if (tx.to?.toLowerCase() !== payment.walletAddress.toLowerCase()) {
        throw new Error('Transaction to wrong address');
      }

      // Check amount (allow 1% tolerance for gas/rounding)
      const receivedAmount = parseFloat(ethers.formatEther(tx.value));
      const expectedAmount = parseFloat(payment.cryptoAmount);
      const tolerance = expectedAmount * 0.01;

      if (Math.abs(receivedAmount - expectedAmount) > tolerance) {
        throw new Error(`Amount mismatch. Expected: ${expectedAmount}, Received: ${receivedAmount}`);
      }

      // Update payment
      payment.txHash = txHash;
      payment.confirmations = receipt.confirmations || 0;
      
      if (payment.confirmations >= payment.requiredConfirmations) {
        payment.status = 'confirmed';
        payment.confirmedAt = new Date();
      }
      
      await payment.save();

      logger.info(`Payment ${paymentId} verified. Confirmations: ${payment.confirmations}`);

      return {
        paymentId,
        status: payment.status,
        txHash,
        confirmations: payment.confirmations,
        requiredConfirmations: payment.requiredConfirmations,
        confirmed: payment.status === 'confirmed'
      };
    } catch (error) {
      logger.error('Failed to verify payment:', error);
      throw error;
    }
  }

  /**
   * Check payment status
   */
  async getPaymentStatus(paymentId: string): Promise<any> {
    try {
      const payment = await CryptoPayment.findOne({ paymentId });
      
      if (!payment) {
        throw new Error('Payment not found');
      }

      // If payment has txHash, check confirmations
      if (payment.txHash && payment.status === 'pending') {
        const receipt = await web3Provider.getTransactionReceipt(payment.txHash, payment.chainId);
        
        if (receipt) {
          payment.confirmations = receipt.confirmations || 0;
          
          if (payment.confirmations >= payment.requiredConfirmations) {
            payment.status = 'confirmed';
            payment.confirmedAt = new Date();
          }
          
          await payment.save();
        }
      }

      // Check expiration
      if (payment.status === 'pending' && new Date() > payment.expiresAt) {
        payment.status = 'expired';
        await payment.save();
      }

      return {
        paymentId: payment.paymentId,
        orderId: payment.orderId,
        status: payment.status,
        amount: payment.amount,
        currency: payment.currency,
        cryptoAmount: payment.cryptoAmount,
        cryptoCurrency: payment.cryptoCurrency,
        walletAddress: payment.walletAddress,
        txHash: payment.txHash,
        confirmations: payment.confirmations,
        requiredConfirmations: payment.requiredConfirmations,
        expiresAt: payment.expiresAt,
        confirmedAt: payment.confirmedAt,
        chainId: payment.chainId,
        chainName: web3Provider.getChainName(payment.chainId)
      };
    } catch (error) {
      logger.error('Failed to get payment status:', error);
      throw error;
    }
  }

  /**
   * Get all payments for an order
   */
  async getOrderPayments(orderId: string): Promise<any[]> {
    try {
      const payments = await CryptoPayment.find({ orderId }).sort({ createdAt: -1 });
      
      return payments.map(p => ({
        paymentId: p.paymentId,
        status: p.status,
        amount: p.amount,
        cryptoAmount: p.cryptoAmount,
        cryptoCurrency: p.cryptoCurrency,
        txHash: p.txHash,
        confirmations: p.confirmations,
        createdAt: p.createdAt,
        confirmedAt: p.confirmedAt
      }));
    } catch (error) {
      logger.error('Failed to get order payments:', error);
      throw error;
    }
  }

  /**
   * Generate payment QR code data (for wallets to scan)
   */
  private generatePaymentQR(address: string, amount: string, currency: string): string {
    // EIP-681 format for Ethereum payment requests
    const chainPrefix = currency === 'BTC' ? 'bitcoin:' : 'ethereum:';
    return `${chainPrefix}${address}?value=${amount}`;
  }

  /**
   * Get supported cryptocurrencies
   */
  getSupportedCryptos(): any[] {
    return [
      { symbol: 'ETH', name: 'Ethereum', chains: [1], icon: '⟠' },
      { symbol: 'MATIC', name: 'Polygon', chains: [137, 80001], icon: '⬡', recommended: true },
      { symbol: 'USDC', name: 'USD Coin', chains: [1, 137, 8453], icon: '$', stable: true },
      { symbol: 'USDT', name: 'Tether', chains: [1, 137], icon: '₮', stable: true }
    ];
  }

  /**
   * Estimate gas cost for transaction
   */
  async estimateGasCost(chainId: number = 137): Promise<any> {
    try {
      const gasPrice = await web3Provider.getGasPrice(chainId);
      const estimatedGas = 21000; // Standard ETH transfer
      const gasCostGwei = parseFloat(gasPrice) * estimatedGas;
      const gasCostEth = gasCostGwei / 1e9;

      // Get native token price
      const nativeToken = chainId === 137 ? 'MATIC' : 'ETH';
      const tokenPrice = await this.getCryptoPrice(nativeToken);
      const gasCostUsd = gasCostEth * tokenPrice;

      return {
        chainId,
        chainName: web3Provider.getChainName(chainId),
        gasPrice: `${gasPrice} Gwei`,
        estimatedGas,
        gasCostEth: gasCostEth.toFixed(6),
        gasCostUsd: gasCostUsd.toFixed(2),
        nativeToken
      };
    } catch (error) {
      logger.error('Failed to estimate gas cost:', error);
      throw error;
    }
  }
}

export const cryptoPaymentService = new CryptoPaymentService();
