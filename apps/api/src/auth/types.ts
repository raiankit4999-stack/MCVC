import type { PlatformRole } from '@prisma/client';

export interface AuthUser {
  id: string;
  email: string;
  name: string;
  platformRole: PlatformRole | null;
}

export interface StoreContext {
  id: string;
  name: string;
  slug: string;
  timezone: string;
  stateCode: string;
  permissions: string[];
  roleName: string;
}

declare global {
  // eslint-disable-next-line @typescript-eslint/no-namespace
  namespace Express {
    interface Request {
      user?: AuthUser;
      store?: StoreContext;
      authViaCookie?: boolean;
    }
  }
}
