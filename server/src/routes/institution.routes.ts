import { Router } from 'express';
import { listInstitutions } from '../controllers/institution.controller';
import { authenticate } from '../middleware/auth';
import { asyncHandler } from '../utils/asyncHandler';

const router = Router();
router.use(authenticate);
router.get('/', asyncHandler(listInstitutions));

export default router;
