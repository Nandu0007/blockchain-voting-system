import type { NextFunction, Request, Response } from 'express';
import jwt from 'jsonwebtoken';
import { env } from '../config/env';
import type { AuthTokenPayload, UserRole } from '../types/models';
import { HttpError } from '../utils/httpError';

const BEARER_PREFIX = 'Bearer ';

export const authenticate = (req: Request, _res: Response, next: NextFunction): void => {
  const header = req.headers.authorization;
  if (!header || !header.startsWith(BEARER_PREFIX)) {
    throw new HttpError(401, 'Missing bearer token');
  }

  const token = header.slice(BEARER_PREFIX.length).trim();

  try {
    const payload = jwt.verify(token, env.jwtSecret) as AuthTokenPayload;
    req.auth = {
      wallet: payload.sub,
      role: payload.role,
    };
    next();
  } catch (error) {
    throw new HttpError(401, 'Invalid or expired token', {
      reason: error instanceof Error ? error.message : 'unknown',
    });
  }
};

export const requireRole = (...roles: UserRole[]) => {
  return (req: Request, _res: Response, next: NextFunction): void => {
    if (!req.auth) {
      throw new HttpError(401, 'Authentication required');
    }

    if (!roles.includes(req.auth.role)) {
      throw new HttpError(403, 'Insufficient privileges', {
        required: roles,
        actual: req.auth.role,
      });
    }

    next();
  };
};
