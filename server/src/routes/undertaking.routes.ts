import { Router } from 'express';
import { listUndertakings, createUndertaking, submitUndertaking, verifyUndertaking, upcomingUndertakings } from '../controllers/undertaking.controller';
import { authenticate, authorize } from '../middleware/auth';
import { validate } from '../middleware/validate';
import { undertakingCreateSchema, undertakingSubmitSchema, undertakingVerifySchema } from '../validation/schemas';
import { asyncHandler } from '../utils/asyncHandler';

const router = Router();
router.use(authenticate);
router.get('/', asyncHandler(listUndertakings));
router.get('/upcoming', asyncHandler(upcomingUndertakings));
router.post('/', authorize('REGIONAL_OFFICER', 'BUREAU_OFFICER', 'COMPETENT_AUTHORITY'), validate(undertakingCreateSchema), asyncHandler(createUndertaking));
router.post('/:id/submit', authorize('INSTITUTION'), validate(undertakingSubmitSchema), asyncHandler(submitUndertaking));
router.post('/:id/verify', authorize('REGIONAL_OFFICER', 'BUREAU_OFFICER', 'COMPETENT_AUTHORITY'), validate(undertakingVerifySchema), asyncHandler(verifyUndertaking));

export default router;
