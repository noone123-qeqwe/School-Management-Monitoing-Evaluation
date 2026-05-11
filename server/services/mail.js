'use strict';
/**
 * Optional SMTP mailer (Nodemailer). If SMTP is not configured, all sends no-op safely.
 *
 * Env (any missing → mail disabled):
 *   SMTP_HOST, SMTP_PORT, SMTP_USER, SMTP_PASS
 *   SMTP_SECURE=true   (465 TLS)
 *   MAIL_FROM="SMME Portal <noreply@example.gov.ph>"
 */
const nodemailer = require('nodemailer');

let transporter = null;
let warnedDisabled = false;

function isMailConfigured() {
  return Boolean(
    process.env.SMTP_HOST &&
    process.env.SMTP_PORT &&
    process.env.SMTP_USER &&
    process.env.SMTP_PASS
  );
}

function getTransport() {
  if (!isMailConfigured()) {
    if (!warnedDisabled && process.env.NODE_ENV !== 'test') {
      warnedDisabled = true;
      console.log('[mail] SMTP not configured — outbound email disabled (set SMTP_* env vars to enable).');
    }
    return null;
  }
  if (!transporter) {
    transporter = nodemailer.createTransport({
      host: process.env.SMTP_HOST,
      port: parseInt(process.env.SMTP_PORT, 10) || 587,
      secure: String(process.env.SMTP_SECURE).toLowerCase() === 'true',
      auth: {
        user: process.env.SMTP_USER,
        pass: process.env.SMTP_PASS,
      },
    });
  }
  return transporter;
}

/**
 * @param {{ to: string, subject: string, html: string, text?: string }} opts
 * @returns {Promise<boolean>} true if sent, false if skipped/failed (failure logged)
 */
async function sendMail(opts) {
  const transport = getTransport();
  if (!transport) return false;
  const from = process.env.MAIL_FROM || process.env.SMTP_USER || 'noreply@localhost';
  try {
    await transport.sendMail({
      from,
      to: opts.to,
      subject: opts.subject,
      text: opts.text || opts.html.replace(/<[^>]+>/g, ' ').replace(/\s+/g, ' ').trim(),
      html: opts.html,
    });
    return true;
  } catch (err) {
    console.error('[mail] send failed:', err.message);
    return false;
  }
}

module.exports = { sendMail, isMailConfigured };
