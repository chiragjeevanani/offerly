import { useState, useEffect } from 'react';
import { motion } from 'framer-motion';
import ProductSearchSelect from './ProductSearchSelect';
import OfferPreviewCard from './OfferPreviewCard';
import PercentRoundedIcon from '@mui/icons-material/PercentRounded';
import VisibilityRoundedIcon from '@mui/icons-material/VisibilityRounded';
import toast from 'react-hot-toast';
import { offerAPI } from '../../../api/offer.api';

const ServiceOfferForm = ({ merchant, storeConfig, editingOffer, onSuccess, onCancel }) => {
  const [formData, setFormData] = useState({
    selectedServicePlan: null,
    title: '',
    description: '',
    discountType: 'percentage',
    discountValue: '',
    validFrom: new Date().toISOString().split('T')[0],
    validTo: '',
    maxRedemptions: '50',
    unlimitedClaims: false,
    bookingRequired: storeConfig?.requires_booking || false,
    bookingWindowDays: '7',
    useCustomImage: false,
    customImage: null,
    customImagePreview: null,
  });

  const [loading, setLoading] = useState(false);
  const [showPreviewMobile, setShowPreviewMobile] = useState(false);

  // Sync with editingOffer
  useEffect(() => {
    if (editingOffer) {
      setFormData({
        ...editingOffer,
        selectedServicePlan: editingOffer.servicePlanId || { _id: editingOffer.servicePlanId, name: 'Linked Service' },
        validFrom: new Date(editingOffer.validFrom).toISOString().split('T')[0],
        validTo: new Date(editingOffer.validTo).toISOString().split('T')[0],
        maxRedemptions: editingOffer.maxRedemptions.toString(),
        unlimitedClaims: editingOffer.maxRedemptions === 0,
        customImage: editingOffer.image,
        customImagePreview: editingOffer.image
      });
    }
  }, [editingOffer]);

  const handleChange = (field, value) => {
    setFormData(prev => ({ ...prev, [field]: value }));
  };

  const setQuickValidity = (days) => {
    const today = new Date();
    const futureDate = new Date(today.setDate(today.getDate() + days));
    handleChange('validTo', futureDate.toISOString().split('T')[0]);
  };

  const handleSubmit = async (e) => {
    e.preventDefault();
    if (!formData.selectedServicePlan || !formData.title.trim() || !formData.discountValue || !formData.validTo) {
      return toast.error('Fields required');
    }

    setLoading(true);
    try {
      const payload = {
        offerType: 'service',
        servicePlanId: formData.selectedServicePlan._id || formData.selectedServicePlan.id,
        title: formData.title,
        description: formData.description,
        discountType: formData.discountType,
        discountValue: parseFloat(formData.discountValue),
        validFrom: formData.validFrom,
        validTo: formData.validTo,
        maxRedemptions: formData.unlimitedClaims ? 0 : parseInt(formData.maxRedemptions),
        bookingRequired: formData.bookingRequired,
        bookingWindowDays: formData.bookingRequired ? parseInt(formData.bookingWindowDays) : 0,
        category: merchant.category,
        image: formData.customImage || merchant.logo,
        status: 'active',
        productPrice: formData.selectedServicePlan.offerPrice || formData.selectedServicePlan.price || 0,
      };

      if (editingOffer) {
        await offerAPI.update(editingOffer._id, payload);
        toast.success('Campaign Synced!');
      } else {
        await offerAPI.create(payload);
        toast.success('Campaign Launched!');
      }
      onSuccess?.();
    } catch (error) { toast.error('Action Failed'); }
    finally { setLoading(false); }
  };

  const previewData = formData.selectedServicePlan ? {
    title: formData.title || 'Offer',
    description: formData.description,
    discountType: formData.discountType,
    discountValue: parseFloat(formData.discountValue) || 0,
    validTo: formData.validTo,
    maxRedemptions: formData.unlimitedClaims ? 0 : parseInt(formData.maxRedemptions) || 50,
    image: formData.customImage || merchant.logo || '',
    productPrice: formData.selectedServicePlan.offerPrice || formData.selectedServicePlan.price || 0,
    duration: formData.selectedServicePlan.duration || '',
    inclusions: formData.selectedServicePlan.inclusions || [],
    bookingRequired: formData.bookingRequired
  } : null;

  return (
    <div className="relative">
      <form onSubmit={handleSubmit} className="space-y-3 pb-20 lg:pb-0">
        <div className="grid grid-cols-1 lg:grid-cols-2 gap-3">
          <div className="bg-white rounded-xl border border-gray-100 p-3 lg:p-4 shadow-sm">
             <div className="flex items-center gap-2 mb-3">
                <span className="w-5 h-5 rounded bg-[#3D7A4F] text-white flex items-center justify-center text-[9px] font-black">01</span>
                <h3 className="text-[11px] font-black text-gray-900 uppercase tracking-widest">Plan</h3>
             </div>
             <ProductSearchSelect
               filterType="service_based"
               onSelect={(plan) => setFormData(prev => ({ ...prev, selectedServicePlan: plan }))}
               selectedProduct={formData.selectedServicePlan}
             />
          </div>
          <div className="bg-white rounded-xl border border-gray-100 p-3 lg:p-4 shadow-sm">
             <div className="flex items-center gap-2 mb-3">
                <span className="w-5 h-5 rounded bg-[#3D7A4F] text-white flex items-center justify-center text-[9px] font-black">02</span>
                <h3 className="text-[11px] font-black text-gray-900 uppercase tracking-widest">Details</h3>
             </div>
             <div className="space-y-2.5">
                <input type="text" value={formData.title} onChange={(e) => handleChange('title', e.target.value)} placeholder="Offer Headline *" className="w-full px-3 py-2 bg-[#F8F5FF] rounded-lg border border-transparent focus:border-[#3D7A4F]/20 outline-none text-[12px] font-bold" />
                <input type="text" value={formData.description} onChange={(e) => handleChange('description', e.target.value)} placeholder="Short Description" className="w-full px-3 py-2 bg-[#F8F5FF] rounded-lg border border-transparent focus:border-[#3D7A4F]/20 outline-none text-[12px] font-bold" />
             </div>
          </div>
          <div className="bg-white rounded-xl border border-gray-100 p-3 lg:p-4 shadow-sm">
             <div className="flex items-center gap-2 mb-3">
                <span className="w-5 h-5 rounded bg-[#3D7A4F] text-white flex items-center justify-center text-[9px] font-black">03</span>
                <h3 className="text-[11px] font-black text-gray-900 uppercase tracking-widest">Benefit</h3>
             </div>
             <div className="grid grid-cols-2 gap-2">
                <select value={formData.discountType} onChange={(e) => handleChange('discountType', e.target.value)} className="px-3 py-2 bg-[#F8F5FF] rounded-lg border border-transparent text-[12px] font-bold outline-none">
                   <option value="percentage">% Off</option>
                   <option value="flat">₹ Off</option>
                </select>
                <input type="number" value={formData.discountValue} onChange={(e) => handleChange('discountValue', e.target.value)} placeholder="Value *" className="w-full px-3 py-2 bg-[#F8F5FF] rounded-lg border border-transparent text-[12px] font-bold outline-none" />
             </div>
          </div>
          <div className="bg-white rounded-xl border border-gray-100 p-3 lg:p-4 shadow-sm">
             <div className="flex items-center gap-2 mb-3">
                <span className="w-5 h-5 rounded bg-[#3D7A4F] text-white flex items-center justify-center text-[9px] font-black">04</span>
                <h3 className="text-[11px] font-black text-gray-900 uppercase tracking-widest">Timeline</h3>
             </div>
             <div className="flex items-center gap-2">
                <input type="date" value={formData.validTo} onChange={(e) => handleChange('validTo', e.target.value)} className="flex-1 px-3 py-2 bg-[#F8F5FF] rounded-lg border border-transparent text-[12px] font-bold outline-none" />
                <div className="flex gap-1">
                   {[7, 30].map(d => (
                      <button key={d} type="button" onClick={() => setQuickValidity(d)} className="px-2 py-2 bg-[#3D7A4F]/10 text-[#3D7A4F] rounded-lg text-[9px] font-black uppercase">+{d}d</button>
                   ))}
                </div>
             </div>
          </div>
          <div className="lg:col-span-2 bg-[#3D7A4F]/5 rounded-xl border border-[#3D7A4F]/10 p-3 shadow-sm flex flex-col sm:flex-row items-center justify-between gap-3">
             <div className="flex items-center gap-3">
                <div className="flex items-center gap-2">
                   <label className="text-[10px] font-black text-gray-400 uppercase">Limit</label>
                   <input type="number" value={formData.maxRedemptions} onChange={(e) => handleChange('maxRedemptions', e.target.value)} className="w-20 px-2 py-1.5 bg-white rounded-lg border border-gray-100 text-[12px] font-bold outline-none" />
                </div>
                <div className="flex items-center gap-2">
                   <input type="checkbox" id="book" checked={formData.bookingRequired} onChange={(e) => handleChange('bookingRequired', e.target.checked)} className="w-4 h-4 rounded border-gray-300 text-[#3D7A4F] accent-[#3D7A4F]" />
                   <label htmlFor="book" className="text-[10px] font-black text-gray-600 uppercase">Booking Required</label>
                </div>
             </div>
             <div className="flex items-center gap-2">
                <button type="button" onClick={() => setShowPreviewMobile(true)} className="px-3 py-2 bg-white text-gray-500 rounded-lg text-[10px] font-black uppercase border border-gray-200 hover:bg-gray-50 transition-all">Preview</button>
                <button type="submit" disabled={loading} className="px-6 py-2 bg-[#3D7A4F] text-white rounded-lg text-[10px] font-black uppercase shadow-lg shadow-[#3D7A4F]/20 active:scale-95 transition-all">
                   {loading ? 'Wait...' : editingOffer ? 'Save Changes' : 'Launch Campaign'}
                </button>
             </div>
          </div>
        </div>
      </form>
      {showPreviewMobile && (
         <div className="fixed inset-0 z-[999999] bg-black/60 backdrop-blur-sm p-6 flex items-center justify-center" onClick={() => setShowPreviewMobile(false)}>
            <motion.div initial={{ scale: 0.9, opacity: 0 }} animate={{ scale: 1, opacity: 1 }} className="w-full max-w-sm" onClick={e => e.stopPropagation()}>
               <OfferPreviewCard offerData={previewData} merchant={merchant} offerType="service" />
               <button onClick={() => setShowPreviewMobile(false)} className="w-full mt-4 py-3 bg-white text-gray-900 rounded-xl font-black text-[10px] uppercase tracking-widest">Close</button>
            </motion.div>
         </div>
      )}
    </div>
  );
};

export default ServiceOfferForm;
