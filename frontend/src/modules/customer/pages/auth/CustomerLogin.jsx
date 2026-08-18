import { useState, useEffect, useRef } from 'react';
import { useNavigate } from 'react-router-dom';
import { motion, AnimatePresence } from 'framer-motion';
import { authAPI } from '../../../../api/auth.api';
import toast from 'react-hot-toast';
import PageTransition from '../../components/ui/PageTransition';

const slides = [
  {
    title: 'FIND THE BEST DEAL\nON EVERY MEAL',
    subtitle: 'Save up to 50% at premier restaurants, cafes, and rooftop dining in your city.',
    badge: 'Exclusive Dining Deals',
  },
  {
    title: 'UNLOCK UP TO 70% OFF\nON TOP MERCHANTS',
    subtitle: 'From luxury spas and gyms to lifestyle stores — get VIP pricing instantly.',
    badge: 'Top Tier Discounts',
  },
  {
    title: 'DISCOVER EXCLUSIVE\nOFFERS IN YOUR CITY',
    subtitle: 'Join thousands of smart shoppers redeeming verified local deals every day.',
    badge: 'Verified Local Deals',
  },
];

const countryList = [
  { code: '+91', flag: '🇮🇳', country: 'India' },
  { code: '+1', flag: '🇺🇸', country: 'United States' },
  { code: '+44', flag: '🇬🇧', country: 'United Kingdom' },
  { code: '+971', flag: '🇦🇪', country: 'UAE' },
];

