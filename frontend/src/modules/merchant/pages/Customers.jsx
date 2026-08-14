import { useState, useEffect } from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import { merchantAPI } from '../../../api/merchant.api';
import SearchRoundedIcon from '@mui/icons-material/SearchRounded';
import PeopleAltRoundedIcon from '@mui/icons-material/PeopleAltRounded';
import LocalOfferRoundedIcon from '@mui/icons-material/LocalOfferRounded';
import WorkspacePremiumRoundedIcon from '@mui/icons-material/WorkspacePremiumRounded';
import HistoryRoundedIcon from '@mui/icons-material/HistoryRounded';
import TrendingUpRoundedIcon from '@mui/icons-material/TrendingUpRounded';

const Customers = ({ merchant }) => {
  const [customerData, setCustomerData] = useState([]);
  const [searchQuery, setSearchQuery] = useState('');
  const [loading, setLoading] = useState(true);

  const [activeFilter, setActiveFilter] = useState('All');

  useEffect(() => {
    if (merchant) loadCustomers();
  }, [merchant]);

  const loadCustomers = async () => {
    try {
      setLoading(true);
      const response = await merchantAPI.getCustomers();
      if (response?.customers) {
        const mapped = response.customers.map(c => ({
          id: c.id,
          name: c.name || 'Anonymous User',
          phone: c.phone || 'N/A',
          totalRedemptions: c.visits || 0,
          totalSpend: c.spend || 0,
          lastVisit: c.lastVisit || new Date().toISOString()
        }));
        setCustomerData(mapped.sort((a, b) => b.totalSpend - a.totalSpend));
      }
    } catch (error) { setCustomerData([]); }
    finally { setLoading(false); }
  };

  const filtered = customerData.filter(c => {
    const matchesSearch = c.name.toLowerCase().includes(searchQuery.toLowerCase()) || c.phone.includes(searchQuery);
    if (!matchesSearch) return false;
    
    if (activeFilter === 'VIPs') return c.totalSpend > 5000;
    if (activeFilter === 'Repeaters') return c.totalRedemptions > 3;
    if (activeFilter === 'Newcomers') return c.totalRedemptions <= 3;
    return true;
  });

  const totalRevenue = customerData.reduce((s, c) => s + c.totalSpend, 0);
  const loyalCount = customerData.filter(c => c.totalRedemptions > 3).length;

  return (
    <div className="space-y-6 lg:space-y-8 pb-20">
      
      {/* Dynamic Header */}
      <div className="flex flex-col md:flex-row md:items-end justify-between gap-4">
        <div>
           <div className="flex items-center gap-2 mb-1">
              <div className="w-1.5 h-6 bg-[#5EB929] rounded-full" />
              <h1 className="text-xl lg:text-2xl font-bold text-gray-900 tracking-tight">Customer Network</h1>
           </div>
           <p className="text-[12px] text-gray-500 font-medium">Manage and reward your most valuable visitors</p>
        </div>
        
        {/* Analytics Strips */}
        <div className="flex items-center gap-3">
           <div className="bg-white px-4 py-2 rounded-xl border border-gray-100 shadow-sm flex items-center gap-3">
              <div className="w-8 h-8 rounded-lg bg-[#5EB929]/10 text-[#5EB929] flex items-center justify-center">
                 <TrendingUpRoundedIcon sx={{ fontSize: 18 }} />
              </div>
              <div>
                 <p className="text-[9px] font-bold text-gray-400 uppercase tracking-widest leading-none">Total Value</p>
                 <p className="text-sm font-bold text-gray-900 mt-1">₹{totalRevenue.toLocaleString()}</p>
              </div>
           </div>
           <div className="bg-gray-900 px-4 py-2 rounded-xl shadow-lg flex items-center gap-3">
              <div className="w-8 h-8 rounded-lg bg-white/10 text-white flex items-center justify-center">
                 <PeopleAltRoundedIcon sx={{ fontSize: 18 }} />
              </div>
              <div>
                 <p className="text-[9px] font-bold text-gray-500 uppercase tracking-widest leading-none">Net Reach</p>
                 <p className="text-sm font-bold text-white mt-1">{customerData.length}</p>
              </div>
           </div>
        </div>
      </div>

      {/* Control Area */}
      <div className="bg-white p-4 rounded-2xl border border-gray-50 shadow-sm flex flex-col md:flex-row items-center justify-between gap-4">
        <div className="relative w-full md:w-80 group">
          <SearchRoundedIcon className="absolute left-3.5 top-1/2 -translate-y-1/2 text-gray-400 group-focus-within:text-[#5EB929] transition-colors" sx={{ fontSize: 18 }} />
          <input 
            type="text" placeholder="Find by name or phone..." value={searchQuery}
            onChange={(e) => setSearchQuery(e.target.value)}
            className="w-full pl-10 pr-4 py-2.5 bg-background rounded-xl border border-transparent focus:border-[#5EB929]/20 outline-none text-[13px] font-bold"
          />
        </div>
        <div className="flex items-center gap-2 overflow-x-auto w-full md:w-auto pb-1 md:pb-0">
           {['All', 'VIPs', 'Repeaters', 'Newcomers'].map(f => (
              <button 
                key={f} 
                onClick={() => setActiveFilter(f)}
                className={`px-4 py-2 rounded-lg text-[10px] font-bold uppercase tracking-widest transition-all whitespace-nowrap ${activeFilter === f ? 'bg-[#5EB929] text-white shadow-lg' : 'bg-background text-gray-500 hover:bg-gray-100'}`}
              >
                 {f}
              </button>
           ))}
        </div>
      </div>

      {/* Directory Grid/Table */}
      <div className="grid grid-cols-1 md:grid-cols-2 xl:grid-cols-3 gap-4">
        {loading ? (
           <div className="col-span-full py-24 flex flex-col items-center gap-4">
              <div className="w-10 h-10 border-2 border-[#5EB929]/20 border-t-[#5EB929] rounded-full animate-spin" />
              <p className="text-[10px] font-bold text-gray-400 uppercase tracking-widest">Scanning Network...</p>
           </div>
        ) : filtered.length === 0 ? (
           <div className="col-span-full py-32 text-center bg-white/50 rounded-2xl border border-dashed border-gray-200">
              <PeopleAltRoundedIcon sx={{ fontSize: 48 }} className="text-gray-200 mb-2" />
              <p className="text-xs font-bold text-gray-400 uppercase tracking-widest">No matching profiles</p>
           </div>
        ) : (
          <AnimatePresence mode="popLayout">
            {filtered.map((customer, idx) => {
               const isVIP = customer.totalSpend > 5000;
               const isLoyal = customer.totalRedemptions > 3;

               return (
                  <motion.div 
                    key={customer.id} layout initial={{ opacity: 0, scale: 0.95 }} animate={{ opacity: 1, scale: 1 }} transition={{ delay: idx * 0.04 }}
                    className="bg-white rounded-2xl p-5 border border-gray-50 hover:border-[#5EB929]/20 hover:shadow-xl transition-all group relative overflow-hidden"
                  >
                    {/* Premium Accent */}
                    {isVIP && <div className="absolute top-0 right-0 w-16 h-16 bg-[#5EB929]/5 rounded-bl-full flex items-start justify-end p-2"><WorkspacePremiumRoundedIcon className="text-[#5EB929]" sx={{ fontSize: 20 }} /></div>}

                    <div className="flex items-center gap-4 mb-5">
                       <div className={`w-14 h-14 rounded-2xl flex items-center justify-center font-bold text-lg shadow-sm border ${isVIP ? 'bg-[#5EB929] text-white' : 'bg-background text-[#5EB929] border-[#5EB929]/10'}`}>
                          {customer.name.charAt(0)}
                       </div>
                       <div className="flex-1 min-w-0">
                          <h3 className="text-[15px] font-bold text-gray-900 group-hover:text-[#5EB929] transition-colors truncate">{customer.name}</h3>
                          <p className="text-[11px] font-bold text-gray-400 font-mono">{customer.phone}</p>
                          <div className="flex gap-2 mt-2">
                             {isVIP ? (
                                <span className="bg-[#5EB929] text-white text-[8px] font-bold uppercase px-2 py-0.5 rounded-md tracking-tight">Gold Elite</span>
                             ) : isLoyal ? (
                                <span className="bg-[#5EB929]/10 text-[#5EB929] text-[8px] font-bold uppercase px-2 py-0.5 rounded-md tracking-tight">Frequent</span>
                             ) : (
                                <span className="bg-gray-50 text-gray-400 text-[8px] font-bold uppercase px-2 py-0.5 rounded-md tracking-tight">Standard</span>
                             )}
                          </div>
                       </div>
                    </div>

                    <div className="grid grid-cols-2 gap-3 mb-5">
                       <div className="bg-background p-3 rounded-xl border border-[#5EB929]/5">
                          <div className="flex items-center gap-1.5 mb-1">
                             <HistoryRoundedIcon className="text-gray-400" sx={{ fontSize: 14 }} />
                             <p className="text-[9px] font-bold text-gray-400 uppercase tracking-widest">Visits</p>
                          </div>
                          <p className="text-base font-bold text-gray-900">{customer.totalRedemptions}</p>
                       </div>
                       <div className="bg-background p-3 rounded-xl border border-[#5EB929]/5">
                          <div className="flex items-center gap-1.5 mb-1">
                             <TrendingUpRoundedIcon className="text-gray-400" sx={{ fontSize: 14 }} />
                             <p className="text-[9px] font-bold text-gray-400 uppercase tracking-widest">Spend</p>
                          </div>
                          <p className="text-base font-bold text-gray-900">₹{customer.totalSpend.toLocaleString()}</p>
                       </div>
                    </div>

                    <div className="flex items-center justify-between pt-4 border-t border-gray-50">
                       <div className="flex flex-col">
                          <span className="text-[8px] font-bold text-gray-400 uppercase tracking-[0.1em]">Last Activity</span>
                          <span className="text-[10px] font-bold text-gray-600">{new Date(customer.lastVisit).toLocaleDateString(undefined, { day: '2-digit', month: 'short' })}</span>
                       </div>
                       <button className="px-4 py-2 bg-gray-900 text-white rounded-lg text-[9px] font-bold uppercase tracking-widest hover:bg-[#5EB929] transition-all active:scale-95 shadow-lg shadow-gray-900/10">
                          Profile
                       </button>
                    </div>
                  </motion.div>
               );
            })}
          </AnimatePresence>
        )}
      </div>
    </div>
  );
};

export default Customers;
