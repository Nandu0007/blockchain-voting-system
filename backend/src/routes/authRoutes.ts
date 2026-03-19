import { Router } from 'express';
import Joi from 'joi';
import jwt from 'jsonwebtoken';
import { env } from '../config/env';
import { auditService } from '../services/auditService';
import { voterService } from '../services/voterService';
import type { UserRole } from '../types/models';
import { ok } from '../utils/apiResponse';
import { asyncHandler } from '../utils/asyncHandler';
import { validate } from '../middleware/validate';

const router = Router();
const tokenExpiry = env.jwtExpiresIn as jwt.SignOptions['expiresIn'];

const tokenSchema = Joi.object({
  walletAddress: Joi.string().pattern(/^0x[a-fA-F0-9]{40}$/).required(),
  role: Joi.string().valid('admin', 'voter', 'auditor', 'observer').default('voter'),
});

router.post(
  '/token',
  validate({ body: tokenSchema }),
  asyncHandler(async (req, res) => {
    const walletAddress = req.body.walletAddress.toLowerCase();
    const role = req.body.role as UserRole;

    if (role === 'voter' || role === 'admin') {
      voterService.ensureProvisioned(walletAddress, role);
    }

    const token = jwt.sign(
      {
        sub: walletAddress,
        role,
      },
      env.jwtSecret,
      {
        expiresIn: tokenExpiry,
      },
    );

    auditService.log('AUTH_TOKEN_ISSUED', walletAddress, 'AUTH', walletAddress, { role });

    res.json(
      ok(
        {
          token,
          walletAddress,
          role,
          expiresIn: env.jwtExpiresIn,
        },
        req.requestId,
      ),
    );
  }),
);

export default router;
