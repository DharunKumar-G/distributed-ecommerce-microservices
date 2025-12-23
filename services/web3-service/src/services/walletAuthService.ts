import { ethers } from 'ethers';
import { v4 as uuidv4 } from 'uuid';
import { Wallet } from '../models';
import { web3Provider } from './web3Provider';
import { logger } from './logger';

export class WalletAuthService {
  
  /**
   * Generate a nonce for wallet authentication
   */
  generateNonce(): string {
    return uuidv4();
  }

  /**
   * Create authentication message
   */
  createAuthMessage(walletAddress: string, nonce: string): string {
    return `Welcome to E-commerce Platform!\n\nSign this message to authenticate your wallet.\n\nWallet: ${walletAddress}\nNonce: ${nonce}\nTimestamp: ${new Date().toISOString()}`;
  }

  /**
   * Request nonce for wallet authentication
   */
  async requestNonce(walletAddress: string): Promise<{ nonce: string; message: string }> {
    try {
      const address = walletAddress.toLowerCase();
      
      if (!web3Provider.isValidAddress(address)) {
        throw new Error('Invalid wallet address');
      }

      const nonce = this.generateNonce();
      const message = this.createAuthMessage(address, nonce);

      // Store or update nonce in database
      await Wallet.findOneAndUpdate(
        { walletAddress: address },
        { 
          walletAddress: address,
          nonce,
          lastUsed: new Date()
        },
        { upsert: true, new: true }
      );

      return { nonce, message };
    } catch (error) {
      logger.error('Failed to request nonce:', error);
      throw error;
    }
  }

  /**
   * Verify wallet signature and authenticate
   */
  async verifyAndAuthenticate(
    walletAddress: string,
    signature: string,
    message: string
  ): Promise<{ wallet: any; token: string }> {
    try {
      const address = walletAddress.toLowerCase();

      // Verify the signature
      const recoveredAddress = await web3Provider.verifyMessage(message, signature);
      
      if (recoveredAddress !== address) {
        throw new Error('Signature verification failed');
      }

      // Get wallet from database
      const wallet = await Wallet.findOne({ walletAddress: address });
      
      if (!wallet) {
        throw new Error('Wallet not found. Please request a nonce first.');
      }

      // Verify message contains the stored nonce
      if (!message.includes(wallet.nonce)) {
        throw new Error('Invalid nonce in message');
      }

      // Update wallet verification status
      wallet.isVerified = true;
      wallet.lastUsed = new Date();
      await wallet.save();

      // Generate JWT token (will integrate with user-service)
      const token = this.generateToken(wallet);

      logger.info(`Wallet authenticated: ${address}`);

      return { wallet, token };
    } catch (error) {
      logger.error('Failed to verify and authenticate:', error);
      throw error;
    }
  }

  /**
   * Link wallet to user account
   */
  async linkWalletToUser(
    walletAddress: string,
    userId: string,
    chainId: number = 137
  ): Promise<any> {
    try {
      const address = walletAddress.toLowerCase();

      if (!web3Provider.isValidAddress(address)) {
        throw new Error('Invalid wallet address');
      }

      // Check if wallet is already linked
      const existing = await Wallet.findOne({ walletAddress: address });
      
      if (existing && existing.userId && existing.userId !== userId) {
        throw new Error('Wallet is already linked to another account');
      }

      const wallet = await Wallet.findOneAndUpdate(
        { walletAddress: address },
        {
          walletAddress: address,
          userId,
          chainId,
          isVerified: true,
          linkedAt: new Date(),
          nonce: this.generateNonce()
        },
        { upsert: true, new: true }
      );

      logger.info(`Wallet ${address} linked to user ${userId}`);

      return wallet;
    } catch (error) {
      logger.error('Failed to link wallet:', error);
      throw error;
    }
  }

  /**
   * Get user's linked wallets
   */
  async getUserWallets(userId: string): Promise<any[]> {
    try {
      const wallets = await Wallet.find({ userId }).sort({ linkedAt: -1 });
      return wallets;
    } catch (error) {
      logger.error('Failed to get user wallets:', error);
      throw error;
    }
  }

  /**
   * Unlink wallet from user
   */
  async unlinkWallet(walletAddress: string, userId: string): Promise<void> {
    try {
      const address = walletAddress.toLowerCase();
      
      const wallet = await Wallet.findOne({ walletAddress: address, userId });
      
      if (!wallet) {
        throw new Error('Wallet not found or not linked to this user');
      }

      await wallet.deleteOne();
      
      logger.info(`Wallet ${address} unlinked from user ${userId}`);
    } catch (error) {
      logger.error('Failed to unlink wallet:', error);
      throw error;
    }
  }

  /**
   * Get wallet balance
   */
  async getWalletBalance(walletAddress: string, chainId: number = 137): Promise<any> {
    try {
      const address = walletAddress.toLowerCase();
      const balance = await web3Provider.getBalance(address, chainId);
      
      return {
        address,
        balance,
        chainId,
        chainName: web3Provider.getChainName(chainId)
      };
    } catch (error) {
      logger.error('Failed to get wallet balance:', error);
      throw error;
    }
  }

  /**
   * Generate JWT token (placeholder - will integrate with user-service)
   */
  private generateToken(wallet: any): string {
    // In production, this should use the same JWT secret as user-service
    // For now, return a simple token
    return Buffer.from(JSON.stringify({
      walletAddress: wallet.walletAddress,
      userId: wallet.userId,
      timestamp: Date.now()
    })).toString('base64');
  }
}

export const walletAuthService = new WalletAuthService();
