import { Router } from 'express';
import { listAlerts, markRead, listEscalations, runSweep, listNotifications, bulkNotify } from '../controllers/alert.controller';
import { authenticate, authorize } from '../middleware/auth';
import { asyncHandler } from '../utils/asyncHandler';

const router = Router();
router.use(authenticate);
router.get('/', asyncHandler(listAlerts));
router.get('/notifications', asyncHandler(listNotifications));
router.get('/escalations', asyncHandler(listEscalations));
router.post('/sweep', authorize('ADMIN'), asyncHandler(runSweep));
router.post('/bulk-notify', authorize('ADMIN', 'COMPETENT_AUTHORITY', 'BUREAU_OFFICER'), asyncHandler(bulkNotify));
router.patch('/:id/read', asyncHandler(markRead));

export default router;
