import { useState, useMemo } from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import { useQuery, useQueryClient } from '@tanstack/react-query';
import { adminAPI } from '../../../api/admin.api';
import SlideOver from '../components/SlideOver';
import ConfirmDeleteModal from '../components/ConfirmDeleteModal';
import CampaignRoundedIcon from '@mui/icons-material/CampaignRounded';
import CheckCircleRoundedIcon from '@mui/icons-material/CheckCircleRounded';
import CancelRoundedIcon from '@mui/icons-material/CancelRounded';
import VisibilityRoundedIcon from '@mui/icons-material/VisibilityRounded';
import AccessTimeRoundedIcon from '@mui/icons-material/AccessTimeRounded';
import RefreshRoundedIcon from '@mui/icons-material/RefreshRounded';
import SearchRoundedIcon from '@mui/icons-material/SearchRounded';
import ChevronRightRoundedIcon from '@mui/icons-material/ChevronRightRounded';
import DeleteRoundedIcon from '@mui/icons-material/DeleteRounded';
import toast from 'react-hot-toast';

const TabButton = ({ label, isActive, onClick, count }) => (
  <button
    onClick={onClick}
    className={`px-5 py-2 text-[12px] font-medium transition-all duration-300 rounded-[10px] flex items-center gap-2 ${
      isActive 
        ? 'bg-[#5EB929] text-white shadow-md' 
        : 'text-gray-500 hover:text-gray-700 hover:bg-white/80'
    }`}
  >
    {label}
    {count !== undefined && (
      <span className={`px-1.5 py-0.5 rounded-full text-[10px] ${isActive ? 'bg-white/20 text-white' : 'bg-gray-100 text-gray-400'}`}>
        {count}
      </span>
    )}
  </button>
);

