import nodemailer from "nodemailer";
import { config } from "../config.js";

const SMTP_TIMEOUT_MS = 8000;

export async function sendOtpEmail(to: string, code: string): Promise<void> {
  if (!config.smtpHost) {
    console.info(`[admin-otp] ${to} → ${code}`);
    return;
  }

  const isGmail = /gmail\.com$/i.test(config.smtpHost);
  const transporter = nodemailer.createTransport(
    isGmail
      ? {
          service: "gmail",
          auth: { user: config.smtpUser, pass: config.smtpPass },
          connectionTimeout: SMTP_TIMEOUT_MS,
          greetingTimeout: SMTP_TIMEOUT_MS,
          socketTimeout: SMTP_TIMEOUT_MS,
        }
      : {
          host: config.smtpHost,
          port: config.smtpPort,
          secure: config.smtpPort === 465,
          requireTLS: config.smtpPort === 587,
          auth: config.smtpUser ? { user: config.smtpUser, pass: config.smtpPass } : undefined,
          connectionTimeout: SMTP_TIMEOUT_MS,
          greetingTimeout: SMTP_TIMEOUT_MS,
          socketTimeout: SMTP_TIMEOUT_MS,
        },
  );

  try {
    await transporter.sendMail({
      from: config.smtpFrom,
      to,
      subject: "קוד כניסה לאזור המנהלים",
      text: `קוד הכניסה שלך הוא ${code}. הקוד תקף ל-10 דקות.`,
      html: `<p>קוד הכניסה שלך הוא <strong>${code}</strong>.</p><p>הקוד תקף ל-10 דקות.</p>`,
    });
  } catch (error) {
    console.error("SMTP send failed", error);
    const failure = new Error(
      "לא ניתן לשלוח את קוד האימות למייל. ב-Render בדקו SMTP_USER, SMTP_PASS, ושימו SMTP_PORT=465.",
    );
    (failure as { statusCode?: number }).statusCode = 502;
    throw failure;
  }
}
