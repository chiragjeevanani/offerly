import { useState, useMemo, useEffect } from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import SearchRoundedIcon from '@mui/icons-material/SearchRounded';
import AddRoundedIcon from '@mui/icons-material/AddRounded';
import EditRoundedIcon from '@mui/icons-material/EditRounded';
import DeleteRoundedIcon from '@mui/icons-material/DeleteRounded';
import Inventory2RoundedIcon from '@mui/icons-material/Inventory2Rounded';
import WarningRoundedIcon from '@mui/icons-material/WarningRounded';
import AccessTimeRoundedIcon from '@mui/icons-material/AccessTimeRounded';
import RocketLaunchRoundedIcon from '@mui/icons-material/RocketLaunchRounded';
import toast from 'react-hot-toast';

import AddProductModal from '../components/AddProductModal';
import ConfirmDialog from '../components/ConfirmDialog';
import UnifiedOfferBuilder from '../components/UnifiedOfferBuilder';
import { productAPI } from '../../../api/product.api';

/* ─── Custom Hook for Debouncing ──────────────── */
function useDebounce(value, delay) {
  const [debouncedValue, setDebouncedValue] = useState(value);
  useEffect(() => {
    const handler = setTimeout(() => setDebouncedValue(value), delay);
    return () => clearTimeout(handler);
  }, [value, delay]);
  return debouncedValue;
}

