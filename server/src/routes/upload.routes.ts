import { Router } from 'express';
import { uploadFile } from '../controllers/upload.controller';
import { authenticate } from '../middleware/auth';
import { upload } from '../middleware/upload';
import { asyncHandler } from '../utils/asyncHandler';

const router = Router();
router.use(authenticate);
router.post('/', upload.single('file'), asyncHandler(uploadFile));

export default router;
