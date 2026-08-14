import { useState, useMemo, useEffect } from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import { createPortal } from 'react-dom';
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import SearchRoundedIcon from '@mui/icons-material/SearchRounded';
import AddRoundedIcon from '@mui/icons-material/AddRounded';
import EditRoundedIcon from '@mui/icons-material/EditRounded';
import DeleteRoundedIcon from '@mui/icons-material/DeleteRounded';
import LocalOfferRoundedIcon from '@mui/icons-material/LocalOfferRounded';
import CloseRoundedIcon from '@mui/icons-material/CloseRounded';
import CalendarMonthRoundedIcon from '@mui/icons-material/CalendarMonthRounded';
import toast from 'react-hot-toast';

import { merchantAPI } from '../../../api/merchant.api';
import { offerAPI } from '../../../api/offer.api';
import ProductOfferForm from '../components/ProductOfferForm';
import ServiceOfferForm from '../components/ServiceOfferForm';
import ConfirmDialog from '../components/ConfirmDialog';
import { getOptimizedImageUrl } from '../../../utils/cloudinaryUtils';

/* ─── Custom Hook for Debouncing ──────────────── */
function useDebounce(value, delay) {
  const [debouncedValue, setDebouncedValue] = useState(value);
  useEffect(() => {
    const handler = setTimeout(() => setDebouncedValue(value), delay);
    return () => clearTimeout(handler);
  }, [value, delay]);
  return debouncedValue;
}

