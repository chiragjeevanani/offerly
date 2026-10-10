import { useState, useRef, useEffect, useMemo } from 'react';
import { useNavigate, useLocation } from 'react-router-dom';
import { motion, AnimatePresence } from 'framer-motion';
import PersonRoundedIcon from '@mui/icons-material/PersonRounded';
import EmailRoundedIcon from '@mui/icons-material/EmailRounded';
import PhoneRoundedIcon from '@mui/icons-material/PhoneRounded';
import MyLocationRoundedIcon from '@mui/icons-material/MyLocationRounded';
import CameraAltRoundedIcon from '@mui/icons-material/CameraAltRounded';
import ArrowForwardRoundedIcon from '@mui/icons-material/ArrowForwardRounded';
import CardGiftcardRoundedIcon from '@mui/icons-material/CardGiftcardRounded';
import VerifiedRoundedIcon from '@mui/icons-material/VerifiedRounded';
import ArrowBackRoundedIcon from '@mui/icons-material/ArrowBackRounded';
import AssignmentIndRoundedIcon from '@mui/icons-material/AssignmentIndRounded';
import { authAPI } from '../../../../api/auth.api';
import { storage } from '../../../../utils/storage';
import { useApp } from '../../context/AppContext';
import toast from 'react-hot-toast';
import PageTransition from '../../components/ui/PageTransition';

const isValidEmail = (email) => /^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(email);

const SIGNUP_DRAFT_KEY = 'offerly_customer_signup_data';

const readDraft = () => {
  try {
    const saved = JSON.parse(localStorage.getItem(SIGNUP_DRAFT_KEY) || 'null');
    if (saved) return saved;
  } catch {
    // Corrupt draft - start clean.
  }
  return { name: '', email: '', phone: '', age: '', gender: '', address: '', profilePhoto: '', referralCode: '' };
};

