import nodemailer from "nodemailer";

export function createMailTransport() {
  const host = process.env.SMTP_HOST || "smtp.gmail.com";
  const port = Number(process.env.SMTP_PORT || 465);
  const { SMTP_USER, SMTP_PASSWORD, SMTP_FROM } = process.env;
  if (!SMTP_USER || !SMTP_PASSWORD || !SMTP_FROM) {
    const error = new Error("Email delivery is not configured. Set SMTP_USER, SMTP_PASSWORD, and SMTP_FROM.");
    error.code = "EMAIL_NOT_CONFIGURED";
    throw error;
  }
  if (!Number.isInteger(port) || port < 1 || port > 65535) {
    throw new Error("SMTP_PORT must be a valid TCP port.");
  }
  return nodemailer.createTransport({
    host,
    port,
    secure: port === 465,
    auth: { user: SMTP_USER, pass: SMTP_PASSWORD },
  });
}
