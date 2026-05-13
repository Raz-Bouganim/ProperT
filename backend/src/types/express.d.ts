import type { JwtAuthUser } from '../auth/jwt-auth.types';

declare global {
  namespace Express {
    // eslint-disable-next-line @typescript-eslint/no-empty-object-type -- Nest/Passport merges into Express.User
    interface User extends JwtAuthUser {}
  }
}

export {};
