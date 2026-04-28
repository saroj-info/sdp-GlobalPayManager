// Augment Express.User with the shape that `jwtAuthMiddleware` attaches to req.user.
// See server/jwtAuth.ts.

import 'express';

declare global {
  namespace Express {
    interface User {
      id: string;
      userId: string;
      email: string;
      userType: string;
      name: string;
      isAuthenticated?: boolean;
      sdpRole?: string | null;
      accessibleCountries?: string[];
      accessibleBusinessIds?: string[];
    }
  }
}

export {};
