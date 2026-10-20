import { Router } from 'express';
import { pendencyReport, evcReport, complianceReport, overdueReport, regionPerformance } from '../controllers/report.controller';
import { authenticate } from '../middleware/auth';
import { asyncHandler } from '../utils/asyncHandler';

const router = Router();
router.use(authenticate);
router.get('/pendency', asyncHandler(pendencyReport));
router.get('/evc', asyncHandler(evcReport));
router.get('/compliance', asyncHandler(complianceReport));
router.get('/overdue', asyncHandler(overdueReport));
router.get('/region-performance', asyncHandler(regionPerformance));

export default router;
