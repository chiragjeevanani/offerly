import { useMemo } from 'react';
import { useNavigate } from 'react-router-dom';
import { useQuery } from '@tanstack/react-query';
import {
  AreaChart, Area, XAxis, YAxis, Tooltip, ResponsiveContainer, CartesianGrid
} from 'recharts';
import TrendingUpRoundedIcon from '@mui/icons-material/TrendingUpRounded';
import StarRoundedIcon from '@mui/icons-material/StarRounded';
import QrCodeScannerRoundedIcon from '@mui/icons-material/QrCodeScannerRounded';
import PeopleRoundedIcon from '@mui/icons-material/PeopleRounded';
import ShoppingBagRoundedIcon from '@mui/icons-material/ShoppingBagRounded';
import CampaignRoundedIcon from '@mui/icons-material/CampaignRounded';
import ChevronRightRoundedIcon from '@mui/icons-material/ChevronRightRounded';
import { merchantAPI } from '../../../api/merchant.api';
import SubscriptionRenewal from '../components/SubscriptionRenewal';

const ChartTooltip = ({ active, payload, label }) => {
  if (!active || !payload?.length) return null;
  return (
    <div className="bg-gray-900 text-white px-4 py-2.5 rounded-2xl shadow-2xl border border-white/10 backdrop-blur-md">
      <p className="text-[9px] font-bold uppercase tracking-widest text-gray-400 mb-1">{label}</p>
      <p className="text-base font-bold text-[#5EB929]">₹{payload[0].value.toLocaleString()}</p>
    </div>
  );
};

