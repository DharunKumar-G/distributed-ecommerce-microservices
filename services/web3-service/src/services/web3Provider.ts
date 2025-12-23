import { ethers } from 'ethers';
import { logger } from './logger';

export class Web3Provider {
  private providers: Map<number, ethers.JsonRpcProvider> = new Map();
  private signers: Map<number, ethers.Wallet> = new Map();

  constructor() {
    this.initializeProviders();
  }

  private initializeProviders() {
    // Polygon Mumbai Testnet (for development)
    this.addProvider(80001, process.env.POLYGON_MUMBAI_RPC || 'https://rpc-mumbai.maticvigil.com');
    
    // Polygon Mainnet
    this.addProvider(137, process.env.POLYGON_RPC || 'https://polygon-rpc.com');
    
    // Ethereum Mainnet
    this.addProvider(1, process.env.ETH_RPC || 'https://eth.llamarpc.com');
    
    // Base (Coinbase L2)
    this.addProvider(8453, process.env.BASE_RPC || 'https://mainnet.base.org');

    // Initialize signers if private key is provided
    const privateKey = process.env.WEB3_PRIVATE_KEY;
    if (privateKey) {
      this.providers.forEach((provider, chainId) => {
        const wallet = new ethers.Wallet(privateKey, provider);
        this.signers.set(chainId, wallet);
      });
      logger.info('Web3 signers initialized for all chains');
    }
  }

  private addProvider(chainId: number, rpcUrl: string) {
    try {
      const provider = new ethers.JsonRpcProvider(rpcUrl);
      this.providers.set(chainId, provider);
      logger.info(`Initialized provider for chain ${chainId}`);
    } catch (error) {
      logger.error(`Failed to initialize provider for chain ${chainId}:`, error);
    }
  }

  getProvider(chainId: number = 137): ethers.JsonRpcProvider {
    const provider = this.providers.get(chainId);
    if (!provider) {
      throw new Error(`No provider configured for chain ${chainId}`);
    }
    return provider;
  }

  getSigner(chainId: number = 137): ethers.Wallet {
    const signer = this.signers.get(chainId);
    if (!signer) {
      throw new Error(`No signer configured for chain ${chainId}`);
    }
    return signer;
  }

  async getBalance(address: string, chainId: number = 137): Promise<string> {
    const provider = this.getProvider(chainId);
    const balance = await provider.getBalance(address);
    return ethers.formatEther(balance);
  }

  async getGasPrice(chainId: number = 137): Promise<string> {
    const provider = this.getProvider(chainId);
    const feeData = await provider.getFeeData();
    return ethers.formatUnits(feeData.gasPrice || 0n, 'gwei');
  }

  async waitForTransaction(txHash: string, chainId: number = 137, confirmations: number = 1): Promise<any> {
    const provider = this.getProvider(chainId);
    const receipt = await provider.waitForTransaction(txHash, confirmations);
    return receipt;
  }

  async verifyMessage(message: string, signature: string): Promise<string> {
    try {
      const address = ethers.verifyMessage(message, signature);
      return address.toLowerCase();
    } catch (error) {
      logger.error('Failed to verify message:', error);
      throw new Error('Invalid signature');
    }
  }

  isValidAddress(address: string): boolean {
    return ethers.isAddress(address);
  }

  async getBlockNumber(chainId: number = 137): Promise<number> {
    const provider = this.getProvider(chainId);
    return await provider.getBlockNumber();
  }

  async getTransaction(txHash: string, chainId: number = 137): Promise<any> {
    const provider = this.getProvider(chainId);
    return await provider.getTransaction(txHash);
  }

  async getTransactionReceipt(txHash: string, chainId: number = 137): Promise<any> {
    const provider = this.getProvider(chainId);
    return await provider.getTransactionReceipt(txHash);
  }

  getAllSupportedChains(): number[] {
    return Array.from(this.providers.keys());
  }

  getChainName(chainId: number): string {
    const names: Record<number, string> = {
      1: 'Ethereum',
      137: 'Polygon',
      80001: 'Polygon Mumbai',
      8453: 'Base'
    };
    return names[chainId] || `Chain ${chainId}`;
  }
}

export const web3Provider = new Web3Provider();
