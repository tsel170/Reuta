import type { NextFunction, Request, Response } from "express";
import { AuthService } from "../admin/authService.js";
import { readAuthToken } from "../admin/cookies.js";
import type { AdminStore } from "../admin/types.js";

export type AuthedRequest = Request & { adminEmail?: string };

export function requireAdmin(store: AdminStore) {
  const auth = new AuthService(store);
  return async (req: AuthedRequest, res: Response, next: NextFunction) => {
    try {
      const token = readAuthToken(req);
      const session = await auth.sessionFromToken(token);
      if (!session) {
        res.status(401).json({ error: "נדרשת התחברות" });
        return;
      }
      req.adminEmail = session.email;
      next();
    } catch (error) {
      next(error);
    }
  };
}
