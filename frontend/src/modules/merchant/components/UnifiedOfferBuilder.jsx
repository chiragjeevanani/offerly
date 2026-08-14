import { useState } from 'react';
import { createPortal } from 'react-dom';
import { motion, AnimatePresence } from 'framer-motion';
import CloseRoundedIcon from '@mui/icons-material/CloseRounded';
import RocketLaunchRoundedIcon from '@mui/icons-material/RocketLaunchRounded';
import AddPhotoAlternateRoundedIcon from '@mui/icons-material/AddPhotoAlternateRounded';
import toast from 'react-hot-toast';
import { productAPI } from '../../../api/product.api';
import { offerAPI } from '../../../api/offer.api';

const UnifiedOfferBuilder = ({ isOpen, onClose, merchant, onSuccess }) => {
  const [loading, setLoading] = useState(false);
  const [uploading, setUploading] = useState(false);

  const [coreData, setCoreData] = useState({
    name: '', originalPrice: '', description: '', image: null, imagePreview: null,
    category: merchant?.category || '', isVeg: false
  });

  const [campaignData, setCampaignData] = useState({
    isActive: true, discountType: 'percentage', discountValue: '20',
    validDays: '7', maxClaims: '50'
  });

  const handleImageUpload = async (e) => {
    const file = e.target.files?.[0];
    if (!file) return;
    try {
      setUploading(true);
      const reader = new FileReader();
      reader.onloadend = () => setCoreData(prev => ({ ...prev, imagePreview: reader.result }));
      reader.readAsDataURL(file);
      const { uploadAPI } = await import('../../../api/upload.api');
      const response = await uploadAPI.uploadImage(file);
      setCoreData(prev => ({ ...prev, image: response?.url || response }));
      toast.success('Ready');
    } catch (err) { toast.error('Error'); }
    finally { setUploading(false); }
  };

  const handleLaunch = async () => {
    if (!coreData.name || !coreData.originalPrice || !coreData.description) {
      return toast.error('Please fill name, price, and description');
    }
    setLoading(true);
    try {
      const productPayload = {
        name: coreData.name,
        description: coreData.description,
        price: parseFloat(coreData.originalPrice),
        offerPrice: parseFloat(coreData.originalPrice) * (1 - (parseFloat(campaignData.discountValue) / 100)),
        images: coreData.image ? [coreData.image] : [],
        category: coreData.category,
        isVeg: coreData.isVeg,
        duration: coreData.duration,
        merchantId: merchant._id
      };
      const productRes = await productAPI.create(productPayload);
      const productId = productRes.product?._id || productRes.product?.id;

      if (campaignData.isActive) {
        const validTo = new Date();
        validTo.setDate(validTo.getDate() + parseInt(campaignData.validDays));
        const offerPayload = {
          title: `${campaignData.discountValue}% OFF on ${coreData.name}`,
          description: coreData.description,
          productId: productId,
          category: coreData.category,
          discountType: 'percentage',
          discountValue: parseFloat(campaignData.discountValue),
          validTo: validTo.toISOString(),
          maxRedemptions: parseInt(campaignData.maxClaims),
          image: coreData.image || merchant.logo,
          status: 'active',
          offerType: 'product',
          productPrice: parseFloat(coreData.originalPrice)
        };
        await offerAPI.create(offerPayload);
      }
      toast.success('Rocket Launch! 🚀');
      onSuccess?.();
      onClose();
    } catch (err) { 
      console.error('Launch Error:', err);
      toast.error('Failed to launch'); 
    }
    finally { setLoading(false); }
  };

  if (!isOpen) return null;

  return createPortal(
    <AnimatePresence>
      <div className="fixed inset-0 z-[999999] bg-gray-950/60 backdrop-blur-md flex items-start justify-center p-0 sm:p-4 overflow-y-auto">
        <motion.div initial={{ scale: 0.95, opacity: 0 }} animate={{ scale: 1, opacity: 1 }} className="w-full max-w-xl bg-background sm:rounded-2xl shadow-2xl overflow-hidden border border-white/20 sm:my-8">
          <div className="bg-gray-900 px-5 py-4 flex items-center justify-between sticky top-0 z-[100]">
            <div className="flex items-center gap-3">
              <div className="w-9 h-9 bg-gradient-to-br from-[#5EB929] to-[#2D5A3A] text-white rounded-xl flex items-center justify-center shadow-lg animate-pulse">
                <RocketLaunchRoundedIcon sx={{ fontSize: 20 }} />
              </div>
              <div>
                <h2 className="text-[15px] font-bold text-white leading-none">Rocket Campaign</h2>
                <p className="text-[9px] font-bold text-gray-400 uppercase tracking-widest mt-1">Unified Flow</p>
              </div>
            </div>
            <button onClick={onClose} className="w-8 h-8 bg-white/10 hover:bg-white/20 text-white rounded-lg flex items-center justify-center transition-all">
              <CloseRoundedIcon sx={{ fontSize: 18 }} />
            </button>
          </div>
          <div className="p-4 sm:p-5 space-y-4">
            <div className="bg-white rounded-xl border border-gray-100 p-4 shadow-sm space-y-4 relative">
               <div className="flex items-center gap-2 mb-1">
                  <div className="w-1 h-4 bg-[#5EB929] rounded-full" />
                  <h3 className="text-[11px] font-bold text-gray-900 uppercase tracking-widest">Item Genesis</h3>
               </div>
               <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
                  <div className="space-y-3">
                     <div>
                        <label className="text-[9px] font-bold text-gray-400 uppercase tracking-widest mb-1 block">Name *</label>
                        <input type="text" value={coreData.name} onChange={(e) => setCoreData({...coreData, name: e.target.value})} placeholder="e.g. Signature Item" className="w-full px-3 py-2 bg-background rounded-lg border border-transparent focus:border-[#5EB929]/20 outline-none text-[13px] font-bold" />
                     </div>
                     <div>
                        <label className="text-[9px] font-bold text-gray-400 uppercase tracking-widest mb-1 block">Price (₹) *</label>
                        <input type="number" value={coreData.originalPrice} onChange={(e) => setCoreData({...coreData, originalPrice: e.target.value})} placeholder="0.00" className="w-full px-3 py-2 bg-background rounded-lg border border-transparent focus:border-[#5EB929]/20 outline-none text-[13px] font-bold" />
                     </div>
                     {['Gym', 'Hotel', 'Spa', 'Salon', 'Tours'].includes(merchant?.category) && (
                        <div>
                           <label className="text-[9px] font-bold text-gray-400 uppercase tracking-widest mb-1 block">Service Duration</label>
                           <select value={coreData.duration || '30 mins'} onChange={(e) => setCoreData({...coreData, duration: e.target.value})} className="w-full px-3 py-2 bg-background rounded-lg border border-transparent focus:border-[#5EB929]/20 outline-none text-[12px] font-bold">
                              <option value="15 mins">15 mins</option>
                              <option value="30 mins">30 mins</option>
                              <option value="1 hour">1 hour</option>
                              <option value="2 hours">2 hours</option>
                           </select>
                        </div>
                     )}
                  </div>
                  <div className="relative group h-[106px]">
                     <input type="file" accept="image/*" onChange={handleImageUpload} className="absolute inset-0 opacity-0 z-10 cursor-pointer" />
                     <div className="w-full h-full rounded-lg bg-background border-2 border-dashed border-gray-200 flex flex-col items-center justify-center group-hover:border-[#5EB929]/30 transition-all overflow-hidden">
                        {coreData.imagePreview ? <img src={coreData.imagePreview} className="w-full h-full object-cover" alt="" /> : <AddPhotoAlternateRoundedIcon className="text-gray-200" />}
                     </div>
                  </div>
               </div>
               <div>
                  <label className="text-[9px] font-bold text-gray-400 uppercase tracking-widest mb-1 block">Short Description *</label>
                  <textarea value={coreData.description} onChange={(e) => setCoreData({...coreData, description: e.target.value})} placeholder="Describe your item or offer..." rows="2" className="w-full px-3 py-2 bg-background rounded-lg border border-transparent focus:border-[#5EB929]/20 outline-none text-[12px] font-bold resize-none" />
               </div>
            </div>
            <div className={`rounded-xl border transition-all p-4 shadow-sm space-y-4 ${campaignData.isActive ? 'bg-[#5EB929]/5 border-[#5EB929]/20' : 'bg-gray-50 border-gray-100 opacity-60'}`}>
               <div className="flex items-center justify-between">
                  <div className="flex items-center gap-2">
                     <div className={`w-1 h-4 rounded-full ${campaignData.isActive ? 'bg-[#5EB929]' : 'bg-gray-300'}`} />
                     <h3 className={`text-[11px] font-bold uppercase tracking-widest ${campaignData.isActive ? 'text-[#5EB929]' : 'text-gray-400'}`}>Offer Engine</h3>
                  </div>
                  <button onClick={() => setCampaignData({...campaignData, isActive: !campaignData.isActive})} className={`w-10 h-5 rounded-full relative transition-all ${campaignData.isActive ? 'bg-[#5EB929]' : 'bg-gray-300'}`}>
                     <div className={`absolute top-0.5 w-4 h-4 bg-white rounded-full transition-all ${campaignData.isActive ? 'left-5.5' : 'left-0.5'}`} />
                  </button>
               </div>
               {campaignData.isActive && (
                  <motion.div initial={{ opacity: 0, height: 0 }} animate={{ opacity: 1, height: 'auto' }} className="space-y-4">
                     <div className="flex gap-2">
                        {['10', '20', '30', '50'].map(v => (
                           <button key={v} onClick={() => setCampaignData({...campaignData, discountValue: v})} className={`flex-1 py-2 rounded-lg text-[11px] font-bold transition-all ${campaignData.discountValue === v ? 'bg-[#5EB929] text-white shadow-lg' : 'bg-white text-[#5EB929] border border-[#5EB929]/10 hover:bg-[#5EB929]/5'}`}>{v}%</button>
                        ))}
                     </div>
                     <div className="grid grid-cols-2 gap-4">
                        <select value={campaignData.validDays} onChange={(e) => setCampaignData({...campaignData, validDays: e.target.value})} className="px-3 py-2 bg-white rounded-lg border border-[#5EB929]/10 text-[12px] font-bold outline-none">
                           <option value="7">7 Days</option>
                           <option value="30">30 Days</option>
                        </select>
                        <input type="number" value={campaignData.maxClaims} onChange={(e) => setCampaignData({...campaignData, maxClaims: e.target.value})} className="px-3 py-2 bg-white rounded-lg border border-[#5EB929]/10 text-[12px] font-bold outline-none" />
                     </div>
                  </motion.div>
               )}
            </div>
            <button onClick={handleLaunch} disabled={loading || uploading} className="w-full py-4 bg-gray-900 text-white rounded-xl font-bold text-xs uppercase tracking-widest shadow-2xl shadow-gray-900/20 active:scale-[0.98] transition-all flex items-center justify-center gap-3">
               {loading ? 'Wait...' : 'Execute Rocket Launch 🚀'}
            </button>
          </div>
        </motion.div>
      </div>
    </AnimatePresence>,
    document.body
  );
};

export default UnifiedOfferBuilder;
