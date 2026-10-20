import { Router } from 'express';
import { listDocuments, createDocument, submitRenewal, verifyRenewal, expiringDocuments } from '../controllers/document.controller';
import { authenticate, authorize } from '../middleware/auth';
import { validate } from '../middleware/validate';
import { documentCreateSchema, documentRenewalSchema, documentRenewalVerifySchema } from '../validation/schemas';
import { asyncHandler } from '../utils/asyncHandler';

const router = Router();
router.use(authenticate);
router.get('/', asyncHandler(listDocuments));
router.get('/expiring', asyncHandler(expiringDocuments));
router.post('/', authorize('INSTITUTION', 'ADMIN'), validate(documentCreateSchema), asyncHandler(createDocument));
router.post('/:id/renewal', authorize('INSTITUTION'), validate(documentRenewalSchema), asyncHandler(submitRenewal));
router.post('/:id/verify-renewal', authorize('REGIONAL_OFFICER', 'BUREAU_OFFICER', 'COMPETENT_AUTHORITY'), validate(documentRenewalVerifySchema), asyncHandler(verifyRenewal));

export default router;
