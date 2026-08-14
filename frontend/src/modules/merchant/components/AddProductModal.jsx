import { useState, useEffect } from 'react';
import { createPortal } from 'react-dom';
import { motion, AnimatePresence } from 'framer-motion';
import CloseRoundedIcon from '@mui/icons-material/CloseRounded';
import Inventory2RoundedIcon from '@mui/icons-material/Inventory2Rounded';
import SpaRoundedIcon from '@mui/icons-material/SpaRounded';
import AddPhotoAlternateRoundedIcon from '@mui/icons-material/AddPhotoAlternateRounded';
import toast from 'react-hot-toast';

const CATEGORY_BEHAVIOURS = {
  'Food': { type: 'product_based', icon: '🍔', showVeg: true },
  'Grocery': { type: 'product_based', icon: '🛒', showVeg: false },
  'Pharmacy': { type: 'product_based', icon: '💊', showVeg: false },
  'Electronics': { type: 'product_based', icon: '📱', showVeg: false },
  'Fashion': { type: 'product_based', icon: '👕', showVeg: false },
  'Beauty': { type: 'product_based', icon: '💄', showVeg: false },
  'Gym': { type: 'service_based', icon: '💪', showDuration: true, requiresBooking: true },
  'Hotel': { type: 'service_based', icon: '🏨', showDuration: true, requiresBooking: true },
  'Spa': { type: 'service_based', icon: '🧖', showDuration: true, requiresBooking: true },
  'Salon': { type: 'service_based', icon: '💇', showDuration: true, requiresBooking: false },
  'Tours': { type: 'service_based', icon: '🗺️', showDuration: true, requiresBooking: true },
};

const getCategoryBehaviour = (category) => CATEGORY_BEHAVIOURS[category] || CATEGORY_BEHAVIOURS['Food'];

