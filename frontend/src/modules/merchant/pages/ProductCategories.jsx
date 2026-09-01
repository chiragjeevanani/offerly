import { useState, useEffect } from 'react';
import { createPortal } from 'react-dom';
import { motion, AnimatePresence } from 'framer-motion';
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import AddRoundedIcon from '@mui/icons-material/AddRounded';
import EditRoundedIcon from '@mui/icons-material/EditRounded';
import DeleteRoundedIcon from '@mui/icons-material/DeleteRounded';
import CloseRoundedIcon from '@mui/icons-material/CloseRounded';
import CategoryRoundedIcon from '@mui/icons-material/CategoryRounded';
import LockRoundedIcon from '@mui/icons-material/LockRounded';
import toast from 'react-hot-toast';

import ConfirmDialog from '../components/ConfirmDialog';
import { productCategoryAPI } from '../../../api/productCategory.api';

const CategoryFormModal = ({ isOpen, onClose, editingCategory, onSave }) => {
  const [name, setName] = useState('');
  const [discountPercent, setDiscountPercent] = useState('');
  const [isSaving, setIsSaving] = useState(false);

  useEffect(() => {
    setName(editingCategory?.name || '');
    setDiscountPercent(editingCategory ? String(editingCategory.discountPercent) : '');
    setIsSaving(false);
  }, [editingCategory, isOpen]);

  if (!isOpen) return null;

  const handleSubmit = async (e) => {
    e.preventDefault();
    if (!name.trim()) return toast.error('Category name is required');
    const pct = Number(discountPercent) || 0;
    if (pct < 0 || pct > 100) return toast.error('Discount must be between 0 and 100');
    setIsSaving(true);
    try {
      await onSave({ name: name.trim(), discountPercent: pct });
    } finally {
      setIsSaving(false);
    }
  };

  return createPortal(
    <AnimatePresence>
      <div className="fixed inset-0 z-[999999] bg-gray-950/60 backdrop-blur-md flex items-center justify-center p-4">
        <motion.div initial={{ opacity: 0, y: 40 }} animate={{ opacity: 1, y: 0 }} exit={{ opacity: 0, y: 40 }} className="w-full max-w-sm bg-white rounded-2xl shadow-2xl overflow-hidden">
          <div className="bg-gray-900 px-5 py-4 flex items-center justify-between">
            <h2 className="text-[15px] font-bold text-white">{editingCategory ? 'Edit' : 'New'} Category</h2>
            <button onClick={onClose} className="w-8 h-8 bg-white/10 hover:bg-white/20 text-white rounded-lg flex items-center justify-center transition-all">
              <CloseRoundedIcon sx={{ fontSize: 18 }} />
            </button>
          </div>
          <form onSubmit={handleSubmit} className="p-5 space-y-4">
            <div>
              <label className="text-[10px] font-bold text-gray-400 uppercase tracking-widest mb-1 block">Name *</label>
              <input
                type="text" value={name} onChange={(e) => setName(e.target.value)}
                placeholder="e.g. Starters" disabled={editingCategory?.isDefault}
                className="w-full px-3 py-2.5 bg-gray-50 rounded-xl border border-gray-100 outline-none text-[13px] font-bold disabled:opacity-60"
              />
            </div>
            <div>
              <label className="text-[10px] font-bold text-gray-400 uppercase tracking-widest mb-1 block">Discount %</label>
              <div className="flex items-center gap-2 px-3 py-2.5 bg-gray-50 rounded-xl border border-gray-100">
                <input
                  type="number" min="0" max="100" value={discountPercent}
                  onChange={(e) => setDiscountPercent(e.target.value)}
                  placeholder="0" className="w-full text-base font-bold text-gray-900 outline-none bg-transparent"
                />
                <span className="text-[13px] font-bold text-gray-400">%</span>
              </div>
            </div>
            <div className="flex items-center gap-2 pt-2">
              <button type="button" onClick={onClose} className="flex-1 py-2.5 bg-gray-100 text-gray-500 rounded-xl text-[11px] font-bold uppercase hover:bg-gray-200 transition-all">Cancel</button>
              <button type="submit" disabled={isSaving} className="flex-1 py-2.5 bg-[#5EB929] text-white rounded-xl text-[11px] font-bold uppercase shadow-lg shadow-[#5EB929]/20 active:scale-95 transition-all">
                {isSaving ? 'Saving...' : 'Save'}
              </button>
            </div>
          </form>
        </motion.div>
      </div>
    </AnimatePresence>,
    document.body
  );
};

