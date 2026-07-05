import nodemailer from "nodemailer";

const getMailTransporter = () => {
  const host = process.env.SMTP_HOST;
  const port = Number(process.env.SMTP_PORT || 587);
  const user = process.env.SMTP_USER;
  const pass = process.env.SMTP_PASS?.replace(/\s+/g, "");

  if (!host || !user || !pass) {
    return null;
  }

  return nodemailer.createTransport({
    host,
    port,
    secure: port === 465,
    auth: {
      user,
      pass,
    },
  });
};

export const sendJsonExportMail = async ({
  to,
  subject,
  text,
  filename,
  payload,
}: {
  to: string;
  subject: string;
  text: string;
  filename: string;
  payload: Record<string, any>;
}) => {
  const transporter = getMailTransporter();
  const from = process.env.MAIL_FROM || process.env.SMTP_USER;

  if (!transporter || !from) {
    throw new Error("Email service is not configured");
  }

  await transporter.sendMail({
    from,
    to,
    subject,
    text,
    attachments: [
      {
        filename,
        content: JSON.stringify(payload, null, 2),
        contentType: "application/json",
      },
    ],
  });
};
