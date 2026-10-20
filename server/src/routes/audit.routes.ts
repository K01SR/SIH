import { Router } from 'express';
import { listAuditLogs, applicationTimeline } from '../controllers/audit.controller';
import { authenticate, authorize } from '../middleware/auth';
import { asyncHandler } from '../utils/asyncHandler';

const router = Router();
router.use(authenticate);
router.get('/', authorize('ADMIN', 'AUDITOR' as never, 'BUREAU_OFFICER', 'COMPETENT_AUTHORITY'), asyncHandler(listAuditLogs));
router.get('/application/:id', asyncHandler(applicationTimeline));

export default router;
