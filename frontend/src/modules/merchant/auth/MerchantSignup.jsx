import { useState, useRef, useEffect } from 'react';
import { useNavigate } from 'react-router-dom';
import { motion, AnimatePresence } from 'framer-motion';
import StorefrontRoundedIcon from '@mui/icons-material/StorefrontRounded';
import PersonRoundedIcon from '@mui/icons-material/PersonRounded';
import EmailRoundedIcon from '@mui/icons-material/EmailRounded';
import PhoneRoundedIcon from '@mui/icons-material/PhoneRounded';
import MyLocationRoundedIcon from '@mui/icons-material/MyLocationRounded';
import ArrowForwardRoundedIcon from '@mui/icons-material/ArrowForwardRounded';
import CameraAltRoundedIcon from '@mui/icons-material/CameraAltRounded';
import CategoryRoundedIcon from '@mui/icons-material/CategoryRounded';
import AssignmentIndRoundedIcon from '@mui/icons-material/AssignmentIndRounded';
import ArrowBackRoundedIcon from '@mui/icons-material/ArrowBackRounded';
import { authAPI } from '../../../api/auth.api';
import { categoryAPI } from '../../../api/category.api';
import toast from 'react-hot-toast';
import PageTransition from '../../customer/components/ui/PageTransition';

