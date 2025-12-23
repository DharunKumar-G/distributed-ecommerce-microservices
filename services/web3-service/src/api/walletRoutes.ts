import { Router, Request, Response } from 'express';
import { walletAuthService } from '../services/walletAuthService';
import { logger } from '../services/logger';

export const walletRouter = Router();

/**
 * POST /api/web3/wallet/request-nonce
 * Request a nonce for wallet authentication
 */
walletRouter.post('/request-nonce', async (req: Request, res: Response) => {
  try {
    const { walletAddress } = req.body;

    if (!walletAddress) {
      return res.status(400).json({ error: 'Wallet address is required' });
    }

    const result = await walletAuthService.requestNonce(walletAddress);
    
    res.json(result);
  } catch (error: any) {
    logger.error('Request nonce failed:', error);
    res.status(500).json({ error: error.message || 'Failed to request nonce' });
  }
});

/**
 * POST /api/web3/wallet/verify
 * Verify wallet signature and authenticate
 */
walletRouter.post('/verify', async (req: Request, res: Response) => {
  try {
    const { walletAddress, signature, message } = req.body;

    if (!walletAddress || !signature || !message) {
      return res.status(400).json({ 
        error: 'Wallet address, signature, and message are required' 
      });
    }

    const result = await walletAuthService.verifyAndAuthenticate(
      walletAddress,
      signature,
      message
    );
    
    res.json({
      success: true,
      wallet: {
        address: result.wallet.walletAddress,
        chainId: result.wallet.chainId,
        linkedAt: result.wallet.linkedAt
      },
      token: result.token
    });
  } catch (error: any) {
    logger.error('Wallet verification failed:', error);
    res.status(401).json({ error: error.message || 'Verification failed' });
  }
});

/**
 * POST /api/web3/wallet/link
 * Link wallet to user account
 */
walletRouter.post('/link', async (req: Request, res: Response) => {
  try {
    const { walletAddress, userId, chainId } = req.body;

    if (!walletAddress || !userId) {
      return res.status(400).json({ 
        error: 'Wallet address and user ID are required' 
      });
    }

    const wallet = await walletAuthService.linkWalletToUser(
      walletAddress,
      userId,
      chainId || 137
    );
    
    res.json({
      success: true,
      wallet: {
        address: wallet.walletAddress,
        userId: wallet.userId,
        chainId: wallet.chainId,
        linkedAt: wallet.linkedAt
      }
    });
  } catch (error: any) {
    logger.error('Wallet linking failed:', error);
    res.status(500).json({ error: error.message || 'Failed to link wallet' });
  }
});

/**
 * GET /api/web3/wallet/user/:userId
 * Get user's linked wallets
 */
walletRouter.get('/user/:userId', async (req: Request, res: Response) => {
  try {
    const { userId } = req.params;

    const wallets = await walletAuthService.getUserWallets(userId);
    
    res.json({
      wallets: wallets.map(w => ({
        address: w.walletAddress,
        chainId: w.chainId,
        isVerified: w.isVerified,
        linkedAt: w.linkedAt,
        lastUsed: w.lastUsed
      }))
    });
  } catch (error: any) {
    logger.error('Failed to get user wallets:', error);
    res.status(500).json({ error: error.message || 'Failed to get wallets' });
  }
});

/**
 * DELETE /api/web3/wallet/unlink
 * Unlink wallet from user
 */
walletRouter.delete('/unlink', async (req: Request, res: Response) => {
  try {
    const { walletAddress, userId } = req.body;

    if (!walletAddress || !userId) {
      return res.status(400).json({ 
        error: 'Wallet address and user ID are required' 
      });
    }

    await walletAuthService.unlinkWallet(walletAddress, userId);
    
    res.json({ success: true, message: 'Wallet unlinked successfully' });
  } catch (error: any) {
    logger.error('Wallet unlinking failed:', error);
    res.status(500).json({ error: error.message || 'Failed to unlink wallet' });
  }
});

/**
 * GET /api/web3/wallet/balance/:walletAddress
 * Get wallet balance
 */
walletRouter.get('/balance/:walletAddress', async (req: Request, res: Response) => {
  try {
    const { walletAddress } = req.params;
    const chainId = req.query.chainId ? parseInt(req.query.chainId as string) : 137;

    const balance = await walletAuthService.getWalletBalance(walletAddress, chainId);
    
    res.json(balance);
  } catch (error: any) {
    logger.error('Failed to get wallet balance:', error);
    res.status(500).json({ error: error.message || 'Failed to get balance' });
  }
});
