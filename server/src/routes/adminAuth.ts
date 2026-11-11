import { Router } from "express";
import { AuthService } from "../admin/authService.js";
import { clearAdminCookie, readAuthToken, setAdminCookie } from "../admin/cookies.js";
import { clearRateLimit, clientIp, hitRateLimit } from "../admin/rateLimit.js";
import type { AdminStore } from "../admin/types.js";
import { requireAdmin, type AuthedRequest } from "../middleware/requireAdmin.js";

export function adminAuthRouter(store: AdminStore): Router {
  const router = Router();
  const auth = new AuthService(store);

  router.post("/login", async (req, res, next) => {
    try {
      const email = String(req.body?.email ?? "");
      const ip = clientIp(req);
      if (hitRateLimit(`login:${ip}`, 20, 60 * 60 * 1000)) {
        res.status(429).json({ error: "יותר מדי ניסיונות. נסו שוב מאוחר יותר" });
        return;
      }
      const result = await auth.login(email);
      if (!result.ok) {
        res.status(401).json({ error: result.error });
        return;
      }
      setAdminCookie(res, result.token);
      res.json({ ok: true, email: result.email, token: result.token });
    } catch (error) {
      next(error);
    }
  });

  router.post("/logout", async (req, res, next) => {
    try {
      const token = readAuthToken(req);
      const session = await auth.sessionFromToken(token);
      const ip = clientIp(req);
      if (session) {
        await store.deleteSession(session.id);
        clearRateLimit(`login:${ip}`);
      }
      clearAdminCookie(res);
      res.json({ ok: true });
    } catch (error) {
      next(error);
    }
  });

  router.get("/me", requireAdmin(store), (req: AuthedRequest, res) => {
    res.json({ email: req.adminEmail });
  });

  return router;
}
