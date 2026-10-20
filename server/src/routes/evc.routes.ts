import { Router } from 'express';
import { listEvcs, queueForEvc, scheduleEvc, completeEvc, evcAlerts, evcCalendar } from '../controllers/evc.controller';
import { authenticate, authorize } from '../middleware/auth';
import { validate } from '../middleware/validate';
import { scheduleEvcSchema, queueEvcSchema } from '../validation/schemas';
import { asyncHandler } from '../utils/asyncHandler';

const router = Router();
router.use(authenticate);
router.get('/', asyncHandler(listEvcs));
router.get('/alerts', asyncHandler(evcAlerts));
router.get('/calendar', asyncHandler(evcCalendar));
router.post('/queue', authorize('REGIONAL_OFFICER', 'BUREAU_OFFICER'), validate(queueEvcSchema), asyncHandler(queueForEvc));
router.post('/:id/schedule', authorize('BUREAU_OFFICER', 'COMPETENT_AUTHORITY', 'ADMIN'), validate(scheduleEvcSchema), asyncHandler(scheduleEvc));
router.post('/:id/complete', authorize('EVC_MEMBER', 'COMMITTEE_MEMBER', 'BUREAU_OFFICER'), asyncHandler(completeEvc));

export default router;
