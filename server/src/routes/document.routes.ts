import { Router } from 'express';
import { listDocuments, createDocument, submitRenewal, verifyRenewal, expiringDocuments } from '../controllers/document.controller';
import { authenticate, authorize } from '../middleware/auth';
import { asyncHandler } from '../utils/asyncHandler';

const router = Router();
router.use(authenticate);
router.get('/', asyncHandler(listDocuments));
router.get('/expiring', asyncHandler(expiringDocuments));
router.post('/', authorize('INSTITUTION', 'ADMIN'), asyncHandler(createDocument));
router.post('/:id/renewal', authorize('INSTITUTION'), asyncHandler(submitRenewal));
router.post('/:id/verify-renewal', authorize('REGIONAL_OFFICER', 'BUREAU_OFFICER', 'COMPETENT_AUTHORITY'), asyncHandler(verifyRenewal));

export default router;
