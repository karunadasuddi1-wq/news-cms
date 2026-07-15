const jwt = require('jsonwebtoken');
const { Resend } = require('resend');
const asyncHandler = require('../utils/asyncHandler');
const { GuestOtp, GuestChatMessage } = require('../models');
const { getSetting } = require('./settingController');
const config = require('../config/env');

const OTP_EXPIRY_MINUTES = 10;
const SESSION_EXPIRY = '24h';

function generateCode() {
  return String(Math.floor(100000 + Math.random() * 900000));
}

async function sendOtpEmail(email, code, siteName) {
  const apiKey = process.env.RESEND_API_KEY;
  if (!apiKey) {
    throw new Error('Email sending is not configured (RESEND_API_KEY missing). Contact the site admin.');
  }
  const resend = new Resend(apiKey);
  const fromAddress = process.env.RESEND_FROM_EMAIL || 'onboarding@resend.dev';

  const { error } = await resend.emails.send({
    from: `${siteName || 'Contributor Desk'} <${fromAddress}>`,
    to: email,
    subject: `Your verification code: ${code}`,
    html: `
      <div style="font-family: sans-serif; max-width: 480px; margin: 0 auto;">
        <p>Your one-time code to submit an article is:</p>
        <p style="font-size: 32px; font-weight: bold; letter-spacing: 4px;">${code}</p>
        <p style="color: #666; font-size: 13px;">This code expires in ${OTP_EXPIRY_MINUTES} minutes. If you didn't request this, you can safely ignore this email.</p>
      </div>
    `,
  });

  if (error) throw new Error(error.message || 'Failed to send verification email.');
}

const requestOtp = asyncHandler(async (req, res) => {
  const { email, token } = req.body;

  if (!email || !/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(email)) {
    return res.status(400).json({ error: 'Please enter a valid email address.' });
  }

  const configuredToken = await getSetting('guest_submission_token', null);
  if (!configuredToken || token !== configuredToken) {
    return res.status(403).json({ error: 'Invalid or expired submission link.' });
  }

  const code = generateCode();
  const expiresAt = new Date(Date.now() + OTP_EXPIRY_MINUTES * 60 * 1000);

  await GuestOtp.create({ email: email.toLowerCase().trim(), code, expiresAt });

  const siteName = await getSetting('site_name', null);
  try {
    await sendOtpEmail(email, code, siteName);
  } catch (err) {
    return res.status(502).json({ error: err.message });
  }

  res.json({ ok: true, message: 'Check your email for the verification code.' });
});

const verifyOtp = asyncHandler(async (req, res) => {
  const { email, code, token } = req.body;
  if (!email || !code) {
    return res.status(400).json({ error: 'Email and code are required.' });
  }

  const configuredToken = await getSetting('guest_submission_token', null);
  if (!configuredToken || token !== configuredToken) {
    return res.status(403).json({ error: 'Invalid or expired submission link.' });
  }

  const normalizedEmail = email.toLowerCase().trim();
  const otp = await GuestOtp.findOne({
    where: { email: normalizedEmail, code: String(code).trim() },
    order: [['createdAt', 'DESC']],
  });

  if (!otp) return res.status(400).json({ error: 'Incorrect code. Please check your email and try again.' });
  if (otp.verifiedAt) return res.status(400).json({ error: 'This code has already been used. Request a new one.' });
  if (new Date() > otp.expiresAt) return res.status(400).json({ error: 'This code has expired. Request a new one.' });

  otp.verifiedAt = new Date();
  await otp.save();

  const sessionToken = jwt.sign(
    { email: normalizedEmail, type: 'guest', token },
    config.jwtSecret,
    { expiresIn: SESSION_EXPIRY }
  );

  res.json({ ok: true, sessionToken, email: normalizedEmail });
});

const getChatHistory = asyncHandler(async (req, res) => {
  const messages = await GuestChatMessage.findAll({
    where: { email: req.guestEmail },
    order: [['createdAt', 'ASC']],
    attributes: ['id', 'fromType', 'text', 'imageUrl', 'tone', 'createdAt'],
  });
  res.json({ messages });
});

module.exports = { requestOtp, verifyOtp, getChatHistory };
