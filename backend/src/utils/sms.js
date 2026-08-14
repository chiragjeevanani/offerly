import crypto from 'crypto';
import dotenv from 'dotenv';
import { normalizePhone, withCountryCode } from './phone.js';

dotenv.config();

const parseNumbers = (value = '') =>
  value
    .split(',')
    .map((item) => normalizePhone(item))
    .filter(Boolean);

export const getRoleDevNumbers = (role) => {
  if (role === 'merchant') {
    return parseNumbers(process.env.DEFAULT_MERCHANT_DEV_NUMBERS || '0987654321,8888888881,9876543210,9999999999');
  }
  return parseNumbers(process.env.DEFAULT_CUSTOMER_DEV_NUMBERS || '1234567890,9999999991,9876543210,9999999999');
};

export const isDevOtpNumber = (phone, role) => {
  const normalized = normalizePhone(phone);
  return getRoleDevNumbers(role).includes(normalized);
};

export const generateOTP = () => Math.floor(100000 + Math.random() * 900000).toString();

export const hashOtp = (otp) =>
  crypto.createHash('sha256').update(`${otp}:${process.env.JWT_SECRET || 'offerly'}`).digest('hex');

export const smsTemplate = (otp) => {
  const template =
    process.env.SMSINDIAHUB_MESSAGE_TEMPLATE ||
    'Welcome to Offerly. Your OTP for registration is {otp}';
  return template.replace('{otp}', otp);
};

export const sendSMS = async (phone, otp, role) => {
  if (isDevOtpNumber(phone, role)) {
    return {
      success: true,
      skipped: true,
      message: 'OTP skipped for configured dev number',
    };
  }

  const apiKey = process.env.SMSINDIAHUB_API_KEY;
  const senderId = process.env.SMSINDIAHUB_SENDER_ID || 'SMSHUB';
  const mobile = withCountryCode(phone);
  const message = smsTemplate(otp);

  if (!apiKey || apiKey === 'your_sms_hub_api_key') {
    console.warn(`[MOCK SMS] To ${mobile}: ${message}`);
    return { success: true, skipped: true, message: 'OTP logged in mock mode' };
  }

  const url = new URL('https://cloud.smsindiahub.in/vendorsms/pushsms.aspx');
  url.searchParams.set('APIKey', apiKey);
  url.searchParams.set('msisdn', mobile);
  url.searchParams.set('sid', senderId);
  url.searchParams.set('msg', message);
  url.searchParams.set('fl', '0');
  url.searchParams.set('gwid', '2');

  const response = await fetch(url.toString(), { method: 'GET' });
  const body = await response.text();

  if (!response.ok) {
    throw new Error(`SMS India Hub request failed with status ${response.status}`);
  }

  return { success: true, providerResponse: body };
};
