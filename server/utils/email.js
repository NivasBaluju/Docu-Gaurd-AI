require('dotenv').config();
const nodemailer = require('nodemailer');

function getSmtpConfig() {
  const host = process.env.SMTP_HOST || 'smtp.gmail.com';
  const port = Number(process.env.SMTP_PORT) || 465;
  const user = process.env.SMTP_USER || process.env.EMAIL_USER;
  const pass = process.env.SMTP_PASS || process.env.EMAIL_PASS;
  const from = process.env.SMTP_FROM || `"Docu-Gaurd AI" <${user || 'no-reply@docu-gaurd.ai'}>`;

  if (!user || !pass) {
    return null;
  }

  return { host, port, secure: port === 465, user, pass, from };
}

async function getTransporter() {
  const config = getSmtpConfig();
  if (!config) return null;

  const transporter = nodemailer.createTransport({
    host: config.host,
    port: config.port,
    secure: config.secure,
    auth: { user: config.user, pass: config.pass },
    tls: { rejectUnauthorized: false }
  });

  return { transporter, from: config.from };
}

/** Send a styled Email OTP for Multi-Factor Authentication */
async function sendOtpEmail(toEmail, code) {
  const mailer = await getTransporter();
  if (!mailer) {
    console.log(`[DEV MODE] OTP for ${toEmail}: ${code} (no SMTP configured — set SMTP_USER & SMTP_PASS in .env to send real emails)`);
    return { devMode: true };
  }

  const html = `
    <div style="font-family: Arial, sans-serif; background-color: #0b0f19; color: #e2e8f0; padding: 30px; border-radius: 12px; max-width: 500px; margin: 0 auto; border: 1px solid #1e293b;">
      <div style="text-align: center; margin-bottom: 20px;">
        <h2 style="color: #38bdf8; margin: 0; font-size: 24px;">Docu-Gaurd AI</h2>
        <p style="color: #94a3b8; font-size: 13px; margin-top: 4px;">Enterprise AI Legal Copilot — SOC Security</p>
      </div>
      <div style="background-color: #1e293b; padding: 20px; border-radius: 8px; text-align: center;">
        <p style="margin-top: 0; color: #cbd5e1; font-size: 15px;">Your Multi-Factor Verification Code:</p>
        <div style="font-size: 32px; font-weight: bold; letter-spacing: 6px; color: #38bdf8; margin: 15px 0;">${code}</div>
        <p style="font-size: 12px; color: #94a3b8; margin-bottom: 0;">This code will expire in <strong>10 minutes</strong>. Do not share it with anyone.</p>
      </div>
      <div style="margin-top: 25px; font-size: 11px; color: #64748b; text-align: center;">
        <p>If you did not request this verification code, please secure your account immediately.</p>
      </div>
    </div>
  `;

  try {
    await mailer.transporter.sendMail({
      from: mailer.from,
      to: toEmail,
      subject: `[Docu-Gaurd AI] Verification Code: ${code}`,
      text: `Your Docu-Gaurd AI verification code is: ${code}. It expires in 10 minutes.`,
      html
    });
    return { devMode: false };
  } catch (err) {
    console.error('SMTP Email Send Error:', err.message);
    console.log(`[FALLBACK DEV MODE] OTP for ${toEmail}: ${code}`);
    return { devMode: true, error: err.message };
  }
}

/** Send Welcome Email upon registration */
async function sendWelcomeEmail(toEmail, name) {
  const mailer = await getTransporter();
  if (!mailer) return;

  const html = `
    <div style="font-family: Arial, sans-serif; background-color: #0b0f19; color: #e2e8f0; padding: 30px; border-radius: 12px; max-width: 550px; margin: 0 auto; border: 1px solid #1e293b;">
      <h2 style="color: #38bdf8; margin-top: 0;">Welcome to Docu-Gaurd AI, ${name}!</h2>
      <p style="color: #cbd5e1; line-height: 1.6;">Your enterprise account is ready. Docu-Gaurd AI provides SOC-grade security with AES-256 encryption, zero-trust session scoring, and automated AI legal contract analysis.</p>
      <div style="background-color: #1e293b; padding: 15px; border-radius: 8px; margin: 20px 0;">
        <h4 style="color: #38bdf8; margin-top: 0;">Getting Started:</h4>
        <ul style="color: #94a3b8; padding-left: 20px; margin: 0;">
          <li>Upload PDF, DOCX, or TXT legal contracts for instant clause analysis.</li>
          <li>Enable Multi-Factor Authentication (MFA) in Security Center.</li>
          <li>Generate custom legal contracts with cryptographic RSA signatures.</li>
        </ul>
      </div>
      <p style="font-size: 12px; color: #64748b; text-align: center; margin-top: 25px;">Docu-Gaurd AI Security Operations</p>
    </div>
  `;

  try {
    await mailer.transporter.sendMail({
      from: mailer.from,
      to: toEmail,
      subject: 'Welcome to Docu-Gaurd AI',
      text: `Welcome to Docu-Gaurd AI, ${name}! Your account is initialized.`,
      html
    });
  } catch (err) {
    console.error('Welcome email failed:', err.message);
  }
}

/** Send Security Alert notification */
async function sendSecurityAlertEmail(toEmail, alertType, details) {
  const mailer = await getTransporter();
  if (!mailer) return;

  const html = `
    <div style="font-family: Arial, sans-serif; background-color: #0b0f19; color: #e2e8f0; padding: 30px; border-radius: 12px; max-width: 550px; margin: 0 auto; border: 1px solid #ef4444;">
      <h2 style="color: #ef4444; margin-top: 0;">⚠️ Docu-Gaurd Security Alert</h2>
      <p style="color: #cbd5e1;">A security event was detected on your Docu-Gaurd AI account:</p>
      <div style="background-color: #1e293b; padding: 15px; border-radius: 8px; margin: 20px 0; border-left: 4px solid #ef4444;">
        <p style="margin: 0; color: #f87171; font-weight: bold;">Alert: ${alertType}</p>
        <p style="margin: 5px 0 0 0; color: #94a3b8; font-size: 13px;">${details}</p>
      </div>
      <p style="font-size: 12px; color: #64748b; text-align: center;">If this action was not authorized by you, please change your password immediately.</p>
    </div>
  `;

  try {
    await mailer.transporter.sendMail({
      from: mailer.from,
      to: toEmail,
      subject: `[Security Alert] Docu-Gaurd AI: ${alertType}`,
      text: `Security Alert: ${alertType} - ${details}`,
      html
    });
  } catch (err) {
    console.error('Security alert email failed:', err.message);
  }
}

module.exports = {
  sendOtpEmail,
  sendWelcomeEmail,
  sendSecurityAlertEmail
};
