import type { UserRole } from './models';

declare global {
  namespace Express {
    interface Request {
      requestId?: string;
      auth?: {
        wallet: string;
        role: UserRole;
      };
    }
  }
}

export {};
