import { useEffect, useRef, useState } from 'react';
import { useLocation, useNavigate, Navigate } from 'react-router-dom';
import { motion } from 'framer-motion';
import toast from 'react-hot-toast';
import ArrowBackRoundedIcon from '@mui/icons-material/ArrowBackRounded';
import { authAPI } from '../../../api/auth.api';
import { storage } from '../../../utils/storage';
import { useApp } from '../../customer/context/AppContext';
import PageTransition from '../../customer/components/ui/PageTransition';
import { BrandMark, PrimaryButton } from '../components/PartnerUI';

const RESEND_AFTER = 30;

const PartnerVerify = () => {
  const navigate = useNavigate();
  const { state } = useLocation();
  const { login } = useApp();
  const [digits, setDigits] = useState(['', '', '', '', '', '']);
  const [loading, setLoading] = useState(false);
  const [wait, setWait] = useState(RESEND_AFTER);
  const inputs = useRef([]);

  useEffect(() => {
    inputs.current[0]?.focus();
  }, []);

  useEffect(() => {
    if (wait <= 0) return;
    const t = setTimeout(() => setWait((w) => w - 1), 1000);
    return () => clearTimeout(t);
  }, [wait]);

  if (!state?.phone) return <Navigate to="/delivery/login" replace />;
  const { phone, purpose } = state;
  const otp = digits.join('');

  const setDigit = (i, value) => {
    const clean = value.replace(/\D/g, '');
    if (clean.length > 1) {
      // Pasted the whole code
      const next = clean.slice(0, 6).split('');
      setDigits([...next, ...Array(6 - next.length).fill('')]);
      inputs.current[Math.min(next.length, 5)]?.focus();
      return;
    }
    setDigits((prev) => prev.map((d, idx) => (idx === i ? clean : d)));
    if (clean && i < 5) inputs.current[i + 1]?.focus();
  };

  const onKeyDown = (i, e) => {
    if (e.key === 'Backspace' && !digits[i] && i > 0) inputs.current[i - 1]?.focus();
  };

  const verify = async (e) => {
    e?.preventDefault();
    if (otp.length !== 6) return;
    setLoading(true);
    try {
      const res = await authAPI.verifyOtp(phone, 'delivery', purpose, otp);
      if (purpose === 'login') {
        storage.setToken(res.token);
        login(res.user);
        toast.success('Signed in');
        navigate('/delivery', { replace: true });
      } else {
        navigate('/delivery/signup/details', { replace: true, state: { phone, verificationToken: res.verificationToken } });
      }
    } catch (err) {
      toast.error(err?.error || 'Invalid OTP');
      setDigits(['', '', '', '', '', '']);
      inputs.current[0]?.focus();
    } finally {
      setLoading(false);
    }
  };

  const resend = async () => {
    try {
      await authAPI.sendOtp(phone, 'delivery', purpose);
      toast.success('OTP sent again');
      setWait(RESEND_AFTER);
    } catch (err) {
      toast.error(err?.error || 'Could not resend OTP');
    }
  };

  return (
    <PageTransition>
      <div className="min-h-screen bg-[#F8FAFC] flex items-center justify-center p-4">
        <div className="w-full max-w-md space-y-6">
          <BrandMark />
          <motion.form
            onSubmit={verify}
            initial={{ y: 20, opacity: 0 }}
            animate={{ y: 0, opacity: 1 }}
            className="bg-white rounded-[2.5rem] p-7 shadow-2xl shadow-gray-200/50 border border-white space-y-6"
          >
            <button type="button" onClick={() => navigate(-1)} className="w-9 h-9 rounded-full bg-[#F8FAFC] flex items-center justify-center text-gray-600" aria-label="Back">
              <ArrowBackRoundedIcon sx={{ fontSize: 18 }} />
            </button>
            <div className="space-y-1">
              <h2 className="text-gray-900 font-bold text-xl tracking-tight">Enter the OTP</h2>
              <p className="text-gray-400 text-[12px] font-medium">
                Sent to <span className="font-bold text-gray-700">+91 {phone}</span>
                {state.devMode ? ' (test number: use the dev OTP)' : ''}
              </p>
            </div>

            <div className="flex justify-between gap-2" aria-label="One-time password">
              {digits.map((d, i) => (
                <input
                  key={i}
                  ref={(el) => { inputs.current[i] = el; }}
                  value={d}
                  onChange={(e) => setDigit(i, e.target.value)}
                  onKeyDown={(e) => onKeyDown(i, e)}
                  inputMode="numeric"
                  autoComplete={i === 0 ? 'one-time-code' : 'off'}
                  maxLength={6}
                  aria-label={`Digit ${i + 1}`}
                  className="flex-1 min-w-0 h-14 rounded-2xl bg-[#F8FAFC] border border-gray-100 text-center text-xl font-black text-gray-900 outline-none focus:bg-white focus:border-[#5EB929]/50 focus:ring-2 focus:ring-[#5EB929]/10"
                />
              ))}
            </div>

            <PrimaryButton type="submit" loading={loading} disabled={otp.length !== 6} className="w-full">
              Verify & Continue
            </PrimaryButton>

            <p className="text-center text-[12px] font-semibold text-gray-400">
              {wait > 0 ? (
                <>Resend OTP in <span className="text-gray-700">{wait}s</span></>
              ) : (
                <button type="button" onClick={resend} className="text-[#5EB929] font-bold">Resend OTP</button>
              )}
            </p>
          </motion.form>
        </div>
      </div>
    </PageTransition>
  );
};

export default PartnerVerify;
