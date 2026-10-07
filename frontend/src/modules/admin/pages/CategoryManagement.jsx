import { useState, useEffect } from 'react';
import { createPortal } from 'react-dom';
import { motion, AnimatePresence } from 'framer-motion';
import { useQuery, useQueryClient } from '@tanstack/react-query';
import CategoryRoundedIcon from '@mui/icons-material/CategoryRounded';
import AddRoundedIcon from '@mui/icons-material/AddRounded';
import EditRoundedIcon from '@mui/icons-material/EditRounded';
import DeleteRoundedIcon from '@mui/icons-material/DeleteRounded';
import CloseRoundedIcon from '@mui/icons-material/CloseRounded';
import RefreshRoundedIcon from '@mui/icons-material/RefreshRounded';
import SearchRoundedIcon from '@mui/icons-material/SearchRounded';
import MoreVertRoundedIcon from '@mui/icons-material/MoreVertRounded';
import ChevronRightRoundedIcon from '@mui/icons-material/ChevronRightRounded';
import toast from 'react-hot-toast';
import AddPhotoAlternateRoundedIcon from '@mui/icons-material/AddPhotoAlternateRounded';
import { categoryAPI } from '../../../api/category.api';
import { uploadAPI } from '../../../api/upload.api';
import SlideOver from '../components/SlideOver';
import { CATEGORY_ICONS, CATEGORY_COLORS, getCategoryVisual } from '../../../utils/categoryVisuals';
import CategoryTile from '../../../components/CategoryTile';

const TabButton = ({ label, isActive, onClick }) => (
  <button
    onClick={onClick}
    className={`px-5 py-2 text-[12px] font-medium transition-all duration-300 rounded-[10px] flex items-center gap-2 ${
      isActive 
        ? 'bg-[#5EB929] text-white shadow-md' 
        : 'text-gray-500 hover:text-gray-700 hover:bg-white/80'
    }`}
  >
    {label}
  </button>
);

