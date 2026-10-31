import mongoose from "mongoose";
import { config } from "../config.js";
import { AdminEmailModel, AdminOtpModel, AdminSessionModel } from "../db/mongoModels.js";
import type {
  AdminEmailRecord,
  AdminOtpRecord,
  AdminRole,
  AdminSessionRecord,
  AdminStore,
} from "./types.js";

export class MongoAdminStore implements AdminStore {
  kind = "mongo" as const;

  async ready(): Promise<void> {
    if (mongoose.connection.readyState === 1) return;
    await mongoose.connect(config.mongoUri);
  }

  async bootstrapEmails(emails: string[]): Promise<void> {
    for (const email of emails) {
      await AdminEmailModel.updateOne(
        { email },
        {
          $setOnInsert: {
            email,
            role: "admin",
            createdAt: new Date().toISOString(),
          },
        },
        { upsert: true },
      );
    }
  }

  async hasEmail(email: string): Promise<boolean> {
    return Boolean(await AdminEmailModel.exists({ email }));
  }

  async listEmails(): Promise<AdminEmailRecord[]> {
    const docs = await AdminEmailModel.find().sort({ email: 1 });
    return docs.map((doc) => ({
      email: doc.email,
      role: (doc.role as AdminRole) ?? "admin",
      createdAt: doc.createdAt,
    }));
  }

  async addEmail(email: string, role: AdminRole = "admin"): Promise<AdminEmailRecord> {
    const existing = await AdminEmailModel.findOne({ email });
    if (existing) {
      return { email: existing.email, role: existing.role as AdminRole, createdAt: existing.createdAt };
    }
    const createdAt = new Date().toISOString();
    await AdminEmailModel.create({ email, role, createdAt });
    return { email, role, createdAt };
  }

  async replaceOtpsForEmail(email: string, otp: AdminOtpRecord): Promise<void> {
    await AdminOtpModel.deleteMany({ email });
    await AdminOtpModel.create({
      email: otp.email,
      codeHash: otp.codeHash,
      expiresAt: otp.expiresAt,
      attempts: otp.attempts,
      createdAt: otp.createdAt,
    });
  }

  async getActiveOtp(email: string): Promise<AdminOtpRecord | null> {
    const doc = await AdminOtpModel.findOne({
      email,
      expiresAt: { $gt: new Date().toISOString() },
    }).sort({ createdAt: -1 });
    return doc ? toOtp(doc.toObject()) : null;
  }

  async updateOtp(otp: AdminOtpRecord): Promise<void> {
    await AdminOtpModel.findByIdAndUpdate(otp.id, {
      attempts: otp.attempts,
      expiresAt: otp.expiresAt,
    });
  }

  async deleteOtp(id: string): Promise<void> {
    await AdminOtpModel.findByIdAndDelete(id);
  }

  async createSession(session: AdminSessionRecord): Promise<void> {
    await AdminSessionModel.create({
      tokenHash: session.tokenHash,
      email: session.email,
      expiresAt: session.expiresAt,
      createdAt: session.createdAt,
    });
  }

  async getSessionByTokenHash(tokenHash: string): Promise<AdminSessionRecord | null> {
    const doc = await AdminSessionModel.findOne({ tokenHash });
    if (!doc) return null;
    if (new Date(doc.expiresAt).getTime() <= Date.now()) {
      await AdminSessionModel.findByIdAndDelete(doc._id);
      return null;
    }
    return {
      id: String(doc._id),
      tokenHash: doc.tokenHash,
      email: doc.email,
      expiresAt: doc.expiresAt,
      createdAt: doc.createdAt,
    };
  }

  async deleteSession(id: string): Promise<void> {
    await AdminSessionModel.findByIdAndDelete(id);
  }

  async deleteExpired(): Promise<void> {
    const now = new Date().toISOString();
    await Promise.all([
      AdminOtpModel.deleteMany({ expiresAt: { $lte: now } }),
      AdminSessionModel.deleteMany({ expiresAt: { $lte: now } }),
    ]);
  }
}

function toOtp(value: Record<string, unknown>): AdminOtpRecord {
  return {
    id: String(value._id ?? value.id),
    email: String(value.email),
    codeHash: String(value.codeHash),
    expiresAt: String(value.expiresAt),
    attempts: Number(value.attempts ?? 0),
    createdAt: String(value.createdAt),
  };
}
