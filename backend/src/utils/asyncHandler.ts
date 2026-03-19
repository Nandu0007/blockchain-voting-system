import type { NextFunction, Request, RequestHandler, Response } from 'express';

export const asyncHandler = (handler: RequestHandler): RequestHandler => {
  return async (req: Request, res: Response, next: NextFunction) => {
    Promise.resolve(handler(req, res, next)).catch(next);
  };
};
