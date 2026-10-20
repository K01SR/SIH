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

const router = Router();

router.get('/health', (_req, res) => res.json({ status: 'ok', service: 'aicte-workflow' }));
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

export default router;
