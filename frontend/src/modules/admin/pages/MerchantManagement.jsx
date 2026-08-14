import { useState, useMemo, useEffect } from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import { useQuery, useQueryClient } from '@tanstack/react-query';
import SlideOver from '../components/SlideOver';
import RejectionReasonModal from '../components/RejectionReasonModal';
import AdminEntityCard from '../components/AdminEntityCard';
import { adminAPI } from '../../../api/admin.api';
import StorefrontRoundedIcon from '@mui/icons-material/StorefrontRounded';
import VerifiedRoundedIcon from '@mui/icons-material/VerifiedRounded';
import CheckCircleRoundedIcon from '@mui/icons-material/CheckCircleRounded';
import CancelRoundedIcon from '@mui/icons-material/CancelRounded';
import RefreshRoundedIcon from '@mui/icons-material/RefreshRounded';
import SearchRoundedIcon from '@mui/icons-material/SearchRounded';
import VisibilityRoundedIcon from '@mui/icons-material/VisibilityRounded';
import GroupRoundedIcon from '@mui/icons-material/GroupRounded';
import InsertDriveFileRoundedIcon from '@mui/icons-material/InsertDriveFileRounded';
import ArrowForwardRoundedIcon from '@mui/icons-material/ArrowForwardRounded';
import HourglassEmptyRoundedIcon from '@mui/icons-material/HourglassEmptyRounded';
import EmailRoundedIcon from '@mui/icons-material/EmailRounded';
import PhoneRoundedIcon from '@mui/icons-material/PhoneRounded';
import LocationOnRoundedIcon from '@mui/icons-material/LocationOnRounded';
import CategoryRoundedIcon from '@mui/icons-material/CategoryRounded';
import InfoRoundedIcon from '@mui/icons-material/InfoRounded';
import HistoryRoundedIcon from '@mui/icons-material/HistoryRounded';
import ChevronLeftRoundedIcon from '@mui/icons-material/ChevronLeftRounded';
import ChevronRightRoundedIcon from '@mui/icons-material/ChevronRightRounded';
import MoreVertRoundedIcon from '@mui/icons-material/MoreVertRounded';
import CloseRoundedIcon from '@mui/icons-material/CloseRounded';
import toast from 'react-hot-toast';

/**
 * Custom hook for debounced value
 */
function useDebounce(value, delay) {
  const [debouncedValue, setDebouncedValue] = useState(value);
  useEffect(() => {
    const handler = setTimeout(() => setDebouncedValue(value), delay);
    return () => clearTimeout(handler);
  }, [value, delay]);
  return debouncedValue;
}

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

