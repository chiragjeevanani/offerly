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

// Must match the DLT-registered template character-for-character or operators drop the SMS.
// Registered: "Welcome to the ##var## powered by Appzeto.Your OTP for registration is ##var##.BGADEC"
const DEFAULT_TEMPLATE =
  'Welcome to the {app} powered by Appzeto.Your OTP for registration is {otp}.BGADEC';

export const smsTemplate = (otp) => {
  const template = process.env.SMSINDIAHUB_MESSAGE_TEMPLATE || DEFAULT_TEMPLATE;
  return template
    .replace('{app}', process.env.SMSINDIAHUB_APP_NAME || 'Offerly')
    .replace('{otp}', otp);
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
  const senderId = process.env.SMSINDIAHUB_SENDER_ID || 'BGADEC';
  const templateId = process.env.SMSINDIAHUB_TEMPLATE_ID || '1007282516644508833';
  const peId = process.env.SMSINDIAHUB_PE_ID || '1001164203633432409';
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
  url.searchParams.set('DLTTemplateId', templateId);
  url.searchParams.set('PEID', peId);

  const response = await fetch(url.toString(), { method: 'GET' });
  const body = await response.text();

  if (!response.ok) {
    throw new Error(`SMS India Hub request failed with status ${response.status}: ${body}`);
  }

  // The provider replies 200 even when it rejects; ErrorCode "000" is the real success signal.
  let parsed = null;
  try {
    parsed = JSON.parse(body);
  } catch {
    // non-JSON body; return it raw
  }
  if (parsed?.ErrorCode && parsed.ErrorCode !== '000') {
    throw new Error(`SMS India Hub rejected OTP SMS: ${parsed.ErrorCode} ${parsed.ErrorMessage}`);
  }

  return { success: true, providerResponse: parsed || body };
};
