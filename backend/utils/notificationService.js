import nodemailer from 'nodemailer';
import { Notification, User } from '../db.js';

const isConfigured = (...values) => values.every((value) => value && String(value).trim());

const maskMobile = (mobile = '') => {
  const digits = String(mobile).replace(/\D/g, '');
  if (digits.length <= 4) return '****';
  return `${'*'.repeat(Math.max(digits.length - 4, 0))}${digits.slice(-4)}`;
};

const buildSmsRecipient = (mobile = '') => {
  return String(mobile).replace(/\D/g, '');
};

const buildOtpMessage = (otp) => {
  return [
    process.env.SMS_MESSAGE_TEMPLATE || 'Your%20OTP%20for%20BJS%20app%20login%20is:',
    otp,
    process.env.SMS_MESSAGE_TEMPLATE_SECOND_PART || ''
  ].join('');
};

const redactSensitiveResponse = (text = '', otp = '') => {
  let redacted = String(text);
  if (otp) {
    redacted = redacted.replaceAll(String(otp), '[OTP]');
  }
  return redacted.replace(/\s+/g, ' ').slice(0, 250);
};

const getMailTransport = () => {
  if (!isConfigured(process.env.SMTP_HOST, process.env.SMTP_PORT, process.env.MAIL_USERNAME, process.env.MAIL_PASSWORD)) {
    return null;
  }

  const encryption = (process.env.SMTP_ENCRYPTION || '').toLowerCase();
  return nodemailer.createTransport({
    host: process.env.SMTP_HOST,
    port: Number(process.env.SMTP_PORT),
    secure: encryption === 'ssl' || encryption === 'tls' || Number(process.env.SMTP_PORT) === 465,
    auth: {
      user: process.env.MAIL_USERNAME,
      pass: process.env.MAIL_PASSWORD
    }
  });
};

const createInAppNotification = async (userId, message) => {
  const newNotification = new Notification({
    id: `notif_${Date.now()}_${Math.random().toString(36).substr(2, 5)}`,
    userId,
    message,
    date: new Date(),
    read: false
  });
  await newNotification.save();
  return newNotification;
};

export const sendEmail = async ({ to, subject, text, html }) => {
  if (!to) return { skipped: true, reason: 'missing_recipient' };

  const transport = getMailTransport();
  if (!transport) {
    console.log(`[Email skipped] SMTP is not configured. To: ${to}, Subject: ${subject}`);
    return { skipped: true, reason: 'smtp_not_configured' };
  }

  const fromAddress = process.env.MAIL_FROM_ADDRESS || process.env.MAIL_USERNAME;
  const fromName = process.env.MAIL_FROM_NAME || 'Counselling Program';
  return transport.sendMail({
    from: `"${fromName}" <${fromAddress}>`,
    to,
    subject,
    text,
    html
  });
};

export const sendOtpSms = async (mobile, otp) => {
  const recipient = buildSmsRecipient(mobile);
  const message = buildOtpMessage(otp);

  if (!isConfigured(process.env.SMS_API_URL, process.env.SMS_API_KEY)) {
    console.log(`[SMS skipped] SMS gateway is not configured. mobile=${maskMobile(recipient)}`);
    throw new Error('SMS gateway is not configured.');
  }

  console.log(`[SMS request] mobile=${maskMobile(recipient)}`);

  const url = [
    process.env.SMS_API_URL,
    `?APIKEY=${encodeURIComponent(process.env.SMS_API_KEY)}`,
    `&MobileNo=${encodeURIComponent(recipient)}`,
    `&SenderID=${encodeURIComponent(process.env.SMS_SENDER_ID || '')}`,
    `&Message=${message}`,
    '&ServiceName=TEMPLATE_BASED',
    `&DLTTemplateID=${encodeURIComponent(process.env.SMS_TEMPLATE_ID || '')}`
  ].join('');

  const response = await fetch(url);

  const responseText = await response.text();
  const responsePreview = redactSensitiveResponse(responseText, otp);
  console.log(`[SMS gateway] status=${response.status} mobile=${maskMobile(recipient)} response="${responsePreview}"`);

  if (!response.ok || /invalid parameters|error|failed/i.test(responseText)) {
    throw new Error(`SMS gateway failed with ${response.status}: ${responsePreview}`);
  }

  try {
    const data = JSON.parse(responseText);
    if (data.status && data.status !== 'success') {
      throw new Error(`SMS gateway failed with ${response.status}: ${responsePreview}`);
    }
    return { success: true, providerResponse: data };
  } catch (error) {
    if (error.message.startsWith('SMS gateway failed')) throw error;
    return { success: true, providerResponse: responseText };
  }
};

export const sendNotification = async (userId, message, options = {}) => {
  try {
    const notification = await createInAppNotification(userId, message);
    const user = options.user || await User.findOne({ id: userId });

    await sendEmail({
      to: options.email || user?.email,
      subject: options.subject || 'Counselling Program notification',
      text: options.emailText || message,
      html: options.emailHtml
    });

    console.log(`[Notification to ${userId}] ${message}`);
    return notification;
  } catch (error) {
    console.error('Error sending notification:', error);
    return null;
  }
};

export const accountStatusNotification = (suspended) => ({
  message: suspended
    ? process.env.ACCOUNT_DEACTIVATED_TEMPLATE || 'Your account has been deactivated.'
    : process.env.ACCOUNT_REACTIVATED_TEMPLATE || 'Your account has been reactivated.',
  subject: suspended ? 'Account deactivated' : 'Account reactivated'
});
