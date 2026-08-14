import { useState, useRef, useEffect } from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import StorefrontRoundedIcon from '@mui/icons-material/StorefrontRounded';
import EmailRoundedIcon from '@mui/icons-material/EmailRounded';
import PhoneRoundedIcon from '@mui/icons-material/PhoneRounded';
import CategoryRoundedIcon from '@mui/icons-material/CategoryRounded';
import CameraAltRoundedIcon from '@mui/icons-material/CameraAltRounded';
import ArrowForwardRoundedIcon from '@mui/icons-material/ArrowForwardRounded';
import ArrowBackRoundedIcon from '@mui/icons-material/ArrowBackRounded';
import DescriptionRoundedIcon from '@mui/icons-material/DescriptionRounded';
import { categoryAPI } from '../../../../api/category.api';
import toast from 'react-hot-toast';

const BusinessDetailsStep = ({ data, onSubmit, onBack, loading }) => {
  const logoInputRef = useRef(null);
  const photosInputRef = useRef(null);
  const [categories, setCategories] = useState([]);
  
  const [formData, setFormData] = useState({
    storeName: data.storeName || '',
    category: data.category || '',
    description: data.description || '',
    businessEmail: data.businessEmail || '',
    businessPhone: data.businessPhone || '',
    logo: data.logo || '',
    photos: data.photos || []
  });

  const [errors, setErrors] = useState({});

  useEffect(() => {
    fetchCategories();
  }, []);

  const fetchCategories = async () => {
    try {
      const response = await categoryAPI.getAll();
      setCategories(response.categories || []);
    } catch (error) {
      toast.error('Failed to load categories');
    }
  };

  const handleChange = (e) => {
    const { name, value } = e.target;
    setFormData({ ...formData, [name]: value });
    if (errors[name]) setErrors({ ...errors, [name]: '' });
  };

  const handlePhoneChange = (e) => {
    const val = e.target.value.replace(/\D/g, '').slice(0, 10);
    setFormData({ ...formData, businessPhone: val });
    if (errors.businessPhone) setErrors({ ...errors, businessPhone: '' });
  };

  const handleLogoUpload = async (e) => {
    const file = e.target.files?.[0];
    if (!file || !file.type.startsWith('image/')) return;
    if (file.size > 2 * 1024 * 1024) { toast.error('Max 2MB allowed'); return; }

    const reader = new FileReader();
    reader.onloadend = () => setFormData(prev => ({ ...prev, logo: reader.result }));
    reader.readAsDataURL(file);

    try {
      const { uploadAPI } = await import('../../../../api/upload.api');
      const response = await uploadAPI.uploadImage(file);
      setFormData(prev => ({ ...prev, logo: response?.url || response }));
    } catch (error) {
      toast.error('Logo upload failed');
    }
  };

  const handlePhotosUpload = async (e) => {
    const files = Array.from(e.target.files || []);
    if (formData.photos.length + files.length > 4) { toast.error('Max 4 photos'); return; }

    try {
      const { uploadAPI } = await import('../../../../api/upload.api');
      const uploadedUrls = [];
      for (const file of files) {
        if (file.size > 2 * 1024 * 1024) continue;
        const response = await uploadAPI.uploadImage(file);
        uploadedUrls.push(response?.url || response);
      }
      setFormData(prev => ({ ...prev, photos: [...prev.photos, ...uploadedUrls] }));
    } catch (error) {
      toast.error('Some uploads failed');
    }
  };

  const removePhoto = (index) => {
    setFormData({ ...formData, photos: formData.photos.filter((_, i) => i !== index) });
  };

  const validate = () => {
    const newErrors = {};
    if (!formData.storeName.trim()) newErrors.storeName = 'Business name required';
    if (!formData.category) newErrors.category = 'Category required';
    const wordCount = formData.description.trim().split(/\s+/).filter(w => w.length > 0).length;
    if (wordCount < 10) newErrors.description = 'Min 10 words required';
    if (!formData.businessEmail) newErrors.businessEmail = 'Business email required';
    if (formData.businessPhone.length !== 10) newErrors.businessPhone = '10-digit phone required';
    if (!formData.logo) newErrors.logo = 'Logo required';
    setErrors(newErrors);
    return Object.keys(newErrors).length === 0;
  };

  const handleSubmit = (e) => {
    e.preventDefault();
    if (validate()) onSubmit(formData);
    else toast.error('Check entries');
  };

  return (
    <div className="space-y-6">
      <motion.div
        initial={{ y: 20, opacity: 0 }}
        animate={{ y: 0, opacity: 1 }}
        className="bg-white rounded-[2.5rem] p-6 md:p-10 shadow-2xl shadow-gray-200/50 border border-white relative overflow-hidden"
      >
        <div className="absolute top-0 right-0 w-32 h-32 bg-[#5EB929]/5 rounded-full blur-3xl -translate-y-1/2 translate-x-1/2" />
        
        <div className="relative z-10 space-y-8">
          {/* Header */}
          <div className="space-y-1">
            <h2 className="text-gray-900 font-bold text-xl tracking-tight">Business Details</h2>
            <p className="text-gray-400 text-[10px] font-bold tracking-tight">Configure your store identity and profile</p>
          </div>

          <form onSubmit={handleSubmit} className="space-y-6">
            {/* Logo Hub */}
            <div className="flex flex-col items-center gap-3">
              <motion.div 
                whileTap={{ scale: 0.95 }}
                onClick={() => logoInputRef.current?.click()}
                className="w-24 h-24 rounded-[2rem] bg-background border border-gray-100 flex items-center justify-center relative cursor-pointer group hover:border-[#5EB929]/30 transition-all"
              >
                {formData.logo ? (
                  <img src={formData.logo} className="w-full h-full object-cover rounded-[1.8rem]" alt="" />
                ) : (
                  <StorefrontRoundedIcon sx={{ fontSize: 40 }} className="text-[#5EB929]/20" />
                )}
                <div className="absolute bottom-0 right-0 w-8 h-8 bg-[#5EB929] text-white rounded-xl flex items-center justify-center shadow-lg border-2 border-white scale-90">
                  <CameraAltRoundedIcon sx={{ fontSize: 14 }} />
                </div>
              </motion.div>
              <p className="text-[9px] font-bold text-gray-400 tracking-tight uppercase px-1">Business Logo</p>
              <input ref={logoInputRef} type="file" accept="image/*" className="hidden" onChange={handleLogoUpload} />
            </div>

            <div className="grid grid-cols-1 md:grid-cols-2 gap-5">
              {/* Name */}
              <div className="space-y-1.5">
                <label className="text-[10px] font-bold text-gray-400 px-1">Store Name</label>
                <div className="relative group">
                  <StorefrontRoundedIcon className="absolute left-4 top-1/2 -translate-y-1/2 text-gray-300 group-focus-within:text-[#5EB929] transition-colors" sx={{ fontSize: 18 }} />
                  <input name="storeName" value={formData.storeName} onChange={handleChange} placeholder="e.g. FitZone Gym" className="w-full h-12 pl-11 pr-4 bg-background rounded-2xl border border-gray-50 text-sm font-bold outline-none focus:bg-white focus:border-[#5EB929]/30 transition-all" />
                </div>
              </div>

              {/* Category */}
              <div className="space-y-1.5">
                <label className="text-[10px] font-bold text-gray-400 px-1">Category</label>
                <div className="relative group">
                  <CategoryRoundedIcon className="absolute left-4 top-1/2 -translate-y-1/2 text-gray-300 group-focus-within:text-[#5EB929] transition-colors z-10" sx={{ fontSize: 18 }} />
                  <select name="category" value={formData.category} onChange={handleChange} className="w-full h-12 pl-11 pr-4 bg-background rounded-2xl border border-gray-50 text-xs font-bold outline-none focus:bg-white focus:border-[#5EB929]/30 appearance-none transition-all cursor-pointer">
                    <option value="">Select</option>
                    {categories.map(c => <option key={c._id} value={c.name}>{c.name}</option>)}
                  </select>
                </div>
              </div>

              {/* Description */}
              <div className="md:col-span-2 space-y-1.5">
                <label className="text-[10px] font-bold text-gray-400 px-1">Store Description</label>
                <div className="relative group">
                  <DescriptionRoundedIcon className="absolute left-4 top-4 text-gray-300 group-focus-within:text-[#5EB929] transition-colors" sx={{ fontSize: 18 }} />
                  <textarea name="description" value={formData.description} onChange={handleChange} rows="3" placeholder="Tell consumers what makes your store unique..." className="w-full pl-11 pr-4 py-3 bg-background rounded-2xl border border-gray-50 text-sm font-bold outline-none focus:bg-white focus:border-[#5EB929]/30 transition-all resize-none" />
                </div>
                <div className="flex justify-between px-1">
                   <p className="text-[9px] font-bold text-gray-300">Min 10 words required</p>
                   <p className={`text-[9px] font-bold ${formData.description.split(' ').length < 10 ? 'text-red-400' : 'text-[#5EB929]'}`}>{formData.description.split(' ').filter(x => x).length} Words</p>
                </div>
              </div>

              {/* Email */}
              <div className="space-y-1.5">
                <label className="text-[10px] font-bold text-gray-400 px-1">Business Email</label>
                <div className="relative group">
                  <EmailRoundedIcon className="absolute left-4 top-1/2 -translate-y-1/2 text-gray-300 group-focus-within:text-[#5EB929] transition-colors" sx={{ fontSize: 18 }} />
                  <input type="email" name="businessEmail" value={formData.businessEmail} onChange={handleChange} placeholder="contact@store.com" className="w-full h-12 pl-11 pr-4 bg-background rounded-2xl border border-gray-50 text-sm font-bold outline-none focus:bg-white focus:border-[#5EB929]/30 transition-all" />
                </div>
              </div>

              {/* Phone */}
              <div className="space-y-1.5">
                <label className="text-[10px] font-bold text-gray-400 px-1">Support Phone</label>
                <div className="flex gap-2">
                  <div className="h-12 w-14 bg-background rounded-2xl border border-gray-50 flex items-center justify-center text-[11px] font-bold text-gray-400">🇮🇳</div>
                  <div className="relative flex-1 group">
                    <PhoneRoundedIcon className="absolute left-4 top-1/2 -translate-y-1/2 text-gray-300 group-focus-within:text-[#5EB929] transition-colors" sx={{ fontSize: 18 }} />
                    <input type="tel" name="businessPhone" value={formData.businessPhone} onChange={handlePhoneChange} placeholder="Phone" className="w-full h-12 pl-11 pr-4 bg-background rounded-2xl border border-gray-50 text-sm font-bold outline-none focus:bg-white focus:border-[#5EB929]/30 transition-all" />
                  </div>
                </div>
              </div>
            </div>

            {/* Gallery Photos */}
            <div className="space-y-2.5">
              <label className="text-[10px] font-bold text-gray-400 px-1 uppercase tracking-tight">Store Gallery (Max 4)</label>
              <div className="grid grid-cols-4 gap-3">
                {formData.photos.map((photo, index) => (
                  <motion.div key={index} initial={{ scale: 0.8, opacity: 0 }} animate={{ scale: 1, opacity: 1 }} className="relative aspect-square">
                    <img src={photo} className="w-full h-full object-cover rounded-2xl border border-gray-100" alt="" />
                    <button type="button" onClick={() => removePhoto(index)} className="absolute -top-1.5 -right-1.5 w-6 h-6 bg-red-500 text-white rounded-lg flex items-center justify-center shadow-lg border-2 border-white active:scale-90"><span className="text-xs font-bold">×</span></button>
                  </motion.div>
                ))}
                {formData.photos.length < 4 && (
                  <motion.button type="button" whileTap={{ scale: 0.95 }} onClick={() => photosInputRef.current?.click()} className="aspect-square rounded-2xl bg-background border-2 border-dashed border-gray-100 flex flex-col items-center justify-center gap-1 hover:border-[#5EB929]/30 transition-all">
                    <CameraAltRoundedIcon sx={{ fontSize: 20 }} className="text-gray-300" />
                    <span className="text-[8px] font-bold text-gray-400">Add</span>
                  </motion.button>
                )}
              </div>
              <input ref={photosInputRef} type="file" accept="image/*" multiple className="hidden" onChange={handlePhotosUpload} />
            </div>

            {/* Error Ledger */}
            {Object.keys(errors).length > 0 && (
              <div className="bg-red-50 border border-red-100 rounded-2xl p-3">
                <p className="text-[9px] font-bold text-red-500 text-center">Protocol requirements missing. Please check entries.</p>
              </div>
            )}

            {/* Action Bar */}
            <div className="flex gap-4 pt-6 border-t border-gray-50">
               <motion.button 
                 type="button" whileTap={{ scale: 0.98 }} onClick={onBack}
                 className="flex-1 h-14 bg-gray-50 text-gray-400 rounded-2xl font-bold text-[12px] flex items-center justify-center gap-2 border border-gray-100"
               >
                 <ArrowBackRoundedIcon sx={{ fontSize: 16 }} /> Back
               </motion.button>
               <motion.button 
                 type="submit" whileTap={{ scale: 0.98 }} disabled={loading}
                 className="flex-[2] h-14 bg-[#5EB929] text-white rounded-2xl font-bold text-[12px] shadow-lg shadow-[#5EB929]/20 flex items-center justify-center gap-2"
               >
                 {loading ? <div className="w-5 h-5 border-2 border-white/30 border-t-white rounded-full animate-spin" /> : <>Continue Architecture <ArrowForwardRoundedIcon sx={{ fontSize: 16 }} /></>}
               </motion.button>
            </div>
          </form>
        </div>
      </motion.div>
    </div>
  );
};

export default BusinessDetailsStep;
