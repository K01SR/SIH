import { Router } from 'express';
import {
  listApplications,
  getApplication,
  createApplication,
  transitionApplication,
  routeToEvc,
  assignOfficer,
  dashboardSummary,
  regionPendency,
  workload,
  predictive,
  sendCommunication,
  simulate,
} from '../controllers/application.controller';
import { authenticate, authorize } from '../middleware/auth';
import { validate } from '../middleware/validate';
import { createApplicationSchema, transitionSchema } from '../validation/schemas';
import { asyncHandler } from '../utils/asyncHandler';

const router = Router();
router.use(authenticate);

router.get('/', asyncHandler(listApplications));
router.post('/', authorize('INSTITUTION', 'ADMIN'), validate(createApplicationSchema), asyncHandler(createApplication));
router.get('/dashboard', asyncHandler(dashboardSummary));
router.get('/analytics/regions', asyncHandler(regionPendency));
router.get('/analytics/workload', asyncHandler(workload));
router.get('/analytics/predictive', asyncHandler(predictive));
router.get('/analytics/simulate', authorize('BUREAU_OFFICER', 'COMPETENT_AUTHORITY', 'ADMIN'), asyncHandler(simulate));
router.get('/:id', asyncHandler(getApplication));
router.post('/:id/transition', authorize('REGIONAL_OFFICER', 'BUREAU_OFFICER', 'COMPETENT_AUTHORITY', 'COMMITTEE_MEMBER', 'EVC_MEMBER'), validate(transitionSchema), asyncHandler(transitionApplication));
router.post('/:id/assign', authorize('BUREAU_OFFICER', 'COMPETENT_AUTHORITY', 'ADMIN'), asyncHandler(assignOfficer));
router.post('/:id/route-evc', authorize('REGIONAL_OFFICER', 'BUREAU_OFFICER'), asyncHandler(routeToEvc));
router.post('/:id/communicate', authorize('REGIONAL_OFFICER', 'BUREAU_OFFICER', 'COMPETENT_AUTHORITY'), asyncHandler(sendCommunication));

export default router;
