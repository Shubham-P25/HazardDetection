const nodemailer = require('nodemailer');
const config = require('../config');
let transporter;

async function sendEmailAlert(payload) {
  const to = payload.to || config.EMAIL_TO;
  if (!config.EMAIL_USER || !config.EMAIL_PASS || !to) throw new Error('Email alert configuration is incomplete');
  transporter ||= nodemailer.createTransport({ service: 'gmail', auth: { user: config.EMAIL_USER, pass: config.EMAIL_PASS } });
  await transporter.sendMail({
    from: config.EMAIL_USER,
    to,
    subject: `[${payload.type}] HazardGuard alert`,
    html: `<h2>${payload.type} alert</h2><p><strong>${payload.sensor}</strong>: ${payload.message}</p><p>Risk: ${payload.riskScore}/100</p>`,
  });
}

module.exports = { sendEmailAlert };
