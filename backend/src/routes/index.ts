import { Router } from 'express';
import authRoutes from './authRoutes';
import campaignRoutes from './campaignRoutes';
import voterRoutes from './voterRoutes';

const router = Router();

router.use('/auth', authRoutes);
router.use('/campaigns', campaignRoutes);
router.use('/voters', voterRoutes);

export default router;
