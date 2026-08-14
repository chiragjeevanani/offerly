import { useState, useEffect } from 'react';
import { useNavigate } from 'react-router-dom';
import { motion, AnimatePresence } from 'framer-motion';
import { authAPI } from '../../../../api/auth.api';
import toast from 'react-hot-toast';
import PageTransition from '../../components/ui/PageTransition';

const slides = [
  'FIND THE BEST DEAL\nON EVERY MEAL',
  'UNLOCK UP TO 70% OFF\nON TOP MERCHANTS',
  'DISCOVER EXCLUSIVE\nOFFERS IN YOUR CITY',
];

const countryList = [
  { code: '+91', flag: '🇮🇳', country: 'India' },
  { code: '+1', flag: '🇺🇸', country: 'United States' },
  { code: '+44', flag: '🇬🇧', country: 'United Kingdom' },
  { code: '+971', flag: '🇦🇪', country: 'UAE' },
];

const CustomerLogin = () => {
  const navigate = useNavigate();
  const [phone, setPhone] = useState(() => localStorage.getItem('offerly_login_phone') || '');
  const [countryCode, setCountryCode] = useState(() => localStorage.getItem('offerly_login_country') || '+91');
  const [rememberLogin, setRememberLogin] = useState(() => localStorage.getItem('offerly_remember_login') !== 'false');
  const [activeSlide, setActiveSlide] = useState(0);
  const [showCountryPicker, setShowCountryPicker] = useState(false);
  const [isLoading, setIsLoading] = useState(false);
  const [error, setError] = useState('');

  // Auto carousel slide timer
  useEffect(() => {
    const timer = setInterval(() => {
      setActiveSlide((prev) => (prev + 1) % slides.length);
    }, 4500);
    return () => clearInterval(timer);
  }, []);

  // Persist form data
  useEffect(() => {
    localStorage.setItem('offerly_login_phone', phone);
    localStorage.setItem('offerly_login_country', countryCode);
    localStorage.setItem('offerly_remember_login', rememberLogin);
  }, [phone, countryCode, rememberLogin]);

  const handleLogin = async (e) => {
    if (e) e.preventDefault();
    if (phone.length < 10) {
      setError('Please enter a valid 10-digit mobile number');
      return;
    }

    setError('');
    setIsLoading(true);

    try {
      const response = await authAPI.sendOtp(phone, 'customer', 'login');

      if (response.success) {
        toast.success('OTP sent successfully');
        navigate('/verify', {
          state: {
            phone: `${countryCode} ${phone}`,
            isNewUser: false,
            userType: 'customer',
            devMode: response.devMode,
          },
        });
      }
    } catch (err) {
      console.error('Login error:', err);
      const errorMessage = typeof err === 'object' ? err.error : err;

      if (errorMessage === 'Account not found for this role') {
        try {
          const signupResp = await authAPI.sendOtp(phone, 'customer', 'register');
          if (signupResp.success) {
            toast.success('Sending OTP for new account');
            navigate('/verify', {
              state: {
                phone: `${countryCode} ${phone}`,
                isNewUser: true,
                userType: 'customer',
                devMode: signupResp.devMode,
              },
            });
            return;
          }
        } catch (signupErr) {
          setError(signupErr.error || 'Account not found. Please sign up.');
          toast.error(signupErr.error || 'No account found. Please sign up.');
        }
      } else {
        setError(errorMessage || 'Failed to send verification code.');
        toast.error(errorMessage || 'Failed to send OTP');
      }
    } finally {
      setIsLoading(false);
    }
  };

  const handleSocialClick = (type) => {
    toast.success(`${type} sign-in will be enabled soon.`);
  };

  const selectedCountry = countryList.find((c) => c.code === countryCode) || countryList[0];

  return (
    <PageTransition>
      <div className="min-h-screen bg-[#070707] flex flex-col justify-center items-center font-sans antialiased select-none">
        
        {/* Mobile Viewport Container */}
        <div className="w-full max-w-[440px] min-h-screen sm:min-h-[840px] sm:my-auto bg-[#070707] flex flex-col justify-between relative shadow-2xl overflow-hidden sm:rounded-[36px]">
          
          {/* ========================================================================= */}
          {/* TOP SECTION: Dark Hero with 3D Deal Badge & Carousel                     */}
          {/* ========================================================================= */}
          <div className="relative flex-1 flex flex-col justify-between pt-12 pb-0 px-6 overflow-hidden bg-gradient-to-b from-[#050505] via-[#090D07] to-[#040404] min-h-[380px]">
            
            {/* Ambient Background Glow and Ray Beams */}
            <div className="absolute top-1/3 left-1/2 -translate-x-1/2 -translate-y-1/2 w-80 h-80 bg-[#5EB929]/20 rounded-full blur-[90px] pointer-events-none" />
            <div className="absolute top-0 inset-x-0 h-40 bg-gradient-to-b from-black to-transparent pointer-events-none" />

            {/* Headline with 2 lines, Bold, Center */}
            <div className="relative z-10 w-full text-center mt-2 min-h-[72px] flex items-center justify-center">
              <AnimatePresence mode="wait">
                <motion.h1
                  key={activeSlide}
                  initial={{ opacity: 0, y: 10 }}
                  animate={{ opacity: 1, y: 0 }}
                  exit={{ opacity: 0, y: -10 }}
                  transition={{ duration: 0.3 }}
                  className="text-white font-extrabold text-[25px] sm:text-[27px] tracking-tight leading-[1.2] whitespace-pre-line uppercase font-sans drop-shadow-md"
                >
                  {slides[activeSlide]}
                </motion.h1>
              </AnimatePresence>
            </div>

            {/* 3D Scalloped Badge Graphic positioned in center/bottom (Clean transparent no-bg) */}
            <div className="relative z-10 flex-1 flex flex-col items-center justify-end w-full">
              
              {/* Badge Container */}
              <div className="relative w-full max-w-[340px] h-[260px] flex items-center justify-center overflow-visible -mb-4">
                
                {/* Floating 3D Scalloped Medal Badge */}
                <motion.div
                  animate={{ y: [0, -6, 0] }}
                  transition={{ duration: 4.5, repeat: Infinity, ease: 'easeInOut' }}
                  className="relative z-10 flex items-center justify-center w-full h-full"
                >
                  <img
                    src="/offerly-green-medal-nobg.png"
                    alt="Offerly Best Deals Badge"
                    className="w-[280px] h-[280px] sm:w-[310px] sm:h-[310px] object-contain drop-shadow-[0_20px_40px_rgba(94,185,41,0.25)] select-none pointer-events-none"
                    onError={(e) => {
                      // Fallback if no-bg not loaded
                      e.currentTarget.src = '/offerly-badge-clean.png';
                    }}
                  />
                </motion.div>
              </div>

              {/* Carousel Indicators (Pill + Dots right at bottom baseline) */}
              <div className="relative z-20 flex items-center justify-center gap-1.5 pb-2">
                {slides.map((_, idx) => (
                  <button
                    key={idx}
                    type="button"
                    onClick={() => setActiveSlide(idx)}
                    className={`transition-all duration-300 rounded-full cursor-pointer ${
                      activeSlide === idx
                        ? 'w-7 h-1.5 bg-[#94A3B8]'
                        : 'w-1.5 h-1.5 bg-[#334155] hover:bg-[#64748B]'
                    }`}
                    aria-label={`Go to slide ${idx + 1}`}
                  />
                ))}
              </div>

            </div>
          </div>

          {/* ========================================================================= */}
          {/* BOTTOM SECTION: Flat White Auth Sheet (Pixel Match to Reference)          */}
          {/* ========================================================================= */}
          <div className="w-full bg-white px-6 pt-5 pb-8 flex flex-col justify-between z-30 shadow-[0_-10px_25px_rgba(0,0,0,0.15)]">
            
            {/* Subheading */}
            <div className="text-center mb-4">
              <h2 className="text-[#475569] font-medium text-[15px] tracking-normal">
                Log in or sign up
              </h2>
            </div>

            {/* Login Form */}
            <form onSubmit={handleLogin} className="space-y-4">
              
              {/* Phone Input Row */}
              <div className="flex items-center gap-2.5">
                
                {/* Flag / Country Code Picker Box */}
                <div className="relative">
                  <button
                    type="button"
                    onClick={() => setShowCountryPicker((prev) => !prev)}
                    className="h-[52px] px-3 bg-white border border-[#CBD5E1] hover:border-gray-400 rounded-xl flex items-center gap-1.5 shadow-sm transition-all text-gray-700 active:scale-95"
                  >
                    <span className="text-2xl leading-none">{selectedCountry.flag}</span>
                    <svg className="w-4 h-4 text-gray-400" fill="currentColor" viewBox="0 0 20 20">
                      <path
                        fillRule="evenodd"
                        d="M5.293 7.293a1 1 0 011.414 0L10 10.586l3.293-3.293a1 1 0 111.414 1.414l-4 4a1 1 0 01-1.414 0l-4-4a1 1 0 010-1.414z"
                        clipRule="evenodd"
                      />
                    </svg>
                  </button>

                  {/* Dropdown Menu */}
                  <AnimatePresence>
                    {showCountryPicker && (
                      <motion.div
                        initial={{ opacity: 0, y: 8, scale: 0.95 }}
                        animate={{ opacity: 1, y: 0, scale: 1 }}
                        exit={{ opacity: 0, y: 8, scale: 0.95 }}
                        className="absolute left-0 bottom-full mb-2 bg-white rounded-xl shadow-2xl border border-gray-200 py-1.5 w-44 z-50 overflow-hidden"
                      >
                        {countryList.map((item) => (
                          <button
                            key={item.code}
                            type="button"
                            onClick={() => {
                              setCountryCode(item.code);
                              setShowCountryPicker(false);
                            }}
                            className="w-full px-3 py-2 flex items-center justify-between hover:bg-gray-50 text-left text-xs font-medium text-gray-800"
                          >
                            <span className="flex items-center gap-2">
                              <span>{item.flag}</span>
                              <span>{item.country}</span>
                            </span>
                            <span className="text-gray-400 font-bold">{item.code}</span>
                          </button>
                        ))}
                      </motion.div>
                    )}
                  </AnimatePresence>
                </div>

                {/* Mobile Number Input Box */}
                <div className="flex-1 relative flex items-center h-[52px] bg-white border border-[#CBD5E1] focus-within:border-primary focus-within:ring-2 focus-within:ring-primary/20 rounded-xl px-3.5 shadow-sm transition-all">
                  <span className="text-gray-900 font-bold text-[15px] mr-2 select-none">
                    {countryCode}
                  </span>
                  <input
                    type="tel"
                    value={phone}
                    onChange={(e) => {
                      const val = e.target.value.replace(/\D/g, '').slice(0, 10);
                      setPhone(val);
                      if (error) setError('');
                    }}
                    placeholder="Enter Phone Number"
                    className="w-full bg-transparent text-gray-900 font-normal text-[15px] placeholder:text-[#94A3B8] placeholder:font-normal outline-none border-none tracking-normal"
                    autoFocus
                  />
                </div>
              </div>

              {/* Error Notification */}
              {error && (
                <p className="text-xs font-medium text-rose-500 px-1 -mt-2">
                  {error}
                </p>
              )}

              {/* Remember Login Checkbox Row */}
              <div
                onClick={() => setRememberLogin(!rememberLogin)}
                className="flex items-center gap-2.5 pt-0.5 cursor-pointer select-none"
              >
                <div
                  className={`w-[18px] h-[18px] rounded-[4px] flex items-center justify-center transition-all ${
                    rememberLogin
                      ? 'bg-primary text-white'
                      : 'border border-gray-300 bg-white'
                  }`}
                >
                  {rememberLogin && (
                    <svg className="w-3 h-3 text-white stroke-[3]" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                      <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={3.5} d="M5 13l4 4L19 7" />
                    </svg>
                  )}
                </div>
                <span className="text-[13px] font-normal text-[#1E293B]">
                  Remember my login for faster sign-in
                </span>
              </div>

              {/* Continue Button with Offerly Brand Gradient */}
              <motion.button
                whileTap={{ scale: 0.98 }}
                type="submit"
                disabled={isLoading || phone.length < 10}
                className="w-full bg-gradient-to-r from-[#62B82B] via-[#5EB929] to-[#4E9F1F] hover:opacity-95 text-white font-semibold text-[15px] h-[48px] rounded-xl shadow-md shadow-[#5EB929]/25 disabled:opacity-50 disabled:cursor-not-allowed transition-all flex items-center justify-center"
              >
                {isLoading ? (
                  <div className="w-5 h-5 border-2 border-white/30 border-t-white rounded-full animate-spin" />
                ) : (
                  'Continue'
                )}
              </motion.button>
            </form>

            {/* Social Logins (Google & Mail Round Buttons) */}
            <div className="flex items-center justify-center gap-4 my-5">
              
              {/* Google Button */}
              <button
                type="button"
                onClick={() => handleSocialClick('Google')}
                className="w-[46px] h-[46px] rounded-full border border-[#E2E8F0] bg-white flex items-center justify-center shadow-sm hover:bg-gray-50 active:scale-95 transition-all"
                aria-label="Sign in with Google"
              >
                <svg className="w-5 h-5" viewBox="0 0 24 24">
                  <path
                    fill="#4285F4"
                    d="M22.56 12.25c0-.78-.07-1.53-.2-2.25H12v4.26h5.92c-.26 1.37-1.04 2.53-2.21 3.31v2.77h3.57c2.08-1.92 3.28-4.74 3.28-8.09z"
                  />
                  <path
                    fill="#34A853"
                    d="M12 23c2.97 0 5.46-.98 7.28-2.66l-3.57-2.77c-.98.66-2.23 1.06-3.71 1.06-2.86 0-5.29-1.93-6.16-4.53H2.18v2.84C3.99 20.53 7.7 23 12 23z"
                  />
                  <path
                    fill="#FBBC05"
                    d="M5.84 14.09c-.22-.66-.35-1.36-.35-2.09s.13-1.43.35-2.09V7.06H2.18C1.43 8.55 1 10.22 1 12s.43 3.45 1.18 4.94l2.85-2.22.81-.63z"
                  />
                  <path
                    fill="#EA4335"
                    d="M12 5.38c1.62 0 3.06.56 4.21 1.64l3.15-3.15C17.45 2.09 14.97 1 12 1 7.7 1 3.99 3.47 2.18 7.06l3.66 2.84c.87-2.6 3.3-4.52 6.16-4.52z"
                  />
                </svg>
              </button>

              {/* Mail / Email Button */}
              <button
                type="button"
                onClick={() => handleSocialClick('Email')}
                className="w-[46px] h-[46px] rounded-full border border-[#E2E8F0] bg-white flex items-center justify-center shadow-sm hover:bg-gray-50 active:scale-95 transition-all text-[#5EB929]"
                aria-label="Sign in with Email"
              >
                <svg
                  className="w-5 h-5 text-[#5EB929]"
                  fill="currentColor"
                  viewBox="0 0 24 24"
                >
                  <path d="M20 4H4c-1.1 0-1.99.9-1.99 2L2 18c0 1.1.9 2 2 2h16c1.1 0 2-.9 2-2V6c0-1.1-.9-2-2-2zm0 4l-8 5-8-5V6l8 5 8-5v2z" />
                </svg>
              </button>
            </div>

            {/* Legal / Terms Footer with Dotted Underlines */}
            <div className="text-center text-[12px] text-[#64748B] leading-relaxed">
              <p>By continuing, you agree to our</p>
              <div className="flex items-center justify-center gap-2.5 mt-0.5 text-[12px] font-normal text-[#334155]">
                <button
                  type="button"
                  onClick={() => navigate('/terms')}
                  className="border-b border-dotted border-gray-400 hover:text-primary transition-colors pb-[1px]"
                >
                  Terms of Service
                </button>
                <button
                  type="button"
                  onClick={() => navigate('/privacy')}
                  className="border-b border-dotted border-gray-400 hover:text-primary transition-colors pb-[1px]"
                >
                  Privacy Policy
                </button>
                <button
                  type="button"
                  onClick={() => navigate('/terms')}
                  className="border-b border-dotted border-gray-400 hover:text-primary transition-colors pb-[1px]"
                >
                  Content Policy
                </button>
              </div>
            </div>

          </div>

        </div>
      </div>
    </PageTransition>
  );
};

export default CustomerLogin;


