import { Role, Region } from './domain';

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
