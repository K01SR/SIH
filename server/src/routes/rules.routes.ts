import { Router } from 'express';
import { listRules, getActiveRules, createRuleVersion, activateRule } from '../controllers/rules.controller';
import { authenticate, authorize } from '../middleware/auth';
import { validate } from '../middleware/validate';
import { ruleCreateSchema } from '../validation/schemas';
import { asyncHandler } from '../utils/asyncHandler';

const router = Router();
router.use(authenticate);
router.get('/', asyncHandler(listRules));
router.get('/active', asyncHandler(getActiveRules));
router.post('/', authorize('ADMIN', 'COMPETENT_AUTHORITY'), validate(ruleCreateSchema), asyncHandler(createRuleVersion));
router.post('/:id/activate', authorize('ADMIN', 'COMPETENT_AUTHORITY'), asyncHandler(activateRule));

export default router;
