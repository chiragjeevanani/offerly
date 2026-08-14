import { useState, useEffect } from 'react';
import { motion } from 'framer-motion';
import ProductSearchSelect from './ProductSearchSelect';
import VariantSelector from './VariantSelector';
import OfferPreviewCard from './OfferPreviewCard';
import PercentRoundedIcon from '@mui/icons-material/PercentRounded';
import toast from 'react-hot-toast';
import { offerAPI } from '../../../api/offer.api';

const ProductOfferForm = ({ merchant, editingOffer, onSuccess, onCancel }) => {
  const [formData, setFormData] = useState({
    selectedProduct: null,
    selectedVariantId: null,
    applyToAllVariants: false,
    discountType: 'percentage',
    discountValue: '',
    validFrom: new Date().toISOString().split('T')[0],
    validTo: '',
    maxRedemptions: '100',
    unlimitedClaims: false,
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
        selectedProduct: editingOffer.productId || { _id: editingOffer.productId, name: 'Linked Product' },
        validFrom: new Date(editingOffer.validFrom).toISOString().split('T')[0],
        validTo: new Date(editingOffer.validTo).toISOString().split('T')[0],
        maxRedemptions: editingOffer.maxRedemptions.toString(),
        unlimitedClaims: editingOffer.maxRedemptions === 0,
        customImage: editingOffer.image,
        customImagePreview: editingOffer.image
      });
    }
  }, [editingOffer]);

  const handleProductSelect = (product) => {
    setFormData(prev => ({
      ...prev,
      selectedProduct: product,
      selectedVariantId: null,
      applyToAllVariants: false
    }));
  };

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
    if (!formData.selectedProduct || !formData.discountValue || !formData.validTo) {
      return toast.error('Check fields');
    }

    setLoading(true);
    try {
      const payload = {
        offerType: 'product',
        productId: formData.selectedProduct._id || formData.selectedProduct.id,
        variantId: formData.selectedVariantId || null,
        applyToAllVariants: formData.applyToAllVariants,
        title: `${formData.discountValue}${formData.discountType === 'percentage' ? '%' : '₹'} OFF`,
        description: `Get discount on ${formData.selectedProduct.name || 'item'}`,
        discountType: formData.discountType,
        discountValue: parseFloat(formData.discountValue),
        validFrom: formData.validFrom,
        validTo: formData.validTo,
        maxRedemptions: formData.unlimitedClaims ? 0 : parseInt(formData.maxRedemptions),
        category: merchant.category,
        image: formData.customImage || formData.selectedProduct.images?.[0] || merchant.logo,
        status: 'active',
        productPrice: formData.selectedProduct.offerPrice || formData.selectedProduct.price || 0,
      };

      if (editingOffer) {
        await offerAPI.update(editingOffer._id, payload);
        toast.success('Campaign Synced!');
      } else {
        await offerAPI.create(payload);
        toast.success('Campaign Launched!');
      }
      onSuccess?.();
    } catch (error) { toast.error('Failed'); }
    finally { setLoading(false); }
  };

  const previewData = formData.selectedProduct ? {
    title: `${formData.discountValue || 0}${formData.discountType === 'percentage' ? '%' : '₹'} OFF`,
    description: `Get discount on ${formData.selectedProduct.name}`,
    discountType: formData.discountType,
    discountValue: parseFloat(formData.discountValue) || 0,
    validTo: formData.validTo,
    maxRedemptions: formData.unlimitedClaims ? 0 : parseInt(formData.maxRedemptions) || 100,
    image: formData.customImage || (formData.selectedProduct.images?.[0] || ''),
    productName: formData.selectedProduct.name,
    productPrice: formData.selectedProduct.offerPrice || formData.selectedProduct.price
  } : null;

  return (
    <div className="relative">
      <form onSubmit={handleSubmit} className="space-y-3 pb-20 lg:pb-0">
        <div className="grid grid-cols-1 lg:grid-cols-2 gap-3">
          <div className="bg-white rounded-xl border border-gray-100 p-3 lg:p-4 shadow-sm">
             <div className="flex items-center gap-2 mb-3">
                <span className="w-5 h-5 rounded bg-[#5EB929] text-white flex items-center justify-center text-[9px] font-bold">01</span>
                <h3 className="text-[11px] font-bold text-gray-900 uppercase tracking-widest">Target Product</h3>
             </div>
             <ProductSearchSelect onSelect={handleProductSelect} selectedProduct={formData.selectedProduct} />
          </div>
          {formData.selectedProduct?.variants?.length > 0 && (
            <div className="bg-white rounded-xl border border-gray-100 p-3 lg:p-4 shadow-sm">
               <div className="flex items-center gap-2 mb-3">
                  <span className="w-5 h-5 rounded bg-[#5EB929] text-white flex items-center justify-center text-[9px] font-bold">02</span>
                  <h3 className="text-[11px] font-bold text-gray-900 uppercase tracking-widest">Variant</h3>
               </div>
               <VariantSelector
                  productId={formData.selectedProduct._id || formData.selectedProduct.id}
                  selectedVariantId={formData.selectedVariantId}
                  onSelect={(vid) => handleChange('selectedVariantId', vid)}
                  applyToAll={formData.applyToAllVariants}
                  onApplyToAllChange={(checked) => handleChange('applyToAllVariants', checked)}
               />
            </div>
          )}
          <div className="bg-white rounded-xl border border-gray-100 p-3 lg:p-4 shadow-sm">
             <div className="flex items-center gap-2 mb-3">
                <span className="w-5 h-5 rounded bg-[#5EB929] text-white flex items-center justify-center text-[9px] font-bold">03</span>
                <h3 className="text-[11px] font-bold text-gray-900 uppercase tracking-widest">Benefit</h3>
             </div>
             <div className="grid grid-cols-2 gap-2">
                <select value={formData.discountType} onChange={(e) => handleChange('discountType', e.target.value)} className="px-3 py-2 bg-background rounded-lg border border-transparent text-[12px] font-bold outline-none">
                   <option value="percentage">% Off</option>
                   <option value="flat">₹ Off</option>
                </select>
                <input type="number" value={formData.discountValue} onChange={(e) => handleChange('discountValue', e.target.value)} placeholder="Value *" className="w-full px-3 py-2 bg-background rounded-lg border border-transparent text-[12px] font-bold outline-none" />
             </div>
          </div>
          <div className="bg-white rounded-xl border border-gray-100 p-3 lg:p-4 shadow-sm">
             <div className="flex items-center gap-2 mb-3">
                <span className="w-5 h-5 rounded bg-[#5EB929] text-white flex items-center justify-center text-[9px] font-bold">04</span>
                <h3 className="text-[11px] font-bold text-gray-900 uppercase tracking-widest">Timeline</h3>
             </div>
             <div className="flex items-center gap-2">
                <input type="date" value={formData.validTo} onChange={(e) => handleChange('validTo', e.target.value)} className="flex-1 px-3 py-2 bg-background rounded-lg border border-transparent text-[12px] font-bold outline-none" />
                <div className="flex gap-1">
                   {[7, 30].map(d => (
                      <button key={d} type="button" onClick={() => setQuickValidity(d)} className="px-2 py-2 bg-[#5EB929]/10 text-[#5EB929] rounded-lg text-[9px] font-bold uppercase">+{d}d</button>
                   ))}
                </div>
             </div>
          </div>
          <div className="lg:col-span-2 bg-[#5EB929]/5 rounded-xl border border-[#5EB929]/10 p-3 shadow-sm flex flex-col sm:flex-row items-center justify-between gap-3">
             <div className="flex items-center gap-4">
                <div className="flex items-center gap-2">
                   <label className="text-[10px] font-bold text-gray-400 uppercase">Claims</label>
                   <input type="number" value={formData.maxRedemptions} onChange={(e) => handleChange('maxRedemptions', e.target.value)} className="w-20 px-2 py-1.5 bg-white rounded-lg border border-gray-100 text-[12px] font-bold outline-none" />
                </div>
             </div>
             <div className="flex items-center gap-2">
                <button type="button" onClick={() => setShowPreviewMobile(true)} className="px-3 py-2 bg-white text-gray-500 rounded-lg text-[10px] font-bold uppercase border border-gray-200 hover:bg-gray-50 transition-all">Preview</button>
                <button type="submit" disabled={loading} className="px-6 py-2 bg-[#5EB929] text-white rounded-lg text-[10px] font-bold uppercase shadow-lg shadow-[#5EB929]/20 active:scale-95 transition-all">
                   {loading ? 'Wait...' : editingOffer ? 'Save Changes' : 'Launch Campaign'}
                </button>
             </div>
          </div>
        </div>
      </form>
      {showPreviewMobile && (
         <div className="fixed inset-0 z-[999999] bg-black/60 backdrop-blur-sm p-6 flex items-center justify-center" onClick={() => setShowPreviewMobile(false)}>
            <motion.div initial={{ scale: 0.9, opacity: 0 }} animate={{ scale: 1, opacity: 1 }} className="w-full max-w-sm" onClick={e => e.stopPropagation()}>
               <OfferPreviewCard offerData={previewData} merchant={merchant} offerType="product" />
               <button onClick={() => setShowPreviewMobile(false)} className="w-full mt-4 py-3 bg-white text-gray-900 rounded-xl font-bold text-[10px] uppercase tracking-widest">Close</button>
            </motion.div>
         </div>
      )}
    </div>
  );
};

export default ProductOfferForm;