const CategoryManagement = () => {
  const queryClient = useQueryClient();
  const [activeTab, setActiveTab] = useState('all'); // 'all', 'product', 'service'
  const [searchQuery, setSearchQuery] = useState('');
  const [isSlideOverOpen, setIsSlideOverOpen] = useState(false);
  const [isDeleteModalOpen, setIsDeleteModalOpen] = useState(false);
  const [selectedCategory, setSelectedCategory] = useState(null);
  const [isUploading, setIsUploading] = useState(false);
  const [formData, setFormData] = useState({ 
    name: '', 
    type: 'product', 
    icon: '', 
    color: '#5EB929', 
    description: '', 
    order: 0,
    status: 'active' 
  });

  const { data: categories = [], isLoading: loading, refetch, isFetching } = useQuery({
    queryKey: ['adminCategories'],
    queryFn: async () => {
      const response = await categoryAPI.getAllAdmin();
      return response.categories || [];
    }
  });

  const filteredCategories = categories.filter(cat => {
    const matchesTab = activeTab === 'all' || cat.type === activeTab;
    const matchesSearch = cat.name.toLowerCase().includes(searchQuery.toLowerCase());
    return matchesTab && matchesSearch;
  });

  const handleAdd = () => {
    setSelectedCategory(null);
    setFormData({
      name: '',
      type: 'product',
      icon: 'storefront',
      color: '#5EB929',
      image: '',
      showOnHome: true,
      description: '',
      order: categories.length + 1,
      status: 'active'
    });
    setIsSlideOverOpen(true);
  };

  const handleEdit = (cat) => {
    setSelectedCategory(cat);
    // Start from what customers currently see (includes the legacy name-based fallback).
    const visual = getCategoryVisual(cat);
    setFormData({
      name: cat.name,
      type: cat.type,
      icon: visual.iconKey,
      color: visual.color,
      image: cat.image || '',
      showOnHome: cat.showOnHome !== false,
      description: cat.description || '', 
      order: cat.order || 0,
      status: cat.status 
    });
    setIsSlideOverOpen(true);
  };

  const handleImageUpload = async (e) => {
    const file = e.target.files?.[0];
    e.target.value = '';
    if (!file) return;
    setIsUploading(true);
    try {
      const response = await uploadAPI.uploadImage(file);
      setFormData(prev => ({ ...prev, image: response?.url || '' }));
    } catch (error) {
      toast.error(error?.response?.data?.message || 'Image upload failed');
    } finally {
      setIsUploading(false);
    }
  };

  const handleDeleteClick = (cat) => {
    setSelectedCategory(cat);
    setIsDeleteModalOpen(true);
  };

  const handleSave = async (e) => {
    e.preventDefault();
    if (!formData.name.trim()) {
      toast.error('Category name is required');
      return;
    }
    
    try {
      if (selectedCategory) {
        await categoryAPI.update(selectedCategory._id, formData);
        toast.success('Category updated successfully!');
      } else {
        await categoryAPI.create(formData);
        toast.success('Category created successfully!');
      }
      setIsSlideOverOpen(false);
      queryClient.invalidateQueries(['adminCategories']);
    } catch (error) {
      toast.error(error?.response?.data?.error || 'Operation failed');
    }
  };

  const confirmDelete = async () => {
    try {
      await categoryAPI.delete(selectedCategory._id);
      toast.success('Category deleted successfully');
      setIsDeleteModalOpen(false);
      setIsSlideOverOpen(false);
      queryClient.invalidateQueries(['adminCategories']);
    } catch (error) {
      toast.error(error?.response?.data?.error || 'Failed to delete category');
    }
  };



  return (
    <div className="min-h-[calc(100vh-80px)] bg-background p-4 lg:p-8 -m-6 lg:-m-8 font-sans text-gray-800 lg:rounded-tl-[32px]">
      <div className="max-w-7xl mx-auto">
        {/* Header Section */}
        <div className="flex flex-col md:flex-row md:items-center justify-between gap-2 mb-2">
          <div>
            <h1 className="text-xl lg:text-2xl font-medium text-gray-800">Catalogue Management</h1>
            <p className="text-[12px] text-gray-500">Manage business categories and service types</p>
          </div>

          <div className="flex items-center gap-2">
            <button
              onClick={() => refetch()}
              className="flex items-center gap-2 bg-white hover:bg-gray-50 text-gray-700 px-4 py-2 rounded-[10px] border border-gray-100 transition-all text-[12px] font-medium shadow-sm active:scale-95 disabled:opacity-50"
              disabled={isFetching}
            >
              <RefreshRoundedIcon sx={{ fontSize: 16 }} className={isFetching ? 'animate-spin' : ''} />
              {isFetching ? 'Syncing...' : 'Sync'}
            </button>
            <button
              onClick={handleAdd}
              className="flex items-center gap-2 bg-[#5EB929] hover:bg-[#2d5a3a] text-white px-4 py-2 rounded-[10px] transition-all text-[12px] font-medium shadow-md shadow-[#5EB929]/10 active:scale-95"
            >
              <AddRoundedIcon sx={{ fontSize: 18 }} />
              Add Category
            </button>
          </div>
        </div>

        {/* Filters & Search Section */}
        <div className="flex flex-col lg:flex-row lg:items-center justify-between gap-3 mb-3">
          <div className="flex items-center gap-1.5 bg-white/50 p-1 rounded-[12px] border border-gray-100 overflow-x-auto no-scrollbar">
            <TabButton label="All" isActive={activeTab === 'all'} onClick={() => setActiveTab('all')} />
            <TabButton label="Products" isActive={activeTab === 'product'} onClick={() => setActiveTab('product')} />
            <TabButton label="Services" isActive={activeTab === 'service'} onClick={() => setActiveTab('service')} />
          </div>

          <div className="relative flex-1 max-w-md w-full">
            <SearchRoundedIcon className="absolute left-4 top-1/2 -translate-y-1/2 text-gray-400" sx={{ fontSize: 18 }} />
            <input 
              type="text" 
              placeholder="Search categories..."
              value={searchQuery}
              onChange={(e) => setSearchQuery(e.target.value)}
              className="w-full bg-white border border-gray-100 rounded-[12px] py-2 pl-11 pr-4 text-[13px] text-gray-800 placeholder:text-gray-400 focus:outline-none focus:ring-2 focus:ring-[#5EB929]/10 focus:border-[#5EB929]/30 transition-all shadow-sm"
            />
          </div>
        </div>

        {loading ? (
          <div className="py-20 flex flex-col items-center justify-center gap-4">
            <div className="w-10 h-10 border-2 border-primary/20 border-t-primary rounded-full animate-spin" />
            <p className="text-gray-500 font-medium text-xs">Loading Catalogue...</p>
          </div>
        ) : filteredCategories.length > 0 ? (
          <div className="grid grid-cols-1 gap-2">
            {filteredCategories.map(cat => (
              <div 
                key={cat._id}
                onClick={() => handleEdit(cat)}
                className="bg-white rounded-xl p-2.5 border border-gray-100 shadow-sm active:scale-[0.98] transition-all relative flex items-center justify-between group cursor-pointer"
              >
                <div className="flex items-center gap-3">
                  <CategoryTile category={cat} size={40} iconSize={20} className="rounded-xl" />
                  <div>
                    <h4 className="text-[14px] font-semibold text-gray-800 leading-tight">{cat.name}</h4>
                    <p className="text-[11px] text-gray-500 mt-0.5">
                      {cat.type === 'product' ? 'Product Based' : 'Service Based'} • Rank {cat.order || 0}
                      {cat.showOnHome === false && ' • Hidden on home'}
                    </p>
                  </div>
                </div>
                
                <div className="flex items-center gap-2">
                  <span className={`px-2 py-0.5 rounded-full text-[9px] font-bold uppercase tracking-wider ${
                    cat.status === 'active' ? 'bg-green-50 text-green-600' : 'bg-gray-50 text-gray-400'
                  }`}>
                    {cat.status}
                  </span>
                  <ChevronRightRoundedIcon sx={{ fontSize: 16 }} className="text-gray-300 group-hover:text-primary transition-colors" />
                </div>
              </div>
            ))}
          </div>
        ) : (
          <div className="py-20 text-center bg-white rounded-3xl border border-dashed border-gray-200">
            <CategoryRoundedIcon className="text-gray-200 mb-4" sx={{ fontSize: 64 }} />
            <h3 className="text-lg font-semibold text-gray-400">No Categories Found</h3>
            <p className="text-sm text-gray-400 mt-1">Try adjusting your filters or add a new category</p>
          </div>
        )}
      </div>

      {/* Edit/Add SlideOver */}
      <SlideOver
        isOpen={isSlideOverOpen}
        onClose={() => setIsSlideOverOpen(false)}
        title={selectedCategory ? "Edit Category" : "New Category"}
        subtitle={selectedCategory ? `REF: ${selectedCategory._id.substring(0, 12)}` : "Create a new business segment"}
        widthClass="max-w-md"
      >
        <form onSubmit={handleSave} className="flex flex-col h-full font-sans">
          <div className="flex-1 overflow-y-auto space-y-5 pb-32 pr-1 no-scrollbar">
            
            {/* Live preview of the customer home "Select Services" tile */}
            <div className="flex flex-col items-center justify-center p-6 bg-gray-50 rounded-2xl border border-gray-100 mb-2">
              <div className="flex flex-col items-center gap-1.5 w-[72px]">
                <CategoryTile category={formData} size={64} iconSize={28} />
                <span className="text-xs font-medium text-gray-700 text-center line-clamp-1 w-full capitalize">
                  {formData.name || 'Category'}
                </span>
              </div>
              <p className="mt-3 text-[11px] font-medium text-gray-400 uppercase tracking-widest">Home preview</p>
            </div>

            {/* Home visibility */}
            <label className="flex items-center justify-between gap-3 p-3.5 bg-white border border-gray-200 rounded-xl cursor-pointer">
              <div>
                <p className="text-sm font-semibold text-gray-800">Show in "Select Services"</p>
                <p className="text-[11px] text-gray-500 mt-0.5">Shown on the customer home row, sorted by Order Index.</p>
              </div>
              <input
                type="checkbox"
                checked={formData.showOnHome}
                onChange={(e) => setFormData({ ...formData, showOnHome: e.target.checked })}
                className="w-5 h-5 accent-[#5EB929] flex-shrink-0"
              />
            </label>

            {/* Icon picker */}
            <div>
              <label className="block text-[11px] font-bold text-gray-400 uppercase tracking-widest mb-1.5 ml-1">Icon</label>
              <div className="grid grid-cols-6 gap-2">
                {Object.entries(CATEGORY_ICONS).map(([key, { label, Icon }]) => {
                  const isSelected = formData.icon === key;
                  return (
                    <button
                      key={key}
                      type="button"
                      title={label}
                      onClick={() => setFormData({ ...formData, icon: key })}
                      className={`aspect-square rounded-xl flex items-center justify-center border transition-all ${
                        isSelected ? 'border-2' : 'border-gray-100 bg-white text-gray-500 hover:border-gray-300'
                      }`}
                      style={isSelected ? { borderColor: formData.color, color: formData.color, backgroundColor: `${formData.color}1A` } : undefined}
                    >
                      <Icon sx={{ fontSize: 20 }} />
                    </button>
                  );
                })}
              </div>
            </div>

            {/* Colour picker */}
            <div>
              <label className="block text-[11px] font-bold text-gray-400 uppercase tracking-widest mb-1.5 ml-1">Colour</label>
              <div className="flex flex-wrap items-center gap-2">
                {CATEGORY_COLORS.map((c) => (
                  <button
                    key={c}
                    type="button"
                    onClick={() => setFormData({ ...formData, color: c })}
                    className={`w-8 h-8 rounded-full border-2 transition-all ${
                      formData.color.toUpperCase() === c ? 'border-gray-800 scale-110' : 'border-white shadow'
                    }`}
                    style={{ backgroundColor: c }}
                    aria-label={c}
                  />
                ))}
                <input
                  type="color"
                  value={formData.color}
                  onChange={(e) => setFormData({ ...formData, color: e.target.value.toUpperCase() })}
                  className="w-8 h-8 rounded-full cursor-pointer border-0 p-0 bg-transparent"
                  title="Custom colour"
                />
              </div>
            </div>

            {/* Optional image (overrides the icon) */}
            <div>
              <label className="block text-[11px] font-bold text-gray-400 uppercase tracking-widest mb-1.5 ml-1">Custom Image (optional)</label>
              <div className="flex items-center gap-3">
                <label className={`flex items-center gap-2 px-4 py-2.5 rounded-xl border border-dashed border-gray-300 text-xs font-semibold text-gray-600 cursor-pointer hover:border-primary hover:text-primary transition-all ${isUploading ? 'opacity-50 pointer-events-none' : ''}`}>
                  <AddPhotoAlternateRoundedIcon sx={{ fontSize: 18 }} />
                  {isUploading ? 'Uploading...' : formData.image ? 'Replace image' : 'Upload image'}
                  <input type="file" accept="image/*" onChange={handleImageUpload} className="hidden" />
                </label>
                {formData.image && (
                  <button
                    type="button"
                    onClick={() => setFormData({ ...formData, image: '' })}
                    className="text-xs font-semibold text-red-500 hover:underline"
                  >
                    Remove (use icon)
                  </button>
                )}
              </div>
              <p className="text-[11px] text-gray-400 mt-1.5 ml-1">Square image works best. Replaces the icon on the home tile.</p>
            </div>

            {/* Basic Info */}
            <div className="space-y-4">
              <div>
                <label className="block text-[11px] font-bold text-gray-400 uppercase tracking-widest mb-1.5 ml-1">Category Name</label>
                <input 
                  type="text"
                  value={formData.name}
                  onChange={(e) => setFormData({...formData, name: e.target.value})}
                  placeholder="e.g. Food & Drinks"
                  className="w-full bg-white border border-gray-200 rounded-xl py-3 px-4 text-sm font-medium focus:ring-2 focus:ring-primary/10 focus:border-primary outline-none transition-all"
                />
              </div>

              <div>
                <label className="block text-[11px] font-bold text-gray-400 uppercase tracking-widest mb-1.5 ml-1">Type</label>
                <div className="grid grid-cols-2 gap-2">
                  <button
                    type="button"
                    onClick={() => setFormData({...formData, type: 'product'})}
                    className={`py-2.5 px-4 rounded-xl text-xs font-bold transition-all border ${
                      formData.type === 'product' ? 'bg-[#5EB929] text-white border-[#5EB929]' : 'bg-white text-gray-500 border-gray-100 hover:border-gray-200'
                    }`}
                  >
                    Product Based
                  </button>
                  <button
                    type="button"
                    onClick={() => setFormData({...formData, type: 'service'})}
                    className={`py-2.5 px-4 rounded-xl text-xs font-bold transition-all border ${
                      formData.type === 'service' ? 'bg-indigo-600 text-white border-indigo-600' : 'bg-white text-gray-500 border-gray-100 hover:border-gray-200'
                    }`}
                  >
                    Service Based
                  </button>
                </div>
              </div>

              <div className="grid grid-cols-2 gap-4">
                <div>
                  <label className="block text-[11px] font-bold text-gray-400 uppercase tracking-widest mb-1.5 ml-1">Order Index</label>
                  <input 
                    type="number"
                    value={formData.order}
                    onChange={(e) => setFormData({...formData, order: parseInt(e.target.value) || 0})}
                    className="w-full bg-white border border-gray-200 rounded-xl py-3 px-4 text-sm font-medium focus:ring-2 focus:ring-primary/10 focus:border-primary outline-none transition-all"
                  />
                </div>
                <div>
                  <label className="block text-[11px] font-bold text-gray-400 uppercase tracking-widest mb-1.5 ml-1">Status</label>
                  <select 
                    value={formData.status}
                    onChange={(e) => setFormData({...formData, status: e.target.value})}
                    className="w-full bg-white border border-gray-200 rounded-xl py-3 px-4 text-sm font-medium focus:ring-2 focus:ring-primary/10 focus:border-primary outline-none transition-all appearance-none"
                  >
                    <option value="active">Active</option>
                    <option value="inactive">Inactive</option>
                  </select>
                </div>
              </div>

              <div>
                <label className="block text-[11px] font-bold text-gray-400 uppercase tracking-widest mb-1.5 ml-1">Description</label>
                <textarea 
                  rows="3"
                  value={formData.description}
                  onChange={(e) => setFormData({...formData, description: e.target.value})}
                  placeholder="Optional description..."
                  className="w-full bg-white border border-gray-200 rounded-xl py-3 px-4 text-sm font-medium focus:ring-2 focus:ring-primary/10 focus:border-primary outline-none transition-all resize-none"
                />
              </div>
            </div>

            {selectedCategory && (
              <button 
                type="button"
                onClick={() => handleDeleteClick(selectedCategory)}
                className="w-full mt-4 flex items-center justify-center gap-2 py-3 border border-red-100 text-red-500 rounded-xl text-xs font-bold hover:bg-red-50 transition-all"
              >
                <DeleteRoundedIcon sx={{ fontSize: 18 }} />
                Delete Category
              </button>
            )}
          </div>

          {/* Sticky Footer */}
          <div className="absolute bottom-0 left-0 right-0 p-4 bg-white border-t border-gray-100 flex gap-3 z-20">
            <button 
              type="submit"
              className="flex-1 bg-[#5EB929] text-white py-3.5 rounded-xl font-semibold text-[14px] shadow-lg shadow-[#5EB929]/10 hover:bg-[#2d5a3a] transition-all"
            >
              {selectedCategory ? 'Save Changes' : 'Create Category'}
            </button>
          </div>
        </form>
      </SlideOver>

      {/* Delete Confirmation Modal */}
      {isDeleteModalOpen && createPortal(
        <div className="fixed inset-0 bg-black/50 z-[9999] flex items-center justify-center p-4 backdrop-blur-sm" onClick={() => setIsDeleteModalOpen(false)}>
          <div className="bg-white rounded-2xl shadow-xl max-w-sm w-full p-6 text-center" onClick={(e) => e.stopPropagation()}>
            <div className="w-14 h-14 bg-red-50 rounded-2xl flex items-center justify-center mx-auto mb-4">
              <DeleteRoundedIcon className="text-red-500" sx={{ fontSize: 28 }} />
            </div>
            <h3 className="text-xl font-bold text-gray-900 mb-2">Delete "{selectedCategory?.name}"?</h3>
            <p className="text-sm text-gray-500 font-medium mb-6">This action cannot be undone. All merchants linked to this category will remain, but the category itself will be removed.</p>
            <div className="flex gap-3">
              <button onClick={() => setIsDeleteModalOpen(false)} className="flex-1 bg-gray-100 text-gray-600 py-3 rounded-xl font-bold text-sm">Cancel</button>
              <button onClick={confirmDelete} className="flex-1 bg-red-500 text-white py-3 rounded-xl font-bold text-sm">Delete</button>
            </div>
          </div>
        </div>,
        document.body
      )}
    </div>
  );
};

export default CategoryManagement;
