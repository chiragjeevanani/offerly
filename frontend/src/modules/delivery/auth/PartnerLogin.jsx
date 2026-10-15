import { useState } from 'react';
import { useNavigate, useLocation } from 'react-router-dom';
import { motion, AnimatePresence } from 'framer-motion';
import toast from 'react-hot-toast';
import SmartphoneRoundedIcon from '@mui/icons-material/SmartphoneRounded';
import ArrowForwardRoundedIcon from '@mui/icons-material/ArrowForwardRounded';
import TwoWheelerRoundedIcon from '@mui/icons-material/TwoWheelerRounded';
import PaymentsRoundedIcon from '@mui/icons-material/PaymentsRounded';
import ScheduleRoundedIcon from '@mui/icons-material/ScheduleRounded';
import { authAPI } from '../../../api/auth.api';
import PageTransition from '../../customer/components/ui/PageTransition';
import { BrandMark, PrimaryButton } from '../components/PartnerUI';

const PERKS = [
  { icon: TwoWheelerRoundedIcon, text: 'Deliver from local stores near you' },
  { icon: ScheduleRoundedIcon, text: 'Go online whenever you like' },
  { icon: PaymentsRoundedIcon, text: 'Earn on every delivery' },
];

// One screen for both: sign in, or start a new partner account.
const PartnerLogin = () => {
  const navigate = useNavigate();
  const location = useLocation();
  const [mode, setMode] = useState(location.pathname.endsWith('/signup') ? 'register' : 'login');
  const [phone, setPhone] = useState('');
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState('');

  const submit = async (e) => {
    e.preventDefault();
    if (!/^[6-9]\d{9}$/.test(phone)) {
      setError('Enter a valid 10-digit mobile number');
      return;
    }
    setError('');
    setLoading(true);
    try {
      const res = await authAPI.sendOtp(phone, 'delivery', mode);
      if (res.success) {
        toast.success('OTP sent');
        navigate('/delivery/verify', { state: { phone, purpose: mode, devMode: res.devMode } });
      }
    } catch (err) {
      const message = err?.error || err?.message || 'Could not send OTP';
      if (mode === 'login' && /not found/i.test(message)) {
        setError('No partner account with this number. Join as a partner below.');
      } else if (mode === 'register' && /already registered/i.test(message)) {
        setError('This number already has a partner account. Sign in instead.');
      } else {
        setError(message);
      }
    } finally {
      setLoading(false);
    }
  };

  const isLogin = mode === 'login';

  return (
    <PageTransition>
      <div className="min-h-screen bg-[#F8FAFC] flex items-center justify-center p-4">
        <div className="w-full max-w-md space-y-6">
          <BrandMark />

          <motion.div
            initial={{ y: 20, opacity: 0 }}
            animate={{ y: 0, opacity: 1 }}
            className="bg-white rounded-[2.5rem] p-7 shadow-2xl shadow-gray-200/50 border border-white relative overflow-hidden"
          >
            <div className="absolute inset-0 overflow-hidden pointer-events-none rounded-[inherit]">
              <div className="absolute top-0 right-0 w-32 h-32 bg-[#5EB929]/5 rounded-full blur-3xl -translate-y-1/2 translate-x-1/2" />
            </div>

            <div className="relative z-10 space-y-6">
              <div className="grid grid-cols-2 bg-[#F8FAFC] rounded-2xl p-1" role="tablist">
                {[
                  { key: 'login', label: 'Sign In' },
                  { key: 'register', label: 'Join as Partner' },
                ].map((t) => (
                  <button
                    key={t.key}
                    role="tab"
                    aria-selected={mode === t.key}
                    onClick={() => { setMode(t.key); setError(''); }}
                    className={`h-10 rounded-xl text-[11px] font-bold uppercase tracking-wider transition-all ${
                      mode === t.key ? 'bg-white text-gray-900 shadow-sm' : 'text-gray-400'
                    }`}
                  >
                    {t.label}
                  </button>
                ))}
              </div>

              <div className="space-y-1">
                <h2 className="text-gray-900 font-bold text-xl tracking-tight">{isLogin ? 'Welcome back' : 'Become a delivery partner'}</h2>
                <p className="text-gray-400 text-[12px] font-medium">
                  {isLogin ? 'Sign in with your registered mobile number.' : 'Verify your mobile number to get started.'}
                </p>
              </div>

              <form onSubmit={submit} className="space-y-5">
                <div className="space-y-1.5">
                  <label htmlFor="partner-phone" className="text-[10px] font-bold text-gray-400 uppercase tracking-widest px-1">Mobile Number</label>
                  <div className="flex gap-2.5">
                    <div className="w-16 h-14 bg-[#F8FAFC] rounded-2xl border border-gray-100 flex items-center justify-center text-[13px] font-bold text-gray-500">+91</div>
                    <div className="flex-1 relative group">
                      <SmartphoneRoundedIcon className="absolute left-4 top-1/2 -translate-y-1/2 text-gray-300 group-focus-within:text-[#5EB929] transition-colors" sx={{ fontSize: 18 }} />
                      <input
                        id="partner-phone"
                        type="tel"
                        inputMode="numeric"
                        autoComplete="tel-national"
                        placeholder="98765 43210"
                        value={phone}
                        onChange={(e) => { setPhone(e.target.value.replace(/\D/g, '').slice(0, 10)); if (error) setError(''); }}
                        className={`w-full h-14 bg-[#F8FAFC] border ${error ? 'border-red-300' : 'border-gray-100'} rounded-2xl pl-11 pr-4 text-sm font-bold outline-none focus:bg-white focus:border-[#5EB929]/40 transition-all`}
                      />
                    </div>
                  </div>
                  <AnimatePresence>
                    {error && (
                      <motion.p initial={{ opacity: 0, height: 0 }} animate={{ opacity: 1, height: 'auto' }} exit={{ opacity: 0, height: 0 }} className="text-[11px] font-bold text-red-500 px-1">
                        {error}
                      </motion.p>
                    )}
                  </AnimatePresence>
                </div>

                <PrimaryButton type="submit" loading={loading} disabled={phone.length < 10} className="w-full">
                  Send OTP <ArrowForwardRoundedIcon sx={{ fontSize: 16 }} />
                </PrimaryButton>
              </form>

              {!isLogin && (
                <ul className="pt-5 border-t border-gray-50 space-y-3">
                  {PERKS.map((p) => (
                    <li key={p.text} className="flex items-center gap-3">
                      <span className="w-8 h-8 rounded-xl bg-[#5EB929]/10 text-[#5EB929] flex items-center justify-center">
                        <p.icon sx={{ fontSize: 16 }} />
                      </span>
                      <span className="text-[12px] font-semibold text-gray-600">{p.text}</span>
                    </li>
                  ))}
                </ul>
              )}
            </div>
          </motion.div>

          <p className="text-center text-[10px] font-bold text-gray-400">
            Shopping on Offerly? <a href="/login" className="text-[#5EB929]">Open the customer app</a>
          </p>
        </div>
      </div>
    </PageTransition>
  );
};

export default PartnerLogin;
