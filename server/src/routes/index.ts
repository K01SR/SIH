import { Router } from 'express';
import authRoutes from './auth.routes';
import applicationRoutes from './application.routes';
import evcRoutes from './evc.routes';
import undertakingRoutes from './undertaking.routes';
import documentRoutes from './document.routes';
import rulesRoutes from './rules.routes';
import alertRoutes from './alert.routes';
import auditRoutes from './audit.routes';
import reportRoutes from './report.routes';
import institutionRoutes from './institution.routes';
import userRoutes from './user.routes';
import uploadRoutes from './upload.routes';
import { prisma } from '../config/prisma';
import { asyncHandler } from '../utils/asyncHandler';

const router = Router();
const startedAt = Date.now();

router.get(
  '/health',
  asyncHandler(async (_req, res) => {
    let db = 'down';
    try {
      await prisma.$queryRaw`SELECT 1`;
      db = 'up';
    } catch {
      db = 'down';
    }
    const healthy = db === 'up';
    res.status(healthy ? 200 : 503).json({
      status: healthy ? 'ok' : 'degraded',
      service: 'aicte-workflow',
      database: db,
      uptimeSeconds: Math.floor((Date.now() - startedAt) / 1000),
      timestamp: new Date().toISOString(),
    });
  })
);
router.use('/auth', authRoutes);
router.use('/applications', applicationRoutes);
router.use('/evc', evcRoutes);
router.use('/undertakings', undertakingRoutes);
router.use('/documents', documentRoutes);
router.use('/rules', rulesRoutes);
router.use('/alerts', alertRoutes);
router.use('/audit', auditRoutes);
router.use('/reports', reportRoutes);
router.use('/institutions', institutionRoutes);
router.use('/users', userRoutes);
router.use('/uploads', uploadRoutes);

export default router;