const Offers = ({ merchant }) => {
  const queryClient = useQueryClient();
  const [searchQuery, setSearchQuery] = useState('');
  const debouncedSearch = useDebounce(searchQuery, 300);
  
  const [confirmEndId, setConfirmEndId] = useState(null);
  const [isModalOpen, setIsModalOpen] = useState(false);
  const [editingOffer, setEditingOffer] = useState(null);
  
  const [formData, setFormData] = useState({
    title: '', description: '', discountType: 'percentage', discountValue: '',
    validTo: '', maxRedemptions: '100', category: merchant?.category || 'Food',
    status: 'active', image: '', imagePreview: null,
  });
  
  const [uploadingImage, setUploadingImage] = useState(false);

  const { data: storeConfig, isLoading: loadingConfig } = useQuery({
    queryKey: ['storeConfig', merchant?._id],
    queryFn: async () => {
      try {
        const response = await merchantAPI.getStoreConfig();
        if (response?.config) return response.config;
      } catch (err) { /* Fallback */ }
      const isServiceCategory = ['Gym', 'Hotel', 'Spa', 'Salon', 'Tours'].includes(merchant?.category);
      return { 
        offer_mode: isServiceCategory ? 'service' : 'product', 
        requires_booking: isServiceCategory,
        category: merchant?.category
      };
    },
    enabled: !!merchant,
    staleTime: 1000 * 60 * 30,
  });

  const { data: rawOffers, isLoading: loadingOffers } = useQuery({
    queryKey: ['merchantOffers', merchant?._id],
    queryFn: async () => {
      const response = await offerAPI.getMyOffers();
      return response.offers || [];
    },
    enabled: !!merchant,
  });

  const deleteMutation = useMutation({
    mutationFn: (id) => offerAPI.delete(id),
    onSuccess: () => {
      queryClient.invalidateQueries(['merchantOffers', merchant?._id]);
      toast.success('Campaign terminated');
    },
    onError: () => toast.error('Failed to end offer'),
  });

  const offers = useMemo(() => {
    if (!rawOffers) return [];
    return [...rawOffers].sort((a, b) => new Date(b.createdAt) - new Date(a.createdAt));
  }, [rawOffers]);

  const filtered = useMemo(() => {
    return offers.filter(o => o.title.toLowerCase().includes(debouncedSearch.toLowerCase()));
  }, [offers, debouncedSearch]);

  const liveCount = useMemo(() => offers.filter(o => o.status === 'active').length, [offers]);
  const totalRedeemed = useMemo(() => offers.reduce((s, o) => s + (o.currentRedemptions || 0), 0), [offers]);

  const confirmEnd = async () => {
    if (confirmEndId) {
      deleteMutation.mutate(confirmEndId);
      setConfirmEndId(null);
    }
  };

  const handleImageUpload = async (e) => {
    const file = e.target.files?.[0];
    if (!file) return;
    try {
      setUploadingImage(true);
      const reader = new FileReader();
      reader.onloadend = () => setFormData(prev => ({ ...prev, imagePreview: reader.result }));
      reader.readAsDataURL(file);
      const { uploadAPI } = await import('../../../api/upload.api');
      const response = await uploadAPI.uploadImage(file);
      setFormData(prev => ({ ...prev, image: response?.url || response }));
      toast.success('Image Ready');
    } catch (err) { toast.error('Upload failed'); }
    finally { setUploadingImage(false); }
  };

  const handleOpenModal = (o = null) => {
    if (o) {
      setEditingOffer(o);
      setFormData({ ...o, validTo: o.validTo ? o.validTo.split('T')[0] : '', imagePreview: o.image || null });
    } else {
      setEditingOffer(null);
      setFormData({ title: '', description: '', discountType: 'percentage', discountValue: '', validTo: '', maxRedemptions: '100', category: merchant?.category, status: 'active', image: '', imagePreview: null });
    }
    setIsModalOpen(true);
  };

  const handleSubmit = async (e) => {
    e.preventDefault();
    if (!formData.title || !formData.discountValue || !formData.image) return toast.error('Check all fields');
    try {
      const payload = { ...formData, offerType: 'generic', discountValue: Number(formData.discountValue), maxRedemptions: Number(formData.maxRedemptions) };
      if (editingOffer) await offerAPI.update(editingOffer._id || editingOffer.id, payload);
      else await offerAPI.create(payload);
      setIsModalOpen(false);
      queryClient.invalidateQueries(['merchantOffers', merchant?._id]);
      toast.success('Campaign Synced!');
    } catch (err) { toast.error('Sync failed'); }
  };

  return (
    <div className="min-h-screen bg-background p-4 lg:p-8 -m-6 lg:-m-8">
      <div className="max-w-7xl mx-auto space-y-6 pb-20">
        
        {/* Header */}
        <div className="flex flex-col md:flex-row md:items-center justify-between gap-4">
          <div>
             <h1 className="text-xl lg:text-2xl font-bold text-gray-900 leading-tight">Live Campaigns</h1>
             <p className="text-[12px] text-gray-500 font-medium">Manage your promotions & growth</p>
          </div>
          <button 
            onClick={() => handleOpenModal()}
            className="flex items-center justify-center gap-2 bg-[#5EB929] text-white px-6 py-2.5 rounded-xl font-bold shadow-[0_4px_12px_rgba(94, 185, 41,0.2),inset_0_-2px_4px_rgba(0,0,0,0.1)] hover:scale-105 transition-all text-xs"
          >
            <AddRoundedIcon sx={{ fontSize: 18 }} />
            New Campaign
          </button>
        </div>

        {/* Stats Row */}
        <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
           <div className="md:col-span-1 bg-white p-4 rounded-2xl border border-gray-50 shadow-sm flex items-center justify-between">
              <div className="relative group w-full">
                 <SearchRoundedIcon className="absolute left-3.5 top-1/2 -translate-y-1/2 text-gray-400 group-focus-within:text-primary" sx={{ fontSize: 18 }} />
                 <input 
                    type="text" placeholder="Search offers..." value={searchQuery} onChange={(e) => setSearchQuery(e.target.value)}
                    className="w-full pl-10 pr-4 py-2.5 bg-background rounded-xl border border-transparent focus:border-primary/20 outline-none text-[13px] font-bold"
                 />
              </div>
           </div>
           <div className="bg-white p-4 rounded-2xl border border-gray-50 shadow-sm flex items-center justify-between">
              <div>
                 <p className="text-[9px] font-bold text-gray-400 uppercase tracking-widest">Active Campaigns</p>
                 <p className="text-lg font-bold text-gray-900">{liveCount}</p>
              </div>
              <div className="w-10 h-10 rounded-xl bg-emerald-50 text-emerald-500 flex items-center justify-center shadow-inner">
                 <LocalOfferRoundedIcon sx={{ fontSize: 20 }} />
              </div>
           </div>
           <div className="bg-white p-4 rounded-2xl border border-gray-50 shadow-sm flex items-center justify-between">
              <div>
                 <p className="text-[9px] font-bold text-gray-400 uppercase tracking-widest">Redeemed Hits</p>
                 <p className="text-lg font-bold text-gray-900">{totalRedeemed}</p>
              </div>
              <div className="w-10 h-10 rounded-xl bg-indigo-50 text-indigo-500 flex items-center justify-center shadow-inner">
                 <CalendarMonthRoundedIcon sx={{ fontSize: 20 }} />
              </div>
           </div>
        </div>

        {/* Offers Grid */}
        <div className="grid grid-cols-1 lg:grid-cols-2 gap-4">
          <AnimatePresence mode="popLayout">
            {loadingOffers ? (
               <div className="col-span-full py-20 flex flex-col items-center gap-3">
                  <div className="w-8 h-8 border-2 border-primary/20 border-t-primary rounded-full animate-spin" />
                  <p className="text-[10px] font-bold text-gray-400 uppercase tracking-widest">Syncing Campaigns...</p>
               </div>
            ) : filtered.length === 0 ? (
               <motion.div initial={{ opacity: 0 }} animate={{ opacity: 1 }} className="col-span-full py-24 text-center bg-white/50 rounded-2xl border border-dashed border-gray-200">
                  <LocalOfferRoundedIcon sx={{ fontSize: 48 }} className="text-gray-200 mb-2" />
                  <p className="text-xs font-bold text-gray-400 uppercase tracking-widest">No active campaigns</p>
               </motion.div>
            ) : (
              filtered.map((offer, idx) => {
                const maxRedemptions = Number(offer.maxRedemptions || 0);
                const currentRedemptions = Number(offer.currentRedemptions || 0);
                const redemptionPercent = maxRedemptions > 0 ? Math.min(100, Math.round((currentRedemptions / maxRedemptions) * 100)) : 0;

                return (
                  <motion.div 
                    key={offer._id} layout initial={{ opacity: 0, y: 10 }} animate={{ opacity: 1, y: 0 }} transition={{ delay: idx * 0.05 }}
                    className="bg-white rounded-2xl border border-gray-50 hover:border-primary/20 hover:shadow-xl transition-all group overflow-hidden flex flex-col sm:flex-row h-full"
                  >
                    {/* Image Section */}
                    <div className="w-full sm:w-44 h-44 sm:h-auto relative flex-shrink-0">
                       <img src={getOptimizedImageUrl(offer.image, { width: 400, height: 400 })} className="w-full h-full object-cover" alt="" />
                       <div className="absolute inset-0 bg-gradient-to-t from-black/60 via-transparent to-transparent" />
                       <div className="absolute bottom-3 left-3 bg-white/90 backdrop-blur-md px-2 py-1 rounded-lg shadow-lg">
                          <p className="text-[10px] font-bold text-gray-900 leading-none">
                             {offer.discountType === 'percentage' ? `${offer.discountValue}% OFF` : `₹${offer.discountValue} OFF`}
                          </p>
                       </div>
                    </div>

                    {/* Content Section */}
                    <div className="flex-1 p-5 flex flex-col">
                       <div className="flex justify-between items-start gap-2 mb-2">
                          <div className="min-w-0">
                             <h3 className="text-[15px] font-bold text-gray-900 leading-tight truncate group-hover:text-primary transition-colors">{offer.title}</h3>
                             <div className="flex items-center gap-1.5 mt-1">
                                <CalendarMonthRoundedIcon sx={{ fontSize: 12 }} className="text-gray-400" />
                                <span className="text-[9px] font-bold text-gray-400 uppercase tracking-wider">Ends {new Date(offer.validTo).toLocaleDateString()}</span>
                             </div>
                          </div>
                          <div className="flex gap-1">
                             <button onClick={() => handleOpenModal(offer)} className="p-2 bg-gray-50 text-gray-400 rounded-lg hover:bg-primary/10 hover:text-primary transition-all">
                                <EditRoundedIcon sx={{ fontSize: 16 }} />
                             </button>
                             <button onClick={() => setConfirmEndId(offer._id)} className="p-2 bg-gray-50 text-gray-400 rounded-lg hover:bg-red-50 hover:text-red-500 transition-all">
                                <DeleteRoundedIcon sx={{ fontSize: 16 }} />
                             </button>
                          </div>
                       </div>

                       <p className="text-[12px] text-gray-500 font-medium line-clamp-2 mb-4 leading-relaxed">{offer.description}</p>

                       <div className="mt-auto space-y-4">
                          {/* Redemption Progress */}
                          <div className="space-y-1.5">
                             <div className="flex justify-between items-center text-[9px] font-bold uppercase tracking-widest">
                                <span className="text-gray-400">Campaign Reach</span>
                                <span className={redemptionPercent > 80 ? 'text-amber-500' : 'text-primary'}>{currentRedemptions} / {maxRedemptions}</span>
                             </div>
                             <div className="w-full h-1.5 bg-gray-100 rounded-full overflow-hidden shadow-inner">
                                <motion.div 
                                   initial={{ width: 0 }} animate={{ width: `${redemptionPercent}%` }}
                                   className={`h-full rounded-full ${redemptionPercent > 80 ? 'bg-amber-500' : 'bg-primary'}`}
                                />
                             </div>
                          </div>

                          <div className="flex items-center justify-between pt-3 border-t border-gray-50">
                             <div className="flex items-center gap-2">
                                <span className={`w-1.5 h-1.5 rounded-full ${offer.status === 'active' ? 'bg-green-500 animate-pulse' : 'bg-gray-300'}`} />
                                <span className="text-[9px] font-bold uppercase tracking-widest text-gray-500">{offer.status}</span>
                             </div>
                             <div className="px-3 py-1 bg-background text-primary rounded-lg text-[9px] font-bold uppercase tracking-widest shadow-[inset_0_-1px_2px_rgba(0,0,0,0.05)] border border-primary/10">
                                {offer.offerType || 'Campaign'}
                             </div>
                          </div>
                       </div>
                    </div>
                  </motion.div>
                );
              })
            )}
          </AnimatePresence>
        </div>

        {/* Modal Overlay via Portal */}
        {isModalOpen && createPortal(
          <div className="fixed inset-0 bg-gray-950/60 backdrop-blur-md z-[99999] overflow-y-auto flex items-start justify-center p-0 sm:p-4">
            <motion.div 
              initial={{ scale: 0.95, opacity: 0, y: 100 }} 
              animate={{ scale: 1, opacity: 1, y: 0 }} 
              className="w-full max-w-3xl bg-background min-h-screen sm:min-h-0 sm:rounded-2xl shadow-2xl overflow-hidden border border-white/20 sm:my-8"
            >
               <div className="bg-gray-900 px-5 py-4 flex items-center justify-between sticky top-0 z-[100]">
                  <div>
                    <h2 className="text-[15px] font-bold text-white">{editingOffer ? 'Edit Campaign' : 'New Campaign'}</h2>
                    <p className="text-gray-400 text-[9px] font-bold uppercase tracking-widest mt-0.5">Strategy Builder</p>
                  </div>
                  <button onClick={() => setIsModalOpen(false)} className="w-8 h-8 bg-white/10 hover:bg-white/20 text-white rounded-lg flex items-center justify-center transition-all">
                    <CloseRoundedIcon sx={{ fontSize: 18 }} />
                  </button>
               </div>

               <div className="p-3 sm:p-6">
                 {loadingConfig ? (
                    <div className="py-12 text-center flex flex-col items-center gap-3">
                       <div className="w-8 h-8 border-2 border-primary/20 border-t-primary rounded-full animate-spin" />
                       <p className="text-[10px] font-bold text-gray-400 uppercase tracking-widest">Configuring...</p>
                    </div>
                 ) : editingOffer && editingOffer.offerType === 'generic' ? (
                   <form onSubmit={handleSubmit} className="space-y-4">
                     <div>
                       <label className="text-[10px] font-bold text-gray-400 uppercase tracking-widest mb-1.5 block">Campaign Title *</label>
                       <input type="text" value={formData.title} onChange={(e) => setFormData({...formData, title: e.target.value})} className="w-full px-4 py-3 bg-background rounded-xl border border-transparent focus:border-primary/20 outline-none text-[13px] font-bold" />
                     </div>
                     <div>
                       <label className="text-[10px] font-bold text-gray-400 uppercase tracking-widest mb-1.5 block">Description</label>
                       <textarea value={formData.description} onChange={(e) => setFormData({...formData, description: e.target.value})} rows="2" className="w-full px-4 py-3 bg-background rounded-xl border border-transparent focus:border-primary/20 outline-none text-[13px] font-bold resize-none" />
                     </div>
                     
                     <div className="grid grid-cols-2 gap-4">
                        <div className="col-span-2 sm:col-span-1">
                           <label className="text-[10px] font-bold text-gray-400 uppercase tracking-widest mb-1.5 block">Visual Anchor *</label>
                           <div className="relative group">
                              <input type="file" accept="image/*" onChange={handleImageUpload} className="absolute inset-0 opacity-0 z-10 cursor-pointer" />
                              <div className="w-full h-32 rounded-xl bg-background border-2 border-dashed border-gray-100 flex flex-col items-center justify-center group-hover:border-primary/30 transition-all">
                                 {formData.imagePreview ? (
                                    <img src={formData.imagePreview} className="w-full h-full object-cover rounded-xl" alt="" />
                                 ) : (
                                    <div className="flex flex-col items-center gap-1">
                                       <AddRoundedIcon className="text-gray-300" />
                                       <span className="text-[10px] font-bold text-gray-300 uppercase">Upload</span>
                                    </div>
                                 )}
                              </div>
                           </div>
                        </div>
                        <div className="col-span-2 sm:col-span-1 space-y-4">
                           <div>
                              <label className="text-[10px] font-bold text-gray-400 uppercase tracking-widest mb-1.5 block">Discount Type</label>
                              <select value={formData.discountType} onChange={(e) => setFormData({...formData, discountType: e.target.value})} className="w-full px-4 py-3 bg-background rounded-xl border border-transparent focus:border-primary/20 outline-none text-[13px] font-bold">
                                 <option value="percentage">Percentage (%)</option>
                                 <option value="flat">Flat Cash (₹)</option>
                              </select>
                           </div>
                           <div>
                              <label className="text-[10px] font-bold text-gray-400 uppercase tracking-widest mb-1.5 block">Benefit Value *</label>
                              <input type="number" value={formData.discountValue} onChange={(e) => setFormData({...formData, discountValue: e.target.value})} className="w-full px-4 py-3 bg-background rounded-xl border border-transparent focus:border-primary/20 outline-none text-[13px] font-bold" />
                           </div>
                        </div>
                     </div>

                     <div className="grid grid-cols-2 gap-4">
                       <div>
                         <label className="text-[10px] font-bold text-gray-400 uppercase tracking-widest mb-1.5 block">Campaign Expiry *</label>
                         <input type="date" value={formData.validTo} onChange={(e) => setFormData({...formData, validTo: e.target.value})} className="w-full px-4 py-3 bg-background rounded-xl border border-transparent focus:border-primary/20 outline-none text-[13px] font-bold" />
                       </div>
                       <div>
                         <label className="text-[10px] font-bold text-gray-400 uppercase tracking-widest mb-1.5 block">Max Hits</label>
                         <input type="number" value={formData.maxRedemptions} onChange={(e) => setFormData({...formData, maxRedemptions: e.target.value})} className="w-full px-4 py-3 bg-background rounded-xl border border-transparent focus:border-primary/20 outline-none text-[13px] font-bold" />
                       </div>
                     </div>
                     <button type="submit" disabled={uploadingImage} className="w-full py-4 bg-gray-900 text-white rounded-xl font-bold text-xs uppercase tracking-widest hover:bg-black transition-all shadow-xl shadow-gray-900/10 active:scale-[0.98] mt-4">
                        {editingOffer ? 'Sync Changes' : 'Execute Campaign'}
                     </button>
                   </form>
                 ) : storeConfig?.offer_mode === 'product' || editingOffer?.offerType === 'product' ? (
                   <ProductOfferForm merchant={merchant} editingOffer={editingOffer} onSuccess={() => { setIsModalOpen(false); queryClient.invalidateQueries(['merchantOffers']); }} onCancel={() => setIsModalOpen(false)} />
                 ) : (
                   <ServiceOfferForm merchant={merchant} storeConfig={storeConfig} editingOffer={editingOffer} onSuccess={() => { setIsModalOpen(false); queryClient.invalidateQueries(['merchantOffers']); }} onCancel={() => setIsModalOpen(false)} />
                 )}
               </div>
            </motion.div>
          </div>,
          document.body
        )}

        <ConfirmDialog
          isOpen={!!confirmEndId}
          title="Terminate Campaign?"
          message="This offer will be immediately removed from the customer marketplace."
          confirmText="Yes, Terminate"
          onConfirm={confirmEnd}
          onCancel={() => setConfirmEndId(null)}
        />
      </div>
    </div>
  );
};

export default Offers;
