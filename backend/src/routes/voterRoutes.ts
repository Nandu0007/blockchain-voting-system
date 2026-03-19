import { Router } from 'express';
import Joi from 'joi';
import { authenticate, requireRole } from '../middleware/auth';
import { validate } from '../middleware/validate';
import { auditService } from '../services/auditService';
import { voterService } from '../services/voterService';
import type { UserRole } from '../types/models';
import { ok } from '../utils/apiResponse';
import { asyncHandler } from '../utils/asyncHandler';

const router = Router();

const registerSchema = Joi.object({
  walletAddress: Joi.string().pattern(/^0x[a-fA-F0-9]{40}$/).required(),
  governmentIdHash: Joi.string().min(12).max(256).required(),
  role: Joi.string().valid('admin', 'voter', 'auditor', 'observer').default('voter'),
});

const verifySchema = Joi.object({
  verified: Joi.boolean().required(),
});

const suspendSchema = Joi.object({
  suspended: Joi.boolean().required(),
});

router.get(
  '/',
  authenticate,
  requireRole('admin', 'auditor'),
  asyncHandler(async (req, res) => {
    const voters = voterService.list();
    res.json(ok({ voters }, req.requestId));
  }),
);

router.get(
  '/:walletAddress',
  authenticate,
  requireRole('admin', 'auditor', 'voter'),
  asyncHandler(async (req, res) => {
    const voter = voterService.getOne(req.params.walletAddress);
    res.json(ok({ voter }, req.requestId));
  }),
);

router.post(
  '/',
  authenticate,
  requireRole('admin'),
  validate({ body: registerSchema }),
  asyncHandler(async (req, res) => {
    const voter = voterService.register(
      req.body.walletAddress,
      req.body.governmentIdHash,
      req.body.role as UserRole,
    );

    auditService.log('VOTER_REGISTERED', req.auth!.wallet, 'VOTER', voter.walletAddress, {
      role: voter.role,
    });

    res.status(201).json(ok({ voter }, req.requestId));
  }),
);

router.patch(
  '/:walletAddress/verify',
  authenticate,
  requireRole('admin'),
  validate({ body: verifySchema }),
  asyncHandler(async (req, res) => {
    const voter = voterService.verify(req.params.walletAddress, req.body.verified as boolean);
    auditService.log('VOTER_VERIFICATION_UPDATED', req.auth!.wallet, 'VOTER', voter.walletAddress, {
      verified: voter.verified,
    });
    res.json(ok({ voter }, req.requestId));
  }),
);

router.patch(
  '/:walletAddress/suspend',
  authenticate,
  requireRole('admin'),
  validate({ body: suspendSchema }),
  asyncHandler(async (req, res) => {
    const voter = voterService.suspend(req.params.walletAddress, req.body.suspended as boolean);
    auditService.log('VOTER_SUSPENSION_UPDATED', req.auth!.wallet, 'VOTER', voter.walletAddress, {
      suspended: voter.suspended,
    });
    res.json(ok({ voter }, req.requestId));
  }),
);

export default router;
