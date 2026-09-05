import Razorpay from 'razorpay';
import crypto from 'crypto';
import dotenv from 'dotenv';

dotenv.config();

let razorpay = null;

if (process.env.RAZORPAY_KEY_ID && process.env.RAZORPAY_KEY_ID !== 'rzp_test_XXXXXXXXXXXXXX') {
  razorpay = new Razorpay({
    key_id: process.env.RAZORPAY_KEY_ID,
    key_secret: process.env.RAZORPAY_KEY_SECRET,
  });
}

export const createRazorpayOrder = async (amount, currency = 'INR', receipt, notes = undefined) => {
  if (!razorpay) {
    throw new Error('Razorpay is not configured with valid keys');
  }

  const options = {
    amount: Math.round(amount * 100), // Amount in paise, rounded to avoid float issues
    currency,
    receipt,
    // Shows up on the order/payment detail page in the Razorpay Dashboard -
    // otherwise every payment there is just an amount + opaque receipt string.
    ...(notes ? { notes } : {}),
  };

  try {
    const order = await razorpay.orders.create(options);
    return order;
  } catch (error) {
    console.error('Razorpay Order Creation Error:', error);
    throw error;
  }
};

export const verifyRazorpayPayment = (orderId, paymentId, signature) => {
  if (!razorpay) return false;
  
  const hmac = crypto.createHmac('sha256', process.env.RAZORPAY_KEY_SECRET);
  hmac.update(orderId + "|" + paymentId);
  const generated_signature = hmac.digest('hex');
  
  return generated_signature === signature;
};

export default razorpay;