const CustomerSignup = () => {
  const navigate = useNavigate();
  const location = useLocation();
  const { login } = useApp();
  const [loading, setLoading] = useState(false);
  const [locationLoading, setLocationLoading] = useState(false);
  const fileInputRef = useRef(null);

  // Arriving from the login screen means the number was already OTP-verified there.
  // It travels in router state (which survives a refresh), never in a stale draft.
  const verified = useMemo(() => {
    const token = location.state?.verificationToken;
    const digits = String(location.state?.phone || '').replace(/D/g, '').slice(-10);
    return token && digits.length === 10 ? { token, phone: digits } : null;
  }, [location.state]);

  const [formData, setFormData] = useState(() => {
    const draft = readDraft();
    return verified ? { ...draft, phone: verified.phone } : draft;
  });

  const [errors, setErrors] = useState({});

  useEffect(() => {
    const params = new URLSearchParams(window.location.search);
    const refCode =
      location.state?.referralCode || params.get('ref') || localStorage.getItem('offerly_signup_referral');
    if (refCode) {
      setFormData(prev => ({ ...prev, referralCode: String(refCode).toUpperCase() }));
    }
  }, [location.state]);

  useEffect(() => {
    localStorage.setItem(SIGNUP_DRAFT_KEY, JSON.stringify(formData));
  }, [formData]);

  const handleChange = (e) => {
    const { name, value } = e.target;
    setFormData({ ...formData, [name]: value });
    if (errors[name]) setErrors({ ...errors, [name]: '' });
  };

  const handlePhoneChange = (e) => {
    if (verified) return;
    const val = e.target.value.replace(/\D/g, '').slice(0, 10);
    setFormData({ ...formData, phone: val });
    if (errors.phone) setErrors({ ...errors, phone: '' });
  };

  const handleUseLocation = () => {
    setLocationLoading(true);
    if ('geolocation' in navigator) {
      navigator.geolocation.getCurrentPosition(
        async (position) => {
          try {
            const { latitude, longitude } = position.coords;
            const res = await fetch(`https://nominatim.openstreetmap.org/reverse?lat=${latitude}&lon=${longitude}&format=json`);
            const data = await res.json();
            if (data.display_name) {
              setFormData(prev => ({ ...prev, address: data.display_name }));
              toast.success('Location protocol captured');
            }
          } catch (e) {
            toast.error('Geo-resolution failed');
          } finally {
            setLocationLoading(false);
          }
        },
        () => {
          setLocationLoading(false);
          toast.error('Geo-access denied');
        }
      );
    }
  };

  const handlePhotoUpload = (e) => {
    const file = e.target.files?.[0];
    if (!file || !file.type.startsWith('image/')) return;
    const reader = new FileReader();
    reader.onloadend = () => setFormData(prev => ({ ...prev, profilePhoto: reader.result }));
    reader.readAsDataURL(file);
  };

  const validateForm = () => {
    const newErrors = {};
    if (!formData.name.trim()) newErrors.name = 'Full name required';
    if (!formData.email || !isValidEmail(formData.email)) newErrors.email = 'Valid email required';
    if (formData.phone.length !== 10) newErrors.phone = '10-digit mobile required';
    if (!formData.age) newErrors.age = 'Age required';
    if (!formData.gender) newErrors.gender = 'Gender required';
    if (!formData.address.trim()) newErrors.address = 'Full address required';
    setErrors(newErrors);
    return Object.keys(newErrors).length === 0;
  };

  const handleSignup = async (e) => {
    e.preventDefault();
    if (!validateForm()) return;

    // Number already verified on the previous screen: create the account now
    // instead of sending a second OTP for the same number.
    if (verified) {
      setLoading(true);
      try {
        const registerResponse = await authAPI.registerCustomer(verified.token, {
          ...formData,
          phone: verified.phone,
          userType: 'customer',
        });

        if (registerResponse.success) {
          storage.setToken(registerResponse.token);
          storage.setUser(registerResponse.user);
          login(registerResponse.user);
          sessionStorage.removeItem('pendingRegistration');
          localStorage.removeItem(SIGNUP_DRAFT_KEY);
          toast.success('Account created successfully!');
          navigate('/home', { replace: true });
        }
      } catch (error) {
        toast.error(error?.error || 'Sign up failed. Please verify your number again.');
      } finally {
        setLoading(false);
      }
      return;
    }

    sessionStorage.setItem('pendingRegistration', JSON.stringify({ ...formData, userType: 'customer' }));
    setLoading(true);
    try {
      const response = await authAPI.sendOtp(formData.phone, 'customer', 'register');
      if (response.success) {
        toast.success('Token dispatched');
        navigate('/verify', { state: { phone: `+91 ${formData.phone}`, isNewUser: true, userType: 'customer', devMode: response.devMode } });
      }
    } catch (error) {
      toast.error(error.error || 'Sign up failed. Please try again.');
    } finally {
      setLoading(false);
    }
  };

  return (
    <PageTransition>
      <div className="min-h-screen bg-background flex items-center justify-center p-4">
        <div className="w-full max-w-lg space-y-6">
          {/* Header & Logo */}
          <div className="flex items-center justify-between px-4">
            <motion.button
              whileTap={{ scale: 0.9 }}
              onClick={() => navigate('/login')}
              className="w-10 h-10 bg-white rounded-2xl flex items-center justify-center text-gray-400 border border-gray-100 shadow-sm active:scale-95"
            >
              <ArrowBackRoundedIcon sx={{ fontSize: 20 }} />
            </motion.button>
            <div className="flex items-center gap-2">
              <img src="/offerly-logo-ring-256.webp" alt="Offerly" className="w-8 h-8 object-contain drop-shadow-sm" />
              <span className="text-gray-900 font-bold text-sm tracking-tight">Offerly</span>
            </div>
          </div>

          <motion.div
            initial={{ y: 20, opacity: 0 }}
            animate={{ y: 0, opacity: 1 }}
            className="bg-white rounded-[2.5rem] p-6 md:p-8 shadow-2xl shadow-gray-200/50 border border-white relative overflow-hidden"
          >
            {/* Background Aesthetic */}
            <div className="absolute inset-0 overflow-hidden pointer-events-none rounded-[inherit]"><div className="absolute top-0 right-0 w-32 h-32 bg-[#5EB929]/5 rounded-full blur-3xl -translate-y-1/2 translate-x-1/2" /></div>
            
            <div className="relative z-10 space-y-6">
              {/* Profile Icon Hub */}
              <div className="flex flex-col items-center">
                <div className="w-24 h-24 rounded-[2rem] bg-background border border-gray-50 flex items-center justify-center relative group cursor-pointer" onClick={() => fileInputRef.current?.click()}>
                  {formData.profilePhoto ? (
                    <img src={formData.profilePhoto} className="w-full h-full object-cover rounded-[1.8rem]" alt="" />
                  ) : (
                    <AssignmentIndRoundedIcon sx={{ fontSize: 48 }} className="text-[#5EB929]/20" />
                  )}
                  <div className="absolute bottom-0 right-0 w-8 h-8 bg-[#5EB929] text-white rounded-xl flex items-center justify-center shadow-lg border-2 border-white scale-90">
                    <CameraAltRoundedIcon sx={{ fontSize: 14 }} />
                  </div>
                </div>
                <div className="mt-4 text-center">
                  <h2 className="text-gray-900 font-bold text-xl tracking-tight">Create Identity</h2>
                  <p className="text-gray-400 text-[10px] font-bold tracking-tight">Create your Offerly account</p>
                </div>
                <input ref={fileInputRef} type="file" accept="image/*" className="hidden" onChange={handlePhotoUpload} />
              </div>

              <form onSubmit={handleSignup} className="space-y-4">
                <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                  {/* Name */}
                  <div className="space-y-1.5">
                    <label className="text-[10px] font-bold text-gray-400 px-1">Full Legal Name</label>
                    <div className="relative">
                      <PersonRoundedIcon className="absolute left-4 top-1/2 -translate-y-1/2 text-gray-300" sx={{ fontSize: 18 }} />
                      <input name="name" value={formData.name} onChange={handleChange} placeholder="Full Name" className="w-full h-12 pl-11 pr-4 bg-background rounded-2xl border border-gray-50 text-sm font-bold outline-none focus:bg-white focus:border-[#5EB929]/30 transition-all" />
                    </div>
                  </div>

                  {/* Email */}
                  <div className="space-y-1.5">
                    <label className="text-[10px] font-bold text-gray-400 px-1">Email Identity</label>
                    <div className="relative">
                      <EmailRoundedIcon className="absolute left-4 top-1/2 -translate-y-1/2 text-gray-300" sx={{ fontSize: 18 }} />
                      <input type="email" name="email" value={formData.email} onChange={handleChange} placeholder="Email" className="w-full h-12 pl-11 pr-4 bg-background rounded-2xl border border-gray-50 text-sm font-bold outline-none focus:bg-white focus:border-[#5EB929]/30 transition-all" />
                    </div>
                  </div>

                  {/* Phone */}
                  <div className="space-y-1.5">
                    <label className="text-[10px] font-bold text-gray-400 px-1">Mobile Identifier</label>
                    <div className="relative">
                      <PhoneRoundedIcon className="absolute left-4 top-1/2 -translate-y-1/2 text-gray-300" sx={{ fontSize: 18 }} />
                      <input
                        type="tel"
                        name="phone"
                        value={verified ? `+91 ${formData.phone}` : formData.phone}
                        onChange={handlePhoneChange}
                        readOnly={Boolean(verified)}
                        placeholder="Phone"
                        className={`w-full h-12 pl-11 pr-4 rounded-2xl border text-sm font-bold outline-none transition-all ${
                          verified
                            ? 'bg-gray-100 border-gray-100 text-gray-500 cursor-not-allowed'
                            : 'bg-background border-gray-50 focus:bg-white focus:border-[#5EB929]/30'
                        }`}
                      />
                      {verified && (
                        <span className="absolute right-4 top-1/2 -translate-y-1/2 flex items-center gap-1 text-[10px] font-bold text-[#5EB929]">
                          <VerifiedRoundedIcon sx={{ fontSize: 14 }} /> Verified
                        </span>
                      )}
                    </div>
                  </div>

                  {/* Age/Gender Row */}
                  <div className="grid grid-cols-2 gap-3">
                    <div className="space-y-1.5">
                      <label className="text-[10px] font-bold text-gray-400 px-1">Age</label>
                      <input type="number" name="age" value={formData.age} onChange={handleChange} placeholder="Age" className="w-full h-12 px-4 bg-background rounded-2xl border border-gray-50 text-sm font-bold outline-none focus:bg-white focus:border-[#5EB929]/30 transition-all" />
                    </div>
                    <div className="space-y-1.5">
                      <label className="text-[10px] font-bold text-gray-400 px-1">Gender</label>
                      <select name="gender" value={formData.gender} onChange={handleChange} className="w-full h-12 px-3 bg-background rounded-2xl border border-gray-50 text-xs font-bold outline-none focus:bg-white focus:border-[#5EB929]/30 transition-all">
                        <option value="">Select</option>
                        <option value="Male">Male</option>
                        <option value="Female">Female</option>
                        <option value="Other">Other</option>
                      </select>
                    </div>
                  </div>
                </div>

                {/* Address */}
                <div className="space-y-1.5">
                  <div className="flex items-center justify-between px-1">
                    <label className="text-[10px] font-bold text-gray-400">Primary Physical Address</label>
                    <button type="button" onClick={handleUseLocation} disabled={locationLoading} className="text-[9px] font-bold text-[#5EB929] flex items-center gap-1">
                      {locationLoading ? 'Locating...' : <><MyLocationRoundedIcon sx={{ fontSize: 10 }} /> Auto-detect</>}
                    </button>
                  </div>
                  <textarea name="address" value={formData.address} onChange={handleChange} rows="2" placeholder="Full Address" className="w-full p-4 bg-background rounded-2xl border border-gray-50 text-sm font-bold outline-none focus:bg-white focus:border-[#5EB929]/30 transition-all resize-none" />
                </div>

                {/* Referral Code */}
                <div className="space-y-1.5">
                  <label className="text-[10px] font-bold text-gray-400 px-1">Referral Code (Optional)</label>
                  <div className="relative">
                    <CardGiftcardRoundedIcon className="absolute left-4 top-1/2 -translate-y-1/2 text-gray-300" sx={{ fontSize: 18 }} />
                    <input name="referralCode" value={formData.referralCode} onChange={handleChange} placeholder="Enter code" className="w-full h-12 pl-11 pr-4 bg-background rounded-2xl border border-gray-50 text-sm font-bold outline-none focus:bg-white focus:border-[#5EB929]/30 transition-all uppercase" />
                  </div>
                </div>

                {/* Error Banner */}
                <AnimatePresence>
                  {Object.keys(errors).length > 0 && (
                    <motion.div initial={{ height: 0, opacity: 0 }} animate={{ height: 'auto', opacity: 1 }} exit={{ height: 0, opacity: 0 }} className="bg-red-50 border border-red-100 rounded-2xl p-3">
                      <p className="text-[9px] font-bold text-red-500 text-center">Please check the details you entered.</p>
                    </motion.div>
                  )}
                </AnimatePresence>

                <motion.button
                  whileTap={{ scale: 0.98 }}
                  type="submit"
                  disabled={loading}
                  className="w-full bg-[#5EB929] text-white font-bold text-[12px] py-4 rounded-2xl shadow-lg shadow-[#5EB929]/20 active:scale-95 transition-all flex items-center justify-center gap-2"
                >
                  {loading ? (
                    <div className="w-5 h-5 border-2 border-white/30 border-t-white rounded-full animate-spin" />
                  ) : (
                    <>Sign Up <ArrowForwardRoundedIcon sx={{ fontSize: 16 }} /></>
                  )}
                </motion.button>
              </form>
            </div>
          </motion.div>

          <p className="text-center text-[9px] font-bold text-gray-300 tracking-widest">
            Secure Sign Up
          </p>
        </div>
      </div>
    </PageTransition>
  );
};

export default CustomerSignup;
