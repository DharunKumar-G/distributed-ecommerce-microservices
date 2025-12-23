import { Router, Request, Response } from 'express';
import { nftCertificateService } from '../services/nftCertificateService';
import { logger } from '../services/logger';

const router = Router();

/**
 * POST /api/web3/nft/mint
 * Mint NFT certificate for an order (admin/auto)
 */
router.post('/mint', async (req: Request, res: Response) => {
  try {
    const { orderId, userId, productData, onChain } = req.body;

    if (!orderId || !userId || !productData) {
      return res.status(400).json({ 
        error: 'orderId, userId, and productData are required' 
      });
    }

    const result = await nftCertificateService.mintCertificate(
      orderId,
      userId,
      productData,
      onChain || false
    );

    res.json(result);
  } catch (error: any) {
    logger.error('Mint certificate error:', error);
    res.status(500).json({ error: error.message || 'Failed to mint certificate' });
  }
});

/**
 * GET /api/web3/nft/certificate/:certificateId
 * Get certificate by ID
 */
router.get('/certificate/:certificateId', async (req: Request, res: Response) => {
  try {
    const { certificateId } = req.params;
    const certificate = await nftCertificateService.getCertificate(certificateId);
    res.json(certificate);
  } catch (error: any) {
    logger.error('Get certificate error:', error);
    res.status(404).json({ error: error.message || 'Certificate not found' });
  }
});

/**
 * GET /api/web3/nft/order/:orderId
 * Get certificate by order ID
 */
router.get('/order/:orderId', async (req: Request, res: Response) => {
  try {
    const { orderId } = req.params;
    const certificate = await nftCertificateService.getCertificateByOrderId(orderId);
    
    if (!certificate) {
      return res.status(404).json({ error: 'No certificate found for this order' });
    }
    
    res.json(certificate);
  } catch (error: any) {
    logger.error('Get certificate by order error:', error);
    res.status(500).json({ error: error.message || 'Failed to get certificate' });
  }
});

/**
 * GET /api/web3/nft/user/:userId
 * Get all certificates for a user
 */
router.get('/user/:userId', async (req: Request, res: Response) => {
  try {
    const { userId } = req.params;
    const certificates = await nftCertificateService.getUserCertificates(userId);
    res.json({ certificates, count: certificates.length });
  } catch (error: any) {
    logger.error('Get user certificates error:', error);
    res.status(500).json({ error: error.message || 'Failed to get certificates' });
  }
});

/**
 * POST /api/web3/nft/claim
 * Claim certificate to wallet address
 */
router.post('/claim', async (req: Request, res: Response) => {
  try {
    const { certificateId, walletAddress } = req.body;

    if (!certificateId || !walletAddress) {
      return res.status(400).json({ 
        error: 'certificateId and walletAddress are required' 
      });
    }

    const result = await nftCertificateService.claimCertificate(
      certificateId,
      walletAddress
    );

    res.json(result);
  } catch (error: any) {
    logger.error('Claim certificate error:', error);
    res.status(400).json({ error: error.message || 'Failed to claim certificate' });
  }
});

/**
 * GET /api/web3/nft/verify/:certificateId
 * Verify certificate authenticity
 */
router.get('/verify/:certificateId', async (req: Request, res: Response) => {
  try {
    const { certificateId } = req.params;
    const result = await nftCertificateService.verifyCertificate(certificateId);
    res.json(result);
  } catch (error: any) {
    logger.error('Verify certificate error:', error);
    res.status(500).json({ error: error.message || 'Failed to verify certificate' });
  }
});

/**
 * GET /api/web3/nft/all
 * Get all certificates (admin)
 */
router.get('/all', async (req: Request, res: Response) => {
  try {
    const limit = parseInt(req.query.limit as string) || 50;
    const certificates = await nftCertificateService.getAllCertificates(limit);
    res.json({ certificates, count: certificates.length });
  } catch (error: any) {
    logger.error('Get all certificates error:', error);
    res.status(500).json({ error: error.message || 'Failed to get certificates' });
  }
});

/**
 * GET /api/web3/nft/stats
 * Get certificate statistics
 */
router.get('/stats', async (req: Request, res: Response) => {
  try {
    const stats = await nftCertificateService.getStatistics();
    res.json(stats);
  } catch (error: any) {
    logger.error('Get statistics error:', error);
    res.status(500).json({ error: 'Failed to get statistics' });
  }
});

export default router;
