import nodemailer from "nodemailer";
import { config } from "../config.js";

const SMTP_TIMEOUT_MS = 8000;

function mailError(message: string): Error {
  const failure = new Error(message);
  (failure as { statusCode?: number }).statusCode = 502;
  return failure;
}

function messageBodies(code: string) {
  return {
    subject: "קוד כניסה לאזור המנהלים",
    text: `קוד הכניסה שלך הוא ${code}. הקוד תקף ל-10 דקות.`,
    html: `<p>קוד הכניסה שלך הוא <strong>${code}</strong>.</p><p>הקוד תקף ל-10 דקות.</p>`,
  };
}

async function sendViaResend(to: string, code: string): Promise<void> {
  const from = config.smtpFrom.includes("@")
    ? config.smtpFrom
    : "רעותה <onboarding@resend.dev>";
  const body = messageBodies(code);
  const response = await fetch("https://api.resend.com/emails", {
    method: "POST",
    headers: {
      Authorization: `Bearer ${config.resendApiKey}`,
      "Content-Type": "application/json",
    },
    body: JSON.stringify({
      from,
      to: [to],
      subject: body.subject,
      text: body.text,
      html: body.html,
    }),
  });
  if (!response.ok) {
    const detail = await response.text();
    console.error("Resend send failed", response.status, detail);
    throw mailError("לא ניתן לשלוח את קוד האימות למייל. בדקו את RESEND_API_KEY ב-Render.");
  }
}

async function sendViaSmtp(to: string, code: string): Promise<void> {
  const body = messageBodies(code);
  const transporter = nodemailer.createTransport({
    host: config.smtpHost,
    port: config.smtpPort,
    secure: config.smtpPort === 465,
    requireTLS: config.smtpPort === 587,
    auth: config.smtpUser ? { user: config.smtpUser, pass: config.smtpPass } : undefined,
    connectionTimeout: SMTP_TIMEOUT_MS,
    greetingTimeout: SMTP_TIMEOUT_MS,
    socketTimeout: SMTP_TIMEOUT_MS,
  });

  await transporter.sendMail({
    from: config.smtpFrom,
    to,
    subject: body.subject,
    text: body.text,
    html: body.html,
  });
}

export async function sendOtpEmail(to: string, code: string): Promise<void> {
  if (config.resendApiKey) {
    await sendViaResend(to, code);
    return;
  }

  if (!config.smtpHost) {
    console.info(`[admin-otp] ${to} → ${code}`);
    return;
  }

  try {
    await sendViaSmtp(to, code);
  } catch (error) {
    console.error("SMTP send failed", error);
    throw mailError(
      "Render חוסם שליחת SMTP ל-Gmail. הוסיפו RESEND_API_KEY ב-Render (חינם ב-resend.com).",
    );
  }
}
