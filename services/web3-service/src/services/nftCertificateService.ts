import { v4 as uuidv4 } from 'uuid';
import { NFTCertificate } from '../models';
import { logger } from './logger';

export class NFTCertificateService {
  /**
   * Mint NFT certificate for an order (off-chain for demo)
   */
  async mintCertificate(
    orderId: string,
    userId: string,
    productData: {
      productId: string;
      name: string;
      description: string;
      image: string;
      price: number;
      brand?: string;
    },
    onChain: boolean = false
  ): Promise<any> {
    try {
      // Check if certificate already exists
      const existing = await NFTCertificate.findOne({ orderId });
      if (existing) {
        return {
          success: false,
          message: 'Certificate already exists for this order',
          certificate: this.formatCertificate(existing)
        };
      }

      const tokenId = Date.now().toString(); // Simple token ID based on timestamp
      const certificateId = uuidv4();

      // Create NFT metadata
      const metadata = {
        name: `${productData.name} - Purchase Certificate`,
        description: `Official purchase certificate for ${productData.name}. Order #${orderId}`,
        image: productData.image || 'https://via.placeholder.com/400',
        attributes: [
          { trait_type: 'Product', value: productData.name },
          { trait_type: 'Brand', value: productData.brand || 'N/A' },
          { trait_type: 'Purchase Price', value: `$${productData.price}` },
          { trait_type: 'Order ID', value: orderId },
          { trait_type: 'Certificate ID', value: certificateId },
          { trait_type: 'Issue Date', value: new Date().toISOString() },
          { trait_type: 'Type', value: onChain ? 'On-Chain' : 'Off-Chain Demo' }
        ],
        external_url: `${process.env.APP_URL || 'http://localhost:3001'}/certificate/${certificateId}`
      };

      // Create certificate record
      const certificate = await NFTCertificate.create({
        orderId,
        userId,
        productId: productData.productId,
        tokenId,
        certificateId,
        metadata,
        contractAddress: onChain ? process.env.NFT_CONTRACT_ADDRESS : null,
        ownerAddress: null, // Will be set when claimed
        mintedOnChain: onChain,
        mintTxHash: null,
        status: 'minted'
      });

      logger.info(`NFT certificate minted: ${certificateId} for order ${orderId}`);

      return {
        success: true,
        message: 'Certificate minted successfully',
        certificate: this.formatCertificate(certificate)
      };
    } catch (error) {
      logger.error('Failed to mint certificate:', error);
      throw error;
    }
  }

  /**
   * Get certificate by ID
   */
  async getCertificate(certificateId: string): Promise<any> {
    try {
      const certificate = await NFTCertificate.findOne({ certificateId });
      
      if (!certificate) {
        throw new Error('Certificate not found');
      }

      return this.formatCertificate(certificate);
    } catch (error) {
      logger.error('Failed to get certificate:', error);
      throw error;
    }
  }

  /**
   * Get certificate by order ID
   */
  async getCertificateByOrderId(orderId: string): Promise<any> {
    try {
      const certificate = await NFTCertificate.findOne({ orderId });
      
      if (!certificate) {
        return null;
      }

      return this.formatCertificate(certificate);
    } catch (error) {
      logger.error('Failed to get certificate by order:', error);
      throw error;
    }
  }

  /**
   * Get all certificates for a user
   */
  async getUserCertificates(userId: string): Promise<any[]> {
    try {
      const certificates = await NFTCertificate.find({ userId }).sort({ createdAt: -1 });
      
      return certificates.map(cert => this.formatCertificate(cert));
    } catch (error) {
      logger.error('Failed to get user certificates:', error);
      throw error;
    }
  }

  /**
   * Transfer certificate to wallet address
   */
  async claimCertificate(certificateId: string, walletAddress: string): Promise<any> {
    try {
      const certificate = await NFTCertificate.findOne({ certificateId });
      
      if (!certificate) {
        throw new Error('Certificate not found');
      }

      if (certificate.ownerAddress) {
        throw new Error('Certificate already claimed');
      }

      certificate.ownerAddress = walletAddress.toLowerCase();
      certificate.claimedAt = new Date();
      await certificate.save();

      logger.info(`Certificate ${certificateId} claimed by ${walletAddress}`);

      return {
        success: true,
        message: 'Certificate claimed successfully',
        certificate: this.formatCertificate(certificate)
      };
    } catch (error) {
      logger.error('Failed to claim certificate:', error);
      throw error;
    }
  }

  /**
   * Verify certificate authenticity
   */
  async verifyCertificate(certificateId: string): Promise<any> {
    try {
      const certificate = await NFTCertificate.findOne({ certificateId });
      
      if (!certificate) {
        return {
          valid: false,
          message: 'Certificate not found'
        };
      }

      return {
        valid: true,
        message: 'Certificate is authentic',
        certificate: this.formatCertificate(certificate),
        verificationDetails: {
          issuedAt: certificate.createdAt,
          orderId: certificate.orderId,
          productId: certificate.productId,
          mintedOnChain: certificate.mintedOnChain,
          owner: certificate.ownerAddress || 'Unclaimed',
          status: certificate.status
        }
      };
    } catch (error) {
      logger.error('Failed to verify certificate:', error);
      throw error;
    }
  }

  /**
   * Get all certificates (admin)
   */
  async getAllCertificates(limit: number = 50): Promise<any[]> {
    try {
      const certificates = await NFTCertificate.find()
        .sort({ createdAt: -1 })
        .limit(limit);
      
      return certificates.map(cert => this.formatCertificate(cert));
    } catch (error) {
      logger.error('Failed to get all certificates:', error);
      throw error;
    }
  }

  /**
   * Get certificate statistics
   */
  async getStatistics(): Promise<any> {
    try {
      const total = await NFTCertificate.countDocuments();
      const minted = await NFTCertificate.countDocuments({ status: 'minted' });
      const claimed = await NFTCertificate.countDocuments({ ownerAddress: { $ne: null } });
      const onChain = await NFTCertificate.countDocuments({ mintedOnChain: true });

      return {
        total,
        minted,
        claimed,
        unclaimed: total - claimed,
        onChain,
        offChain: total - onChain
      };
    } catch (error) {
      logger.error('Failed to get statistics:', error);
      throw error;
    }
  }

  /**
   * Format certificate for response
   */
  private formatCertificate(certificate: any): any {
    return {
      certificateId: certificate.certificateId,
      orderId: certificate.orderId,
      userId: certificate.userId,
      productId: certificate.productId,
      tokenId: certificate.tokenId,
      metadata: certificate.metadata,
      contractAddress: certificate.contractAddress,
      ownerAddress: certificate.ownerAddress,
      mintedOnChain: certificate.mintedOnChain,
      mintTxHash: certificate.mintTxHash,
      status: certificate.status,
      createdAt: certificate.createdAt,
      claimedAt: certificate.claimedAt,
      verificationUrl: `${process.env.APP_URL || 'http://localhost:3001'}/verify/${certificate.certificateId}`,
      qrCode: this.generateQRCodeData(certificate.certificateId)
    };
  }

  /**
   * Generate QR code data
   */
  private generateQRCodeData(certificateId: string): string {
    return `${process.env.APP_URL || 'http://localhost:3001'}/verify/${certificateId}`;
  }
}

export const nftCertificateService = new NFTCertificateService();