const MerchantSignup = () => {
  const navigate = useNavigate();
  const [loading, setLoading] = useState(false);
  const [locationLoading, setLocationLoading] = useState(false);
  const fileInputRef = useRef(null);

  const [formData, setFormData] = useState(() => {
    const saved = localStorage.getItem('offerly_merchant_signup_data');
    if (saved) {
      try { return JSON.parse(saved); } catch (e) { console.error(e); }
    }
    return { name: '', email: '', phone: '', businessType: '', address: '', profilePhoto: '' };
  });

  const [categories, setCategories] = useState([]);
  const [errors, setErrors] = useState({});

  useEffect(() => {
    fetchCategories();
  }, []);

  useEffect(() => {
    localStorage.setItem('offerly_merchant_signup_data', JSON.stringify(formData));
  }, [formData]);

  const fetchCategories = async () => {
    try {
      const response = await categoryAPI.getAll();
      setCategories(response.categories || []);
    } catch (error) { console.error(error); }
  };

  const handleChange = (e) => {
    const { name, value } = e.target;
    setFormData({ ...formData, [name]: value });
    if (errors[name]) setErrors({ ...errors, [name]: '' });
  };

  const handlePhoneChange = (e) => {
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
              toast.success('Location captured');
            }
          } catch (e) { toast.error('Geo-resolution failed'); }
          finally { setLocationLoading(false); }
        },
        () => { setLocationLoading(false); toast.error('Access denied'); }
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

  const handleSignup = async (e) => {
    e.preventDefault();
    setLoading(true);
    try {
      sessionStorage.setItem('pendingRegistration', JSON.stringify({ ...formData, userType: 'merchant' }));
      const response = await authAPI.sendOtp(formData.phone, 'merchant', 'register');
      if (response.success) {
        toast.success('Token dispatched');
        navigate('/merchant/verify', { 
          state: { phone: `+91 ${formData.phone}`, isNewUser: true, userType: 'merchant', devMode: response.devMode } 
        });
      }
    } catch (error) { toast.error(error.error || 'Failed'); }
    finally { setLoading(false); }
  };

  return (
    <PageTransition>
      <div className="min-h-screen bg-[#F8F5FF] flex items-center justify-center p-4">
        <div className="w-full max-w-lg space-y-6 py-10">
          {/* Header Row */}
          <div className="flex items-center justify-between px-4">
            <motion.button
              whileTap={{ scale: 0.9 }}
              onClick={() => navigate('/merchant/login')}
              className="w-10 h-10 bg-white rounded-2xl flex items-center justify-center text-gray-400 border border-gray-100 shadow-sm active:scale-95"
            >
              <ArrowBackRoundedIcon sx={{ fontSize: 20 }} />
            </motion.button>
            <div className="flex items-center gap-2">
              <div className="w-8 h-8 bg-gray-900 rounded-xl flex items-center justify-center shadow-lg">
                <StorefrontRoundedIcon sx={{ fontSize: 18 }} className="text-[#3D7A4F]" />
              </div>
              <span className="text-gray-900 font-black text-sm tracking-tighter uppercase">Offerly<span className="text-[#3D7A4F] italic">Biz</span></span>
            </div>
          </div>

          <motion.div
            initial={{ y: 20, opacity: 0 }}
            animate={{ y: 0, opacity: 1 }}
            className="bg-white rounded-[2.5rem] p-6 md:p-8 shadow-2xl shadow-gray-200/50 border border-white relative overflow-hidden"
          >
            {/* Background Aesthetic */}
            <div className="absolute top-0 right-0 w-32 h-32 bg-[#3D7A4F]/5 rounded-full blur-3xl -translate-y-1/2 translate-x-1/2" />
            
            <div className="relative z-10 space-y-6">
              {/* Profile Icon Hub */}
              <div className="flex flex-col items-center">
                <div className="w-24 h-24 rounded-[2rem] bg-[#F8F5FF] border border-gray-50 flex items-center justify-center relative group cursor-pointer" onClick={() => fileInputRef.current?.click()}>
                  {formData.profilePhoto ? (
                    <img src={formData.profilePhoto} className="w-full h-full object-cover rounded-[1.8rem]" alt="" />
                  ) : (
                    <AssignmentIndRoundedIcon sx={{ fontSize: 48 }} className="text-[#3D7A4F]/20" />
                  )}
                  <div className="absolute bottom-0 right-0 w-8 h-8 bg-[#3D7A4F] text-white rounded-xl flex items-center justify-center shadow-lg border-2 border-white scale-90">
                    <CameraAltRoundedIcon sx={{ fontSize: 14 }} />
                  </div>
                </div>
                <div className="mt-4 text-center">
                  <h2 className="text-gray-900 font-black text-xl tracking-tight">Merchant Enrollment</h2>
                  <p className="text-gray-400 text-[10px] font-bold tracking-tight">Initialize business protocol</p>
                </div>
                <input ref={fileInputRef} type="file" accept="image/*" className="hidden" onChange={handlePhotoUpload} />
              </div>

              <form onSubmit={handleSignup} className="space-y-4">
                <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                  {/* Name */}
                  <div className="space-y-1.5">
                    <label className="text-[10px] font-bold text-gray-400 px-1">Owner Identity</label>
                    <div className="relative">
                      <PersonRoundedIcon className="absolute left-4 top-1/2 -translate-y-1/2 text-gray-300" sx={{ fontSize: 18 }} />
                      <input name="name" required value={formData.name} onChange={handleChange} placeholder="Full Name" className="w-full h-12 pl-11 pr-4 bg-[#F8F5FF] rounded-2xl border border-gray-50 text-sm font-bold outline-none focus:bg-white focus:border-[#3D7A4F]/30 transition-all" />
                    </div>
                  </div>

                  {/* Email */}
                  <div className="space-y-1.5">
                    <label className="text-[10px] font-bold text-gray-400 px-1">Business Email</label>
                    <div className="relative">
                      <EmailRoundedIcon className="absolute left-4 top-1/2 -translate-y-1/2 text-gray-300" sx={{ fontSize: 18 }} />
                      <input type="email" name="email" required value={formData.email} onChange={handleChange} placeholder="Email" className="w-full h-12 pl-11 pr-4 bg-[#F8F5FF] rounded-2xl border border-gray-50 text-sm font-bold outline-none focus:bg-white focus:border-[#3D7A4F]/30 transition-all" />
                    </div>
                  </div>

                  {/* Category */}
                  <div className="space-y-1.5">
                    <label className="text-[10px] font-bold text-gray-400 px-1">Merchant Category</label>
                    <div className="relative">
                      <CategoryRoundedIcon className="absolute left-4 top-1/2 -translate-y-1/2 text-gray-300" sx={{ fontSize: 18 }} />
                      <select name="businessType" required value={formData.businessType} onChange={handleChange} className="w-full h-12 pl-11 pr-4 bg-[#F8F5FF] rounded-2xl border border-gray-50 text-xs font-bold outline-none focus:bg-white focus:border-[#3D7A4F]/30 appearance-none transition-all">
                        <option value="">Select Sector</option>
                        {categories.map(c => <option key={c._id} value={c.name}>{c.name}</option>)}
                      </select>
                    </div>
                  </div>

                  {/* Phone */}
                  <div className="space-y-1.5">
                    <label className="text-[10px] font-bold text-gray-400 px-1">Mobile Identifier</label>
                    <div className="relative">
                      <PhoneRoundedIcon className="absolute left-4 top-1/2 -translate-y-1/2 text-gray-300" sx={{ fontSize: 18 }} />
                      <input type="tel" name="phone" required value={formData.phone} onChange={handlePhoneChange} placeholder="Phone" className="w-full h-12 pl-11 pr-4 bg-[#F8F5FF] rounded-2xl border border-gray-50 text-sm font-bold outline-none focus:bg-white focus:border-[#3D7A4F]/30 transition-all" />
                    </div>
                  </div>
                </div>

                {/* Address */}
                <div className="space-y-1.5">
                  <div className="flex items-center justify-between px-1">
                    <label className="text-[10px] font-bold text-gray-400">Operations Address</label>
                    <button type="button" onClick={handleUseLocation} disabled={locationLoading} className="text-[9px] font-black text-[#3D7A4F] flex items-center gap-1">
                      {locationLoading ? 'Locating...' : <><MyLocationRoundedIcon sx={{ fontSize: 10 }} /> Auto-detect</>}
                    </button>
                  </div>
                  <textarea name="address" required value={formData.address} onChange={handleChange} rows="2" placeholder="HQ Address / Outlet Location" className="w-full p-4 bg-[#F8F5FF] rounded-2xl border border-gray-50 text-sm font-bold outline-none focus:bg-white focus:border-[#3D7A4F]/30 transition-all resize-none" />
                </div>

                <motion.button
                  whileTap={{ scale: 0.98 }}
                  type="submit" disabled={loading}
                  className="w-full bg-[#3D7A4F] text-white font-black text-[12px] py-4 rounded-2xl shadow-lg shadow-[#3D7A4F]/20 active:scale-95 transition-all flex items-center justify-center gap-2"
                >
                  {loading ? (
                    <div className="w-5 h-5 border-2 border-white/30 border-t-white rounded-full animate-spin" />
                  ) : (
                    <>Confirm Enrollment <ArrowForwardRoundedIcon sx={{ fontSize: 16 }} /></>
                  )}
                </motion.button>
              </form>
            </div>
          </motion.div>

          {/* Footer Ledger */}
          <p className="text-center text-[9px] font-bold text-gray-300 tracking-widest">
            Merchant Protocol Standards · v2.0.0
          </p>
        </div>
      </div>
    </PageTransition>
  );
};

export default MerchantSignup;
