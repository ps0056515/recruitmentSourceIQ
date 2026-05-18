import nodemailer from "nodemailer";

export type SendEmailInput = {
  to: string;
  subject: string;
  body: string;
  from?: string;
};

export function isEmailConfigured(): boolean {
  return Boolean(process.env.SMTP_HOST && process.env.SMTP_USER);
}

export async function sendEmail(input: SendEmailInput): Promise<{ messageId: string; provider: string }> {
  const host = process.env.SMTP_HOST;
  const user = process.env.SMTP_USER;
  const pass = process.env.SMTP_PASS;
  if (!host || !user) {
    throw new Error("email_not_configured");
  }

  const transporter = nodemailer.createTransport({
    host,
    port: Number(process.env.SMTP_PORT ?? 587),
    secure: process.env.SMTP_SECURE === "true",
    auth: pass ? { user, pass } : undefined,
  });

  const from = input.from ?? process.env.SMTP_FROM ?? user;
  const info = await transporter.sendMail({
    from,
    to: input.to,
    subject: input.subject,
    text: input.body,
    html: input.body.replace(/\n/g, "<br>"),
  });

  return { messageId: info.messageId, provider: "smtp" };
}
