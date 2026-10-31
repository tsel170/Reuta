import { createHash, createHmac, randomBytes, randomInt, timingSafeEqual } from "node:crypto";
import { config } from "../config.js";

export function hashValue(value: string): string {
  return createHmac("sha256", config.sessionSecret).update(value).digest("hex");
}

export function hashMatches(value: string, storedHash: string): boolean {
  const actual = hashValue(value);
  const left = Buffer.from(actual);
  const right = Buffer.from(storedHash);
  if (left.length !== right.length) return false;
  return timingSafeEqual(left, right);
}

export function randomToken(): string {
  return randomBytes(32).toString("hex");
}

export function randomOtp(): string {
  return String(randomInt(0, 1_000_000)).padStart(6, "0");
}

export function sha256(value: string): string {
  return createHash("sha256").update(value).digest("hex");
}
