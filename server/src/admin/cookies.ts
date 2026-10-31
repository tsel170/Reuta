import type { Request, Response } from "express";
import { isProduction } from "../config.js";

export const ADMIN_COOKIE = "reuota_admin";
const MAX_AGE_MS = 30 * 24 * 60 * 60 * 1000;
const MAX_AGE_SEC = Math.floor(MAX_AGE_MS / 1000);

function cookieOptions(): string {
  const parts = ["Path=/", `Max-Age=${MAX_AGE_SEC}`, "HttpOnly", "SameSite=Lax"];
  if (isProduction) parts.push("Secure");
  return parts.join("; ");
}

export function readCookie(req: Request, name: string): string | undefined {
  const header = req.headers.cookie;
  if (!header) return undefined;
  for (const part of header.split(";")) {
    const [key, ...rest] = part.trim().split("=");
    if (key === name) return decodeURIComponent(rest.join("="));
  }
  return undefined;
}

export function readAuthToken(req: Request): string | undefined {
  const fromCookie = readCookie(req, ADMIN_COOKIE);
  if (fromCookie) return fromCookie;
  const header = req.headers.authorization ?? "";
  const match = /^Bearer\s+(\S+)/i.exec(header);
  return match?.[1];
}

export function setAdminCookie(res: Response, token: string): void {
  const expires = new Date(Date.now() + MAX_AGE_MS).toUTCString();
  res.append(
    "Set-Cookie",
    `${ADMIN_COOKIE}=${encodeURIComponent(token)}; ${cookieOptions()}; Expires=${expires}`,
  );
}

export function clearAdminCookie(res: Response): void {
  res.append(
    "Set-Cookie",
    `${ADMIN_COOKIE}=; Path=/; Max-Age=0; HttpOnly; SameSite=Lax${isProduction ? "; Secure" : ""}`,
  );
}

export const SESSION_MS = MAX_AGE_MS;
export const OTP_MS = 10 * 60 * 1000;
export const OTP_MAX_ATTEMPTS = 5;
