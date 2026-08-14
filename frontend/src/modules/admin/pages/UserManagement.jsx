import { useState, useMemo, useEffect } from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import { useQuery, useQueryClient } from '@tanstack/react-query';
import SlideOver from '../components/SlideOver';
import AdminEntityCard from '../components/AdminEntityCard';
import { adminAPI } from '../../../api/admin.api';
import GroupRoundedIcon from '@mui/icons-material/GroupRounded';
import RefreshRoundedIcon from '@mui/icons-material/RefreshRounded';
import SearchRoundedIcon from '@mui/icons-material/SearchRounded';
import PersonRemoveRoundedIcon from '@mui/icons-material/PersonRemoveRounded';
import EmailRoundedIcon from '@mui/icons-material/EmailRounded';
import PhoneRoundedIcon from '@mui/icons-material/PhoneRounded';
import LocationOnRoundedIcon from '@mui/icons-material/LocationOnRounded';
import EventAvailableRoundedIcon from '@mui/icons-material/EventAvailableRounded';
import PaymentsRoundedIcon from '@mui/icons-material/PaymentsRounded';
import HistoryRoundedIcon from '@mui/icons-material/HistoryRounded';
import MoreVertRoundedIcon from '@mui/icons-material/MoreVertRounded';
import CloseRoundedIcon from '@mui/icons-material/CloseRounded';
import CheckCircleRoundedIcon from '@mui/icons-material/CheckCircleRounded';
import BlockRoundedIcon from '@mui/icons-material/BlockRounded';
import StarRoundedIcon from '@mui/icons-material/StarRounded';
import toast from 'react-hot-toast';

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

