import { mkdir, readFile, writeFile } from "node:fs/promises";
import path from "node:path";
import { config } from "../config.js";
import type {
  AdminEmailRecord,
  AdminOtpRecord,
  AdminRole,
  AdminSessionRecord,
  AdminStore,
} from "./types.js";

type FileShape = {
  emails: AdminEmailRecord[];
  otps: AdminOtpRecord[];
  sessions: AdminSessionRecord[];
};

const empty = (): FileShape => ({ emails: [], otps: [], sessions: [] });

export class FileAdminStore implements AdminStore {
  kind = "file" as const;
  private data = empty();
  private loaded = false;

  constructor(
    private readonly filePath = path.join(path.dirname(config.dataFile), "admin.json"),
  ) {}

  async ready(): Promise<void> {
    if (this.loaded) return;
    try {
      this.data = { ...empty(), ...JSON.parse(await readFile(this.filePath, "utf8")) };
    } catch {
      this.data = empty();
      await this.persist();
    }
    this.loaded = true;
  }

  async bootstrapEmails(emails: string[]): Promise<void> {
    await this.ready();
    for (const email of emails) {
      if (!this.data.emails.some((item) => item.email === email)) {
        this.data.emails.push({
          email,
          role: "admin",
          createdAt: new Date().toISOString(),
        });
      }
    }
    await this.persist();
  }

  async hasEmail(email: string): Promise<boolean> {
    await this.ready();
    return this.data.emails.some((item) => item.email === email);
  }

  async listEmails(): Promise<AdminEmailRecord[]> {
    await this.ready();
    return [...this.data.emails];
  }

  async addEmail(email: string, role: AdminRole = "admin"): Promise<AdminEmailRecord> {
    await this.ready();
    const existing = this.data.emails.find((item) => item.email === email);
    if (existing) return existing;
    const record = { email, role, createdAt: new Date().toISOString() };
    this.data.emails.push(record);
    await this.persist();
    return record;
  }

  async replaceOtpsForEmail(email: string, otp: AdminOtpRecord): Promise<void> {
    await this.ready();
    this.data.otps = this.data.otps.filter((item) => item.email !== email);
    this.data.otps.push(otp);
    await this.persist();
  }

  async getActiveOtp(email: string): Promise<AdminOtpRecord | null> {
    await this.ready();
    const now = Date.now();
    return (
      this.data.otps.find(
        (item) => item.email === email && new Date(item.expiresAt).getTime() > now,
      ) ?? null
    );
  }

  async updateOtp(otp: AdminOtpRecord): Promise<void> {
    await this.ready();
    const index = this.data.otps.findIndex((item) => item.id === otp.id);
    if (index >= 0) this.data.otps[index] = otp;
    await this.persist();
  }

  async deleteOtp(id: string): Promise<void> {
    await this.ready();
    this.data.otps = this.data.otps.filter((item) => item.id !== id);
    await this.persist();
  }

  async createSession(session: AdminSessionRecord): Promise<void> {
    await this.ready();
    this.data.sessions.push(session);
    await this.persist();
  }

  async getSessionByTokenHash(tokenHash: string): Promise<AdminSessionRecord | null> {
    await this.ready();
    const session = this.data.sessions.find((item) => item.tokenHash === tokenHash);
    if (!session) return null;
    if (new Date(session.expiresAt).getTime() <= Date.now()) {
      await this.deleteSession(session.id);
      return null;
    }
    return session;
  }

  async deleteSession(id: string): Promise<void> {
    await this.ready();
    this.data.sessions = this.data.sessions.filter((item) => item.id !== id);
    await this.persist();
  }

  async deleteExpired(): Promise<void> {
    await this.ready();
    const now = Date.now();
    this.data.otps = this.data.otps.filter((item) => new Date(item.expiresAt).getTime() > now);
    this.data.sessions = this.data.sessions.filter(
      (item) => new Date(item.expiresAt).getTime() > now,
    );
    await this.persist();
  }

  private async persist(): Promise<void> {
    await mkdir(path.dirname(this.filePath), { recursive: true });
    await writeFile(this.filePath, JSON.stringify(this.data, null, 2), "utf8");
  }
}
