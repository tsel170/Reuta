import dotenv from "dotenv";
import path from "node:path";
import { fileURLToPath } from "node:url";

const here = path.dirname(fileURLToPath(import.meta.url));
dotenv.config({ path: path.resolve(here, "../../.env") });
dotenv.config();

export const config = {
  port: Number(process.env.PORT ?? 3001),
  nodeEnv: process.env.NODE_ENV ?? "development",
  mongoUri: process.env.MONGODB_URI?.trim() ?? "",
  ingestSecret: process.env.INGEST_SECRET ?? "",
  storeTimezone: process.env.STORE_TIMEZONE ?? "Asia/Jerusalem",
  whatsappInviteUrl: process.env.WHATSAPP_INVITE_URL?.trim() ?? "",
  sessionSecret: process.env.SESSION_SECRET?.trim() || "dev-session-secret-change-me",
  adminEmails: (process.env.ADMIN_EMAILS ?? "")
    .split(",")
    .map((email) => email.trim().toLowerCase())
    .filter(Boolean),
  smtpHost: process.env.SMTP_HOST?.trim() ?? "",
  smtpPort: Number(process.env.SMTP_PORT ?? 587),
  smtpUser: process.env.SMTP_USER?.trim() ?? "",
  smtpPass: process.env.SMTP_PASS?.trim() ?? "",
  smtpFrom: process.env.SMTP_FROM?.trim() || process.env.SMTP_USER?.trim() || "reuota@localhost",
  dataFile: process.env.DATA_FILE
    ? path.resolve(process.env.DATA_FILE)
    : path.resolve(here, "../data/store.json"),
};

export const isProduction = config.nodeEnv === "production";