const highlights = [
  { icon: '🏷️', label: '100% Verified Deals' },
  { icon: '⚡', label: 'Instant QR Redemption' },
  { icon: '💎', label: 'Cashback & Rewards' },
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
  const [isKeyboardOpen, setIsKeyboardOpen] = useState(false);
  const countryPickerRef = useRef(null);

  // Auto carousel timer
  useEffect(() => {
    const timer = setInterval(() => {
      setActiveSlide((prev) => (prev + 1) % slides.length);
    }, 4500);
    return () => clearInterval(timer);
  }, []);

  // Handle clicking outside country picker
  useEffect(() => {
    const handleClickOutside = (e) => {
      if (countryPickerRef.current && !countryPickerRef.current.contains(e.target)) {
        setShowCountryPicker(false);
      }
    };
    document.addEventListener('mousedown', handleClickOutside);
    return () => document.removeEventListener('mousedown', handleClickOutside);
  }, []);

  // Visual viewport resize detection for mobile/webviews
  useEffect(() => {
    const handleResize = () => {
      if (window.visualViewport) {
        const isKeyboard = window.visualViewport.height < window.innerHeight * 0.75;
        setIsKeyboardOpen(isKeyboard);
      }
    };

    if (window.visualViewport) {
      window.visualViewport.addEventListener('resize', handleResize);
    }
    return () => {
      if (window.visualViewport) {
        window.visualViewport.removeEventListener('resize', handleResize);
      }
    };
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
      <div 
        className="w-full min-h-[100dvh] bg-[#070809] flex flex-col justify-center items-center font-sans antialiased select-none md:p-6 lg:p-10"
        style={{
          paddingTop: 'env(safe-area-inset-top, 0px)',
          paddingBottom: 'env(safe-area-inset-bottom, 0px)',
        }}
      >
        {/* Main Responsive Wrapper: Full width on mobile/webview, Split-screen Masterpiece on Desktop/Tablet */}
        <div className="w-full max-w-full md:max-w-5xl lg:max-w-6xl min-h-[100dvh] md:min-h-[640px] lg:min-h-[720px] md:h-auto bg-[#070707] md:bg-[#0B0F0C] flex flex-col md:flex-row justify-between relative md:rounded-[32px] shadow-2xl overflow-hidden md:border md:border-white/10">
          
          {/* ========================================================================= */}
          {/* LEFT / TOP SECTION: Brand Hero with Dynamic 3D Badge & Carousel           */}
          {/* ========================================================================= */}
          <div className={`relative flex-1 md:w-7/12 lg:w-3/5 min-h-0 flex flex-col justify-between items-center md:items-start p-6 sm:p-8 md:p-10 lg:p-12 overflow-hidden bg-gradient-to-b md:bg-gradient-to-br from-[#060806] via-[#090F08] to-[#040504] transition-all duration-300 ${
            isKeyboardOpen ? 'max-h-[180px] md:max-h-none' : ''
          }`}>
            
            {/* Ambient Background Glows */}
            <div className="absolute top-1/4 left-1/2 md:left-1/3 -translate-x-1/2 -translate-y-1/2 w-80 md:w-96 h-80 md:h-96 bg-[#5EB929]/20 rounded-full blur-[90px] pointer-events-none" />
            <div className="absolute bottom-0 right-0 w-64 h-64 bg-[#5EB929]/10 rounded-full blur-[80px] pointer-events-none" />
            <div className="absolute top-0 inset-x-0 h-32 bg-gradient-to-b from-black/60 to-transparent pointer-events-none" />

            {/* Top Brand Identity */}
            <div className="relative z-10 w-full flex items-center justify-between">
              <div className="flex items-center gap-3">
                <div className="w-10 h-10 md:w-11 md:h-11 rounded-2xl bg-white/5 border border-white/10 backdrop-blur-md p-2 flex items-center justify-center shadow-lg shadow-black/40">
                  <img src="/offerly-logo-ring.png" alt="Offerly Logo" className="w-full h-full object-contain" />
                </div>
                <div>
                  <h2 className="text-white font-black text-xl tracking-tight leading-none flex items-center gap-1.5">
                    Offerly
                    <span className="w-2 h-2 rounded-full bg-[#5EB929] inline-block shadow-[0_0_8px_#5EB929]" />
                  </h2>
                  <p className="text-[10px] font-bold text-gray-400 uppercase tracking-widest mt-0.5">Local Deals & Savings</p>
                </div>
              </div>

              {/* Desktop Tag */}
              <div className="hidden md:flex items-center gap-2 px-3 py-1.5 rounded-full bg-white/5 border border-white/10 backdrop-blur-md">
                <span className="w-2 h-2 rounded-full bg-[#5EB929] animate-pulse" />
                <span className="text-xs font-semibold text-gray-300">Live in your city</span>
              </div>
            </div>

            {/* Middle Section: Floating 3D Badge + Dynamic Copy */}
            <div className="relative z-10 w-full flex-1 flex flex-col md:flex-row items-center justify-center md:justify-between gap-4 md:gap-8 my-auto py-2 md:py-6">
              
              {/* Text Headline & Carousel Content */}
              <div className="w-full md:max-w-md text-center md:text-left flex flex-col justify-center">
                
                {/* Active Category Badge */}
                <div className="hidden md:inline-flex items-center gap-2 self-start px-3 py-1 rounded-full bg-[#5EB929]/15 border border-[#5EB929]/30 text-[#67C72E] text-xs font-bold uppercase tracking-wider mb-4">
                  <span>★</span>
                  <span>{slides[activeSlide].badge}</span>
                </div>

                <div className="min-h-[56px] sm:min-h-[68px] md:min-h-[96px] flex items-center md:items-start justify-center md:justify-start">
                  <AnimatePresence mode="wait">
                    <motion.div
                      key={activeSlide}
                      initial={{ opacity: 0, y: 10 }}
                      animate={{ opacity: 1, y: 0 }}
                      exit={{ opacity: 0, y: -10 }}
                      transition={{ duration: 0.3 }}
                      className="space-y-2"
                    >
                      <h1 className={`text-white font-black tracking-tight leading-[1.15] uppercase font-sans drop-shadow-md whitespace-pre-line ${
                        isKeyboardOpen ? 'text-lg' : 'text-xl sm:text-2xl md:text-3xl lg:text-4xl'
                      }`}>
                        {slides[activeSlide].title}
                      </h1>
                      <p className="hidden md:block text-sm lg:text-base text-gray-400 font-normal leading-relaxed">
                        {slides[activeSlide].subtitle}
                      </p>
                    </motion.div>
                  </AnimatePresence>
                </div>
              </div>

              {/* 3D Scalloped Badge Graphic */}
              <div className="relative flex items-center justify-center max-w-[240px] sm:max-w-[280px] md:max-w-[260px] lg:max-w-[320px] aspect-square w-full">
                <motion.div
                  animate={{ y: [0, -6, 0] }}
                  transition={{ duration: 4.5, repeat: Infinity, ease: 'easeInOut' }}
                  className="relative z-10 w-full h-full flex items-center justify-center"
                >
                  <img
                    src="/offerly-green-medal-nobg.png"
                    alt="Offerly Best Deals"
                    className="max-h-full max-w-full object-contain drop-shadow-[0_20px_40px_rgba(94,185,41,0.3)] select-none pointer-events-none"
                    onError={(e) => {
                      e.currentTarget.src = '/offerly-badge-clean.png';
                    }}
                  />
                </motion.div>
              </div>

            </div>

            {/* Bottom Hero Highlights (Desktop) & Carousel Indicator (Both) */}
            <div className="relative z-10 w-full flex flex-col md:flex-row items-center justify-between gap-4 pt-2">
              
              {/* Highlight Badges on Desktop */}
              <div className="hidden md:flex items-center gap-3">
                {highlights.map((h, i) => (
                  <div key={i} className="flex items-center gap-1.5 px-3 py-1.5 rounded-xl bg-white/5 border border-white/5 text-xs font-semibold text-gray-300">
                    <span>{h.icon}</span>
                    <span>{h.label}</span>
                  </div>
                ))}
              </div>

              {/* Carousel Indicators */}
              <div className="flex items-center gap-1.5">
                {slides.map((_, idx) => (
                  <button
                    key={idx}
                    type="button"
                    onClick={() => setActiveSlide(idx)}
                    className={`transition-all duration-300 rounded-full cursor-pointer ${
                      activeSlide === idx
                        ? 'w-6 md:w-8 h-1.5 bg-[#5EB929]'
                        : 'w-1.5 h-1.5 bg-gray-700 hover:bg-gray-500'
                    }`}
                    aria-label={`Slide ${idx + 1}`}
                  />
                ))}
              </div>

            </div>

          </div>

          {/* ========================================================================= */}
          {/* RIGHT / BOTTOM SECTION: Clean White Auth Panel                           */}
          {/* ========================================================================= */}
          <div className="w-full md:w-5/12 lg:w-2/5 bg-white rounded-t-[32px] md:rounded-t-none md:rounded-r-[32px] p-6 sm:p-8 md:p-10 lg:p-12 flex flex-col justify-between z-30 shadow-[0_-10px_30px_rgba(0,0,0,0.2)] md:shadow-none shrink-0 border-t md:border-t-0 md:border-l border-gray-100">
            
            {/* Header */}
            <div className="mb-6 text-center md:text-left">
              <h2 className="text-gray-900 font-extrabold text-2xl lg:text-3xl tracking-tight">
                Get Started
              </h2>
              <p className="text-gray-500 text-sm font-normal mt-1.5">
                Enter your mobile number to log in or create your Offerly account.
              </p>
            </div>

            {/* Login Form */}
            <form onSubmit={handleLogin} className="space-y-4">
              
              <div className="space-y-1.5">
                <label className="block text-xs font-bold text-gray-700 uppercase tracking-wider">
                  Mobile Number
                </label>

                {/* Phone Input Row */}
                <div className="flex items-center gap-2.5">
                  
                  {/* Flag / Country Code Picker Box */}
                  <div className="relative" ref={countryPickerRef}>
                    <button
                      type="button"
                      onClick={() => setShowCountryPicker((prev) => !prev)}
                      className="h-[52px] px-3.5 bg-gray-50 hover:bg-gray-100 border border-gray-200 focus:border-[#5EB929] rounded-2xl flex items-center gap-1.5 shadow-sm transition-all text-gray-800 active:scale-95"
                      aria-expanded={showCountryPicker}
                    >
                      <span className="text-xl sm:text-2xl leading-none">{selectedCountry.flag}</span>
                      <svg className="w-3.5 h-3.5 text-gray-400" fill="currentColor" viewBox="0 0 20 20">
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
                          className="absolute left-0 bottom-full md:bottom-auto md:top-full mb-2 md:mb-0 md:mt-2 bg-white rounded-2xl shadow-2xl border border-gray-200 py-2 w-52 z-50 overflow-hidden"
                        >
                          {countryList.map((item) => (
                            <button
                              key={item.code}
                              type="button"
                              onClick={() => {
                                setCountryCode(item.code);
                                setShowCountryPicker(false);
                              }}
                              className="w-full px-4 py-2.5 flex items-center justify-between hover:bg-gray-50 text-left text-xs font-semibold text-gray-800 active:bg-gray-100"
                            >
                              <span className="flex items-center gap-2.5">
                                <span className="text-lg">{item.flag}</span>
                                <span>{item.country}</span>
                              </span>
                              <span className="text-gray-400 font-bold">{item.code}</span>
                            </button>
                          ))}
                        </motion.div>
                      )}
                    </AnimatePresence>
                  </div>

                  {/* Mobile Number Input Box (text-base prevents auto-zoom on iOS/WebViews) */}
                  <div className="flex-1 relative flex items-center h-[52px] bg-gray-50 border border-gray-200 focus-within:border-[#5EB929] focus-within:bg-white focus-within:ring-4 focus-within:ring-[#5EB929]/15 rounded-2xl px-4 shadow-sm transition-all">
                    <span className="text-gray-900 font-bold text-base sm:text-[15px] mr-2 select-none">
                      {countryCode}
                    </span>
                    <input
                      type="tel"
                      inputMode="tel"
                      autoComplete="tel"
                      pattern="[0-9]*"
                      value={phone}
                      onFocus={() => {
                        if (window.visualViewport) {
                          setIsKeyboardOpen(true);
                        }
                      }}
                      onBlur={() => {
                        setIsKeyboardOpen(false);
                      }}
                      onChange={(e) => {
                        const val = e.target.value.replace(/\D/g, '').slice(0, 10);
                        setPhone(val);
                        if (error) setError('');
                      }}
                      placeholder="00000 00000"
                      className="w-full bg-transparent text-gray-900 font-medium text-base sm:text-[15px] placeholder:text-gray-400 placeholder:font-normal outline-none border-none tracking-normal"
                      autoFocus={!Boolean(phone)}
                    />
                  </div>
                </div>
              </div>

              {/* Error Message */}
              {error && (
                <p className="text-xs font-medium text-rose-500 px-1">
                  {error}
                </p>
              )}

              {/* Remember Login Checkbox Row */}
              <div
                onClick={() => setRememberLogin(!rememberLogin)}
                className="flex items-center gap-2.5 pt-1 cursor-pointer select-none"
              >
                <div
                  className={`w-5 h-5 rounded-md flex items-center justify-center transition-all ${
                    rememberLogin
                      ? 'bg-[#5EB929] text-white shadow-sm shadow-[#5EB929]/40'
                      : 'border border-gray-300 bg-white'
                  }`}
                >
                  {rememberLogin && (
                    <svg className="w-3.5 h-3.5 text-white stroke-[3]" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                      <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={3.5} d="M5 13l4 4L19 7" />
                    </svg>
                  )}
                </div>
                <span className="text-xs sm:text-sm font-medium text-gray-700">
                  Keep me signed in on this device
                </span>
              </div>

              {/* Continue Button with Offerly Brand Gradient */}
              <motion.button
                whileTap={{ scale: 0.98 }}
                whileHover={{ scale: 1.01 }}
                type="submit"
                disabled={isLoading || phone.length < 10}
                className="w-full bg-gradient-to-r from-[#62B82B] via-[#5EB929] to-[#4E9F1F] hover:brightness-105 text-white font-bold text-base h-[52px] rounded-2xl shadow-lg shadow-[#5EB929]/30 disabled:opacity-50 disabled:cursor-not-allowed transition-all flex items-center justify-center mt-2"
              >
                {isLoading ? (
                  <div className="w-5 h-5 border-2 border-white/30 border-t-white rounded-full animate-spin" />
                ) : (
                  'Continue with OTP'
                )}
              </motion.button>
            </form>

            {/* Social Logins */}
            <div className="my-6">
              <div className="relative flex items-center justify-center mb-4">
                <div className="absolute inset-0 flex items-center">
                  <div className="w-full border-t border-gray-200" />
                </div>
                <span className="relative px-3 bg-white text-xs font-semibold text-gray-400 uppercase tracking-wider">
                  or continue with
                </span>
              </div>

              <div className="grid grid-cols-2 gap-3">
                
                {/* Google Button */}
                <button
                  type="button"
                  onClick={() => handleSocialClick('Google')}
                  className="h-[46px] rounded-xl border border-gray-200 bg-white hover:bg-gray-50 flex items-center justify-center gap-2.5 shadow-sm active:scale-95 transition-all text-xs font-bold text-gray-700"
                >
                  <svg className="w-4 h-4" viewBox="0 0 24 24">
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
                  Google
                </button>

                {/* Email Button */}
                <button
                  type="button"
                  onClick={() => handleSocialClick('Email')}
                  className="h-[46px] rounded-xl border border-gray-200 bg-white hover:bg-gray-50 flex items-center justify-center gap-2.5 shadow-sm active:scale-95 transition-all text-xs font-bold text-gray-700"
                >
                  <svg
                    className="w-4 h-4 text-[#5EB929]"
                    fill="currentColor"
                    viewBox="0 0 24 24"
                  >
                    <path d="M20 4H4c-1.1 0-1.99.9-1.99 2L2 18c0 1.1.9 2 2 2h16c1.1 0 2-.9 2-2V6c0-1.1-.9-2-2-2zm0 4l-8 5-8-5V6l8 5 8-5v2z" />
                  </svg>
                  Email
                </button>
              </div>
            </div>

            {/* Legal / Terms Footer */}
            <div className="text-center text-xs text-gray-500 leading-relaxed pt-2 border-t border-gray-100">
              <p>By continuing, you agree to Offerly&apos;s</p>
              <div className="flex items-center justify-center gap-2 mt-1 font-medium text-gray-700 flex-wrap">
                <button
                  type="button"
                  onClick={() => navigate('/terms')}
                  className="hover:text-[#5EB929] underline underline-offset-2 transition-colors"
                >
                  Terms of Service
                </button>
                <span>•</span>
                <button
                  type="button"
                  onClick={() => navigate('/privacy')}
                  className="hover:text-[#5EB929] underline underline-offset-2 transition-colors"
                >
                  Privacy Policy
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
