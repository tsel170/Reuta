import nodemailer from "nodemailer";
import { config } from "../config.js";

export async function sendOtpEmail(to: string, code: string): Promise<void> {
  if (!config.smtpHost) {
    console.info(`[admin-otp] ${to} → ${code}`);
    return;
  }

  const transporter = nodemailer.createTransport({
    host: config.smtpHost,
    port: config.smtpPort,
    secure: config.smtpPort === 465,
    auth: config.smtpUser ? { user: config.smtpUser, pass: config.smtpPass } : undefined,
  });

  await transporter.sendMail({
    from: config.smtpFrom,
    to,
    subject: "קוד כניסה לאזור המנהלים",
    text: `קוד הכניסה שלך הוא ${code}. הקוד תקף ל-10 דקות.`,
    html: `<p>קוד הכניסה שלך הוא <strong>${code}</strong>.</p><p>הקוד תקף ל-10 דקות.</p>`,
  });
}
