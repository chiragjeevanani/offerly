import { useState, useEffect, useRef } from 'react';
import { useNavigate } from 'react-router-dom';
import { motion, AnimatePresence } from 'framer-motion';
import { authAPI } from '../../../../api/auth.api';
import { storage } from '../../../../utils/storage';
import { useApp } from '../../context/AppContext';
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

const formVariants = {
  enter: (direction) => ({
    x: direction > 0 ? 30 : -30,
    opacity: 0,
  }),
  center: {
    x: 0,
    opacity: 1,
    transition: {
      duration: 0.3,
      ease: [0.16, 1, 0.3, 1],
    },
  },
  exit: (direction) => ({
    x: direction > 0 ? -30 : 30,
    opacity: 0,
    transition: {
      duration: 0.2,
      ease: [0.4, 0, 1, 1],
    },
  }),
};

const CustomerLogin = () => {
  const navigate = useNavigate();
  const { login } = useApp();

  // Auth step state: 'phone' | 'otp'
  const [step, setStep] = useState('phone');
  const [direction, setDirection] = useState(1);

  // Phone input states
  const [phone, setPhone] = useState(() => localStorage.getItem('offerly_login_phone') || '');
  const [countryCode, setCountryCode] = useState(() => localStorage.getItem('offerly_login_country') || '+91');
  const [rememberLogin, setRememberLogin] = useState(() => localStorage.getItem('offerly_remember_login') !== 'false');
  const [activeSlide, setActiveSlide] = useState(0);
  const [showCountryPicker, setShowCountryPicker] = useState(false);
  const [isLoading, setIsLoading] = useState(false);
  const [isVerifying, setIsVerifying] = useState(false);
  const [error, setError] = useState('');
  const [isKeyboardOpen, setIsKeyboardOpen] = useState(false);

  // OTP states
  const [otp, setOtp] = useState(Array(6).fill(''));
  const [otpPurpose, setOtpPurpose] = useState('login');
  const [isNewUser, setIsNewUser] = useState(false);
  const [devMode, setDevMode] = useState(false);
  const [resendCooldown, setResendCooldown] = useState(0);
  const [otpShake, setOtpShake] = useState(false);

  const countryPickerRef = useRef(null);
  const phoneInputRef = useRef(null);
  const otpInputRefs = useRef([]);

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

  // Resend OTP cooldown timer
  useEffect(() => {
    if (step !== 'otp' || resendCooldown <= 0) return;
    const timer = setInterval(() => {
      setResendCooldown((c) => (c > 0 ? c - 1 : 0));
    }, 1000);
    return () => clearInterval(timer);
  }, [step, resendCooldown]);

  // Focus management on step change
  useEffect(() => {
    if (step === 'otp') {
      const timer = setTimeout(() => {
        otpInputRefs.current[0]?.focus();
      }, 150);
      return () => clearTimeout(timer);
    } else if (step === 'phone') {
      const timer = setTimeout(() => {
        phoneInputRef.current?.focus();
      }, 150);
      return () => clearTimeout(timer);
    }
  }, [step]);

  // Step 1: Send OTP handler
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
        setOtpPurpose('login');
        setIsNewUser(false);
        setDevMode(Boolean(response.devMode));
        setResendCooldown(30);
        setOtp(Array(6).fill(''));
        setDirection(1);
        setStep('otp');
        toast.success('OTP sent successfully');
      }
    } catch (err) {
      console.error('Login error:', err);
      const errorMessage = typeof err === 'object' ? err.error : err;

      if (errorMessage === 'Account not found for this role') {
        try {
          const signupResp = await authAPI.sendOtp(phone, 'customer', 'register');
          if (signupResp.success) {
            setOtpPurpose('register');
            setIsNewUser(true);
            setDevMode(Boolean(signupResp.devMode));
            setResendCooldown(30);
            setOtp(Array(6).fill(''));
            setDirection(1);
            setStep('otp');
            toast.success('Sending OTP for new account');
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

  // Step 2: Verify OTP handler
  const handleVerifyOtp = async (codeToVerify) => {
    const code = typeof codeToVerify === 'string' ? codeToVerify : otp.join('');
    if (code.length < 6) {
      setError('Please enter the complete 6-digit OTP');
      return;
    }

    setError('');
    setIsVerifying(true);

    try {
      const cleanPhone = phone.replace(/\D/g, '');
      const verifyResponse = await authAPI.verifyOtp(cleanPhone, 'customer', otpPurpose, code);

      if (verifyResponse.success) {
        if (otpPurpose === 'register' || verifyResponse.isNewUser) {
          const pendingData = JSON.parse(sessionStorage.getItem('pendingRegistration') || '{}');
          if (pendingData.name) {
            const registerResponse = await authAPI.registerCustomer(verifyResponse.verificationToken, {
              ...pendingData,
              phone: cleanPhone,
            });

            if (registerResponse.success) {
              storage.setToken(registerResponse.token);
              storage.setUser(registerResponse.user);
              login(registerResponse.user);
              sessionStorage.removeItem('pendingRegistration');
              toast.success('Account created successfully!');
              navigate('/home');
              return;
            }
          }

          // New user without prior registration data - redirect to complete profile
          sessionStorage.setItem(
            'pendingRegistration',
            JSON.stringify({ phone: cleanPhone, verificationToken: verifyResponse.verificationToken, userType: 'customer' })
          );
          toast.success('Mobile verified! Please complete your profile.');
          navigate('/signup', {
            state: {
              phone: `${countryCode} ${cleanPhone}`,
              verificationToken: verifyResponse.verificationToken,
            },
          });
        } else {
          // Existing customer login
          storage.setToken(verifyResponse.token);
          storage.setUser(verifyResponse.user);
          login(verifyResponse.user);
          toast.success('Welcome back to Offerly!');
          navigate('/home');
        }
      }
    } catch (err) {
      console.error('OTP Verification error:', err);
      const errMsg = typeof err === 'object' ? err.error || err.message : err;
      setError(errMsg || 'Invalid verification code. Please try again.');
      setOtpShake(true);
      setTimeout(() => setOtpShake(false), 500);
      toast.error(errMsg || 'Invalid OTP');
    } finally {
      setIsVerifying(false);
    }
  };

  // Step 2: Resend OTP handler
  const handleResendOtp = async () => {
    if (resendCooldown > 0) return;
    setError('');
    const cleanPhone = phone.replace(/\D/g, '');

    try {
      const response = await authAPI.sendOtp(cleanPhone, 'customer', otpPurpose);
      if (response.success) {
        setResendCooldown(30);
        setOtp(Array(6).fill(''));
        setDevMode(Boolean(response.devMode));
        toast.success('New OTP sent successfully');
        otpInputRefs.current[0]?.focus();
      }
    } catch (err) {
      toast.error(err.error || 'Failed to resend verification code');
    }
  };

  // Edit phone number action
  const handleEditPhone = () => {
    setError('');
    setOtp(Array(6).fill(''));
    setDirection(-1);
    setStep('phone');
  };

  // OTP Input handlers
  const handleOtpChange = (index, e) => {
    const val = e.target.value.replace(/\D/g, '');
    if (!val) return;

    const char = val.slice(-1);
    const newOtp = [...otp];
    newOtp[index] = char;
    setOtp(newOtp);
    if (error) setError('');

    // Auto advance to next input
    if (index < 5) {
      otpInputRefs.current[index + 1]?.focus();
    }

    // Auto submit on last digit filled
    const isComplete = newOtp.every((digit) => digit !== '');
    if (isComplete) {
      handleVerifyOtp(newOtp.join(''));
    }
  };

  const handleOtpKeyDown = (index, e) => {
    if (e.key === 'Backspace') {
      const newOtp = [...otp];
      if (otp[index]) {
        newOtp[index] = '';
        setOtp(newOtp);
      } else if (index > 0) {
        newOtp[index - 1] = '';
        setOtp(newOtp);
        otpInputRefs.current[index - 1]?.focus();
      }
    } else if (e.key === 'ArrowLeft' && index > 0) {
      otpInputRefs.current[index - 1]?.focus();
    } else if (e.key === 'ArrowRight' && index < 5) {
      otpInputRefs.current[index + 1]?.focus();
    }
  };

  const handleOtpPaste = (e) => {
    e.preventDefault();
    const pasted = e.clipboardData.getData('text').replace(/\D/g, '').slice(0, 6);
    if (!pasted) return;

    const newOtp = Array(6).fill('');
    pasted.split('').forEach((char, i) => {
      newOtp[i] = char;
    });
    setOtp(newOtp);
    if (error) setError('');

    const targetIdx = Math.min(pasted.length, 5);
    otpInputRefs.current[targetIdx]?.focus();

    if (pasted.length === 6) {
      handleVerifyOtp(pasted);
    }
  };

  const handleSocialClick = (type) => {
    toast.success(`${type} sign-in will be enabled soon.`);
  };

  const selectedCountry = countryList.find((c) => c.code === countryCode) || countryList[0];

  return (
    <PageTransition>
      <div 
        className="w-full h-[100dvh] max-h-[100dvh] bg-[#070809] flex flex-col justify-center items-center font-sans antialiased select-none overflow-hidden md:p-6 lg:p-10"
        style={{
          paddingTop: 'env(safe-area-inset-top, 0px)',
          paddingBottom: 'env(safe-area-inset-bottom, 0px)',
        }}
      >
        {/* Main Responsive Container: Strictly 100dvh on mobile (no scroll), split-card on desktop */}
        <div className="w-full max-w-full md:max-w-5xl lg:max-w-6xl h-full md:h-auto md:min-h-[620px] lg:min-h-[680px] bg-[#070707] md:bg-[#0B0F0C] flex flex-col md:flex-row justify-between relative md:rounded-[32px] shadow-2xl overflow-hidden md:border md:border-white/10">
          
          {/* ========================================================================= */}
          {/* TOP (MOBILE) / LEFT (DESKTOP) SECTION: Brand Hero Banner                  */}
          {/* ========================================================================= */}
          <div className={`relative w-full md:w-7/12 lg:w-3/5 flex flex-col justify-between items-center md:items-start p-3 sm:p-5 md:p-10 lg:p-12 overflow-hidden bg-gradient-to-b md:bg-gradient-to-br from-[#060806] via-[#090F08] to-[#040504] shrink-0 ${
            isKeyboardOpen ? 'h-[14vh] md:h-auto' : 'h-[28vh] sm:h-[32vh] md:h-auto md:flex-1'
          } transition-all duration-300`}>
            
            {/* Ambient Glows */}
            <div className="absolute top-1/2 left-1/2 md:left-1/3 -translate-x-1/2 -translate-y-1/2 w-64 sm:w-80 md:w-96 h-64 sm:h-80 md:h-96 bg-[#5EB929]/20 rounded-full blur-[80px] pointer-events-none" />
            <div className="absolute bottom-0 right-0 w-48 md:w-64 h-48 md:h-64 bg-[#5EB929]/10 rounded-full blur-[70px] pointer-events-none" />

            {/* Desktop Brand Identity (Visible only on Desktop) */}
            <div className="hidden md:flex relative z-10 w-full items-center justify-between">
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

              <div className="flex items-center gap-2 px-3 py-1.5 rounded-full bg-white/5 border border-white/10 backdrop-blur-md">
                <span className="w-2 h-2 rounded-full bg-[#5EB929] animate-pulse" />
                <span className="text-xs font-semibold text-gray-300">Live in your city</span>
              </div>
            </div>

            {/* Middle Section: Floating Scalloped Badge + Dynamic Copy */}
            <div className="relative z-10 w-full h-full md:h-auto flex flex-col md:flex-row items-center justify-center md:justify-between gap-2 md:gap-8 my-auto">
              
              {/* Desktop Headline & Carousel Copy */}
              <div className="hidden md:flex w-full md:max-w-md text-left flex-col justify-center">
                <div className="inline-flex items-center gap-2 self-start px-3 py-1 rounded-full bg-[#5EB929]/15 border border-[#5EB929]/30 text-[#67C72E] text-xs font-bold uppercase tracking-wider mb-4">
                  <span>★</span>
                  <span>{slides[activeSlide].badge}</span>
                </div>

                <div className="min-h-[96px] flex items-start justify-start">
                  <AnimatePresence mode="wait">
                    <motion.div
                      key={activeSlide}
                      initial={{ opacity: 0, y: 10 }}
                      animate={{ opacity: 1, y: 0 }}
                      exit={{ opacity: 0, y: -10 }}
                      transition={{ duration: 0.3 }}
                      className="space-y-2"
                    >
                      <h1 className="text-white font-black tracking-tight leading-[1.15] uppercase font-sans drop-shadow-md whitespace-pre-line text-2xl md:text-3xl lg:text-4xl">
                        {slides[activeSlide].title}
                      </h1>
                      <p className="text-sm lg:text-base text-gray-400 font-normal leading-relaxed">
                        {slides[activeSlide].subtitle}
                      </p>
                    </motion.div>
                  </AnimatePresence>
                </div>
              </div>

              {/* 3D Scalloped Badge Graphic */}
              <div className="relative flex items-center justify-center h-full max-h-[160px] sm:max-h-[190px] md:max-h-none md:max-w-[260px] lg:max-w-[300px] aspect-square w-auto">
                <motion.div
                  animate={{ y: [0, -5, 0] }}
                  transition={{ duration: 4, repeat: Infinity, ease: 'easeInOut' }}
                  className="relative z-10 w-full h-full flex items-center justify-center"
                >
                  <img
                    src="/offerly-green-medal-nobg.png"
                    alt="Offerly Deals"
                    className="max-h-full max-w-full object-contain drop-shadow-[0_12px_28px_rgba(94,185,41,0.35)] select-none pointer-events-none"
                    onError={(e) => {
                      e.currentTarget.src = '/offerly-badge-clean.png';
                    }}
                  />
                </motion.div>
              </div>

            </div>

            {/* Bottom Hero Highlights & Carousel Indicators */}
            <div className="relative z-10 w-full flex items-center justify-center md:justify-between pt-1">
              <div className="hidden md:flex items-center gap-3">
                {highlights.map((h, i) => (
                  <div key={i} className="flex items-center gap-1.5 px-3 py-1.5 rounded-xl bg-white/5 border border-white/5 text-xs font-semibold text-gray-300">
                    <span>{h.icon}</span>
                    <span>{h.label}</span>
                  </div>
                ))}
              </div>

              {/* Carousel Indicators */}
              <div className="flex items-center gap-1.5 pb-1 md:pb-0">
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
          {/* BOTTOM (MOBILE) / RIGHT (DESKTOP) SECTION: White Auth Panel               */}
          {/* ========================================================================= */}
          <div className="w-full md:w-5/12 lg:w-2/5 bg-white rounded-t-[30px] md:rounded-t-none md:rounded-r-[32px] px-5 py-4 sm:px-8 sm:py-6 md:p-10 lg:p-12 flex flex-col justify-between z-30 shadow-[0_-10px_30px_rgba(0,0,0,0.2)] md:shadow-none border-t md:border-t-0 md:border-l border-gray-100 overflow-hidden flex-1 md:flex-initial">
            
            <AnimatePresence mode="wait" custom={direction}>
              {step === 'phone' ? (
                /* =================================================================== */
                /* STEP 1: MOBILE NUMBER ENTRY                                         */
                /* =================================================================== */
                <motion.div
                  key="phone-step"
                  custom={direction}
                  variants={formVariants}
                  initial="enter"
                  animate="center"
                  exit="exit"
                  className="flex flex-col justify-between h-full flex-1"
                >
                  {/* Header */}
                  <div className="mb-2.5 sm:mb-4 text-center md:text-left">
                    <h2 className="text-gray-900 font-extrabold text-xl sm:text-2xl lg:text-3xl tracking-tight leading-tight">
                      Get Started
                    </h2>
                    <p className="text-gray-500 text-xs sm:text-sm font-normal mt-0.5 sm:mt-1">
                      Enter your mobile number to log in or create your Offerly account.
                    </p>
                  </div>

                  {/* Phone Input Form */}
                  <form onSubmit={handleLogin} className="space-y-2.5 sm:space-y-3.5">
                    <div className="space-y-1">
                      <label className="block text-[11px] sm:text-xs font-bold text-gray-700 uppercase tracking-wider">
                        Mobile Number
                      </label>

                      {/* Phone Input Row */}
                      <div className="flex items-center gap-2">
                        {/* Flag / Country Code Picker */}
                        <div className="relative" ref={countryPickerRef}>
                          <button
                            type="button"
                            onClick={() => setShowCountryPicker((prev) => !prev)}
                            className="h-[46px] sm:h-[50px] px-3 bg-gray-50 hover:bg-gray-100 border border-gray-200 focus:border-[#5EB929] rounded-2xl flex items-center gap-1 shadow-xs transition-all text-gray-800 active:scale-95 cursor-pointer"
                            aria-expanded={showCountryPicker}
                          >
                            <span className="text-lg sm:text-xl leading-none">{selectedCountry.flag}</span>
                            <svg className="w-3.5 h-3.5 text-gray-400" fill="currentColor" viewBox="0 0 20 20">
                              <path
                                fillRule="evenodd"
                                d="M5.293 7.293a1 1 0 011.414 0L10 10.586l3.293-3.293a1 1 0 111.414 1.414l-4 4a1 1 0 01-1.414 0l-4-4a1 1 0 010-1.414z"
                                clipRule="evenodd"
                              />
                            </svg>
                          </button>

                          {/* Country Dropdown Menu */}
                          <AnimatePresence>
                            {showCountryPicker && (
                              <motion.div
                                initial={{ opacity: 0, y: 8, scale: 0.95 }}
                                animate={{ opacity: 1, y: 0, scale: 1 }}
                                exit={{ opacity: 0, y: 8, scale: 0.95 }}
                                className="absolute left-0 bottom-full md:bottom-auto md:top-full mb-2 md:mb-0 md:mt-2 bg-white rounded-2xl shadow-2xl border border-gray-200 py-2 w-48 z-50 overflow-hidden"
                              >
                                {countryList.map((item) => (
                                  <button
                                    key={item.code}
                                    type="button"
                                    onClick={() => {
                                      setCountryCode(item.code);
                                      setShowCountryPicker(false);
                                    }}
                                    className="w-full px-3.5 py-2 flex items-center justify-between hover:bg-gray-50 text-left text-xs font-semibold text-gray-800 active:bg-gray-100 cursor-pointer"
                                  >
                                    <span className="flex items-center gap-2">
                                      <span className="text-base">{item.flag}</span>
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
                        <div className="flex-1 relative flex items-center h-[46px] sm:h-[50px] bg-gray-50 border border-gray-200 focus-within:border-[#5EB929] focus-within:bg-white focus-within:ring-3 focus-within:ring-[#5EB929]/15 rounded-2xl px-3.5 shadow-xs transition-all">
                          <span className="text-gray-900 font-bold text-sm sm:text-[15px] mr-1.5 select-none">
                            {countryCode}
                          </span>
                          <input
                            ref={phoneInputRef}
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
                            className="w-full bg-transparent text-gray-900 font-medium text-sm sm:text-[15px] placeholder:text-gray-400 placeholder:font-normal outline-none border-none tracking-normal"
                            autoFocus={!Boolean(phone)}
                          />
                        </div>
                      </div>
                    </div>

                    {/* Error Message */}
                    {error && (
                      <p className="text-[11px] font-medium text-rose-500 px-1">
                        {error}
                      </p>
                    )}

                    {/* Remember Login Checkbox Row */}
                    <div
                      onClick={() => setRememberLogin(!rememberLogin)}
                      className="flex items-center gap-2 pt-0.5 cursor-pointer select-none"
                    >
                      <div
                        className={`w-4 h-4 sm:w-4.5 sm:h-4.5 rounded-md flex items-center justify-center transition-all ${
                          rememberLogin
                            ? 'bg-[#5EB929] text-white shadow-xs shadow-[#5EB929]/40'
                            : 'border border-gray-300 bg-white'
                        }`}
                      >
                        {rememberLogin && (
                          <svg className="w-3 h-3 text-white stroke-[3]" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={3.5} d="M5 13l4 4L19 7" />
                          </svg>
                        )}
                      </div>
                      <span className="text-xs font-medium text-gray-700">
                        Keep me signed in on this device
                      </span>
                    </div>

                    {/* Continue with OTP Button */}
                    <motion.button
                      whileTap={{ scale: 0.98 }}
                      whileHover={{ scale: 1.01 }}
                      type="submit"
                      disabled={isLoading || phone.length < 10}
                      className="w-full bg-gradient-to-r from-[#62B82B] via-[#5EB929] to-[#4E9F1F] hover:brightness-105 text-white font-bold text-sm sm:text-base h-[46px] sm:h-[50px] rounded-2xl shadow-md shadow-[#5EB929]/25 disabled:opacity-50 disabled:cursor-not-allowed transition-all flex items-center justify-center mt-1.5 cursor-pointer"
                    >
                      {isLoading ? (
                        <div className="w-4 h-4 border-2 border-white/30 border-t-white rounded-full animate-spin" />
                      ) : (
                        'Continue with OTP'
                      )}
                    </motion.button>
                  </form>

                  {/* Social Logins */}
                  <div className="my-2 sm:my-3">
                    <div className="relative flex items-center justify-center mb-2 sm:mb-2.5">
                      <div className="absolute inset-0 flex items-center">
                        <div className="w-full border-t border-gray-200" />
                      </div>
                      <span className="relative px-2.5 bg-white text-[10px] sm:text-xs font-semibold text-gray-400 uppercase tracking-wider">
                        or continue with
                      </span>
                    </div>

                    <div className="grid grid-cols-2 gap-2 sm:gap-3">
                      <button
                        type="button"
                        onClick={() => handleSocialClick('Google')}
                        className="h-[40px] sm:h-[44px] rounded-xl border border-gray-200 bg-white hover:bg-gray-50 flex items-center justify-center gap-2 shadow-xs active:scale-95 transition-all text-xs font-bold text-gray-700 cursor-pointer"
                      >
                        <svg className="w-3.5 h-3.5" viewBox="0 0 24 24">
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

                      <button
                        type="button"
                        onClick={() => handleSocialClick('Email')}
                        className="h-[40px] sm:h-[44px] rounded-xl border border-gray-200 bg-white hover:bg-gray-50 flex items-center justify-center gap-2 shadow-xs active:scale-95 transition-all text-xs font-bold text-gray-700 cursor-pointer"
                      >
                        <svg
                          className="w-3.5 h-3.5 text-[#5EB929]"
                          fill="currentColor"
                          viewBox="0 0 24 24"
                        >
                          <path d="M20 4H4c-1.1 0-1.99.9-1.99 2L2 18c0 1.1.9 2 2 2h16c1.1 0 2-.9 2-2V6c0-1.1-.9-2-2-2zm0 4l-8 5-8-5V6l8 5 8-5v2z" />
                        </svg>
                        Email
                      </button>
                    </div>
                  </div>

                  {/* Terms & Privacy Footer */}
                  <div className="text-center text-[11px] text-gray-500 leading-tight pt-1.5 border-t border-gray-100">
                    <p>By continuing, you agree to Offerly&apos;s</p>
                    <div className="flex items-center justify-center gap-1.5 mt-0.5 font-medium text-gray-700 flex-wrap">
                      <button
                        type="button"
                        onClick={() => navigate('/terms')}
                        className="hover:text-[#5EB929] underline underline-offset-2 transition-colors cursor-pointer"
                      >
                        Terms of Service
                      </button>
                      <span>•</span>
                      <button
                        type="button"
                        onClick={() => navigate('/privacy')}
                        className="hover:text-[#5EB929] underline underline-offset-2 transition-colors cursor-pointer"
                      >
                        Privacy Policy
                      </button>
                    </div>
                  </div>
                </motion.div>
              ) : (
                /* =================================================================== */
                /* STEP 2: IN-PAGE OTP VERIFICATION                                   */
                /* =================================================================== */
                <motion.div
                  key="otp-step"
                  custom={direction}
                  variants={formVariants}
                  initial="enter"
                  animate="center"
                  exit="exit"
                  className="flex flex-col justify-between h-full flex-1"
                >
                  {/* Top Header & Navigation */}
                  <div className="space-y-2 sm:space-y-3">
                    <div className="flex items-center justify-between">
                      <button
                        type="button"
                        onClick={handleEditPhone}
                        className="inline-flex items-center gap-1 text-[11px] sm:text-xs font-bold text-gray-500 hover:text-gray-900 transition-colors p-1 -ml-1 rounded-lg hover:bg-gray-100 cursor-pointer"
                      >
                        <svg className="w-3.5 h-3.5" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                          <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2.5} d="M15 19l-7-7 7-7" />
                        </svg>
                        <span>Change Number</span>
                      </button>

                      <span className="px-2 py-0.5 rounded-full bg-[#5EB929]/10 text-[#4E9F1F] text-[10px] font-extrabold tracking-wide uppercase">
                        Step 2 of 2
                      </span>
                    </div>

                    <div className="text-center md:text-left">
                      <h2 className="text-gray-900 font-extrabold text-xl sm:text-2xl lg:text-3xl tracking-tight leading-tight">
                        Verify Code
                      </h2>
                      <p className="text-gray-500 text-xs sm:text-sm font-normal mt-0.5">
                        Enter the 6-digit code sent to your number.
                      </p>
                    </div>

                    {/* Editable Phone Number Card */}
                    <div className="bg-gradient-to-r from-gray-50 to-gray-50/60 border border-gray-200/90 rounded-2xl p-2.5 sm:p-3 flex items-center justify-between shadow-xs hover:border-[#5EB929]/40 transition-all">
                      <div className="flex items-center gap-2.5 min-w-0">
                        <div className="w-8 h-8 sm:w-9 sm:h-9 rounded-xl bg-white border border-gray-200/80 flex items-center justify-center text-base sm:text-lg shadow-xs shrink-0">
                          {selectedCountry.flag}
                        </div>
                        <div className="min-w-0">
                          <p className="text-[9px] sm:text-[10px] font-bold uppercase tracking-wider text-gray-400 leading-none">Mobile</p>
                          <p className="text-xs sm:text-sm font-extrabold text-gray-900 tracking-wide font-mono truncate mt-0.5">
                            {countryCode} {phone.length === 10 ? `${phone.slice(0, 5)} ${phone.slice(5)}` : phone}
                          </p>
                        </div>
                      </div>
                      
                      <motion.button
                        whileHover={{ scale: 1.05 }}
                        whileTap={{ scale: 0.95 }}
                        type="button"
                        onClick={handleEditPhone}
                        className="inline-flex items-center gap-1 px-2.5 py-1 rounded-xl bg-white hover:bg-emerald-50 text-[#4E9F1F] hover:text-[#3B8014] border border-gray-200 hover:border-[#5EB929]/40 text-[11px] font-bold shadow-xs transition-colors cursor-pointer shrink-0"
                      >
                        <svg className="w-3 h-3" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                          <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2.5} d="M15.232 5.232l3.536 3.536m-2.036-5.036a2.5 2.5 0 113.536 3.536L6.5 21.036H3v-3.572L16.732 3.732z" />
                        </svg>
                        <span>Edit</span>
                      </motion.button>
                    </div>

                    {/* Dev Mode Auto-Fill Helper Banner */}
                    {devMode && (
                      <div className="bg-emerald-50 border border-emerald-200/70 rounded-xl p-2 flex items-center justify-between gap-2">
                        <div className="flex items-center gap-1.5">
                          <span className="w-1.5 h-1.5 rounded-full bg-[#5EB929] animate-pulse" />
                          <span className="text-[11px] font-bold text-emerald-800">
                            Dev Code: <strong className="font-mono text-emerald-900 tracking-wider">123456</strong>
                          </span>
                        </div>
                        <button
                          type="button"
                          onClick={() => {
                            const devDigits = ['1', '2', '3', '4', '5', '6'];
                            setOtp(devDigits);
                            handleVerifyOtp('123456');
                          }}
                          className="px-2 py-0.5 bg-[#5EB929] hover:bg-[#4E9F1F] text-white rounded-lg text-[10px] font-bold transition-all shadow-xs active:scale-95 cursor-pointer"
                        >
                          Auto-Fill
                        </button>
                      </div>
                    )}

                    {/* OTP 6-Digit Inputs Grid */}
                    <div className="space-y-2 sm:space-y-3">
                      <div className="space-y-1">
                        <div className="flex items-center justify-between px-1">
                          <label className="text-[11px] sm:text-xs font-bold text-gray-700 uppercase tracking-wider">
                            Enter OTP
                          </label>
                          <span className="text-[10px] font-semibold text-gray-400">
                            6-digit code
                          </span>
                        </div>

                        <motion.div
                          animate={otpShake ? { x: [-8, 8, -6, 6, -3, 3, 0] } : {}}
                          transition={{ duration: 0.4 }}
                          className="flex items-center justify-between gap-1.5 sm:gap-2.5 pt-0.5"
                        >
                          {otp.map((digit, index) => (
                            <input
                              key={index}
                              ref={(el) => (otpInputRefs.current[index] = el)}
                              type="text"
                              inputMode="numeric"
                              maxLength={1}
                              pattern="[0-9]*"
                              autoComplete={index === 0 ? 'one-time-code' : 'off'}
                              value={digit}
                              onChange={(e) => handleOtpChange(index, e)}
                              onKeyDown={(e) => handleOtpKeyDown(index, e)}
                              onPaste={handleOtpPaste}
                              className={`w-10 sm:w-12 h-11 sm:h-13 text-center text-lg sm:text-2xl font-black rounded-2xl border-2 transition-all outline-none font-mono select-none ${
                                digit
                                  ? 'border-[#5EB929] bg-[#5EB929]/5 text-gray-900 ring-2 ring-[#5EB929]/20 shadow-xs'
                                  : 'border-gray-200 bg-gray-50 text-gray-900 hover:border-gray-300'
                              } focus:border-[#5EB929] focus:bg-white focus:ring-3 focus:ring-[#5EB929]/15`}
                            />
                          ))}
                        </motion.div>
                      </div>

                      {/* Error Message */}
                      {error && (
                        <motion.p
                          initial={{ opacity: 0, y: -4 }}
                          animate={{ opacity: 1, y: 0 }}
                          className="text-[11px] font-medium text-rose-500 px-1"
                        >
                          {error}
                        </motion.p>
                      )}

                      {/* Resend OTP Row */}
                      <div className="flex items-center justify-between text-[11px] sm:text-xs pt-0.5 px-1">
                        <span className="text-gray-500">
                          {resendCooldown > 0 ? (
                            <>
                              Resend code in <strong className="text-gray-900 font-bold font-mono">00:{resendCooldown.toString().padStart(2, '0')}</strong>
                            </>
                          ) : (
                            "Didn't receive code?"
                          )}
                        </span>
                        
                        <button
                          type="button"
                          onClick={handleResendOtp}
                          disabled={resendCooldown > 0}
                          className={`font-bold transition-colors cursor-pointer ${
                            resendCooldown > 0
                              ? 'text-gray-300 cursor-not-allowed'
                              : 'text-[#5EB929] hover:text-[#4E9F1F] underline underline-offset-2'
                          }`}
                        >
                          Resend OTP
                        </button>
                      </div>

                      {/* Verify Button */}
                      <motion.button
                        whileTap={{ scale: 0.98 }}
                        whileHover={{ scale: 1.01 }}
                        type="button"
                        onClick={() => handleVerifyOtp()}
                        disabled={isVerifying || otp.join('').length < 6}
                        className="w-full bg-gradient-to-r from-[#62B82B] via-[#5EB929] to-[#4E9F1F] hover:brightness-105 text-white font-bold text-sm sm:text-base h-[46px] sm:h-[50px] rounded-2xl shadow-md shadow-[#5EB929]/25 disabled:opacity-50 disabled:cursor-not-allowed transition-all flex items-center justify-center mt-2 cursor-pointer"
                      >
                        {isVerifying ? (
                          <div className="w-4 h-4 border-2 border-white/30 border-t-white rounded-full animate-spin" />
                        ) : (
                          'Verify & Continue'
                        )}
                      </motion.button>
                    </div>
                  </div>

                  {/* Terms & Privacy Footer */}
                  <div className="text-center text-[10px] sm:text-[11px] text-gray-400 leading-tight pt-2 border-t border-gray-100">
                    <p>Secured with Offerly instant OTP verification</p>
                    <div className="flex items-center justify-center gap-1.5 mt-0.5 font-medium text-gray-600 flex-wrap">
                      <button
                        type="button"
                        onClick={() => navigate('/terms')}
                        className="hover:text-[#5EB929] underline underline-offset-2 transition-colors cursor-pointer"
                      >
                        Terms of Service
                      </button>
                      <span>•</span>
                      <button
                        type="button"
                        onClick={() => navigate('/privacy')}
                        className="hover:text-[#5EB929] underline underline-offset-2 transition-colors cursor-pointer"
                      >
                        Privacy Policy
                      </button>
                    </div>
                  </div>
                </motion.div>
              )}
            </AnimatePresence>

          </div>

        </div>
      </div>
    </PageTransition>
  );
};

export default CustomerLogin;