const MerchantManagement = () => {
  const queryClient = useQueryClient();
  const [activeTab, setActiveTab] = useState('all'); // 'all', 'pending', 'approved', 'rejected'
  const [searchQuery, setSearchQuery] = useState('');
  const debouncedSearch = useDebounce(searchQuery, 400);
  const [page, setPage] = useState(1);
  const limit = 10;

  const [viewingMerchant, setViewingMerchant] = useState(null);
  const [isSlideOverOpen, setIsSlideOverOpen] = useState(false);
  const [isRejectModalOpen, setIsRejectModalOpen] = useState(false);
  const [merchantToReject, setMerchantToReject] = useState(null);

  // 1. Fetch merchants with React Query
  const { data, isLoading: loading, isFetching, refetch } = useQuery({
    queryKey: ['adminMerchants', activeTab, debouncedSearch, page],
    queryFn: async () => {
      const params = {
        page,
        limit,
        status: activeTab === 'all' ? undefined : activeTab,
        q: debouncedSearch || undefined
      };
      const res = await adminAPI.getAllMerchants(params);
      return res.data || res;
    },
    keepPreviousData: true,
    staleTime: 1000 * 60 * 5,
  });

  const merchants = data?.merchants || [];
  const pagination = data?.pagination || { total: 0, pages: 1 };

  const handleEntityView = (merchant) => {
    setViewingMerchant(merchant);
    setIsSlideOverOpen(true);
  };

  const handleApprove = async (id) => {
    try {
      await adminAPI.updateMerchantStatus(id, 'approved');
      toast.success('Merchant approved!');
      setIsSlideOverOpen(false);
      queryClient.invalidateQueries(['adminMerchants']);
    } catch (error) {
      toast.error('Approval failed');
    }
  };

  const handleReject = (id) => {
    setMerchantToReject(id);
    setIsRejectModalOpen(true);
  };

  const confirmReject = async (reason) => {
    try {
      await adminAPI.updateMerchantStatus(merchantToReject, 'rejected', reason);
      toast.error('Merchant rejected');
      setIsRejectModalOpen(false);
      setIsSlideOverOpen(false);
      queryClient.invalidateQueries(['adminMerchants']);
    } catch (error) {
      toast.error('Rejection failed');
    }
  };

  const handleStatusToggle = async (merchant) => {
    const currentStatus = merchant.status;
    const newStatus = currentStatus === 'approved' ? 'rejected' : 'approved';
    const action = newStatus === 'approved' ? 'Activated' : 'Restricted';
    
    try {
      await adminAPI.updateMerchantStatus(merchant.id || merchant._id, newStatus);
      toast.success(`Merchant ${action} successfully`);
      queryClient.invalidateQueries(['adminMerchants']);
    } catch (error) {
      toast.error(`Failed to update merchant status`);
    }
  };



  return (
    <div className="min-h-[calc(100vh-80px)] bg-background p-4 lg:p-8 -m-6 lg:-m-8 font-sans text-gray-800 lg:rounded-tl-[32px]">
      <div className="max-w-7xl mx-auto">
        {/* Header Section */}
        <div className="flex flex-col md:flex-row md:items-center justify-between gap-2 mb-1.5">
          <div>
            <h1 className="text-xl lg:text-2xl font-medium text-gray-800 tracking-tight">Merchant Oversight</h1>
            <p className="text-[12px] text-gray-500 tracking-tight">Global Management of Business Partners</p>
          </div>

          <button
            onClick={() => refetch()}
            className="flex items-center gap-2 bg-white hover:bg-gray-50 text-gray-700 px-3.5 py-2 rounded-[10px] border border-gray-100 transition-all text-[11px] font-medium shadow-sm active:scale-95 disabled:opacity-50 w-fit"
            disabled={isFetching}
          >
            <RefreshRoundedIcon sx={{ fontSize: 14 }} className={isFetching ? 'animate-spin' : ''} />
            {isFetching ? 'Syncing...' : 'Sync Data'}
          </button>
        </div>

        {/* Filters & Search Section */}
        <div className="flex flex-col lg:flex-row lg:items-center justify-between gap-2.5 mb-2.5">
          <div className="flex items-center gap-1 bg-white/50 p-0.5 rounded-[12px] border border-gray-100 overflow-x-auto no-scrollbar">
            <TabButton label="All" isActive={activeTab === 'all'} onClick={() => { setActiveTab('all'); setPage(1); }} />
            <TabButton label="Pending" isActive={activeTab === 'pending'} onClick={() => { setActiveTab('pending'); setPage(1); }} />
            <TabButton label="Active" isActive={activeTab === 'approved'} onClick={() => { setActiveTab('approved'); setPage(1); }} />
            <TabButton label="Blocked" isActive={activeTab === 'rejected'} onClick={() => { setActiveTab('rejected'); setPage(1); }} />
          </div>

          <div className="relative flex-1 max-w-md w-full">
            <SearchRoundedIcon className="absolute left-4 top-1/2 -translate-y-1/2 text-gray-400" sx={{ fontSize: 18 }} />
            <input 
              type="text" 
              placeholder="Search merchants..."
              value={searchQuery}
              onChange={(e) => { setSearchQuery(e.target.value); setPage(1); }}
              className="w-full bg-white border border-gray-100 rounded-[12px] py-1.5 pl-11 pr-4 text-[12px] text-gray-800 placeholder:text-gray-400 focus:outline-none focus:ring-2 focus:ring-[#5EB929]/10 focus:border-[#5EB929]/30 transition-all shadow-sm"
            />
          </div>
        </div>

        {/* Mobile-only Section Title */}
        <div className="lg:hidden mb-4">
          <h2 className="text-[15px] font-semibold text-gray-800">
            {activeTab === 'pending' ? 'Pending Merchant Requests' : 
             activeTab === 'approved' ? 'Active Merchants' : 
             activeTab === 'rejected' ? 'Blocked Merchants' : 'All Merchants'} 
            <span className="text-gray-400 ml-1">({pagination.total})</span>
          </h2>
        </div>

        {loading ? (
          <div className="py-20 flex flex-col items-center justify-center gap-4">
            <div className="w-10 h-10 border-2 border-primary/20 border-t-primary rounded-full animate-spin" />
            <p className="text-gray-500 font-bold uppercase tracking-tight text-xs">Syncing Cloud Database...</p>
          </div>
        ) : merchants.length > 0 ? (
          <div className="space-y-4">
            <div className="grid grid-cols-1 gap-4">
              {merchants.map(merchant => (
                <AdminEntityCard
                  key={merchant._id || merchant.id}
                  entity={merchant}
                  type="merchant"
                  onView={handleEntityView}
                  onStatusToggle={handleStatusToggle}
                />
              ))}
            </div>
            
            {/* Pagination Controls */}
            {pagination.pages > 1 && (
              <div className="flex flex-col sm:flex-row items-center justify-between gap-4 bg-white/50 p-4 rounded-[16px] border border-gray-100 shadow-sm mt-8">
                <p className="text-[11px] font-medium text-gray-500 uppercase tracking-widest">
                  Showing {(page - 1) * limit + 1} - {Math.min(page * limit, pagination.total)} of {pagination.total} Merchants
                </p>
                <div className="flex items-center gap-2">
                  <button
                    onClick={() => setPage(p => Math.max(1, p - 1))}
                    disabled={page === 1}
                    className="w-9 h-9 flex items-center justify-center rounded-[10px] border border-gray-100 bg-white text-gray-500 hover:bg-gray-50 disabled:opacity-30 transition-all shadow-sm"
                  >
                    <ChevronLeftRoundedIcon sx={{ fontSize: 18 }} />
                  </button>
                  <div className="flex items-center gap-1">
                    {[...Array(pagination.pages)].map((_, i) => {
                      const p = i + 1;
                      if (p === 1 || p === pagination.pages || Math.abs(p - page) <= 1) {
                         return (
                           <button
                             key={p}
                             onClick={() => setPage(p)}
                             className={`w-9 h-9 flex items-center justify-center rounded-[10px] text-[12px] font-medium transition-all ${
                               page === p ? 'bg-[#5EB929] text-white shadow-sm' : 'text-gray-400 hover:bg-gray-50'
                             }`}
                           >
                             {p}
                           </button>
                         );
                      }
                      if (p === 2 || p === pagination.pages - 1) return <span key={p} className="text-gray-300">...</span>;
                      return null;
                    })}
                  </div>
                  <button
                    onClick={() => setPage(p => Math.min(pagination.pages, p + 1))}
                    disabled={page === pagination.pages}
                    className="w-9 h-9 flex items-center justify-center rounded-[10px] border border-gray-100 bg-white text-gray-500 hover:bg-gray-50 disabled:opacity-30 transition-all shadow-sm"
                  >
                    <ChevronRightRoundedIcon sx={{ fontSize: 18 }} />
                  </button>
                </div>
              </div>
            )}
          </div>
        ) : (
          <div className="py-20 text-center border-2 border-dashed border-gray-200 rounded-md bg-white/50">
            <StorefrontRoundedIcon className="text-gray-300 mb-4" sx={{ fontSize: 64 }} />
            <h3 className="text-xl font-bold text-gray-400">No Merchants Found</h3>
            <p className="text-gray-400 mt-1">Try adjusting your filters or search query</p>
          </div>
        )}
      </div>

      <SlideOver
        isOpen={isSlideOverOpen}
        onClose={() => setIsSlideOverOpen(false)}
        title="Review Merchant"
        subtitle={viewingMerchant?._id ? `REF: ${viewingMerchant._id}` : null}
        widthClass="max-w-3xl"
      >
        {viewingMerchant && (
          <div className="flex flex-col h-full font-sans">
            <div className="flex-1 overflow-y-auto space-y-6 pb-32 pr-1 no-scrollbar">
              
              {/* Profile Header Section */}
              <div className="flex items-center gap-4 px-1 pt-1">
                <div className="w-16 h-16 sm:w-20 sm:h-20 rounded-full bg-gray-100 flex items-center justify-center border border-gray-200 overflow-hidden shadow-sm flex-shrink-0">
                  {viewingMerchant.logo ? (
                    <img src={viewingMerchant.logo} alt="" className="w-full h-full object-cover" />
                  ) : (
                    <StorefrontRoundedIcon sx={{ fontSize: 32 }} className="text-gray-300" />
                  )}
                </div>
                <div className="flex-1 min-w-0">
                  <h3 className="text-lg sm:text-xl font-semibold text-gray-800 leading-tight truncate">{viewingMerchant.storeName}</h3>
                  <p className="text-[12px] sm:text-[13px] text-gray-500 mt-0.5">{viewingMerchant.category || 'Business'} • {viewingMerchant.city || 'Location'}</p>
                  <p className="text-[12px] sm:text-[13px] text-gray-500 mt-0.5">{viewingMerchant.phone}</p>
                  <p className="text-[11px] text-gray-400 mt-0.5 italic">Registered {new Date(viewingMerchant.createdAt).toLocaleDateString('en-GB', { day: 'numeric', month: 'short', year: 'numeric' })}</p>
                </div>
                <button className="p-2 text-gray-400 hover:text-gray-600 flex-shrink-0">
                  <MoreVertRoundedIcon />
                </button>
              </div>

              {/* Business Information Section */}
              <div className="bg-white rounded-2xl border border-gray-100 shadow-sm overflow-hidden">
                <div className="px-5 py-4 bg-gray-50/50 border-b border-gray-100">
                  <h4 className="text-[14px] font-semibold text-gray-800">Business Information</h4>
                </div>
                <div className="divide-y divide-gray-100 px-5">
                  <div className="py-4 flex justify-between items-start gap-4">
                    <span className="text-[13px] text-gray-500 min-w-[140px]">Business Category</span>
                    <span className="text-[13px] font-medium text-gray-800 text-right">{viewingMerchant.category || 'N/A'}</span>
                  </div>
                  <div className="py-4 flex justify-between items-start gap-4">
                    <span className="text-[13px] text-gray-500 min-w-[140px]">Owner Name</span>
                    <span className="text-[13px] font-medium text-gray-800 text-right">{viewingMerchant.ownerName || 'N/A'}</span>
                  </div>
                  <div className="py-4 flex justify-between items-start gap-4">
                    <span className="text-[13px] text-gray-500 min-w-[140px]">Support Phone</span>
                    <span className="text-[13px] font-medium text-gray-800 text-right">{viewingMerchant.businessPhone || viewingMerchant.phone}</span>
                  </div>
                  <div className="py-4 flex justify-between items-start gap-4">
                    <span className="text-[13px] text-gray-500 min-w-[140px]">Business Email</span>
                    <span className="text-[13px] font-medium text-gray-800 text-right break-all">{viewingMerchant.businessEmail || viewingMerchant.email}</span>
                  </div>
                  <div className="py-4 flex justify-between items-start gap-4">
                    <span className="text-[13px] text-gray-500 min-w-[140px]">GST Number</span>
                    <span className="text-[13px] font-bold text-[#5EB929] text-right uppercase">{viewingMerchant.gstNumber || 'NOT PROVIDED'}</span>
                  </div>
                  <div className="py-4 flex flex-col gap-2">
                    <span className="text-[13px] text-gray-500">Store Description</span>
                    <span className="text-[13px] font-medium text-gray-800 leading-relaxed italic">
                      "{viewingMerchant.description || 'No description provided'}"
                    </span>
                  </div>
                  <div className="py-4 flex justify-between items-start gap-4">
                    <span className="text-[13px] text-gray-500 min-w-[120px]">Address</span>
                    <span className="text-[13px] font-medium text-gray-800 text-right break-words leading-normal max-w-[200px] sm:max-w-none">
                      {viewingMerchant.address}, {viewingMerchant.city}, {viewingMerchant.state} - {viewingMerchant.pincode}
                    </span>
                  </div>
                </div>
              </div>

              {/* Business Hours Section */}
              <div className="bg-white rounded-2xl border border-gray-100 shadow-sm overflow-hidden">
                <div className="px-5 py-4 bg-gray-50/50 border-b border-gray-100 flex justify-between items-center">
                  <h4 className="text-[14px] font-semibold text-gray-800">Operational Hours</h4>
                  <div className="w-2 h-2 bg-[#5EB929] rounded-full animate-pulse" />
                </div>
                <div className="p-5 grid grid-cols-1 sm:grid-cols-2 gap-3">
                  {viewingMerchant.businessHours && Object.entries(viewingMerchant.businessHours).map(([day, hours]) => (
                    <div key={day} className="flex justify-between items-center bg-gray-50 p-3 rounded-xl border border-gray-100">
                      <span className="text-[10px] font-bold uppercase text-gray-400 tracking-widest">{day}</span>
                      <span className={`text-[11px] font-bold ${hours.isClosed ? 'text-red-400' : 'text-gray-700'}`}>
                        {hours.isClosed ? 'CLOSED' : `${hours.open} - ${hours.close}`}
                      </span>
                    </div>
                  ))}
                </div>
              </div>

              <div className="bg-white rounded-2xl border border-gray-100 shadow-sm overflow-hidden">
                <div className="px-5 py-4 bg-gray-50/50 border-b border-gray-100">
                  <h4 className="text-[14px] font-semibold text-gray-800">Verification Artifacts</h4>
                </div>
                <div className="p-5">
                  <div className="grid grid-cols-2 sm:grid-cols-3 gap-4">
                    {/* Documents Gallery */}
                    {viewingMerchant.documents && viewingMerchant.documents.map((doc, idx) => (
                      <div key={idx} className="flex flex-col gap-2">
                        <div className="aspect-[4/3] bg-gray-100 rounded-xl overflow-hidden border border-gray-100 shadow-sm group relative">
                          <img src={doc.url} alt="" className="w-full h-full object-cover transition-transform group-hover:scale-110" />
                          <div className="absolute inset-0 bg-black/40 opacity-0 group-hover:opacity-100 transition-opacity flex items-center justify-center">
                            <a href={doc.url} target="_blank" rel="noreferrer" className="bg-white p-2 rounded-lg text-[#5EB929] shadow-lg">
                              <VisibilityRoundedIcon sx={{ fontSize: 18 }} />
                            </a>
                          </div>
                        </div>
                        <span className="text-[10px] text-gray-500 font-bold uppercase tracking-tight text-center truncate">{doc.label || doc.type}</span>
                      </div>
                    ))}
                    
                    {/* Business Photos Gallery */}
                    {viewingMerchant.photos && viewingMerchant.photos.map((photo, idx) => (
                      <div key={`photo-${idx}`} className="flex flex-col gap-2">
                        <div className="aspect-[4/3] bg-gray-100 rounded-xl overflow-hidden border border-gray-100 shadow-sm group relative">
                          <img src={photo} alt="" className="w-full h-full object-cover transition-transform group-hover:scale-110" />
                          <div className="absolute inset-0 bg-black/40 opacity-0 group-hover:opacity-100 transition-opacity flex items-center justify-center">
                            <a href={photo} target="_blank" rel="noreferrer" className="bg-white p-2 rounded-lg text-[#5EB929] shadow-lg">
                              <VisibilityRoundedIcon sx={{ fontSize: 18 }} />
                            </a>
                          </div>
                        </div>
                        <span className="text-[10px] text-gray-500 font-bold uppercase tracking-tight text-center">Gallery Photo {idx + 1}</span>
                      </div>
                    ))}
                  </div>
                </div>
              </div>

            </div>

            {/* Sticky Action Footer (Mobile Style) */}
            <div className="absolute bottom-0 left-0 right-0 p-4 bg-white border-t border-gray-100 flex gap-3 z-20">
              <button 
                onClick={() => handleReject(viewingMerchant._id || viewingMerchant.id)}
                className="flex-1 flex items-center justify-center gap-2 bg-white border border-red-100 text-red-500 py-3.5 rounded-xl font-semibold text-[14px] hover:bg-red-50 transition-all shadow-sm"
              >
                <CloseRoundedIcon sx={{ fontSize: 20 }} />
                Reject Merchant
              </button>
              <button 
                onClick={() => handleApprove(viewingMerchant._id || viewingMerchant.id)}
                className="flex-[1.2] flex items-center justify-center gap-2 bg-[#5EB929] text-white py-3.5 rounded-xl font-semibold text-[14px] hover:bg-[#489A1B] transition-all shadow-lg shadow-[#5EB929]/20"
              >
                <CheckCircleRoundedIcon sx={{ fontSize: 20 }} />
                Approve Merchant
              </button>
            </div>
          </div>
        )}
      </SlideOver>

      <RejectionReasonModal isOpen={isRejectModalOpen} onClose={() => setIsRejectModalOpen(false)} onSubmit={confirmReject} />
    </div>
  );
};

export default MerchantManagement;

