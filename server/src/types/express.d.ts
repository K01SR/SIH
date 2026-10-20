import { Role, Region } from '@prisma/client';

declare global {
  namespace Express {
    interface Request {
      user?: {
        id: string;
        email: string;
        role: Role;
        region?: Region | null;
        institutionId?: string | null;
      };
    }
  }
}

export {};
