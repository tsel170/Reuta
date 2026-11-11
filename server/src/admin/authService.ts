import { randomUUID } from "node:crypto";
import { SESSION_MS } from "./cookies.js";
import { hashValue, randomToken } from "./crypto.js";
import type { AdminStore } from "./types.js";

export function normalizeEmail(email: string): string {
  return email.trim().toLowerCase();
}

export class AuthService {
  constructor(private readonly store: AdminStore) {}

  async login(
    rawEmail: string,
  ): Promise<{ ok: true; token: string; email: string } | { ok: false; error: string }> {
    const email = normalizeEmail(rawEmail);
    if (!email || !(await this.store.hasEmail(email))) {
      return { ok: false, error: "הכתובת הזו אינה מורשית" };
    }

    const token = randomToken();
    const now = Date.now();
    await this.store.createSession({
      id: randomUUID(),
      tokenHash: hashValue(token),
      email,
      expiresAt: new Date(now + SESSION_MS).toISOString(),
      createdAt: new Date(now).toISOString(),
    });
    return { ok: true, token, email };
  }

  async sessionFromToken(token?: string) {
    if (!token) return null;
    return this.store.getSessionByTokenHash(hashValue(token));
  }
}
