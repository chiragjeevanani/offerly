import { useState, useEffect } from 'react';
import { useNavigate, useLocation } from 'react-router-dom';
import { motion } from 'framer-motion';
import ArrowBackRoundedIcon from '@mui/icons-material/ArrowBackRounded';
import CardGiftcardRoundedIcon from '@mui/icons-material/CardGiftcardRounded';
import StorefrontRoundedIcon from '@mui/icons-material/StorefrontRounded';
import ShieldMoonRoundedIcon from '@mui/icons-material/ShieldMoonRounded';
import OtpInput from '../../components/ui/OtpInput';
import { useApp } from '../../context/AppContext';
import { authAPI } from '../../../../api/auth.api';
import { storage } from '../../../../utils/storage';
import toast from 'react-hot-toast';
import PageTransition from '../../components/ui/PageTransition';

const OTP_DURATION = 300; // 5 minutes
const RESEND_COOLDOWN = 30;

const OtpVerify = () => {
  const navigate = useNavigate();
  const location = useLocation();
  const { login } = useApp();

  const phone = location.state?.phone;
  const isNewUser = location.state?.isNewUser;
  const userType = location.state?.userType || 'customer';
  const devMode = location.state?.devMode || false;

  const [timeLeft, setTimeLeft] = useState(OTP_DURATION);
  const [resendCooldown, setResendCooldown] = useState(RESEND_COOLDOWN);
  const [error, setError] = useState('');
  const [isVerifying, setIsVerifying] = useState(false);
  const [attempts, setAttempts] = useState(0);
  const [resetKey, setResetKey] = useState(0);

  useEffect(() => {
    if (!phone) {
      toast.error('SESSION TIMEOUT. RE-INITIALIZE.');
      navigate(userType === 'merchant' ? '/merchant/login' : '/login');
    }
  }, [phone, navigate, userType]);

  useEffect(() => {
    const timer = setInterval(() => {
      setTimeLeft((t) => {
        if (t <= 1) {
          setError('TOKEN EXPIRED. REQUEST NEW DISPATCH.');
          return 0;
        }
        return t - 1;
      });
    }, 1000);
    return () => clearInterval(timer);
  }, []);

  useEffect(() => {
    if (resendCooldown <= 0) return;
    const timer = setInterval(() => {
      setResendCooldown((c) => (c > 0 ? c - 1 : 0));
    }, 1000);
    return () => clearInterval(timer);
  }, [resendCooldown]);

  const formatTime = (sec) => {
    const m = Math.floor(sec / 60);
    const s = sec % 60;
    return `${m}:${s.toString().padStart(2, '0')}`;
  };

  const handleOtpComplete = async (otp) => {
    if (attempts >= 3) {
      setError('MAX ATTEMPTS REACHED. RE-DISPATCH REQUIRED.');
      return;
    }

    setIsVerifying(true);

    try {
      const cleanPhone = phone.replace(/\D/g, '');
      const action = isNewUser ? 'register' : 'login';
      
      const verifyResponse = await authAPI.verifyOtp(cleanPhone, userType, action, otp);

      if (verifyResponse.success) {
        if (isNewUser) {
          const pendingData = JSON.parse(sessionStorage.getItem('pendingRegistration') || '{}');
          if (!pendingData.name) {
            toast.error('REGISTRATION DATA LOSS.');
            navigate(userType === 'customer' ? '/signup' : '/merchant/signup');
            return;
          }

          const registerFn = userType === 'customer' ? authAPI.registerCustomer : authAPI.registerMerchant;
          const registerResponse = await registerFn(verifyResponse.verificationToken, {
            ...pendingData,
            phone: cleanPhone
          });

          if (registerResponse.success) {
            storage.setToken(registerResponse.token);
            storage.setUser(registerResponse.user);
            login(registerResponse.user);
            sessionStorage.removeItem('pendingRegistration');
            toast.success('IDENTITY CREATED');
            navigate(userType === 'customer' ? '/home' : '/merchant/register');
          }
        } else {
          storage.setToken(verifyResponse.token);
          storage.setUser(verifyResponse.user);
          login(verifyResponse.user);
          toast.success('ACCESS GRANTED');
          navigate(userType === 'customer' ? '/home' : '/merchant');
        }
      }
    } catch (error) {
      setAttempts((a) => a + 1);
      setError(error.error || `INVALID TOKEN. ${3 - attempts - 1} RETRIES REMAINING.`);
      setResetKey((k) => k + 1);
    } finally {
      setIsVerifying(false);
    }
  };

  const handleResend = async () => {
    if (resendCooldown > 0) return;
    setError('');
    setAttempts(0);
    setResetKey((k) => k + 1);

    try {
      const cleanPhone = phone.replace(/\D/g, '');
      const action = isNewUser ? 'register' : 'login';
      const response = await authAPI.sendOtp(cleanPhone, userType, action);
      if (response.success) {
        setTimeLeft(OTP_DURATION);
        setResendCooldown(RESEND_COOLDOWN);
        toast.success('TOKEN RE-DISPATCHED');
      }
    } catch (error) {
      toast.error(error.error || 'DISPATCH ERROR. RETRY.');
    }
  };

  return (
    <PageTransition>
      <div className="min-h-screen bg-background flex items-center justify-center p-4">
        <div className="w-full max-w-md space-y-8">
          
          {/* Header Terminal */}
          <div className="flex items-center justify-between px-2">
            <motion.button
              whileTap={{ scale: 0.9 }}
              onClick={() => navigate(-1)}
              className="w-10 h-10 bg-white rounded-2xl flex items-center justify-center shadow-sm border border-gray-100 text-gray-400"
            >
              <ArrowBackRoundedIcon sx={{ fontSize: 20 }} />
            </motion.button>
            <div className="flex items-center gap-2">
              <img src="/offerly-logo-ring.png" alt="Offerly" className="w-6 h-6 object-contain" />
              <span className="text-gray-900 font-bold text-xs tracking-tight">Offerly Security</span>
            </div>
          </div>

          <motion.div
            initial={{ y: 20, opacity: 0 }}
            animate={{ y: 0, opacity: 1 }}
            className="bg-white rounded-[2.5rem] p-8 shadow-xl shadow-gray-200/50 border border-white relative overflow-hidden"
          >
             {/* Security Icon Strip */}
            <div className="absolute top-0 right-0 p-6 opacity-[0.03]">
              <ShieldMoonRoundedIcon sx={{ fontSize: 120 }} />
            </div>

            <div className="relative z-10 space-y-6">
              <div className="space-y-1">
                <h2 className="text-gray-900 font-bold text-lg tracking-tight">Token Verification</h2>
                <p className="text-gray-400 text-[10px] font-bold tracking-tight leading-relaxed">
                  Cryptographic code dispatched to <span className="text-gray-900">{phone}</span>
                </p>
              </div>

              {devMode && (
                <div className="bg-[#5EB929]/5 border border-[#5EB929]/10 rounded-xl p-2.5 flex items-center gap-2">
                  <div className="w-1.5 h-1.5 bg-[#5EB929] rounded-full animate-pulse" />
                  <p className="text-[9px] font-bold text-[#5EB929] tracking-tight">Dev Mode: Protocol 123456</p>
                </div>
              )}

              {/* OTP Input Terminal */}
              <div className="space-y-6">
                <div className="flex justify-center">
                  <OtpInput length={6} onComplete={handleOtpComplete} onReset={resetKey} />
                </div>

                {error && (
                  <motion.div
                    initial={{ opacity: 0, x: -10 }}
                    animate={{ opacity: 1, x: 0 }}
                    className="bg-red-50 border border-red-100 rounded-xl p-3 flex items-center gap-2 justify-center"
                  >
                    <div className="w-1.5 h-1.5 bg-red-500 rounded-full" />
                    <p className="text-[9px] font-bold text-red-500 tracking-tight text-center">{error}</p>
                  </motion.div>
                )}
              </div>

              {/* Timer & Resend Protocol */}
              <div className="space-y-5">
                <div className="text-center">
                  <p className="text-[10px] font-bold text-gray-300 tracking-tight">
                    Token Expiry: <span className={`font-bold ${timeLeft < 60 ? 'text-red-500' : 'text-gray-900'}`}>{formatTime(timeLeft)}</span>
                  </p>
                </div>

                <div className="flex flex-col gap-2.5">
                  <motion.button
                    whileTap={{ scale: 0.98 }}
                    disabled={isVerifying}
                    className="w-full bg-[#5EB929] text-white font-bold text-[12px] py-4 rounded-2xl shadow-lg shadow-[#5EB929]/20 active:scale-95 transition-all flex items-center justify-center gap-2 disabled:opacity-50"
                  >
                    {isVerifying ? (
                      <div className="w-5 h-5 border-2 border-white/30 border-t-white rounded-full animate-spin" />
                    ) : (
                      'Verify Protocol'
                    )}
                  </motion.button>

                  <button
                    onClick={handleResend}
                    disabled={resendCooldown > 0}
                    className={`w-full py-3.5 rounded-2xl font-bold text-[10px] transition-all ${
                      resendCooldown > 0 
                        ? 'text-gray-300 border border-gray-50' 
                        : 'text-[#5EB929] border border-[#5EB929]/10 hover:bg-[#5EB929]/5'
                    }`}
                  >
                    {resendCooldown > 0 ? `Wait ${resendCooldown}s for Resend` : 'Request New Token'}
                  </button>
                </div>
              </div>
            </div>
          </motion.div>

          {/* Footer Ledger */}
          <p className="text-center text-[9px] font-bold text-gray-300 tracking-widest">
            Secure Verification Protocol · v1.0.0
          </p>
        </div>
      </div>
    </PageTransition>
  );
};

export default OtpVerify;