const UserManagement = () => {
  const queryClient = useQueryClient();
  const [activeTab, setActiveTab] = useState('all'); // 'all', 'active', 'suspended'
  const [searchQuery, setSearchQuery] = useState('');
  const debouncedSearch = useDebounce(searchQuery, 400);
  const [page, setPage] = useState(1);
  const limit = 20;

  const [viewingUser, setViewingUser] = useState(null);
  const [isSlideOverOpen, setIsSlideOverOpen] = useState(false);

  // 1. Fetch users with React Query
  const { data, isLoading: loading, isFetching, refetch } = useQuery({
    queryKey: ['adminUsers', activeTab, debouncedSearch, page],
    queryFn: async () => {
      const res = await adminAPI.getAllUsers();
      let users = res.data?.users || res.users || res.data || [];
      
      // Filter for customers only
      users = users.filter(user => user.role === 'customer');

      // Manual filtering for tab and search since the current backend endpoint might not support all params
      if (activeTab !== 'all') {
        users = users.filter(u => u.status === activeTab);
      }
      if (debouncedSearch) {
        const q = debouncedSearch.toLowerCase();
        users = users.filter(u => 
          u.name?.toLowerCase().includes(q) || 
          u.phone?.includes(q) || 
          u.email?.toLowerCase().includes(q)
        );
      }

      return {
        users: users.slice((page - 1) * limit, page * limit),
        total: users.length
      };
    },
    keepPreviousData: true,
  });

  const users = data?.users || [];
  const total = data?.total || 0;

  const handleEntityView = (user) => {
    setViewingUser(user);
    setIsSlideOverOpen(true);
  };

  const handleStatusToggle = async (user) => {
    const currentStatus = user.status || 'active';
    const newStatus = currentStatus === 'active' ? 'suspended' : 'active';
    const action = newStatus === 'active' ? 'Activated' : 'Restricted';
    
    try {
      await adminAPI.updateUserStatus(user.id || user._id, newStatus);
      toast.success(`User ${action} successfully`);
      queryClient.invalidateQueries(['adminUsers']);
    } catch (error) {
      toast.error(`Failed to update user status`);
    }
  };



  return (
    <div className="min-h-[calc(100vh-80px)] bg-background p-4 lg:p-8 -m-6 lg:-m-8 font-sans text-gray-800 lg:rounded-tl-[32px]">
      <div className="max-w-7xl mx-auto">
        {/* Header Section */}
        <div className="flex flex-col md:flex-row md:items-center justify-between gap-2 mb-1.5">
          <div>
            <h1 className="text-xl lg:text-2xl font-medium text-gray-800 tracking-tight">Customer Oversight</h1>
            <p className="text-[12px] text-gray-500 tracking-tight">Global Management of Platform Users</p>
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
            <TabButton label="Active" isActive={activeTab === 'active'} onClick={() => { setActiveTab('active'); setPage(1); }} />
            <TabButton label="Blocked" isActive={activeTab === 'suspended'} onClick={() => { setActiveTab('suspended'); setPage(1); }} />
          </div>

          <div className="relative flex-1 max-w-md w-full">
            <SearchRoundedIcon className="absolute left-4 top-1/2 -translate-y-1/2 text-gray-400" sx={{ fontSize: 18 }} />
            <input 
              type="text" 
              placeholder="Search by name, phone or email..."
              value={searchQuery}
              onChange={(e) => setSearchQuery(e.target.value)}
              className="w-full bg-white border border-gray-100 rounded-[12px] py-1.5 pl-11 pr-4 text-[12px] text-gray-800 placeholder:text-gray-400 focus:outline-none focus:ring-2 focus:ring-[#5EB929]/10 focus:border-[#5EB929]/30 transition-all shadow-sm"
            />
          </div>
        </div>

        {/* Mobile-only Section Title */}
        <div className="lg:hidden mb-4">
          <h2 className="text-[15px] font-semibold text-gray-800">
            {activeTab === 'suspended' ? 'Blocked Users' : 'Platform Users'} 
            <span className="text-gray-400 ml-1">({total})</span>
          </h2>
        </div>

        {loading ? (
          <div className="py-20 flex flex-col items-center justify-center gap-4">
            <div className="w-10 h-10 border-2 border-primary/20 border-t-primary rounded-full animate-spin" />
            <p className="text-gray-500 font-medium text-xs tracking-widest uppercase">Syncing Users...</p>
          </div>
        ) : users.length > 0 ? (
          <div className="grid grid-cols-1 gap-3">
            {users.map(user => (
              <AdminEntityCard 
                key={user._id || user.id}
                entity={user}
                type="customer"
                onView={() => handleEntityView(user)}
                onStatusToggle={() => handleStatusToggle(user)}
              />
            ))}
          </div>
        ) : (
          <div className="py-20 text-center bg-white rounded-3xl border border-dashed border-gray-200">
            <PersonRemoveRoundedIcon className="text-gray-200 mb-4" sx={{ fontSize: 64 }} />
            <h3 className="text-lg font-semibold text-gray-400">No Customers Found</h3>
            <p className="text-sm text-gray-400 mt-1">Try adjusting your filters or search query</p>
          </div>
        )}
      </div>

      {/* Detail SlideOver */}
      <SlideOver
        isOpen={isSlideOverOpen}
        onClose={() => setIsSlideOverOpen(false)}
        title="Customer Profile"
        subtitle={`REF: ${viewingUser?._id?.toString()?.substring(0, 12) || 'N/A'}`}
        widthClass="max-w-xl"
      >
        {viewingUser && (
          <div className="flex flex-col h-full font-sans">
            <div className="flex-1 overflow-y-auto space-y-6 pb-32 pr-1 no-scrollbar">
              
              {/* Profile Header Section */}
              <div className="flex items-center gap-4 px-1 pt-1">
                <div className="w-16 h-16 sm:w-20 sm:h-20 rounded-full bg-indigo-50 text-indigo-600 flex items-center justify-center border border-indigo-100 overflow-hidden shadow-sm flex-shrink-0 font-bold text-2xl">
                  {viewingUser.profilePhoto ? (
                    <img src={viewingUser.profilePhoto} alt="" className="w-full h-full object-cover" />
                  ) : (
                    viewingUser.name?.[0]?.toUpperCase()
                  )}
                </div>
                <div className="flex-1 min-w-0">
                  <h3 className="text-lg sm:text-xl font-semibold text-gray-800 leading-tight truncate">{viewingUser.name}</h3>
                  <p className="text-[12px] sm:text-[13px] text-gray-500 mt-0.5">{viewingUser.email}</p>
                  <p className="text-[12px] sm:text-[13px] text-gray-500 mt-0.5">{viewingUser.phone}</p>
                  <p className="text-[11px] text-gray-400 mt-0.5 italic">Joined {new Date(viewingUser.createdAt).toLocaleDateString('en-GB', { day: 'numeric', month: 'short', year: 'numeric' })}</p>
                </div>
                <button className="p-2 text-gray-400 hover:text-gray-600 flex-shrink-0">
                  <MoreVertRoundedIcon />
                </button>
              </div>

              {/* Personal Information */}
              <div className="bg-white rounded-2xl border border-gray-100 shadow-sm overflow-hidden">
                <div className="px-5 py-4 bg-gray-50/50 border-b border-gray-100">
                  <h4 className="text-[14px] font-semibold text-gray-800">Personal Information</h4>
                </div>
                <div className="px-5 divide-y divide-gray-50">
                  <div className="py-4 flex justify-between items-center gap-4">
                    <span className="text-[13px] text-gray-500 flex items-center gap-2"><GroupRoundedIcon sx={{ fontSize: 16 }} /> Name</span>
                    <span className="text-[13px] font-medium text-gray-800">{viewingUser.name}</span>
                  </div>
                  <div className="py-4 flex justify-between items-center gap-4">
                    <span className="text-[13px] text-gray-500 flex items-center gap-2"><EmailRoundedIcon sx={{ fontSize: 16 }} /> Email</span>
                    <span className="text-[13px] font-medium text-gray-800 break-all">{viewingUser.email}</span>
                  </div>
                  <div className="py-4 flex justify-between items-center gap-4">
                    <span className="text-[13px] text-gray-500 flex items-center gap-2"><PhoneRoundedIcon sx={{ fontSize: 16 }} /> Phone</span>
                    <span className="text-[13px] font-medium text-gray-800">{viewingUser.phone}</span>
                  </div>
                  <div className="py-4 flex justify-between items-center gap-4">
                    <span className="text-[13px] text-gray-500 flex items-center gap-2"><LocationOnRoundedIcon sx={{ fontSize: 16 }} /> City</span>
                    <span className="text-[13px] font-medium text-gray-800">{viewingUser.city || 'Not Specified'}</span>
                  </div>
                  <div className="py-4 flex justify-between items-center gap-4">
                    <span className="text-[13px] text-gray-500 flex items-center gap-2"><LocationOnRoundedIcon sx={{ fontSize: 16 }} /> Address</span>
                    <span className="text-[13px] font-medium text-gray-800 text-right max-w-[200px]">{viewingUser.address || 'Not Provided'}</span>
                  </div>
                  <div className="py-4 flex justify-between items-center gap-4">
                    <span className="text-[13px] text-gray-500 flex items-center gap-2"><GroupRoundedIcon sx={{ fontSize: 16 }} /> Gender</span>
                    <span className="text-[13px] font-medium text-gray-800 capitalize">{viewingUser.gender || 'Not Specified'}</span>
                  </div>
                  <div className="py-4 flex justify-between items-center gap-4">
                    <span className="text-[13px] text-gray-500 flex items-center gap-2"><EventAvailableRoundedIcon sx={{ fontSize: 16 }} /> Age / DOB</span>
                    <span className="text-[13px] font-medium text-gray-800">
                      {viewingUser.age ? `${viewingUser.age} Yrs` : 'N/A'} 
                      {viewingUser.dob && ` (${new Date(viewingUser.dob).toLocaleDateString()})`}
                    </span>
                  </div>
                </div>
              </div>

              {/* Account / Referral Section */}
              <div className="bg-white rounded-2xl border border-gray-100 shadow-sm overflow-hidden">
                <div className="px-5 py-4 bg-gray-50/50 border-b border-gray-100">
                  <h4 className="text-[14px] font-semibold text-gray-800">Account & Growth</h4>
                </div>
                <div className="px-5 divide-y divide-gray-50">
                   <div className="py-4 flex justify-between items-center gap-4">
                    <span className="text-[13px] text-gray-500">Referral Code</span>
                    <span className="text-[13px] font-bold text-[#5EB929] tracking-widest">{viewingUser.referralCode || 'N/A'}</span>
                  </div>
                  <div className="py-4 flex justify-between items-center gap-4">
                    <span className="text-[13px] text-gray-500">Account Status</span>
                    <span className={`text-[10px] font-bold px-3 py-1 rounded-full uppercase tracking-tight ${viewingUser.status === 'suspended' ? 'bg-red-50 text-red-500' : 'bg-green-50 text-green-600'}`}>
                      {viewingUser.status || 'Active'}
                    </span>
                  </div>
                </div>
              </div>

              {/* Usage Stats */}
              <div className="bg-white rounded-2xl border border-gray-100 shadow-sm overflow-hidden">
                <div className="px-5 py-4 bg-gray-50/50 border-b border-gray-100">
                  <h4 className="text-[14px] font-semibold text-gray-800">Activity & Stats</h4>
                </div>
                <div className="grid grid-cols-2 divide-x divide-gray-50 border-b border-gray-50">
                  <div className="p-5 flex flex-col items-center text-center gap-2">
                    <div className="p-3 bg-amber-50 text-amber-600 rounded-xl">
                      <PaymentsRoundedIcon />
                    </div>
                    <div>
                      <p className="text-[10px] font-bold text-gray-400 uppercase tracking-widest">Available Credits</p>
                      <p className="text-xl font-bold text-gray-800">{viewingUser.credits || 0}</p>
                    </div>
                  </div>
                  <div className="p-5 flex flex-col items-center text-center gap-2">
                    <div className="p-3 bg-indigo-50 text-indigo-600 rounded-xl">
                      <StarRoundedIcon sx={{ fontSize: 24 }} />
                    </div>
                    <div>
                      <p className="text-[10px] font-bold text-gray-400 uppercase tracking-widest">Saved Offers</p>
                      <p className="text-xl font-bold text-gray-800">{viewingUser.savedOffers?.length || 0}</p>
                    </div>
                  </div>
                </div>
              </div>

            </div>

            {/* Sticky Action Footer (Mobile Style) */}
            <div className="absolute bottom-0 left-0 right-0 p-4 bg-white border-t border-gray-100 flex gap-3 z-20">
              <button 
                onClick={() => handleStatusToggle(viewingUser)}
                className={`flex-1 flex items-center justify-center gap-2 py-3.5 rounded-xl font-semibold text-[14px] transition-all shadow-sm ${
                  viewingUser.status === 'suspended' 
                    ? 'bg-green-50 border border-green-100 text-green-600 hover:bg-green-100' 
                    : 'bg-white border border-red-100 text-red-500 hover:bg-red-50'
                }`}
              >
                {viewingUser.status === 'suspended' ? <CheckCircleRoundedIcon sx={{ fontSize: 20 }} /> : <BlockRoundedIcon sx={{ fontSize: 20 }} />}
                {viewingUser.status === 'suspended' ? 'Activate User' : 'Block User'}
              </button>
            </div>
          </div>
        )}
      </SlideOver>
    </div>
  );
};

export default UserManagement;
