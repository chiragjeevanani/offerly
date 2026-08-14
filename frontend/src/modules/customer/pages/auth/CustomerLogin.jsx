import { useState, useEffect } from 'react';
import { useNavigate } from 'react-router-dom';
import { motion } from 'framer-motion';
import SmartphoneRoundedIcon from '@mui/icons-material/SmartphoneRounded';
import ArrowForwardRoundedIcon from '@mui/icons-material/ArrowForwardRounded';
import CardGiftcardRoundedIcon from '@mui/icons-material/CardGiftcardRounded';
import VerifiedUserRoundedIcon from '@mui/icons-material/VerifiedUserRounded';
import { authAPI } from '../../../../api/auth.api';
import toast from 'react-hot-toast';
import PageTransition from '../../components/ui/PageTransition';

const countryCodes = [
  { code: '+91', flag: '🇮🇳', name: 'India' },
];

const CustomerLogin = () => {
  const navigate = useNavigate();
  const [phone, setPhone] = useState(() => localStorage.getItem('offerly_login_phone') || '');
  const [countryCode, setCountryCode] = useState(() => localStorage.getItem('offerly_login_country') || '+91');
  const [isLoading, setIsLoading] = useState(false);
  const [error, setError] = useState('');

  // Persist form data to localStorage
  useEffect(() => {
    localStorage.setItem('offerly_login_phone', phone);
    localStorage.setItem('offerly_login_country', countryCode);
  }, [phone, countryCode]);

  const handleLogin = async (e) => {
    e.preventDefault();
    if (phone.length < 10) {
      setError('VALID 10-DIGIT PROTOCOL REQUIRED');
      return;
    }

    setError('');
    setIsLoading(true);

    try {
      const response = await authAPI.sendOtp(phone, 'customer', 'login');

      if (response.success) {
        toast.success('OTP DISPATCHED');
        navigate('/verify', {
          state: {
            phone: `${countryCode} ${phone}`,
            isNewUser: false,
            userType: 'customer',
            devMode: response.devMode
          }
        });
      }
    } catch (error) {
      console.error('Login error:', error);
      const errorMessage = typeof error === 'object' ? error.error : error;

      if (errorMessage === 'Account not found for this role') {
        setError('IDENTITY NOT FOUND. INITIALIZE SIGNUP.');
        toast.error('No account found for this number.');
      } else {
        setError(errorMessage || 'DISPATCH FAILED. RETRY PROTOCOL.');
        toast.error(errorMessage || 'Failed to send OTP');
      }
    } finally {
      setIsLoading(false);
    }
  };

  return (
    <PageTransition>
      <div className="min-h-screen bg-[#F8F5FF] flex items-center justify-center p-4">
        <div className="w-full max-w-md space-y-8">
          
          {/* Logo Terminal */}
          <div className="text-center space-y-4">
            <motion.div
              initial={{ scale: 0.8, opacity: 0 }}
              animate={{ scale: 1, opacity: 1 }}
              className="w-20 h-20 bg-[#3D7A4F] rounded-3xl flex items-center justify-center mx-auto shadow-xl shadow-[#3D7A4F]/20"
            >
              <CardGiftcardRoundedIcon sx={{ fontSize: 36 }} className="text-white" />
            </motion.div>
            <div>
              <h1 className="text-gray-900 font-black text-2xl tracking-tighter">Offerly</h1>
              <p className="text-gray-400 text-[9px] font-black tracking-widest mt-0.5">Digital Access Portal</p>
            </div>
          </div>

          {/* Authentication Card */}
          <motion.div
            initial={{ y: 20, opacity: 0 }}
            animate={{ y: 0, opacity: 1 }}
            className="bg-white rounded-[2.5rem] p-8 shadow-xl shadow-gray-200/50 border border-white relative overflow-hidden"
          >
            {/* Security Icon Strip */}
            <div className="absolute top-0 right-0 p-6 opacity-[0.03]">
              <VerifiedUserRoundedIcon sx={{ fontSize: 120 }} />
            </div>

            <div className="relative z-10 space-y-5">
              <div className="space-y-1">
                <h2 className="text-gray-900 font-black text-lg tracking-tight">Identity Access</h2>
                <p className="text-gray-400 text-[10px] font-bold tracking-tight">Provide your mobile identifier to proceed</p>
              </div>

              <form onSubmit={handleLogin} className="space-y-5">
                <div className="space-y-4">
                  <div className="space-y-1.5">
                    <label className="text-[10px] font-bold text-gray-400 tracking-tight px-1">
                      Phone Identifier
                    </label>
                    <div className="flex gap-2">
                      <div className="bg-[#F8F5FF] border border-gray-100 rounded-2xl px-4 py-4 flex items-center gap-2">
                        <span className="text-xs font-black text-gray-500">🇮🇳</span>
                        <span className="text-xs font-black text-gray-800">+91</span>
                      </div>
                      <div className="flex-1 relative group">
                        <SmartphoneRoundedIcon className="absolute left-4 top-1/2 -translate-y-1/2 text-gray-300 group-focus-within:text-[#3D7A4F] transition-colors" sx={{ fontSize: 20 }} />
                        <input
                          type="tel"
                          value={phone}
                          onChange={(e) => {
                            const val = e.target.value.replace(/\D/g, '').slice(0, 10);
                            setPhone(val);
                            if (error) setError('');
                          }}
                          placeholder="00000 00000"
                          className="w-full pl-12 pr-4 py-4 rounded-2xl border border-gray-100 bg-[#F8F5FF] focus:bg-white focus:border-[#3D7A4F] focus:ring-4 focus:ring-[#3D7A4F]/5 outline-none transition-all text-sm font-black tracking-widest placeholder:text-gray-200"
                        />
                      </div>
                    </div>
                  </div>

                  {error && (
                    <motion.div
                      initial={{ opacity: 0, x: -10 }}
                      animate={{ opacity: 1, x: 0 }}
                      className="bg-red-50 border border-red-100 rounded-xl p-3 flex items-center gap-2"
                    >
                      <div className="w-1.5 h-1.5 bg-red-500 rounded-full" />
                      <p className="text-[9px] font-bold text-red-500 tracking-tight">{error}</p>
                    </motion.div>
                  )}
                </div>

                <motion.button
                  whileTap={{ scale: 0.98 }}
                  type="submit"
                  disabled={isLoading || phone.length < 10}
                  className="w-full bg-[#3D7A4F] text-white font-black text-[12px] py-4 rounded-2xl shadow-lg shadow-[#3D7A4F]/20 active:scale-95 transition-all flex items-center justify-center gap-2 disabled:opacity-50"
                >
                  {isLoading ? (
                    <div className="w-5 h-5 border-2 border-white/30 border-t-white rounded-full animate-spin" />
                  ) : (
                    <>
                      Initialize Access
                      <ArrowForwardRoundedIcon sx={{ fontSize: 16 }} />
                    </>
                  )}
                </motion.button>
              </form>

              <div className="pt-4 border-t border-gray-50 flex flex-col items-center gap-3">
                <p className="text-[10px] font-bold text-gray-400 tracking-tight">
                  New to the network?
                </p>
                <button
                  onClick={() => navigate('/signup')}
                  className="w-full py-3.5 rounded-2xl border border-gray-100 text-gray-900 font-black text-[11px] hover:bg-gray-50 transition-all active:scale-95"
                >
                  Create Digital ID
                </button>
              </div>
            </div>
          </motion.div>

          {/* Footer Ledger */}
          <p className="text-center text-[9px] font-bold text-gray-300 tracking-widest">
            Secure Identity Protocol · v1.0.0
          </p>
        </div>
      </div>
    </PageTransition>
  );
};

export default CustomerLogin;
