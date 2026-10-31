import { randomUUID } from "node:crypto";
import { OTP_MAX_ATTEMPTS, OTP_MS, SESSION_MS } from "./cookies.js";
import { hashMatches, hashValue, randomOtp, randomToken } from "./crypto.js";
import { sendOtpEmail } from "./mailer.js";
import type { AdminStore } from "./types.js";

const GENERIC = "אם הכתובת מורשית, נשלח אליה קוד.";

export function normalizeEmail(email: string): string {
  return email.trim().toLowerCase();
}

export class AuthService {
  constructor(private readonly store: AdminStore) {}

  async requestOtp(rawEmail: string): Promise<{ ok: true; message: string }> {
    const email = normalizeEmail(rawEmail);
    const allowed = email && (await this.store.hasEmail(email));
    if (!allowed) {
      return { ok: true, message: GENERIC };
    }

    const code = randomOtp();
    const now = Date.now();
    await this.store.replaceOtpsForEmail(email, {
      id: randomUUID(),
      email,
      codeHash: hashValue(`${email}:${code}`),
      expiresAt: new Date(now + OTP_MS).toISOString(),
      attempts: 0,
      createdAt: new Date(now).toISOString(),
    });
    await sendOtpEmail(email, code);
    return { ok: true, message: GENERIC };
  }

  async verifyOtp(
    rawEmail: string,
    code: string,
  ): Promise<{ ok: true; token: string; email: string } | { ok: false; error: string }> {
    const email = normalizeEmail(rawEmail);
    const otp = await this.store.getActiveOtp(email);
    if (!otp) {
      return { ok: false, error: "הקוד שגוי או שפג תוקפו" };
    }
    if (otp.attempts >= OTP_MAX_ATTEMPTS) {
      await this.store.deleteOtp(otp.id);
      return { ok: false, error: "הקוד שגוי או שפג תוקפו" };
    }
    if (!hashMatches(`${email}:${code.trim()}`, otp.codeHash)) {
      otp.attempts += 1;
      await this.store.updateOtp(otp);
      return { ok: false, error: "הקוד שגוי או שפג תוקפו" };
    }

    await this.store.deleteOtp(otp.id);
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
