import nodemailer from 'nodemailer';
import config from '../config/config';
import logger from '../config/logger';

// Log SMTP config at startup (redact password) so misconfigured env is immediately visible
logger.info('[email] SMTP config loaded', {
  host: config.email.smtp.host,
  port: config.email.smtp.port,
  user: config.email.smtp.auth.user,
  from: config.email.from,
  passSet: !!config.email.smtp.auth.pass,
});

const transport = nodemailer.createTransport(config.email.smtp);

if (config.env !== 'test') {
  transport
    .verify()
    .then(() => logger.info('[email] SMTP connection verified successfully'))
    .catch((err: unknown) =>
      logger.warn('[email] SMTP connection verification failed', { error: err instanceof Error ? err.message : err })
    );
}

const sendEmail = async (to: string, subject: string, html: string, text: string) => {
  logger.info('[email] Sending email', { to, subject, from: config.email.from });
  try {
    const info = await transport.sendMail({ from: config.email.from, to, subject, html, text });
    logger.info('[email] Email sent successfully', { messageId: info.messageId, to, subject });
  } catch (err: unknown) {
    logger.error('[email] Failed to send email', {
      to,
      subject,
      error: err instanceof Error ? err.message : err,
      stack: err instanceof Error ? err.stack : undefined,
    });
    throw err;
  }
};

const sendOtpEmail = async (to: string, otp: string) => {
  logger.info('[email] Sending OTP email', { to });
  const subject = 'Your Haber login code';
  const html = `
    <div style="font-family:sans-serif;max-width:480px;margin:0 auto;padding:32px">
      <h2 style="color:#1a1a2e;margin-bottom:8px">Haber</h2>
      <p style="color:#444;margin-bottom:24px">Use the code below to sign in. It expires in <strong>10 minutes</strong>.</p>
      <div style="background:#f4f4f8;border-radius:8px;padding:24px;text-align:center;letter-spacing:12px;font-size:36px;font-weight:700;color:#1a1a2e">
        ${otp}
      </div>
      <p style="color:#888;font-size:13px;margin-top:24px">If you did not request this code, you can safely ignore this email.</p>
    </div>
  `;
  const text = `Your Haber login code is: ${otp}\nThis code expires in 10 minutes.`;
  await sendEmail(to, subject, html, text);
};

export const emailService = {
  transport,
  sendEmail,
  sendOtpEmail,
};
