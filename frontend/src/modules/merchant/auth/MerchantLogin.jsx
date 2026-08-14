import { useState, useEffect } from 'react';
import { useNavigate } from 'react-router-dom';
import { motion, AnimatePresence } from 'framer-motion';
import StorefrontRoundedIcon from '@mui/icons-material/StorefrontRounded';
import ArrowForwardRoundedIcon from '@mui/icons-material/ArrowForwardRounded';
import SmartphoneRoundedIcon from '@mui/icons-material/SmartphoneRounded';
import VerifiedUserRoundedIcon from '@mui/icons-material/VerifiedUserRounded';
import CardGiftcardRoundedIcon from '@mui/icons-material/CardGiftcardRounded';
import { authAPI } from '../../../api/auth.api';
import toast from 'react-hot-toast';
import PageTransition from '../../customer/components/ui/PageTransition';

const MerchantLogin = () => {
  const navigate = useNavigate();
  const [phone, setPhone] = useState(() => localStorage.getItem('offerly_merchant_login_phone') || '');
  const [isLoading, setIsLoading] = useState(false);
  const [error, setError] = useState('');

  useEffect(() => {
    localStorage.setItem('offerly_merchant_login_phone', phone);
  }, [phone]);

  const handleLogin = async (e) => {
    e.preventDefault();
    if (phone.length < 10) {
      setError('Invalid phone identifier');
      return;
    }

    setError('');
    setIsLoading(true);

    try {
      const response = await authAPI.sendOtp(phone, 'merchant', 'login');
      if (response.success) {
        toast.success('Transmission successful');
        navigate('/merchant/verify', { 
          state: { phone: `+91 ${phone}`, isNewUser: false, userType: 'merchant', devMode: response.devMode } 
        });
      }
    } catch (error) {
      const errorMessage = typeof error === 'object' ? error.error : error;
      setError(errorMessage || 'Transmission failed');
      toast.error(errorMessage || 'Failed to send OTP');
    } finally {
      setIsLoading(false);
    }
  };

  return (
    <PageTransition>
      <div className="min-h-screen bg-background flex items-center justify-center p-4">
        <div className="w-full max-w-md space-y-6">
          {/* Header & Logo */}
          <div className="flex flex-col items-center gap-4 mb-8">
            <motion.div 
              initial={{ scale: 0.9, opacity: 0 }}
              animate={{ scale: 1, opacity: 1 }}
              className="w-16 h-16 bg-gray-900 rounded-[1.5rem] flex items-center justify-center shadow-xl shadow-black/20 p-2.5"
            >
              <img src="/offerly-logo-ring.png" alt="Offerly" className="w-full h-full object-contain" />
            </motion.div>
            <div className="text-center">
              <h1 className="text-gray-900 font-bold text-2xl tracking-tight">Offerly Biz</h1>
              <p className="text-gray-400 text-[9px] font-bold tracking-widest mt-0.5">Merchant Terminal</p>
            </div>
          </div>

          <motion.div
            initial={{ y: 20, opacity: 0 }}
            animate={{ y: 0, opacity: 1 }}
            className="bg-white rounded-[2.5rem] p-8 shadow-2xl shadow-gray-200/50 border border-white relative overflow-hidden"
          >
            {/* Background Aesthetic */}
            <div className="absolute top-0 right-0 w-32 h-32 bg-[#5EB929]/5 rounded-full blur-3xl -translate-y-1/2 translate-x-1/2" />
            
            <div className="relative z-10 space-y-8">
              <div className="space-y-1">
                <h2 className="text-gray-900 font-bold text-xl tracking-tight">Business Access</h2>
                <p className="text-gray-400 text-[10px] font-bold tracking-tight">Synchronize session via mobile identifier</p>
              </div>

              <form onSubmit={handleLogin} className="space-y-6">
                <div className="space-y-1.5">
                  <label className="text-[10px] font-bold text-gray-400 px-1">Mobile Identifier</label>
                  <div className="flex gap-2.5">
                    <div className="w-16 h-14 bg-background rounded-2xl border border-gray-50 flex items-center justify-center text-[13px] font-bold text-gray-400">🇮🇳</div>
                    <div className="flex-1 relative group">
                      <SmartphoneRoundedIcon className="absolute left-4 top-1/2 -translate-y-1/2 text-gray-300 group-focus-within:text-[#5EB929] transition-colors" sx={{ fontSize: 18 }} />
                      <input 
                        type="tel" required placeholder="00000 00000" value={phone}
                        onChange={(e) => {
                          const val = e.target.value.replace(/\D/g, '').slice(0, 10);
                          setPhone(val);
                          if (error) setError('');
                        }}
                        className={`w-full h-14 bg-background border ${error ? 'border-red-500' : 'border-gray-50'} rounded-2xl pl-11 pr-4 text-sm font-bold outline-none focus:bg-white focus:border-[#5EB929]/30 transition-all`}
                      />
                    </div>
                  </div>
                  <AnimatePresence>
                    {error && (
                      <motion.p initial={{ opacity: 0, height: 0 }} animate={{ opacity: 1, height: 'auto' }} className="text-[9px] font-bold text-red-500 px-1">⚠️ {error}</motion.p>
                    )}
                  </AnimatePresence>
                </div>

                <motion.button 
                  whileTap={{ scale: 0.98 }}
                  type="submit" disabled={isLoading || phone.length < 10}
                  className="w-full h-14 bg-[#5EB929] text-white rounded-2xl font-bold text-[12px] shadow-lg shadow-[#5EB929]/20 active:scale-95 transition-all flex items-center justify-center gap-2 disabled:opacity-50"
                >
                  {isLoading ? (
                    <div className="w-5 h-5 border-2 border-white/30 border-t-white rounded-full animate-spin" />
                  ) : (
                    <>Initiate Session <ArrowForwardRoundedIcon sx={{ fontSize: 16 }} /></>
                  )}
                </motion.button>
              </form>

              <div className="pt-6 border-t border-gray-50 text-center">
                <p className="text-[11px] font-bold text-gray-400">
                  New business architecture? 
                  <button onClick={() => navigate('/merchant/signup')} className="text-[#5EB929] font-bold ml-1.5 hover:underline">Deploy store</button>
                </p>
              </div>
            </div>
          </motion.div>

          {/* Platform Ledger */}
          <p className="text-center text-[9px] font-bold text-gray-300 tracking-widest">
            Secure Enterprise Gateway · v2.0.0
          </p>
        </div>
      </div>
    </PageTransition>
  );
};

export default MerchantLogin;