const ProductCategories = ({ merchant }) => {
  const queryClient = useQueryClient();
  const [isModalOpen, setIsModalOpen] = useState(false);
  const [editingCategory, setEditingCategory] = useState(null);
  const [confirmDeleteId, setConfirmDeleteId] = useState(null);

  const { data: categories, isLoading } = useQuery({
    queryKey: ['merchantProductCategories', merchant?._id],
    queryFn: async () => {
      const res = await productCategoryAPI.getMine();
      return res?.categories || [];
    },
    enabled: !!merchant,
  });

  const invalidate = () => {
    queryClient.invalidateQueries(['merchantProductCategories', merchant?._id]);
    queryClient.invalidateQueries(['merchantProducts', merchant?._id]);
  };

  const deleteMutation = useMutation({
    mutationFn: (id) => productCategoryAPI.delete(id),
    onSuccess: () => { invalidate(); toast.success('Category deleted'); },
    onError: (err) => toast.error(err?.message || 'Cannot delete this category'),
  });

  const handleSave = async (payload) => {
    try {
      if (editingCategory) {
        await productCategoryAPI.update(editingCategory.id, payload);
        toast.success('Category updated');
      } else {
        await productCategoryAPI.create(payload);
        toast.success('Category created');
      }
      setIsModalOpen(false);
      setEditingCategory(null);
      invalidate();
    } catch (err) {
      toast.error(err?.message || 'Save failed');
    }
  };

  const list = categories || [];

  return (
    <div className="min-h-screen bg-background p-3 lg:p-10 -m-6 lg:-m-10">
      <div className="max-w-3xl mx-auto space-y-6 pb-24">
        <div className="flex items-center justify-between gap-4">
          <div>
            <h1 className="text-2xl font-bold text-gray-900 leading-none uppercase tracking-tight">Categories & Discounts</h1>
            <p className="text-[10px] font-bold text-gray-400 uppercase tracking-widest mt-1.5">Group your catalog and set a discount per category</p>
          </div>
          <button
            onClick={() => { setEditingCategory(null); setIsModalOpen(true); }}
            className="w-11 h-11 flex items-center justify-center rounded-2xl bg-[#5EB929] text-white shadow-xl shadow-[#5EB929]/20 hover:scale-105 transition-all"
          >
            <AddRoundedIcon />
          </button>
        </div>

        <div className="space-y-3">
          {isLoading ? (
            <div className="py-24 flex flex-col items-center gap-4">
              <div className="w-10 h-10 border-2 border-[#5EB929]/20 border-t-[#5EB929] rounded-full animate-spin" />
            </div>
          ) : list.length === 0 ? (
            <div className="py-20 text-center bg-white rounded-[2rem] border border-dashed border-gray-100">
              <CategoryRoundedIcon sx={{ fontSize: 40 }} className="text-gray-100 mb-2" />
              <p className="text-[10px] font-bold text-gray-300 uppercase tracking-widest">No categories yet</p>
            </div>
          ) : (
            list.map((category) => (
              <div key={category.id} className="bg-white rounded-2xl p-4 border border-gray-50 shadow-sm flex items-center justify-between gap-3">
                <div className="flex items-center gap-3">
                  <div className="w-10 h-10 bg-[#5EB929]/10 rounded-xl flex items-center justify-center text-[#5EB929]">
                    <CategoryRoundedIcon sx={{ fontSize: 18 }} />
                  </div>
                  <div>
                    <div className="flex items-center gap-1.5">
                      <h3 className="text-[13px] font-bold text-gray-900">{category.name}</h3>
                      {category.isDefault && <LockRoundedIcon sx={{ fontSize: 12 }} className="text-gray-300" />}
                    </div>
                    <p className="text-[10px] font-bold text-gray-400">{category.productCount} item{category.productCount === 1 ? '' : 's'}</p>
                  </div>
                </div>
                <div className="flex items-center gap-3">
                  <span className="text-[11px] font-bold bg-emerald-50 text-[#5EB929] px-2 py-1 rounded-md">
                    {category.discountPercent}% OFF
                  </span>
                  <button onClick={() => { setEditingCategory(category); setIsModalOpen(true); }} className="w-8 h-8 flex items-center justify-center text-gray-400 hover:text-gray-900 transition-colors">
                    <EditRoundedIcon sx={{ fontSize: 16 }} />
                  </button>
                  {!category.isDefault && (
                    <button onClick={() => setConfirmDeleteId(category.id)} className="w-8 h-8 flex items-center justify-center text-gray-400 hover:text-red-500 transition-colors">
                      <DeleteRoundedIcon sx={{ fontSize: 16 }} />
                    </button>
                  )}
                </div>
              </div>
            ))
          )}
        </div>

        <CategoryFormModal
          isOpen={isModalOpen}
          onClose={() => { setIsModalOpen(false); setEditingCategory(null); }}
          editingCategory={editingCategory}
          onSave={handleSave}
        />

        <ConfirmDialog
          isOpen={!!confirmDeleteId}
          title="Delete Category?"
          message="Products in this category must be moved first. If any remain, deletion will be blocked."
          confirmText="Delete"
          onConfirm={() => { deleteMutation.mutate(confirmDeleteId); setConfirmDeleteId(null); }}
          onCancel={() => setConfirmDeleteId(null)}
        />
      </div>
    </div>
  );
};

export default ProductCategories;