const PromotionRequest = () => {
  const queryClient = useQueryClient();
  const [activeTab, setActiveTab] = useState('pending'); // 'all', 'pending', 'approved', 'rejected'
  const [searchQuery, setSearchQuery] = useState('');
  const [isSlideOverOpen, setIsSlideOverOpen] = useState(false);
  const [isDeleteModalOpen, setIsDeleteModalOpen] = useState(false);
  const [selectedAd, setSelectedAd] = useState(null);

  const { data: ads = [], isLoading: loading, refetch, isFetching } = useQuery({
    queryKey: ['adminAds'],
    queryFn: async () => {
      const res = await adminAPI.getAdRequests();
      return (res.data?.ads || res.ads || [])
        .sort((a, b) => new Date(b.createdAt || 0) - new Date(a.createdAt || 0));
    }
  });

  const filteredAds = ads.filter(ad => {
    const matchesTab = activeTab === 'all' || ad.status === activeTab;
    const matchesSearch = ad.storeName.toLowerCase().includes(searchQuery.toLowerCase()) || 
                          ad.type.toLowerCase().includes(searchQuery.toLowerCase());
    return matchesTab && matchesSearch;
  });

  const handleUpdateStatus = async (adId, status) => {
    try {
      await adminAPI.updateAdStatus(adId, status);
      toast.success(`Campaign ${status}`);
      queryClient.invalidateQueries(['adminAds']);
      if (selectedAd && selectedAd.id === adId) {
        setIsSlideOverOpen(false);
      }
    } catch (err) {
      toast.error('Failed to update campaign status');
    }
  };

  const handleView = (ad) => {
    setSelectedAd(ad);
    setIsSlideOverOpen(true);
  };

  const handleDeleteClick = (e, ad) => {
    e.stopPropagation();
    setSelectedAd(ad);
    setIsDeleteModalOpen(true);
  };

  const confirmDelete = async () => {
    try {
      await adminAPI.deleteAd(selectedAd._id || selectedAd.id);
      toast.success('Campaign deleted');
      setIsDeleteModalOpen(false);
      setIsSlideOverOpen(false);
      queryClient.invalidateQueries(['adminAds']);
    } catch (err) {
      toast.error('Failed to delete ad request');
    }
  };



  return (
    <div className="min-h-[calc(100vh-80px)] bg-background p-4 lg:p-8 -m-6 lg:-m-8 font-sans text-gray-800 lg:rounded-tl-[32px]">
      <div className="max-w-7xl mx-auto">
        {/* Header Section */}
        <div className="flex flex-col md:flex-row md:items-center justify-between gap-2 mb-2">
          <div>
            <h1 className="text-xl lg:text-2xl font-medium text-gray-800">Promotion Queue</h1>
            <p className="text-[12px] text-gray-500">Review and approve merchant advertisement campaigns</p>
          </div>

          <div className="flex items-center gap-2">
            <button
              onClick={() => refetch()}
              className="flex items-center gap-2 bg-white hover:bg-gray-50 text-gray-700 px-4 py-2 rounded-[10px] border border-gray-100 transition-all text-[12px] font-medium shadow-sm active:scale-95 disabled:opacity-50"
              disabled={isFetching}
            >
              <RefreshRoundedIcon sx={{ fontSize: 16 }} className={isFetching ? 'animate-spin' : ''} />
              {isFetching ? 'Syncing...' : 'Sync Data'}
            </button>
          </div>
        </div>

        {/* Filters & Search Section */}
        <div className="flex flex-col lg:flex-row lg:items-center justify-between gap-3 mb-3">
          <div className="flex items-center gap-1.5 bg-white/50 p-1 rounded-[12px] border border-gray-100 overflow-x-auto no-scrollbar">
            <TabButton label="All" isActive={activeTab === 'all'} onClick={() => setActiveTab('all')} />
            <TabButton label="Pending" isActive={activeTab === 'pending'} onClick={() => setActiveTab('pending')} count={ads.filter(a => a.status === 'pending').length} />
            <TabButton label="Approved" isActive={activeTab === 'approved'} onClick={() => setActiveTab('approved')} />
            <TabButton label="Rejected" isActive={activeTab === 'rejected'} onClick={() => setActiveTab('rejected')} />
          </div>

          <div className="relative flex-1 max-w-md w-full">
            <SearchRoundedIcon className="absolute left-4 top-1/2 -translate-y-1/2 text-gray-400" sx={{ fontSize: 18 }} />
            <input 
              type="text" 
              placeholder="Search by store or type..."
              value={searchQuery}
              onChange={(e) => setSearchQuery(e.target.value)}
              className="w-full bg-white border border-gray-100 rounded-[12px] py-2 pl-11 pr-4 text-[13px] text-gray-800 placeholder:text-gray-400 focus:outline-none focus:ring-2 focus:ring-[#5EB929]/10 focus:border-[#5EB929]/30 transition-all shadow-sm"
            />
          </div>
        </div>

        {loading ? (
          <div className="py-20 flex flex-col items-center justify-center gap-4">
            <div className="w-10 h-10 border-2 border-primary/20 border-t-primary rounded-full animate-spin" />
            <p className="text-gray-500 font-medium text-xs">Loading Queue...</p>
          </div>
        ) : filteredAds.length > 0 ? (
          <div className="grid grid-cols-1 gap-2">
            {filteredAds.map(ad => (
              <div 
                key={ad._id || ad.id}
                onClick={() => handleView(ad)}
                className="bg-white rounded-xl p-2.5 border border-gray-100 shadow-sm active:scale-[0.98] transition-all relative flex items-center justify-between group cursor-pointer"
              >
                <div className="flex items-center gap-3">
                  <div className="w-10 h-10 rounded-full bg-indigo-50 border border-indigo-100 flex items-center justify-center text-indigo-600 overflow-hidden">
                    {ad.image ? (
                      <img src={ad.image} alt="" className="w-full h-full object-cover" />
                    ) : (
                      <CampaignRoundedIcon sx={{ fontSize: 20 }} />
                    )}
                  </div>
                  <div>
                    <h4 className="text-[14px] font-semibold text-gray-800 leading-tight">{ad.storeName}</h4>
                    <p className="text-[11px] text-gray-500 mt-0.5">
                      <span className="font-bold text-indigo-500 uppercase tracking-tight mr-2">{ad.type}</span>
                      • {new Date(ad.createdAt).toLocaleDateString()}
                    </p>
                  </div>
                </div>
                
                <div className="flex items-center gap-2">
                  <span className={`px-2 py-0.5 rounded-full text-[9px] font-bold uppercase tracking-wider ${
                    ad.status === 'approved' ? 'bg-green-50 text-green-600' : 
                    ad.status === 'pending' ? 'bg-amber-50 text-amber-600' : 
                    'bg-red-50 text-red-600'
                  }`}>
                    {ad.status}
                  </span>
                  <ChevronRightRoundedIcon sx={{ fontSize: 16 }} className="text-gray-300 group-hover:text-primary transition-colors" />
                </div>
              </div>
            ))}
          </div>
        ) : (
          <div className="py-20 text-center bg-white rounded-3xl border border-dashed border-gray-200">
            <CampaignRoundedIcon className="text-gray-200 mb-4" sx={{ fontSize: 64 }} />
            <h3 className="text-lg font-semibold text-gray-400">Queue is Clear</h3>
            <p className="text-sm text-gray-400 mt-1">No advertisement requests found</p>
          </div>
        )}
      </div>

      {/* Details SlideOver */}
      <SlideOver
        isOpen={isSlideOverOpen}
        onClose={() => setIsSlideOverOpen(false)}
        title="Campaign Analysis"
        subtitle={selectedAd ? `REF: ${selectedAd.id.substring(0, 12)}` : "Review promotion details"}
        widthClass="max-w-md"
      >
        <div className="flex flex-col h-full font-sans">
          <div className="flex-1 overflow-y-auto space-y-6 pb-32 pr-1 no-scrollbar">
            
            {/* Ad Preview */}
            <div className="space-y-2">
              <label className="block text-[11px] font-bold text-gray-400 uppercase tracking-widest ml-1">Campaign Creative</label>
              <div className="aspect-[16/9] w-full bg-gray-100 rounded-2xl overflow-hidden border border-gray-100 shadow-inner group relative">
                {selectedAd?.image ? (
                  <img src={selectedAd.image} alt="Creative" className="w-full h-full object-cover" />
                ) : (
                  <div className="w-full h-full flex flex-col items-center justify-center text-gray-300 italic text-xs gap-2">
                    <CampaignRoundedIcon sx={{ fontSize: 40 }} />
                    No Preview Available
                  </div>
                )}
              </div>
            </div>

            {/* Merchant Info */}
            <div className="bg-gray-50 rounded-2xl p-4 border border-gray-100 space-y-4">
               <div className="flex justify-between items-center pb-3 border-b border-gray-200/50">
                  <span className="text-[11px] font-bold text-gray-400 uppercase tracking-widest">Merchant</span>
                  <span className="text-sm font-bold text-gray-800">{selectedAd?.storeName}</span>
               </div>
               <div className="flex justify-between items-center pb-3 border-b border-gray-200/50">
                  <span className="text-[11px] font-bold text-gray-400 uppercase tracking-widest">Campaign Type</span>
                  <span className="text-xs font-bold text-indigo-600 bg-indigo-50 px-2 py-0.5 rounded uppercase">{selectedAd?.type}</span>
               </div>
               <div className="flex justify-between items-center">
                  <span className="text-[11px] font-bold text-gray-400 uppercase tracking-widest">Request Date</span>
                  <span className="text-sm font-bold text-gray-700">{selectedAd?.createdAt ? new Date(selectedAd.createdAt).toLocaleString() : 'N/A'}</span>
               </div>
            </div>

            {/* Target Settings */}
            <div className="space-y-4">
              <div className="flex items-center gap-3 p-4 bg-white border border-gray-100 rounded-2xl">
                 <div className="w-10 h-10 rounded-xl bg-amber-50 text-amber-600 flex items-center justify-center">
                    <AccessTimeRoundedIcon sx={{ fontSize: 20 }} />
                 </div>
                 <div>
                    <p className="text-[10px] font-bold text-gray-400 uppercase tracking-widest">Campaign Expiry</p>
                    <p className="text-[13px] font-bold text-gray-800">{selectedAd?.expiryAt ? new Date(selectedAd.expiryAt).toLocaleDateString() : 'Continuous'}</p>
                 </div>
              </div>
            </div>

            {selectedAd && (
              <button 
                type="button"
                onClick={(e) => handleDeleteClick(e, selectedAd)}
                className="w-full mt-4 flex items-center justify-center gap-2 py-3 border border-red-100 text-red-500 rounded-xl text-xs font-bold hover:bg-red-50 transition-all"
              >
                <DeleteRoundedIcon sx={{ fontSize: 18 }} />
                Discard Request
              </button>
            )}
          </div>

          {/* Sticky Actions Footer */}
          {selectedAd?.status === 'pending' && (
            <div className="absolute bottom-0 left-0 right-0 p-4 bg-white border-t border-gray-100 flex gap-3 z-20">
              <button 
                onClick={() => handleUpdateStatus(selectedAd.id, 'rejected')}
                className="flex-1 bg-gray-100 text-gray-600 py-3.5 rounded-xl font-bold text-[14px] hover:bg-gray-200 transition-all"
              >
                Reject
              </button>
              <button 
                onClick={() => handleUpdateStatus(selectedAd.id, 'approved')}
                className="flex-1 bg-[#5EB929] text-white py-3.5 rounded-xl font-semibold text-[14px] shadow-lg shadow-[#5EB929]/10 hover:bg-[#2d5a3a] transition-all"
              >
                Approve Campaign
              </button>
            </div>
          )}
        </div>
      </SlideOver>

      {/* Delete Confirmation Modal */}
      <ConfirmDeleteModal 
        isOpen={isDeleteModalOpen}
        onClose={() => setIsDeleteModalOpen(false)}
        onConfirm={confirmDelete}
        title="Discard Request?"
        message="This will remove the advertisement request from the queue permanently. The merchant will not be automatically notified."
      />
    </div>
  );
};

export default PromotionRequest;
