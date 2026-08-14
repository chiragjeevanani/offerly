import { useState, useMemo } from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import { useQuery } from '@tanstack/react-query';
import { adminAPI } from '../../../api/admin.api';
import SearchRoundedIcon from '@mui/icons-material/SearchRounded';
import RefreshRoundedIcon from '@mui/icons-material/RefreshRounded';
import ReceiptLongRoundedIcon from '@mui/icons-material/ReceiptLongRounded';
import ChevronRightRoundedIcon from '@mui/icons-material/ChevronRightRounded';
import StorefrontRoundedIcon from '@mui/icons-material/StorefrontRounded';
import PersonRoundedIcon from '@mui/icons-material/PersonRounded';
import AccountBalanceWalletRoundedIcon from '@mui/icons-material/AccountBalanceWalletRounded';
import FilterListRoundedIcon from '@mui/icons-material/FilterListRounded';
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

const BookingLedger = () => {
  const [searchQuery, setSearchQuery] = useState('');
  const [activeTab, setActiveTab] = useState('all'); // 'all', 'pending', 'completed'

  const { data: bookings = [], isLoading: loading, refetch, isFetching } = useQuery({
    queryKey: ['adminBookings'],
    queryFn: async () => {
      const res = await adminAPI.getAllBookings();
      return res.data?.redemptions || res.redemptions || [];
    }
  });

  const filteredBookings = useMemo(() => {
    return bookings.filter(b => {
      const matchesTab = activeTab === 'all' || 
                        (activeTab === 'pending' && b.status === 'pending') ||
                        (activeTab === 'completed' && (b.status === 'completed' || b.status === 'fulfilled'));
      
      const query = searchQuery.toLowerCase();
      const matchesSearch = 
        b.id.toLowerCase().includes(query) ||
        b.customerName?.toLowerCase().includes(query) ||
        b.merchant?.storeName?.toLowerCase().includes(query);
      
      return matchesTab && matchesSearch;
    });
  }, [bookings, activeTab, searchQuery]);

  // Stats
  const totalRevenue = useMemo(() => 
    filteredBookings.reduce((sum, b) => sum + (b.totals?.final || 0), 0)
  , [filteredBookings]);



  return (
    <div className="min-h-[calc(100vh-80px)] bg-background p-4 lg:p-8 -m-6 lg:-m-8 font-sans text-gray-800 lg:rounded-tl-[32px]">
      <div className="max-w-7xl mx-auto">
        {/* Header Section */}
        <div className="flex flex-col md:flex-row md:items-center justify-between gap-2 mb-2">
          <div>
            <h1 className="text-xl lg:text-2xl font-medium text-gray-800">Global Ledger</h1>
            <p className="text-[12px] text-gray-500">Real-time platform booking and transaction history</p>
          </div>

          <div className="flex items-center gap-2">
            <div className="flex items-center gap-3 bg-white px-4 py-2 rounded-[12px] border border-gray-100 shadow-sm">
               <span className="text-[10px] font-bold text-gray-400 uppercase tracking-widest">Total Value:</span>
               <span className="text-[14px] font-bold text-primary">₹{totalRevenue.toLocaleString()}</span>
            </div>
            <button
              onClick={() => refetch()}
              className="flex items-center gap-2 bg-white hover:bg-gray-50 text-gray-700 px-4 py-2 rounded-[10px] border border-gray-100 transition-all text-[12px] font-medium shadow-sm active:scale-95 disabled:opacity-50"
              disabled={isFetching}
            >
              <RefreshRoundedIcon sx={{ fontSize: 16 }} className={isFetching ? 'animate-spin' : ''} />
            </button>
          </div>
        </div>

        {/* Filters Section */}
        <div className="flex flex-col lg:flex-row lg:items-center justify-between gap-3 mb-3">
          <div className="flex items-center gap-1.5 bg-white/50 p-1 rounded-[12px] border border-gray-100 overflow-x-auto no-scrollbar">
            <TabButton label="All History" isActive={activeTab === 'all'} onClick={() => setActiveTab('all')} />
            <TabButton label="Pending" isActive={activeTab === 'pending'} onClick={() => setActiveTab('pending')} count={bookings.filter(b => b.status === 'pending').length} />
            <TabButton label="Completed" isActive={activeTab === 'completed'} onClick={() => setActiveTab('completed')} />
          </div>

          <div className="relative flex-1 max-w-md w-full">
            <SearchRoundedIcon className="absolute left-4 top-1/2 -translate-y-1/2 text-gray-400" sx={{ fontSize: 18 }} />
            <input 
              type="text" 
              placeholder="Search ID, Merchant, or Customer..."
              value={searchQuery}
              onChange={(e) => setSearchQuery(e.target.value)}
              className="w-full bg-white border border-gray-100 rounded-[12px] py-2 pl-11 pr-4 text-[13px] text-gray-800 placeholder:text-gray-400 focus:outline-none focus:ring-2 focus:ring-[#5EB929]/10 focus:border-[#5EB929]/30 transition-all shadow-sm"
            />
          </div>
        </div>

        {loading ? (
          <div className="py-20 flex flex-col items-center justify-center gap-4">
            <div className="w-10 h-10 border-2 border-primary/20 border-t-primary rounded-full animate-spin" />
            <p className="text-gray-500 font-medium text-xs">Loading Ledger...</p>
          </div>
        ) : filteredBookings.length > 0 ? (
          <div className="grid grid-cols-1 gap-2">
            {filteredBookings.map(b => (
              <div 
                key={b._id || b.id}
                className="bg-white rounded-xl p-2.5 border border-gray-100 shadow-sm active:scale-[0.98] transition-all flex items-center justify-between group"
              >
                <div className="flex items-center gap-4 flex-1">
                  {/* ID & Icon */}
                  <div className="hidden sm:flex flex-col items-center justify-center w-12 border-r border-gray-50 pr-4">
                     <ReceiptLongRoundedIcon className="text-gray-300" sx={{ fontSize: 20 }} />
                     <span className="text-[9px] font-bold text-gray-400 uppercase mt-1">#{b.id}</span>
                  </div>

                  {/* Customer & Store Info */}
                  <div className="flex flex-col lg:flex-row lg:items-center gap-3 lg:gap-8 flex-1">
                    <div className="flex items-center gap-2 min-w-[140px]">
                      <div className="w-6 h-6 rounded-full bg-indigo-50 flex items-center justify-center text-indigo-500">
                        <PersonRoundedIcon sx={{ fontSize: 14 }} />
                      </div>
                      <span className="text-[13px] font-bold text-gray-700 truncate">{b.customerName || 'Guest User'}</span>
                    </div>

                    <div className="flex items-center gap-2 min-w-[180px]">
                      <div className="w-6 h-6 rounded-full bg-green-50 flex items-center justify-center text-green-600">
                        <StorefrontRoundedIcon sx={{ fontSize: 14 }} />
                      </div>
                      <div>
                        <p className="text-[12px] font-bold text-gray-800 leading-none">{b.merchant?.storeName || '—'}</p>
                        <p className="text-[9px] text-gray-400 font-bold uppercase tracking-tight mt-0.5">{b.merchant?.category}</p>
                      </div>
                    </div>

                    <div className="flex items-center gap-2">
                       <span className="text-[12px] text-gray-400 font-medium">
                        {new Date(b.createdAt).toLocaleDateString()} at {new Date(b.createdAt).toLocaleTimeString([], {hour:'2-digit', minute:'2-digit'})}
                       </span>
                    </div>
                  </div>
                </div>
                
                {/* Amount & Status */}
                <div className="flex items-center gap-4 lg:gap-8">
                  <div className="text-right">
                    <p className="text-[13px] font-bold text-primary leading-none">₹{b.totals?.final}</p>
                    <p className="text-[9px] font-bold text-gray-400 uppercase tracking-widest mt-1">Settled</p>
                  </div>
                  
                  <div className="flex items-center gap-2 min-w-[80px] justify-end">
                    <span className={`px-2 py-0.5 rounded-full text-[9px] font-bold uppercase tracking-wider ${
                      b.status === 'pending' ? 'bg-amber-50 text-amber-600' : 'bg-green-50 text-green-600'
                    }`}>
                      {b.status}
                    </span>
                  </div>
                </div>
              </div>
            ))}
          </div>
        ) : (
          <div className="py-20 text-center bg-white rounded-3xl border border-dashed border-gray-200">
            <ReceiptLongRoundedIcon className="text-gray-200 mb-4" sx={{ fontSize: 64 }} />
            <h3 className="text-lg font-semibold text-gray-400">Ledger Empty</h3>
            <p className="text-sm text-gray-400 mt-1">No transaction history found</p>
          </div>
        )}
      </div>
    </div>
  );
};

export default BookingLedger;
