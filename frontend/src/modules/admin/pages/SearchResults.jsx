import { useState, useMemo } from 'react';
import { useLocation, useNavigate } from 'react-router-dom';
import { useQuery } from '@tanstack/react-query';
import { adminAPI } from '../../../api/admin.api';
import StorefrontRoundedIcon from '@mui/icons-material/StorefrontRounded';
import GroupRoundedIcon from '@mui/icons-material/GroupRounded';
import MapRoundedIcon from '@mui/icons-material/MapRounded';
import SearchOffRoundedIcon from '@mui/icons-material/SearchOffRounded';
import ChevronRightRoundedIcon from '@mui/icons-material/ChevronRightRounded';
import ArrowBackRoundedIcon from '@mui/icons-material/ArrowBackRounded';
import toast from 'react-hot-toast';

const SearchResults = () => {
  const location = useLocation();
  const navigate = useNavigate();
  const query = new URLSearchParams(location.search).get('q');
  
  const { data: results = { merchants: [], users: [], cities: [] }, isLoading: loading } = useQuery({
    queryKey: ['adminGlobalSearch', query],
    queryFn: async () => {
      if (!query) return { merchants: [], users: [], cities: [] };
      const res = await adminAPI.globalSearch(query);
      return res.data;
    },
    enabled: !!query
  });

  const hasResults = results.merchants.length > 0 || results.users.length > 0 || results.cities.length > 0;

  const SectionHeader = ({ icon: Icon, title, count, colorClass }) => (
    <div className="flex items-center gap-3 mb-3 mt-6">
      <div className={`w-10 h-10 rounded-xl ${colorClass} bg-opacity-10 flex items-center justify-center`}>
        <Icon className={colorClass.replace('bg-', 'text-')} sx={{ fontSize: 20 }} />
      </div>
      <div>
        <h2 className="text-[15px] font-bold text-gray-800">{title}</h2>
        <p className="text-[10px] text-gray-400 font-black uppercase tracking-widest">{count} Matches Found</p>
      </div>
    </div>
  );

  return (
    <div className="min-h-[calc(100vh-80px)] bg-[#F8F5FF] p-4 lg:p-8 -m-6 lg:-m-8 font-sans text-gray-800 lg:rounded-tl-[32px]">
      <div className="max-w-7xl mx-auto">
        {/* Header Section */}
        <div className="flex items-center gap-4 mb-2">
           <button onClick={() => navigate(-1)} className="p-2 bg-white rounded-xl border border-gray-100 shadow-sm hover:bg-gray-50 transition-all active:scale-95">
              <ArrowBackRoundedIcon sx={{ fontSize: 20 }} className="text-gray-700" />
           </button>
           <div>
              <h1 className="text-xl lg:text-2xl font-medium text-gray-800">Search Results</h1>
              <p className="text-[12px] text-gray-500">
                Matches for <span className="text-primary font-bold">"{query}"</span>
              </p>
           </div>
        </div>

        {loading ? (
          <div className="py-20 flex flex-col items-center justify-center gap-4">
            <div className="w-10 h-10 border-2 border-primary/20 border-t-primary rounded-full animate-spin" />
            <p className="text-gray-500 font-medium text-xs">Scanning platform database...</p>
          </div>
        ) : !hasResults ? (
          <div className="py-20 text-center bg-white rounded-[32px] border border-dashed border-gray-200 mt-8">
            <SearchOffRoundedIcon className="text-gray-200 mb-4" sx={{ fontSize: 64 }} />
            <h3 className="text-lg font-semibold text-gray-400">No Matches Found</h3>
            <p className="text-sm text-gray-400 mt-1">Try searching for a different keyword or ID</p>
          </div>
        ) : (
          <div className="space-y-4 pb-20">
            {/* Merchants Section */}
            {results.merchants.length > 0 && (
              <div>
                <SectionHeader icon={StorefrontRoundedIcon} title="Merchants" count={results.merchants.length} colorClass="bg-primary" />
                <div className="grid grid-cols-1 gap-2">
                  {results.merchants.map(m => (
                    <div 
                      key={m._id} 
                      onClick={() => navigate(`/admin/merchants?id=${m._id}`)}
                      className="bg-white p-3 rounded-xl border border-gray-100 shadow-sm hover:border-primary/30 transition-all cursor-pointer flex items-center justify-between group"
                    >
                      <div className="flex items-center gap-3">
                        <div className="w-10 h-10 rounded-full bg-primary/5 flex items-center justify-center text-primary font-bold text-lg">
                           {m.storeName?.[0]?.toUpperCase()}
                        </div>
                        <div>
                          <h3 className="text-[14px] font-bold text-gray-800 leading-tight">{m.storeName}</h3>
                          <p className="text-[10px] text-gray-400 font-black uppercase tracking-widest mt-0.5">{m.category} • {m.city}</p>
                        </div>
                      </div>
                      <ChevronRightRoundedIcon sx={{ fontSize: 18 }} className="text-gray-300 group-hover:text-primary transition-all" />
                    </div>
                  ))}
                </div>
              </div>
            )}

            {/* Users Section */}
            {results.users.length > 0 && (
              <div>
                <SectionHeader icon={GroupRoundedIcon} title="Customers" count={results.users.length} colorClass="bg-indigo-500" />
                <div className="grid grid-cols-1 gap-2">
                  {results.users.map(u => (
                    <div 
                      key={u._id}
                      onClick={() => navigate(`/admin/users?id=${u._id}`)}
                      className="bg-white p-3 rounded-xl border border-gray-100 shadow-sm hover:border-indigo-500/30 transition-all cursor-pointer flex items-center justify-between group"
                    >
                      <div className="flex items-center gap-3">
                        <div className="w-10 h-10 rounded-full bg-indigo-50 flex items-center justify-center text-indigo-500 font-bold text-lg">
                           {u.name?.[0]?.toUpperCase()}
                        </div>
                        <div>
                          <h3 className="text-[14px] font-bold text-gray-800 leading-tight">{u.name}</h3>
                          <p className="text-[10px] text-gray-400 font-black uppercase tracking-widest mt-0.5">{u.phone || u.email}</p>
                        </div>
                      </div>
                      <ChevronRightRoundedIcon sx={{ fontSize: 18 }} className="text-gray-300 group-hover:text-indigo-500 transition-all" />
                    </div>
                  ))}
                </div>
              </div>
            )}

            {/* Cities Section */}
            {results.cities.length > 0 && (
              <div>
                <SectionHeader icon={MapRoundedIcon} title="Locations" count={results.cities.length} colorClass="bg-orange-500" />
                <div className="grid grid-cols-1 gap-2">
                  {results.cities.map(c => (
                    <div 
                      key={c._id} 
                      onClick={() => navigate('/admin/cities')}
                      className="bg-white p-3 rounded-xl border border-gray-100 shadow-sm hover:border-orange-500/30 transition-all cursor-pointer flex items-center justify-between group"
                    >
                      <div className="flex items-center gap-3">
                        <div className="w-10 h-10 rounded-full bg-orange-50 flex items-center justify-center text-orange-500">
                           <MapRoundedIcon sx={{ fontSize: 20 }} />
                        </div>
                        <div>
                          <h3 className="text-[14px] font-bold text-gray-800 leading-tight">{c.name}</h3>
                          <p className="text-[10px] text-gray-400 font-black uppercase tracking-widest mt-0.5">{c.zones?.length || 0} Zones Active</p>
                        </div>
                      </div>
                      <ChevronRightRoundedIcon sx={{ fontSize: 18 }} className="text-gray-300 group-hover:text-orange-500 transition-all" />
                    </div>
                  ))}
                </div>
              </div>
            )}
          </div>
        )}
      </div>
    </div>
  );
};

export default SearchResults;
