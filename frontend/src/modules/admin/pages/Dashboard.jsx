import { useMemo } from 'react';
import { useNavigate } from 'react-router-dom';
import { useQuery } from '@tanstack/react-query';
import ChevronRightRoundedIcon from '@mui/icons-material/ChevronRightRounded';
import GroupRoundedIcon from '@mui/icons-material/GroupRounded';
import StorefrontRoundedIcon from '@mui/icons-material/StorefrontRounded';
import LocalOfferRoundedIcon from '@mui/icons-material/LocalOfferRounded';
import SecurityRoundedIcon from '@mui/icons-material/SecurityRounded';
import FavoriteRoundedIcon from '@mui/icons-material/FavoriteRounded';
import ErrorOutlineRoundedIcon from '@mui/icons-material/ErrorOutlineRounded';
import CircleRoundedIcon from '@mui/icons-material/CircleRounded';
import { adminAPI } from '../../../api/admin.api';

const AdminDashboard = () => {
  const navigate = useNavigate();

  const { data: dashboardData, isLoading, error } = useQuery({
    queryKey: ['adminDashboard'],
    queryFn: async () => {
      const response = await adminAPI.getDashboardStats();
      if (response.success) return response.data;
      throw new Error('Failed to fetch dashboard stats');
    },
    staleTime: 1000 * 60 * 5,
  });

  const { stats, todaysRedemptions, liveActivities } = useMemo(() => {
    if (!dashboardData) return { stats: {}, todaysRedemptions: 0, liveActivities: [] };

    const s = dashboardData.stats || {};
    const charts = dashboardData.charts || {};
    
    // Calculate today's redemptions
    const todayStr = new Date().toISOString().split('T')[0];
    const todayData = (charts.dailyRedemptions || []).find(item => item.date === todayStr);
    const todayCount = todayData ? todayData.count : 0;

    // Compile Live Activity
    const recentMerchants = (dashboardData.recentMerchants || []).map(m => ({
      id: `m_${m._id}`,
      text: `New merchant registered: ${m.storeName}`,
      date: new Date(m.createdAt),
      type: 'merchant'
    }));

    const recentRedemptions = (dashboardData.recentRedemptions || []).map(r => ({
      id: `r_${r._id}`,
      text: `Offer redeemed by ${r.customerId?.name || 'Guest'}`,
      date: new Date(r.createdAt),
      type: 'redemption'
    }));

    const combined = [...recentMerchants, ...recentRedemptions]
      .sort((a, b) => b.date - a.date)
      .slice(0, 8); // Show more on desktop

    return { stats: s, todaysRedemptions: todayCount, liveActivities: combined };
  }, [dashboardData]);

  if (isLoading) {
    return (
      <div className="flex items-center justify-center min-h-[60vh]">
        <div className="w-8 h-8 border-4 border-[#5EB929] border-t-transparent rounded-full animate-spin" />
      </div>
    );
  }

  if (error) {
    return (
      <div className="p-4 text-center text-red-500 font-bold bg-red-50 rounded-xl">
        Failed to load dashboard data.
      </div>
    );
  }

  return (
    <div className="min-h-[calc(100vh-80px)] bg-background p-6 lg:p-10 -m-6 lg:-m-8 font-sans text-gray-800 lg:rounded-tl-[32px]">
      <div className="max-w-7xl mx-auto">
      {/* Header Section */}
      <div className="mb-5">
        <h1 className="text-2xl lg:text-3xl font-medium text-gray-800 mb-0.5">Admin Dashboard</h1>
        <p className="text-sm text-gray-500 tracking-tight">Today's Activity Protocol</p>
      </div>

      {/* Top Stat Cards */}
      <div className="grid grid-cols-2 lg:grid-cols-4 gap-3 lg:gap-4 mb-6 lg:mb-8">
        <div className="bg-white rounded-[12px] px-4 py-3.5 lg:p-5 shadow-sm border border-gray-100 hover:shadow-md transition-shadow">
          <p className="text-[12px] font-medium text-gray-500 mb-1">Users</p>
          <h2 className="text-[22px] leading-tight lg:text-3xl font-semibold text-gray-800">{(stats.totalCustomers || 0).toLocaleString()}</h2>
        </div>
        <div className="bg-white rounded-[12px] px-4 py-3.5 lg:p-5 shadow-sm border border-gray-100 hover:shadow-md transition-shadow">
          <p className="text-[12px] font-medium text-gray-500 mb-1">Merchants</p>
          <h2 className="text-[22px] leading-tight lg:text-3xl font-semibold text-gray-800">{(stats.totalMerchants || 0).toLocaleString()}</h2>
        </div>
        <div className="bg-white rounded-[12px] px-4 py-3.5 lg:p-5 shadow-sm border border-gray-100 hover:shadow-md transition-shadow">
          <p className="text-[12px] font-medium text-gray-500 mb-1">Active Offers</p>
          <h2 className="text-[22px] leading-tight lg:text-3xl font-semibold text-gray-800">{(stats.activeOffers || 0).toLocaleString()}</h2>
        </div>
        <div className="bg-white rounded-[12px] px-4 py-3.5 lg:p-5 shadow-sm border border-gray-100 hover:shadow-md transition-shadow">
          <p className="text-[12px] font-medium text-gray-500 mb-1">Today's Redemptions</p>
          <h2 className="text-[22px] leading-tight lg:text-3xl font-semibold text-gray-800">{todaysRedemptions.toLocaleString()}</h2>
        </div>
      </div>

      {/* Main Grid for Desktop */}
      <div className="grid grid-cols-1 lg:grid-cols-12 gap-6 lg:gap-8">
        
        {/* Left Column: Actions & Controls */}
        <div className="lg:col-span-7 space-y-6 lg:space-y-8">
          
          {/* Pending Actions */}
          <div>
            <h3 className="text-[15px] font-semibold text-gray-700 mb-3 px-1">Pending Actions</h3>
            <div className="grid grid-cols-2 gap-3 lg:gap-4">
              
              <button 
                onClick={() => navigate('/admin/merchants')}
                className="flex items-center justify-between bg-white rounded-[10px] px-3.5 py-3 lg:p-4 shadow-sm border border-gray-100 hover:bg-gray-50 transition-colors group"
              >
                <span className="text-[12px] font-medium text-gray-500 group-hover:text-gray-700">Merchant Approvals</span>
                <span className="text-[12px] font-bold text-gray-800">
                  {stats.pendingMerchants || 0}
                </span>
              </button>

              <button 
                className="flex items-center justify-between bg-white rounded-[10px] px-3.5 py-3 lg:p-4 shadow-sm border border-gray-100 hover:bg-gray-50 transition-colors group"
              >
                <span className="text-[12px] font-medium text-gray-500 group-hover:text-gray-700">Reported Issues</span>
                <ChevronRightRoundedIcon sx={{ fontSize: 16 }} className="text-gray-400 group-hover:text-gray-600 transition-colors" />
              </button>

              <button 
                onClick={() => navigate('/admin/ads')}
                className="flex items-center justify-between bg-white rounded-[10px] px-3.5 py-3 lg:p-4 shadow-sm border border-gray-100 hover:bg-gray-50 transition-colors group"
              >
                <span className="text-[12px] font-medium text-gray-500 group-hover:text-gray-700">Ad Requests</span>
                <ChevronRightRoundedIcon sx={{ fontSize: 16 }} className="text-gray-400 group-hover:text-gray-600 transition-colors" />
              </button>

              <button 
                onClick={() => navigate('/admin/notifications')}
                className="flex items-center justify-between bg-white rounded-[10px] px-3.5 py-3 lg:p-4 shadow-sm border border-gray-100 hover:bg-gray-50 transition-colors group"
              >
                <div className="flex items-center gap-2">
                  <FavoriteRoundedIcon sx={{ fontSize: 14 }} className="text-[#6C8E75]" />
                  <span className="text-[12px] font-medium text-gray-500 group-hover:text-gray-700">System Alerts</span>
                </div>
                <ChevronRightRoundedIcon sx={{ fontSize: 16 }} className="text-gray-400 group-hover:text-gray-600 transition-colors" />
              </button>

            </div>
          </div>

          {/* Quick Controls */}
          <div>
            <h3 className="text-[15px] font-semibold text-gray-700 mb-3 px-1">Quick Controls</h3>
            <div className="grid grid-cols-2 gap-3 lg:gap-4">
              
              <button 
                onClick={() => navigate('/admin/merchants')}
                className="flex items-center gap-2.5 bg-white rounded-[10px] px-3.5 py-3 lg:p-4 shadow-sm border border-gray-100 hover:bg-gray-50 transition-colors group"
              >
                <StorefrontRoundedIcon sx={{ fontSize: 16 }} className="text-[#5EB929] group-hover:scale-110 transition-transform" />
                <span className="text-[12px] font-medium text-gray-500 group-hover:text-gray-700 transition-colors text-left leading-tight">Manage Merchants</span>
              </button>

              <button 
                onClick={() => navigate('/admin/categories')}
                className="flex items-center gap-2.5 bg-white rounded-[10px] px-3.5 py-3 lg:p-4 shadow-sm border border-gray-100 hover:bg-gray-50 transition-colors group"
              >
                <LocalOfferRoundedIcon sx={{ fontSize: 16 }} className="text-[#5EB929] group-hover:scale-110 transition-transform" />
                <span className="text-[12px] font-medium text-gray-500 group-hover:text-gray-700 transition-colors text-left leading-tight">Manage Offers</span>
              </button>

              <button 
                onClick={() => navigate('/admin/users')}
                className="flex items-center gap-2.5 bg-white rounded-[10px] px-3.5 py-3 lg:p-4 shadow-sm border border-gray-100 hover:bg-gray-50 transition-colors group"
              >
                <GroupRoundedIcon sx={{ fontSize: 16 }} className="text-[#5EB929] group-hover:scale-110 transition-transform" />
                <span className="text-[12px] font-medium text-gray-500 group-hover:text-gray-700 transition-colors text-left leading-tight">User Management</span>
              </button>

              <button 
                className="flex items-center gap-2.5 bg-white rounded-[10px] px-3.5 py-3 lg:p-4 shadow-sm border border-gray-100 hover:bg-gray-50 transition-colors group"
              >
                <SecurityRoundedIcon sx={{ fontSize: 16 }} className="text-[#5EB929] group-hover:scale-110 transition-transform" />
                <span className="text-[12px] font-medium text-gray-500 group-hover:text-gray-700 transition-colors text-left leading-tight">Reports & Safety</span>
              </button>

            </div>
          </div>
        </div>

        {/* Right Column: Live Activity */}
        <div className="lg:col-span-5 h-full">
          <h3 className="text-base font-semibold text-gray-700 mb-4 px-1">Live Activity</h3>
          <div className="bg-white rounded-[20px] p-6 shadow-[0_2px_12px_-4px_rgba(0,0,0,0.05)] border border-gray-50 h-[calc(100%-2.5rem)] min-h-[300px]">
            {liveActivities.length === 0 ? (
              <div className="h-full flex flex-col items-center justify-center text-gray-400">
                <ErrorOutlineRoundedIcon sx={{ fontSize: 40 }} className="mb-2 opacity-50" />
                <p className="text-sm font-medium">No recent activity</p>
              </div>
            ) : (
              <div className="space-y-6">
                {liveActivities.map((activity, idx) => (
                  <div key={activity.id || idx} className="flex gap-4 relative">
                    {/* Vertical Timeline Line */}
                    {idx !== liveActivities.length - 1 && (
                      <div className="absolute left-1.5 top-6 bottom-[-24px] w-px bg-gray-100" />
                    )}
                    
                    <div className="mt-1">
                      <CircleRoundedIcon sx={{ fontSize: 12 }} className={activity.type === 'merchant' ? 'text-indigo-400' : 'text-[#5EB929]'} />
                    </div>
                    <div>
                      <p className="text-[14px] text-gray-700 font-medium leading-snug mb-0.5">
                        {activity.text}
                      </p>
                      <p className="text-[11px] text-gray-400 font-medium">
                        {new Date(activity.date).toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' })} 
                        <span className="mx-1">•</span> 
                        {new Date(activity.date).toLocaleDateString([], { month: 'short', day: 'numeric' })}
                      </p>
                    </div>
                  </div>
                ))}
              </div>
            )}
          </div>
        </div>

        </div>
      </div>
    </div>
  );
};

export default AdminDashboard;
