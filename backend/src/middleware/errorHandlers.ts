import type { NextFunction, Request, Response } from 'express';
import logger from '../config/logger';
import { isHttpError } from '../utils/httpError';

export const notFoundHandler = (req: Request, res: Response): void => {
  res.status(404).json({
    success: false,
    error: {
      message: 'Route not found',
      path: req.path,
      method: req.method,
    },
    meta: {
      requestId: req.requestId,
      timestamp: new Date().toISOString(),
    },
  });
};

export const errorHandler = (
  error: unknown,
  req: Request,
  res: Response,
  _next: NextFunction,
): void => {
  const status = isHttpError(error) ? error.statusCode : 500;
  const details = isHttpError(error) ? error.details : undefined;

  logger.error({
    requestId: req.requestId,
    path: req.path,
    method: req.method,
    status,
    message: error instanceof Error ? error.message : 'Unhandled error',
  });

  res.status(status).json({
    success: false,
    error: {
      message: error instanceof Error ? error.message : 'Internal Server Error',
      details,
    },
    meta: {
      requestId: req.requestId,
      timestamp: new Date().toISOString(),
    },
  });
};
