import { useState } from 'react';
import { useNavigate } from 'react-router-dom';
import { motion } from 'framer-motion';
import CardGiftcardRoundedIcon from '@mui/icons-material/CardGiftcardRounded';
import ArrowForwardRoundedIcon from '@mui/icons-material/ArrowForwardRounded';
import PageTransition from '../../components/ui/PageTransition';

const countryCodes = [
  { code: '+91', flag: '🇮🇳', name: 'India' },
  { code: '+1', flag: '🇺🇸', name: 'USA' },
  { code: '+44', flag: '🇬🇧', name: 'UK' },
  { code: '+971', flag: '🇦🇪', name: 'UAE' },
];

const PhoneEntry = () => {
  const navigate = useNavigate();
  const [phone, setPhone] = useState('');
  const [countryCode, setCountryCode] = useState('+91');
  const [isLoading, setIsLoading] = useState(false);
  const [error, setError] = useState('');

  const handleSendOtp = () => {
    if (phone.length < 10) {
      setError('Please enter a valid 10-digit phone number');
      return;
    }
    setError('');
    setIsLoading(true);

    // Simulate OTP send
    setTimeout(() => {
      setIsLoading(false);
      navigate('/verify', { state: { phone: `${countryCode} ${phone}` } });
    }, 1200);
  };

  return (
    <PageTransition>
      <div className="min-h-screen bg-background flex flex-col">
        {/* Top decoration */}
        <div className="h-48 gradient-green rounded-b-[40px] flex flex-col items-center justify-center gap-3 px-6">
          <motion.div
            initial={{ scale: 0, rotate: -10 }}
            animate={{ scale: 1, rotate: 0 }}
            transition={{ type: 'spring', stiffness: 300, delay: 0.1 }}
            className="w-16 h-16 bg-white/20 backdrop-blur-sm rounded-2xl flex items-center justify-center p-2"
          >
            <img src="/offerly-logo-ring.png" alt="Offerly" className="w-full h-full object-contain" />
          </motion.div>
          <motion.div
            initial={{ opacity: 0, y: 8 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ delay: 0.2 }}
            className="text-center"
          >
            <h1 className="font-display text-2xl font-bold text-white tracking-wide">OFFERLY</h1>
            <p className="text-white/80 text-sm mt-0.5">Discover & Redeem Local Deals</p>
          </motion.div>
        </div>

        {/* Form card */}
        <motion.div
           initial={{ opacity: 0, y: 24 }}
           animate={{ opacity: 1, y: 0 }}
           transition={{ delay: 0.25, duration: 0.4 }}
           className="flex-1 w-full max-w-md mx-auto px-5 -mt-6 relative z-10"
        >
          <div className="bg-surface rounded-3xl shadow-card p-6">
            <h2 className="text-xl font-bold text-text-primary">Welcome! 👋</h2>
            <p className="text-text-secondary text-sm mt-1">Enter your phone number to continue</p>

            <div className="mt-6 space-y-4">
              {/* Phone input */}
              <div>
                <label className="text-xs font-medium text-text-secondary uppercase tracking-wide">
                  Phone Number
                </label>
                <div className="flex gap-2 mt-1.5">
                  {/* Country code selector */}
                  <select
                    value={countryCode}
                    onChange={(e) => setCountryCode(e.target.value)}
                    className="bg-background border border-border rounded-xl px-3 py-3.5 text-sm font-medium text-text-primary w-24 flex-shrink-0 focus:border-primary outline-none"
                  >
                    {countryCodes.map((c) => (
                      <option key={c.code} value={c.code}>
                        {c.flag} {c.code}
                      </option>
                    ))}
                  </select>

                  <input
                    type="tel"
                    inputMode="numeric"
                    placeholder="98765 43210"
                    value={phone}
                    onChange={(e) => {
                      const val = e.target.value.replace(/\D/g, '').slice(0, 10);
                      setPhone(val);
                      if (error) setError('');
                    }}
                    className="flex-1 input-field"
                  />
                </div>

                {error && (
                  <motion.p
                    initial={{ opacity: 0, y: -4 }}
                    animate={{ opacity: 1, y: 0 }}
                    className="text-xs text-red-500 mt-1.5"
                  >
                    {error}
                  </motion.p>
                )}
              </div>

              {/* CTA */}
              <motion.button
                whileTap={{ scale: 0.97 }}
                onClick={handleSendOtp}
                disabled={isLoading || phone.length < 10}
                className="btn-primary mt-2"
              >
                {isLoading ? (
                  <div className="w-5 h-5 border-2 border-white/40 border-t-white rounded-full animate-spin" />
                ) : (
                  <>
                    <span>Send OTP</span>
                    <ArrowForwardRoundedIcon sx={{ fontSize: 18 }} />
                  </>
                )}
              </motion.button>
            </div>

            <p className="text-center text-xs text-text-secondary mt-5 leading-relaxed">
              By continuing, you agree to our{' '}
              <span className="text-primary font-medium">Terms of Service</span> and{' '}
              <span className="text-primary font-medium">Privacy Policy</span>
            </p>
          </div>

          {/* Features hint */}
          <div className="mt-6 grid grid-cols-3 gap-3 pb-8">
            {[
              { emoji: '🏷️', label: 'Exclusive Deals' },
              { emoji: '📍', label: 'Near You' },
              { emoji: '⚡', label: 'Instant Redeem' },
            ].map((f) => (
              <div key={f.label} className="flex flex-col items-center gap-1.5 bg-surface rounded-2xl p-3 shadow-card">
                <span className="text-2xl">{f.emoji}</span>
                <span className="text-xs font-medium text-text-secondary text-center">{f.label}</span>
              </div>
            ))}
          </div>
        </motion.div>
      </div>
    </PageTransition>
  );
};

export default PhoneEntry;
