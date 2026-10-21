import { Router } from 'express';
import { listUsers } from '../controllers/user.controller';
import { authenticate, authorize } from '../middleware/auth';
import { asyncHandler } from '../utils/asyncHandler';

const router = Router();
router.use(authenticate);
// Listing the user directory is a staff-only capability: institutions must not
// be able to enumerate officers, other institutions or administrators.
router.get(
  '/',
  authorize('BUREAU_OFFICER', 'COMPETENT_AUTHORITY', 'ADMIN', 'REGIONAL_OFFICER', 'EVC_MEMBER', 'COMMITTEE_MEMBER'),
  asyncHandler(listUsers)
);

export default router;
