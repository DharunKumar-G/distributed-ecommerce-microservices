import mongoose, { Schema, Document } from 'mongoose';

// Web3 Wallet Schema
export interface IWallet extends Document {
  walletAddress: string;
  userId: string;
  chainId: number;
  isVerified: boolean;
  nonce: string;
  linkedAt: Date;
  lastUsed: Date;
}

const WalletSchema = new Schema({
  walletAddress: { type: String, required: true, unique: true, lowercase: true, index: true },
  userId: { type: String, required: true, index: true },
  chainId: { type: Number, required: true },
  isVerified: { type: Boolean, default: false },
  nonce: { type: String, required: true },
  linkedAt: { type: Date, default: Date.now },
  lastUsed: { type: Date, default: Date.now }
}, {
  timestamps: true,
  collection: 'wallets'
});

export const Wallet = mongoose.model<IWallet>('Wallet', WalletSchema);

// NFT Certificate Schema
export interface INFTCertificate extends Document {
  orderId: string;
  userId: string;
  productId: string;
  tokenId: string;
  certificateId: string;
  metadata: {
    name: string;
    description: string;
    image: string;
    attributes: any[];
    external_url?: string;
  };
  contractAddress?: string;
  ownerAddress?: string;
  mintedOnChain: boolean;
  mintTxHash?: string;
  status: 'minted' | 'transferred' | 'burned';
  claimedAt?: Date;
  createdAt?: Date;
  updatedAt?: Date;
}

const NFTCertificateSchema = new Schema({
  orderId: { type: String, required: true, index: true },
  userId: { type: String, required: true, index: true },
  productId: { type: String, required: true },
  tokenId: { type: String, required: true, index: true },
  certificateId: { type: String, required: true, unique: true, index: true },
  metadata: {
    name: { type: String, required: true },
    description: { type: String },
    image: { type: String },
    attributes: [{ trait_type: String, value: Schema.Types.Mixed }],
    external_url: { type: String }
  },
  contractAddress: { type: String, lowercase: true },
  ownerAddress: { type: String, lowercase: true },
  mintedOnChain: { type: Boolean, default: false },
  mintTxHash: { type: String },
  status: { 
    type: String, 
    enum: ['minted', 'transferred', 'burned'],
    default: 'minted'
  },
  claimedAt: { type: Date }
}, {
  timestamps: true,
  collection: 'nft_certificates'
});

export const NFTCertificate = mongoose.model<INFTCertificate>('NFTCertificate', NFTCertificateSchema);

// Crypto Payment Schema
export interface ICryptoPayment extends Document {
  orderId: string;
  paymentId: string;
  amount: number;
  currency: string;
  cryptoAmount: string;
  cryptoCurrency: string;
  walletAddress: string;
  status: 'pending' | 'confirmed' | 'failed' | 'expired';
  txHash?: string;
  confirmations: number;
  requiredConfirmations: number;
  chainId: number;
  expiresAt: Date;
  confirmedAt?: Date;
  createdAt?: Date;
  updatedAt?: Date;
}

const CryptoPaymentSchema = new Schema({
  orderId: { type: String, required: true, index: true },
  paymentId: { type: String, required: true, unique: true },
  amount: { type: Number, required: true },
  currency: { type: String, required: true },
  cryptoAmount: { type: String, required: true },
  cryptoCurrency: { type: String, required: true },
  walletAddress: { type: String, required: true, lowercase: true },
  status: { 
    type: String, 
    enum: ['pending', 'confirmed', 'failed', 'expired'],
    default: 'pending',
    index: true
  },
  txHash: { type: String },
  confirmations: { type: Number, default: 0 },
  requiredConfirmations: { type: Number, default: 3 },
  chainId: { type: Number, required: true },
  expiresAt: { type: Date, required: true },
  confirmedAt: { type: Date }
}, {
  timestamps: true,
  collection: 'crypto_payments'
});

export const CryptoPayment = mongoose.model<ICryptoPayment>('CryptoPayment', CryptoPaymentSchema);

// Token Rewards Schema
export interface ITokenReward extends Document {
  userId: string;
  tokenAddress: string;
  balance: string;
  earned: string;
  spent: string;
  chainId: number;
  transactions: {
    type: 'earn' | 'spend' | 'transfer';
    amount: string;
    reason: string;
    txHash?: string;
    timestamp: Date;
  }[];
}

const TokenRewardSchema = new Schema({
  userId: { type: String, required: true, unique: true, index: true },
  tokenAddress: { type: String, required: true, lowercase: true },
  balance: { type: String, default: '0' },
  earned: { type: String, default: '0' },
  spent: { type: String, default: '0' },
  chainId: { type: Number, required: true },
  transactions: [{
    type: { type: String, enum: ['earn', 'spend', 'transfer'], required: true },
    amount: { type: String, required: true },
    reason: { type: String, required: true },
    txHash: String,
    timestamp: { type: Date, default: Date.now }
  }]
}, {
  timestamps: true,
  collection: 'token_rewards'
});

export const TokenReward = mongoose.model<ITokenReward>('TokenReward', TokenRewardSchema);

// Blockchain Audit Log Schema
export interface IAuditLog extends Document {
  eventType: string;
  entityId: string;
  entityType: string;
  action: string;
  performedBy: string;
  txHash: string;
  chainId: number;
  blockNumber: number;
  timestamp: Date;
  data: any;
}

const AuditLogSchema = new Schema({
  eventType: { type: String, required: true, index: true },
  entityId: { type: String, required: true, index: true },
  entityType: { type: String, required: true },
  action: { type: String, required: true },
  performedBy: { type: String, required: true },
  txHash: { type: String, required: true, unique: true },
  chainId: { type: Number, required: true },
  blockNumber: { type: Number, required: true },
  timestamp: { type: Date, default: Date.now, index: true },
  data: Schema.Types.Mixed
}, {
  timestamps: true,
  collection: 'audit_logs'
});

export const AuditLog = mongoose.model<IAuditLog>('AuditLog', AuditLogSchema);
