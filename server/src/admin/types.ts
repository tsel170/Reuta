export type AdminRole = "admin";

export type AdminEmailRecord = {
  email: string;
  role: AdminRole;
  createdAt: string;
};

export type AdminOtpRecord = {
  id: string;
  email: string;
  codeHash: string;
  expiresAt: string;
  attempts: number;
  createdAt: string;
};

export type AdminSessionRecord = {
  id: string;
  tokenHash: string;
  email: string;
  expiresAt: string;
  createdAt: string;
};

export interface AdminStore {
  kind: "file" | "mongo";
  ready(): Promise<void>;
  bootstrapEmails(emails: string[]): Promise<void>;
  hasEmail(email: string): Promise<boolean>;
  listEmails(): Promise<AdminEmailRecord[]>;
  addEmail(email: string, role?: AdminRole): Promise<AdminEmailRecord>;
  replaceOtpsForEmail(email: string, otp: AdminOtpRecord): Promise<void>;
  getActiveOtp(email: string): Promise<AdminOtpRecord | null>;
  updateOtp(otp: AdminOtpRecord): Promise<void>;
  deleteOtp(id: string): Promise<void>;
  createSession(session: AdminSessionRecord): Promise<void>;
  getSessionByTokenHash(tokenHash: string): Promise<AdminSessionRecord | null>;
  deleteSession(id: string): Promise<void>;
  deleteExpired(): Promise<void>;
}
