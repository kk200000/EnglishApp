import type { RefreshTokenPayload } from '@en/common/user';

declare global {
  namespace Express {
    interface Request {
      user: RefreshTokenPayload;
    }
  }
}

export {};