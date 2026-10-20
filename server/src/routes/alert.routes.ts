import { Router } from 'express';
import { listAlerts, markRead, listEscalations, runSweep } from '../controllers/alert.controller';
import { authenticate, authorize } from '../middleware/auth';
import { asyncHandler } from '../utils/asyncHandler';

const router = Router();
router.use(authenticate);
router.get('/', asyncHandler(listAlerts));
router.get('/escalations', asyncHandler(listEscalations));
router.post('/sweep', authorize('ADMIN'), asyncHandler(runSweep));
router.patch('/:id/read', asyncHandler(markRead));

export default router;
