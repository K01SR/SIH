import { Router } from 'express';
import { listEvcs, queueForEvc, scheduleEvc, completeEvc, evcAlerts } from '../controllers/evc.controller';
import { authenticate, authorize } from '../middleware/auth';
import { asyncHandler } from '../utils/asyncHandler';

const router = Router();
router.use(authenticate);
router.get('/', asyncHandler(listEvcs));
router.get('/alerts', asyncHandler(evcAlerts));
router.post('/queue', authorize('REGIONAL_OFFICER', 'BUREAU_OFFICER'), asyncHandler(queueForEvc));
router.post('/:id/schedule', authorize('BUREAU_OFFICER', 'COMPETENT_AUTHORITY', 'ADMIN'), asyncHandler(scheduleEvc));
router.post('/:id/complete', authorize('EVC_MEMBER', 'COMMITTEE_MEMBER', 'BUREAU_OFFICER'), asyncHandler(completeEvc));

export default router;
