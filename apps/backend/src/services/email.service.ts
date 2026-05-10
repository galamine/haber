import nodemailer from 'nodemailer';
import config from '../config/config';
import logger from '../config/logger';

const transport = nodemailer.createTransport(config.email.smtp);

if (config.env !== 'test') {
  transport
    .verify()
    .then(() => logger.info('Connected to email server'))
    .catch(() => logger.warn('Unable to connect to email server. Make sure you have configured the SMTP options in .env'));
}

const sendEmail = async (to: string, subject: string, html: string, text: string) => {
  await transport.sendMail({ from: config.email.from, to, subject, html, text });
};

const sendOtpEmail = async (to: string, otp: string) => {
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