const AddProductModal = ({ isOpen, onClose, merchant, editingProduct, onSave }) => {
  const behaviour = getCategoryBehaviour(merchant?.category);
  const isProductBased = behaviour.type === 'product_based';

  const [formData, setFormData] = useState({
    name: '', description: '', price: '', offerPrice: '',
    category: '', isVeg: false, stock: '', sku: '',
    duration: '30 mins', inclusions: [''], maxBookings: '',
    validityDays: '30', images: [], imagePreview: null,
  });
  
  const [isSaving, setIsSaving] = useState(false);
  const [uploadingImage, setUploadingImage] = useState(false);

  useEffect(() => {
    if (editingProduct) setFormData({ ...editingProduct });
    else setFormData({
        name: '', description: '', price: '', offerPrice: '', category: '', 
        isVeg: false, stock: '', sku: '', duration: '30 mins', inclusions: [''], 
        maxBookings: '', validityDays: '30', images: [], imagePreview: null,
    });
    setIsSaving(false);
  }, [editingProduct, isOpen]);

  const handleChange = (field, value) => setFormData(prev => ({ ...prev, [field]: value }));

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
      setFormData(prev => ({ ...prev, images: [response?.url || response] }));
      toast.success('Ready');
    } catch (err) { toast.error('Upload Error'); }
    finally { setUploadingImage(false); }
  };

  const handleSubmit = async (e) => {
    e.preventDefault();
    if (!formData.name.trim() || !formData.price || !formData.offerPrice) return toast.error('Fill required fields');
    setIsSaving(true);
    try {
      const payload = {
        ...formData, merchantId: merchant._id, categoryType: behaviour.type,
        price: parseFloat(formData.price), offerPrice: parseFloat(formData.offerPrice),
        discount: Math.round(((formData.price - formData.offerPrice) / formData.price) * 100),
      };
      await onSave(payload);
    } catch (err) { setIsSaving(false); }
  };

  if (!isOpen) return null;

  return createPortal(
    <AnimatePresence>
      <div className="fixed inset-0 z-[999999] bg-gray-950/60 backdrop-blur-md flex items-start justify-center p-0 sm:p-4 overflow-y-auto">
        <motion.div initial={{ opacity: 0, y: 100 }} animate={{ opacity: 1, y: 0 }} exit={{ opacity: 0, y: 100 }} className="w-full max-w-2xl bg-background sm:rounded-2xl shadow-2xl overflow-hidden border border-white/20 sm:my-8">
          
          {/* Header */}
          <div className="bg-gray-900 px-5 py-4 flex items-center justify-between sticky top-0 z-[100]">
            <div className="flex items-center gap-3">
              <div className="w-8 h-8 bg-[#5EB929] text-white rounded-lg flex items-center justify-center shadow-lg">
                {isProductBased ? <Inventory2RoundedIcon sx={{ fontSize: 18 }} /> : <SpaRoundedIcon sx={{ fontSize: 18 }} />}
              </div>
              <div>
                <h2 className="text-[15px] font-bold text-white leading-none">{editingProduct ? 'Edit' : 'New'} {isProductBased ? 'Product' : 'Service'}</h2>
                <p className="text-[9px] font-bold text-gray-400 uppercase tracking-widest mt-1">{behaviour.icon} {merchant?.category}</p>
              </div>
            </div>
            <button onClick={onClose} className="w-8 h-8 bg-white/10 hover:bg-white/20 text-white rounded-lg flex items-center justify-center transition-all">
              <CloseRoundedIcon sx={{ fontSize: 18 }} />
            </button>
          </div>

          <div className="p-4 sm:p-6">
            <form onSubmit={handleSubmit} className="space-y-4">
              <div className="grid grid-cols-1 sm:grid-cols-3 gap-4">
                 <div className="sm:col-span-2 space-y-3">
                    <div>
                      <label className="text-[10px] font-bold text-gray-400 uppercase tracking-widest mb-1 block">Item Name *</label>
                      <input type="text" value={formData.name} onChange={(e) => handleChange('name', e.target.value)} placeholder="e.g. Margherita Pizza" className="w-full px-3 py-2.5 bg-white rounded-xl border border-gray-100 focus:border-[#5EB929]/20 outline-none text-[13px] font-bold shadow-sm" />
                    </div>
                    <div>
                      <label className="text-[10px] font-bold text-gray-400 uppercase tracking-widest mb-1 block">Short Description</label>
                      <textarea value={formData.description} onChange={(e) => handleChange('description', e.target.value)} rows="2" className="w-full px-3 py-2.5 bg-white rounded-xl border border-gray-100 focus:border-[#5EB929]/20 outline-none text-[13px] font-bold shadow-sm resize-none" />
                    </div>
                 </div>
                 <div className="sm:col-span-1">
                    <label className="text-[10px] font-bold text-gray-400 uppercase tracking-widest mb-1 block">Image</label>
                    <div className="relative group h-[116px]">
                       <input type="file" accept="image/*" onChange={handleImageUpload} className="absolute inset-0 opacity-0 z-10 cursor-pointer" />
                       <div className="w-full h-full rounded-xl bg-white border-2 border-dashed border-gray-100 flex flex-col items-center justify-center group-hover:border-[#5EB929]/30 transition-all shadow-sm overflow-hidden">
                          {formData.imagePreview ? (
                             <img src={formData.imagePreview} className="w-full h-full object-cover" alt="" />
                          ) : (
                             <AddPhotoAlternateRoundedIcon className="text-gray-200" />
                          )}
                       </div>
                    </div>
                 </div>
              </div>
              <div className="grid grid-cols-2 gap-4">
                 <div className="bg-white p-3 rounded-xl border border-gray-100 shadow-sm">
                    <label className="text-[10px] font-bold text-gray-400 uppercase tracking-widest mb-2 block">Regular Price</label>
                    <div className="flex items-center gap-2">
                       <span className="text-[13px] font-bold text-gray-300">₹</span>
                       <input type="number" value={formData.price} onChange={(e) => handleChange('price', e.target.value)} placeholder="0.00" className="w-full text-base font-bold text-gray-900 outline-none" />
                    </div>
                 </div>
                 <div className="bg-[#5EB929]/5 p-3 rounded-xl border border-[#5EB929]/10 shadow-sm">
                    <label className="text-[10px] font-bold text-[#5EB929] uppercase tracking-widest mb-2 block">Offer Price</label>
                    <div className="flex items-center gap-2">
                       <span className="text-[13px] font-bold text-[#5EB929]/40">₹</span>
                       <input type="number" value={formData.offerPrice} onChange={(e) => handleChange('offerPrice', e.target.value)} placeholder="0.00" className="w-full text-base font-bold text-[#5EB929] outline-none bg-transparent" />
                    </div>
                 </div>
              </div>
              <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
                 {isProductBased ? (
                    <>
                      {behaviour.showVeg && (
                        <div className="flex items-center gap-3 p-3 bg-white rounded-xl border border-gray-100 shadow-sm">
                           <input type="checkbox" id="isVeg" checked={formData.isVeg} onChange={(e) => handleChange('isVeg', e.target.checked)} className="w-4 h-4 rounded text-[#5EB929] accent-[#5EB929]" />
                           <label htmlFor="isVeg" className="text-[11px] font-bold text-gray-600 uppercase flex items-center gap-2">
                              <div className="w-3 h-3 border border-green-600 flex items-center justify-center rounded-sm"><div className="w-1.5 h-1.5 bg-green-600 rounded-full" /></div>
                              Vegetarian Item
                           </label>
                        </div>
                      )}
                      <div className="bg-white p-3 rounded-xl border border-gray-100 shadow-sm flex items-center justify-between">
                         <label className="text-[10px] font-bold text-gray-400 uppercase tracking-widest">In Stock</label>
                         <input type="number" value={formData.stock} onChange={(e) => handleChange('stock', e.target.value)} placeholder="Qty" className="w-16 text-right text-[13px] font-bold text-gray-900 outline-none" />
                      </div>
                    </>
                 ) : (
                    <>
                      <div className="bg-white p-3 rounded-xl border border-gray-100 shadow-sm flex items-center justify-between">
                         <label className="text-[10px] font-bold text-gray-400 uppercase tracking-widest">Duration</label>
                         <select value={formData.duration} onChange={(e) => handleChange('duration', e.target.value)} className="bg-transparent text-[12px] font-bold text-gray-900 outline-none">
                            <option value="15 mins">15 mins</option>
                            <option value="30 mins">30 mins</option>
                            <option value="1 hour">1 hour</option>
                            <option value="2 hours">2 hours</option>
                            <option value="Full Day">Full Day</option>
                         </select>
                      </div>
                      <div className="bg-white p-3 rounded-xl border border-gray-100 shadow-sm flex items-center justify-between">
                         <label className="text-[10px] font-bold text-gray-400 uppercase tracking-widest">Capacity</label>
                         <input type="number" value={formData.maxBookings} onChange={(e) => handleChange('maxBookings', e.target.value)} placeholder="Max" className="w-16 text-right text-[13px] font-bold text-gray-900 outline-none" />
                      </div>
                    </>
                 )}
              </div>
              <div className="flex items-center justify-between gap-4 pt-4 border-t border-gray-100">
                 <div className="hidden sm:block">
                    {formData.price && formData.offerPrice && (
                       <span className="text-[10px] font-bold text-[#5EB929] uppercase tracking-widest bg-[#5EB929]/10 px-3 py-1.5 rounded-lg">
                          Save {Math.round(((formData.price - formData.offerPrice) / formData.price) * 100)}%
                       </span>
                    )}
                 </div>
                 <div className="flex items-center gap-2 w-full sm:w-auto">
                    <button type="button" onClick={onClose} className="flex-1 sm:flex-none px-6 py-2.5 bg-gray-100 text-gray-500 rounded-xl text-[11px] font-bold uppercase hover:bg-gray-200 transition-all">Cancel</button>
                    <button type="submit" disabled={isSaving || uploadingImage} className="flex-1 sm:flex-none px-10 py-2.5 bg-[#5EB929] text-white rounded-xl text-[11px] font-bold uppercase shadow-lg shadow-[#5EB929]/20 active:scale-95 transition-all">
                       {isSaving ? 'Saving...' : editingProduct ? 'Update Item' : 'Add Item'}
                    </button>
                 </div>
              </div>
            </form>
          </div>
        </motion.div>
      </div>
    </AnimatePresence>,
    document.body
  );
};

export default AddProductModal;