const MerchantDashboard = ({ merchant }) => {
  const navigate = useNavigate();

  const { data: dashboardData, isLoading: loading } = useQuery({
    queryKey: ['merchantDashboard', merchant?._id],
    queryFn: () => merchantAPI.getDashboard(),
    enabled: !!merchant?._id
  });

  const stats = useMemo(() => {
    if (!dashboardData) return {
      pending: 0, fulfilled: 0, revenue: 0, totalCustomers: 0, avgOrderValue: 0,
      history: [], weeklyData: [], topOffers: [], adStats: {}
    };

    const apiStats = dashboardData.stats || {};
    const recentBookings = dashboardData.recentBookings || [];
    const weeklyRevenue = apiStats.weeklyRevenue || [];

    const days = ['Sun', 'Mon', 'Tue', 'Wed', 'Thu', 'Fri', 'Sat'];
    const today = new Date();
    const weeklyData = Array.from({ length: 7 }, (_, i) => {
      const date = new Date(today);
      date.setDate(today.getDate() - (6 - i));
      const dateStr = date.toISOString().split('T')[0];
      const dayName = days[date.getDay()];
      const match = weeklyRevenue.find(d => d._id === dateStr);
      return { day: dayName, revenue: match ? match.revenue : 0 };
    });

    return {
      pending: apiStats.pendingBookingsCount || 0,
      fulfilled: apiStats.bookingsCount || 0,
      revenue: apiStats.revenue || 0,
      totalCustomers: apiStats.customersCount || 0,
      avgOrderValue: (apiStats.bookingsCount || 0) > 0 ? Math.round(apiStats.revenue / apiStats.bookingsCount) : 0,
      history: recentBookings.slice(0, 5),
      weeklyData,
      topOffers: apiStats.topOffers || [],
      adStats: {
        active: apiStats.activeAdsCount || 0,
        available: apiStats.availableAdSlots || 0,
        total: apiStats.totalAdPackages || 0
      },
      remainingDays: apiStats.remainingDays
    };
  }, [dashboardData]);

  if (loading) return (
    <div className="min-h-[70vh] flex flex-col items-center justify-center gap-6">
       <div className="relative">
          <div className="w-16 h-16 border-4 border-[#5EB929]/10 rounded-full" />
          <div className="w-16 h-16 border-4 border-[#5EB929] border-t-transparent rounded-full animate-spin absolute inset-0" />
       </div>
       <div className="text-center">
          <p className="text-gray-900 font-bold text-xs uppercase tracking-[0.2em] mb-1 animate-pulse">Initializing Engine</p>
          <p className="text-gray-400 font-bold text-[10px] uppercase tracking-widest">Loading your business analytics</p>
       </div>
    </div>
  );

  if (stats.remainingDays <= 0 && stats.remainingDays !== undefined) {
    return <SubscriptionRenewal merchant={merchant} />;
  }

  return (
    <div className="min-h-screen bg-background p-3 lg:p-6 -m-4 lg:-m-6">
      <div className="max-w-7xl mx-auto space-y-5 pb-16">
        
        {/* Header - Desktop Only Quick Actions */}
        <div className="hidden md:flex items-center justify-end px-1">
          <button onClick={() => navigate('/merchant/scanner')} className="bg-gray-900 text-white px-5 py-3 rounded-2xl font-bold text-[10px] uppercase tracking-widest shadow-xl shadow-gray-900/10 hover:scale-105 active:scale-95 transition-all flex items-center gap-2.5">
             <QrCodeScannerRoundedIcon sx={{ fontSize: 18 }} />
             Quick Scan
          </button>
        </div>

        {/* Dynamic Analytics Grid */}
        <div className="grid grid-cols-1 lg:grid-cols-12 gap-5">
          
          {/* Main Analytics Hub */}
          <div className="lg:col-span-8 space-y-6">
             {/* Revenue Chart Card */}
             <div className="bg-white rounded-[2rem] p-6 shadow-[0_15px_40px_rgba(0,0,0,0.03)] border border-white relative overflow-hidden">
                <div className="absolute top-0 right-0 w-48 h-48 bg-[#5EB929]/5 rounded-full -mr-24 -mt-24 blur-3xl" />
                <div className="flex items-center justify-between mb-8 relative z-10">
                   <div>
                      <h2 className="text-lg font-bold text-gray-900 tracking-tight">Revenue Velocity</h2>
                      <p className="text-[10px] font-bold text-gray-400 uppercase tracking-widest">7-Day Analysis</p>
                   </div>
                   <div className="text-right">
                      <p className="text-xl font-bold text-gray-900">₹{stats.revenue.toLocaleString()}</p>
                      <div className="flex items-center justify-end gap-1 text-[#5EB929] font-bold text-[9px] uppercase">
                         <TrendingUpRoundedIcon sx={{ fontSize: 12 }} /> Yield
                      </div>
                   </div>
                </div>

                <div className="h-60 w-full relative z-10">
                   <ResponsiveContainer width="100%" height="100%">
                      <AreaChart data={stats.weeklyData}>
                        <defs>
                          <linearGradient id="colorRev" x1="0" y1="0" x2="0" y2="1">
                            <stop offset="5%" stopColor="#5EB929" stopOpacity={0.3}/>
                            <stop offset="95%" stopColor="#5EB929" stopOpacity={0}/>
                          </linearGradient>
                        </defs>
                        <CartesianGrid strokeDasharray="3 3" vertical={false} stroke="#F1F5F9" />
                        <XAxis dataKey="day" axisLine={false} tickLine={false} tick={{ fill: '#94A3B8', fontSize: 10, fontWeight: 800 }} dy={8} />
                        <YAxis hide />
                        <Tooltip content={<ChartTooltip />} cursor={{ stroke: '#5EB929', strokeWidth: 2, strokeDasharray: '5 5' }} />
                        <Area type="monotone" dataKey="revenue" stroke="#5EB929" strokeWidth={3} fillOpacity={1} fill="url(#colorRev)" />
                      </AreaChart>
                   </ResponsiveContainer>
                </div>
             </div>

             {/* Secondary Stats */}
             <div className="grid grid-cols-3 gap-3">
                <div className="bg-white p-4 rounded-2xl border border-gray-50 flex flex-col items-center text-center shadow-sm">
                   <PeopleRoundedIcon className="text-indigo-500 mb-1" sx={{ fontSize: 20 }} />
                   <p className="text-[8px] font-bold text-gray-400 uppercase tracking-widest">Customers</p>
                   <p className="text-lg font-bold text-gray-900 leading-none mt-1">{stats.totalCustomers}</p>
                </div>
                <div className="bg-white p-4 rounded-2xl border border-gray-50 flex flex-col items-center text-center shadow-sm">
                   <ShoppingBagRoundedIcon className="text-pink-500 mb-1" sx={{ fontSize: 20 }} />
                   <p className="text-[8px] font-bold text-gray-400 uppercase tracking-widest">Avg Order</p>
                   <p className="text-lg font-bold text-gray-900 leading-none mt-1">₹{stats.avgOrderValue}</p>
                </div>
                <div className="bg-white p-4 rounded-2xl border border-gray-50 flex flex-col items-center text-center shadow-sm">
                   <StarRoundedIcon className="text-amber-500 mb-1" sx={{ fontSize: 20 }} />
                   <p className="text-[8px] font-bold text-gray-400 uppercase tracking-widest">Rating</p>
                   <p className="text-lg font-bold text-gray-900 leading-none mt-1">{merchant?.avgRating?.toFixed(1) || '0.0'}</p>
                </div>
             </div>
          </div>

          {/* Side Control Center */}
          <div className="lg:col-span-4 space-y-6">
             {/* Ad Quota Card */}
             <div className="bg-gray-900 rounded-[2rem] p-5 text-white shadow-2xl relative overflow-hidden group">
                <div className="absolute -right-10 -bottom-10 w-32 h-32 bg-[#5EB929]/20 rounded-full blur-3xl group-hover:bg-[#5EB929]/40 transition-all duration-700" />
                <div className="flex items-center gap-3 mb-5 relative z-10">
                   <div className="w-9 h-9 bg-white/10 rounded-xl flex items-center justify-center text-[#5EB929]">
                      <CampaignRoundedIcon sx={{ fontSize: 18 }} />
                   </div>
                   <div>
                      <h3 className="text-xs font-bold uppercase tracking-tight">Ad Quota</h3>
                      <p className="text-[8px] font-bold text-gray-500 uppercase tracking-widest">Promotional Balance</p>
                   </div>
                </div>

                <div className="grid grid-cols-2 gap-2.5 mb-5 relative z-10">
                   <div className="p-3 bg-white/5 rounded-xl border border-white/5">
                      <p className="text-[7px] font-bold text-gray-500 uppercase mb-0.5">Active</p>
                      <p className="text-xl font-bold">{stats.adStats.active}</p>
                   </div>
                   <div className="p-3 bg-white/5 rounded-xl border border-white/5">
                      <p className="text-[7px] font-bold text-gray-500 uppercase mb-0.5">Available</p>
                      <p className="text-xl font-bold text-[#5EB929]">{stats.adStats.available}</p>
                   </div>
                </div>

                <button onClick={() => navigate('/merchant/advertise')} className="w-full py-3.5 bg-white text-gray-900 rounded-xl font-bold text-[9px] uppercase tracking-[0.2em] hover:bg-[#5EB929] hover:text-white transition-all relative z-10">
                   Campaigns Hub
                </button>
             </div>

             {/* Top Performing Offers */}
             <div className="bg-white rounded-[2rem] p-5 shadow-sm border border-gray-50">
                <h3 className="text-[10px] font-bold text-gray-400 uppercase tracking-[0.2em] mb-4 ml-1">Top Performers</h3>
                <div className="space-y-2.5">
                   {stats.topOffers.length === 0 ? (
                      <div className="py-6 text-center bg-background rounded-xl border border-dashed border-gray-200">
                         <p className="text-[9px] font-bold text-gray-400 uppercase">No Data</p>
                      </div>
                   ) : (
                      stats.topOffers.map((offer, idx) => (
                        <div key={idx} className="flex items-center justify-between p-2.5 bg-background rounded-xl border border-gray-50 group hover:bg-white hover:shadow-md transition-all">
                           <div className="flex items-center gap-2.5">
                              <div className="w-7 h-7 rounded-lg bg-white flex items-center justify-center shadow-sm text-[#5EB929] font-bold text-[10px]">
                                 #{idx + 1}
                              </div>
                              <div className="max-w-[110px]">
                                 <h4 className="text-[10px] font-bold text-gray-900 truncate uppercase tracking-tight">{offer.title}</h4>
                                 <p className="text-[8px] font-bold text-gray-400">{offer.count} Redemptions</p>
                              </div>
                           </div>
                           <ChevronRightRoundedIcon className="text-gray-300 group-hover:text-[#5EB929]" sx={{ fontSize: 14 }} />
                        </div>
                      ))
                   )}
                </div>
             </div>

             {/* Recent Activity Mini-List */}
             <div className="px-1">
                <div className="flex items-center justify-between mb-3">
                   <h3 className="text-[10px] font-bold text-gray-400 uppercase tracking-[0.2em]">Live Activity</h3>
                   <button onClick={() => navigate('/merchant/bookings')} className="text-[8px] font-bold text-[#5EB929] uppercase hover:underline">Full Feed</button>
                </div>
                <div className="space-y-2">
                   {stats.history.map((booking, idx) => (
                      <div key={idx} className="flex items-center justify-between bg-white/40 p-2 rounded-xl border border-transparent hover:border-gray-100 transition-all">
                         <div className="flex items-center gap-2.5">
                            <div className="w-7 h-7 rounded-full bg-indigo-50 flex items-center justify-center text-[9px] font-bold text-indigo-500 uppercase">
                               {booking.customerName?.[0]}
                            </div>
                            <div>
                               <p className="text-[10px] font-bold text-gray-900 leading-none mb-0.5">{booking.customerName}</p>
                               <p className="text-[8px] font-bold text-gray-400 uppercase">₹{booking.totals?.final}</p>
                            </div>
                         </div>
                         <div className="text-right">
                            <p className="text-[8px] font-bold text-[#5EB929] uppercase">Verified</p>
                            <p className="text-[7px] text-gray-400 font-bold uppercase">{new Date(booking.createdAt).toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' })}</p>
                         </div>
                      </div>
                   ))}
                </div>
             </div>
          </div>

        </div>
      </div>
    </div>
  );
};

export default MerchantDashboard;