const Products = ({ merchant }) => {
  const queryClient = useQueryClient();
  const [searchQuery, setSearchQuery] = useState('');
  const debouncedSearch = useDebounce(searchQuery, 300);
  
  const [isModalOpen, setIsModalOpen] = useState(false);
  const [editingProduct, setEditingProduct] = useState(null);
  const [confirmDeleteId, setConfirmDeleteId] = useState(null);
  
  const [isUnifiedBuilderOpen, setIsUnifiedBuilderOpen] = useState(false);
  const [quickOfferProduct, setQuickOfferProduct] = useState(null);

  const { data: rawProducts, isLoading: loading } = useQuery({
    queryKey: ['merchantProducts', merchant?._id],
    queryFn: async () => {
      const response = await productAPI.getByMerchant('me');
      const productsList = response?.products || response?.data?.products || response || [];
      return Array.isArray(productsList) ? productsList : [];
    },
    enabled: !!merchant,
  });

  const products = rawProducts || [];

  const deleteMutation = useMutation({
    mutationFn: (id) => productAPI.delete(id),
    onSuccess: () => {
      queryClient.invalidateQueries(['merchantProducts', merchant?._id]);
      toast.success('Removed');
    },
  });

  const handleSaveProduct = async (productData) => {
    try {
      if (editingProduct) {
        await productAPI.update(editingProduct._id || editingProduct.id, productData);
        toast.success('Updated');
      } else {
        await productAPI.create(productData);
        toast.success('Added');
      }
      setIsModalOpen(false);
      setEditingProduct(null);
      queryClient.invalidateQueries(['merchantProducts', merchant?._id]);
    } catch (error) {
      toast.error(error?.message || 'Save failed');
      throw error;
    }
  };

  const filtered = useMemo(() => {
    return products.filter(p => p.name?.toLowerCase().includes(debouncedSearch.toLowerCase()));
  }, [products, debouncedSearch]);

  const maxProducts = merchant?.subscription?.planId?.maxProducts || 5;
  const isUnlimited = maxProducts === 999;
  const usagePercent = isUnlimited ? 0 : Math.round((products.length / maxProducts) * 100);

  return (
    <div className="min-h-screen bg-background p-3 lg:p-10 -m-6 lg:-m-10">
      <div className="max-w-7xl mx-auto space-y-6 pb-24">
        
        {/* Compact Header */}
        <div className="flex items-center justify-between gap-4">
          <div>
            <h1 className="text-2xl font-bold text-gray-900 leading-none uppercase tracking-tight">Catalog</h1>
            <div className="flex items-center gap-2 mt-1.5">
               <div className="w-1.5 h-1.5 bg-[#5EB929] rounded-full" />
               <p className="text-[10px] font-bold text-gray-400 uppercase tracking-widest">{products.length} Items Listed</p>
            </div>
          </div>
          <div className="flex gap-2">
            <button 
              onClick={() => { setEditingProduct(null); setIsModalOpen(true); }}
              disabled={!isUnlimited && products.length >= maxProducts}
              className={`w-11 h-11 flex items-center justify-center rounded-2xl transition-all shadow-lg ${
                !isUnlimited && products.length >= maxProducts ? "bg-gray-100 text-gray-400" : "bg-white text-gray-900 border border-gray-100 hover:scale-105"
              }`}
            >
              <AddRoundedIcon />
            </button>
            <button 
              onClick={() => { setQuickOfferProduct(null); setIsUnifiedBuilderOpen(true); }}
              className="px-5 h-11 bg-[#5EB929] text-white rounded-2xl font-bold text-[11px] uppercase tracking-widest shadow-xl shadow-[#5EB929]/20 hover:scale-105 transition-all flex items-center gap-2"
            >
              <RocketLaunchRoundedIcon sx={{ fontSize: 18 }} />
              <span className="hidden sm:inline">Launch</span>
            </button>
          </div>
        </div>

        {/* High-Density Search & Stats */}
        <div className="grid grid-cols-1 md:grid-cols-12 gap-4 items-center bg-white p-3 rounded-[2rem] shadow-sm border border-gray-50">
           <div className="md:col-span-7 relative group">
              <SearchRoundedIcon className="absolute left-4 top-1/2 -translate-y-1/2 text-gray-300 group-focus-within:text-[#5EB929] transition-colors" sx={{ fontSize: 18 }} />
              <input 
                type="text" placeholder="Search menu, products..." 
                value={searchQuery} onChange={(e) => setSearchQuery(e.target.value)}
                className="w-full pl-12 pr-4 py-3 bg-[#F8FAFC] rounded-2xl outline-none text-[13px] font-bold placeholder:text-gray-300"
              />
           </div>
           <div className="md:col-span-5 px-2">
              <div className="flex justify-between items-center mb-1.5">
                 <p className="text-[9px] font-bold text-gray-400 uppercase tracking-[0.2em]">Storage Space</p>
                 <p className="text-[9px] font-bold text-gray-900 uppercase">{products.length} / {isUnlimited ? '∞' : maxProducts}</p>
              </div>
              <div className="w-full h-1.5 bg-gray-100 rounded-full overflow-hidden">
                 <motion.div initial={{ width: 0 }} animate={{ width: `${Math.min(usagePercent, 100)}%` }} className={`h-full rounded-full ${usagePercent > 85 ? 'bg-red-500' : 'bg-[#5EB929]'}`} />
              </div>
           </div>
        </div>

        {/* Compact Grid System */}
        <div className="grid grid-cols-2 sm:grid-cols-3 lg:grid-cols-4 xl:grid-cols-5 gap-3">
          {loading ? (
             <div className="col-span-full py-24 flex flex-col items-center gap-4">
                <div className="w-10 h-10 border-2 border-[#5EB929]/20 border-t-[#5EB929] rounded-full animate-spin" />
                <p className="text-[9px] font-bold text-gray-400 uppercase tracking-widest animate-pulse">Syncing Inventory</p>
             </div>
          ) : (
            <AnimatePresence mode="popLayout">
              {filtered.length === 0 ? (
                <motion.div initial={{ opacity: 0 }} animate={{ opacity: 1 }} className="col-span-full py-20 text-center bg-white rounded-[2.5rem] border border-dashed border-gray-100">
                  <Inventory2RoundedIcon sx={{ fontSize: 40 }} className="text-gray-100 mb-2" />
                  <p className="text-[10px] font-bold text-gray-300 uppercase tracking-widest">No Items Found</p>
                </motion.div>
              ) : (
                filtered.map((product, idx) => (
                  <motion.div 
                    key={product._id} layout initial={{ opacity: 0, scale: 0.9 }} animate={{ opacity: 1, scale: 1 }} transition={{ delay: idx * 0.03 }}
                    className="bg-white rounded-[2rem] p-3 border border-gray-50 hover:border-[#5EB929]/20 hover:shadow-xl transition-all group flex flex-col h-full relative"
                  >
                    {/* Compact Image & Quick Edit */}
                    <div className="relative aspect-square rounded-2xl overflow-hidden bg-gray-50 mb-3 group-hover:shadow-lg transition-all border border-gray-50">
                       {product.images?.[0] || product.image ? (
                         <img src={product.images?.[0] || product.image} alt="" className="w-full h-full object-cover group-hover:scale-110 transition-transform duration-700" />
                       ) : (
                         <div className="w-full h-full flex items-center justify-center text-gray-200">
                            <Inventory2RoundedIcon sx={{ fontSize: 24 }} />
                         </div>
                       )}
                       
                       {/* Floating Actions */}
                       <div className="absolute top-2 right-2 flex flex-col gap-1 opacity-0 group-hover:opacity-100 transition-all translate-x-2 group-hover:translate-x-0">
                          <button onClick={() => { setEditingProduct(product); setIsModalOpen(true); }} className="w-8 h-8 bg-white/90 backdrop-blur-md rounded-xl flex items-center justify-center text-gray-900 shadow-xl hover:bg-white transition-all">
                             <EditRoundedIcon sx={{ fontSize: 14 }} />
                          </button>
                          <button onClick={() => setConfirmDeleteId(product._id)} className="w-8 h-8 bg-red-500/90 backdrop-blur-md rounded-xl flex items-center justify-center text-white shadow-xl hover:bg-red-600 transition-all">
                             <DeleteRoundedIcon sx={{ fontSize: 14 }} />
                          </button>
                       </div>

                       {/* Veg/Non-Veg Tag */}
                       {product.category === 'Food' && product.isVeg !== null && (
                          <div className="absolute top-2 left-2 p-1 bg-white/90 backdrop-blur-md rounded-lg shadow-sm border border-white/20">
                             <div className={`w-2 h-2 border flex items-center justify-center rounded-sm ${product.isVeg ? 'border-green-600' : 'border-red-600'}`}>
                               <div className={`w-1 h-1 rounded-full ${product.isVeg ? 'bg-green-600' : 'bg-red-600'}`} />
                             </div>
                          </div>
                       )}

                       {/* Category Overlay */}
                       <div className="absolute bottom-2 left-2 right-2">
                          <span className="px-2 py-1 bg-gray-900/80 backdrop-blur-md text-white text-[7px] font-bold uppercase tracking-widest rounded-lg">
                             {product.category}
                          </span>
                       </div>
                    </div>

                    <div className="flex flex-col flex-1">
                       <h3 className="text-[12px] font-bold text-gray-900 leading-tight mb-1 line-clamp-1">{product.name}</h3>
                       
                       <div className="mt-auto pt-2 border-t border-gray-50 flex items-center justify-between gap-2">
                          <div className="flex flex-col">
                             <span className="text-sm font-bold text-gray-900">₹{Math.round(product.offerPrice)}</span>
                             {product.price > product.offerPrice && (
                               <span className="text-[9px] text-gray-400 font-bold line-through">₹{Math.round(product.price)}</span>
                             )}
                          </div>
                          {product.discount > 0 && (
                             <span className="text-[8px] font-bold bg-emerald-50 text-[#5EB929] px-1.5 py-0.5 rounded-md">
                                -{product.discount}%
                             </span>
                          )}
                       </div>

                       <button 
                        onClick={() => { setQuickOfferProduct(product); setIsUnifiedBuilderOpen(true); }}
                        className="mt-3 w-full py-2 bg-background text-[#5EB929] rounded-xl font-bold text-[9px] uppercase tracking-widest hover:bg-[#5EB929] hover:text-white transition-all active:scale-95"
                       >
                          Rocket Launch 🚀
                       </button>
                    </div>
                  </motion.div>
                ))
              )}
            </AnimatePresence>
          )}
        </div>

        {/* Modals & Dialogs */}
        <AddProductModal
          isOpen={isModalOpen} onClose={() => { setIsModalOpen(false); setEditingProduct(null); }}
          merchant={merchant} editingProduct={editingProduct} onSave={handleSaveProduct}
        />

        <UnifiedOfferBuilder
          isOpen={isUnifiedBuilderOpen} onClose={() => setIsUnifiedBuilderOpen(false)}
          merchant={merchant} preSelectedProduct={quickOfferProduct}
          onSuccess={() => queryClient.invalidateQueries(['merchantProducts'])}
        />

        <ConfirmDialog
          isOpen={!!confirmDeleteId} title="Delete Item?" message="Permanently remove this from your catalog?"
          confirmText="Delete" onConfirm={() => { deleteMutation.mutate(confirmDeleteId); setConfirmDeleteId(null); }}
          onCancel={() => setConfirmDeleteId(null)}
        />

      </div>
    </div>
  );
};

export default Products;
