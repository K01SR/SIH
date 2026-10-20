import { Router } from 'express';
import { login, register, me } from '../controllers/auth.controller';
import { authenticate } from '../middleware/auth';
import { validate } from '../middleware/validate';
import { authLimiter } from '../middleware/rateLimit';
import { loginSchema, registerSchema } from '../validation/schemas';
import { asyncHandler } from '../utils/asyncHandler';

const router = Router();
router.post('/login', authLimiter, validate(loginSchema), asyncHandler(login));
router.post('/register', authenticate, validate(registerSchema), asyncHandler(register));
router.get('/me', authenticate, asyncHandler(me));

export default router;
