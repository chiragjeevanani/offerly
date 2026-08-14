import { useState } from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import { useQuery, useQueryClient } from '@tanstack/react-query';
import { adminAPI } from '../../../api/admin.api';
import NotificationsRoundedIcon from '@mui/icons-material/NotificationsRounded';
import DoneAllRoundedIcon from '@mui/icons-material/DoneAllRounded';
import CircleRoundedIcon from '@mui/icons-material/CircleRounded';
import RefreshRoundedIcon from '@mui/icons-material/RefreshRounded';
import InfoRoundedIcon from '@mui/icons-material/InfoRounded';
import CheckCircleRoundedIcon from '@mui/icons-material/CheckCircleRounded';
import ErrorRoundedIcon from '@mui/icons-material/ErrorRounded';
import toast from 'react-hot-toast';
import { useSocket } from '../../../hooks/useSocket';

const Notifications = () => {
  const queryClient = useQueryClient();
  const { socket } = useSocket();
  const [activeTab, setActiveTab] = useState('all'); // 'all', 'unread'

  const { data: notifications = [], isLoading: loading, refetch, isFetching } = useQuery({
    queryKey: ['adminNotifications'],
    queryFn: async () => {
      const res = await adminAPI.getNotifications();
      return (res.data || []).sort((a, b) => new Date(b.createdAt) - new Date(a.createdAt));
    }
  });

  const filteredNotifications = notifications.filter(n => 
    activeTab === 'all' || !n.isRead
  );

  const markAsRead = async (id) => {
    try {
      await adminAPI.markNotificationRead(id);
      queryClient.setQueryData(['adminNotifications'], (old) => 
        old.map(n => n._id === id ? { ...n, isRead: true } : n)
      );
    } catch (err) {
      toast.error('Failed to update notification');
    }
  };

  const markAllAsRead = async () => {
    try {
      // In a real scenario, this would call a markAll endpoint
      // For now, we loop or wait for next fetch
      toast.success('Marking all as read...');
      queryClient.invalidateQueries(['adminNotifications']);
    } catch (err) {}
  };

  const getIcon = (type) => {
    switch (type) {
      case 'success': return <CheckCircleRoundedIcon className="text-green-500" sx={{ fontSize: 20 }} />;
      case 'error': return <ErrorRoundedIcon className="text-red-500" sx={{ fontSize: 20 }} />;
      case 'warning': return <InfoRoundedIcon className="text-amber-500" sx={{ fontSize: 20 }} />;
      default: return <NotificationsRoundedIcon className="text-indigo-500" sx={{ fontSize: 20 }} />;
    }
  };

  return (
    <div className="min-h-[calc(100vh-80px)] bg-background p-4 lg:p-8 -m-6 lg:-m-8 font-sans text-gray-800 lg:rounded-tl-[32px]">
      <div className="max-w-4xl mx-auto">
        {/* Header Section */}
        <div className="flex flex-col md:flex-row md:items-center justify-between gap-2 mb-6">
          <div>
            <h1 className="text-xl lg:text-2xl font-medium text-gray-800">Notifications</h1>
            <p className="text-[12px] text-gray-500">Stay updated with real-time platform activity</p>
          </div>

          <div className="flex items-center gap-2">
            <button
              onClick={markAllAsRead}
              className="flex items-center gap-2 bg-white hover:bg-gray-50 text-gray-700 px-4 py-2 rounded-[10px] border border-gray-100 transition-all text-[12px] font-medium shadow-sm active:scale-95"
            >
              <DoneAllRoundedIcon sx={{ fontSize: 16 }} />
              Mark All Read
            </button>
            <button
              onClick={() => refetch()}
              className="flex items-center gap-2 bg-white hover:bg-gray-50 text-gray-700 px-4 py-2 rounded-[10px] border border-gray-100 transition-all text-[12px] font-medium shadow-sm active:scale-95 disabled:opacity-50"
              disabled={isFetching}
            >
              <RefreshRoundedIcon sx={{ fontSize: 16 }} className={isFetching ? 'animate-spin' : ''} />
            </button>
          </div>
        </div>

        {/* Tab Selection */}
        <div className="flex items-center gap-1.5 bg-white/50 p-1 rounded-[12px] border border-gray-100 mb-4 w-fit">
          <button
            onClick={() => setActiveTab('all')}
            className={`px-5 py-1.5 text-[12px] font-medium transition-all duration-300 rounded-[10px] ${
              activeTab === 'all' ? 'bg-[#5EB929] text-white shadow-md' : 'text-gray-500 hover:text-gray-700'
            }`}
          >
            All Alerts
          </button>
          <button
            onClick={() => setActiveTab('unread')}
            className={`px-5 py-1.5 text-[12px] font-medium transition-all duration-300 rounded-[10px] flex items-center gap-2 ${
              activeTab === 'unread' ? 'bg-[#5EB929] text-white shadow-md' : 'text-gray-500 hover:text-gray-700'
            }`}
          >
            Unread
            {notifications.filter(n => !n.isRead).length > 0 && (
              <span className={`w-1.5 h-1.5 rounded-full ${activeTab === 'unread' ? 'bg-white' : 'bg-[#5EB929]'}`} />
            )}
          </button>
        </div>

        {loading ? (
          <div className="py-20 flex flex-col items-center justify-center gap-4">
            <div className="w-10 h-10 border-2 border-primary/20 border-t-primary rounded-full animate-spin" />
            <p className="text-gray-500 font-medium text-xs">Fetching Alerts...</p>
          </div>
        ) : filteredNotifications.length > 0 ? (
          <div className="grid grid-cols-1 gap-2">
            <AnimatePresence initial={false}>
              {filteredNotifications.map((n) => (
                <motion.div
                  key={n._id}
                  initial={{ opacity: 0, y: 10 }}
                  animate={{ opacity: 1, y: 0 }}
                  className={`bg-white rounded-xl p-3 border border-gray-100 shadow-sm transition-all flex items-start gap-4 relative group ${!n.isRead ? 'border-l-4 border-l-[#5EB929]' : ''}`}
                >
                  <div className={`mt-1 w-10 h-10 rounded-full flex items-center justify-center ${!n.isRead ? 'bg-primary/5' : 'bg-gray-50 opacity-60'}`}>
                    {getIcon(n.type)}
                  </div>
                  
                  <div className="flex-1 min-w-0">
                    <div className="flex justify-between items-start mb-0.5">
                      <h4 className={`text-[14px] font-semibold truncate ${!n.isRead ? 'text-gray-800' : 'text-gray-400'}`}>
                        {n.title}
                      </h4>
                      <span className="text-[10px] font-bold text-gray-400 uppercase tracking-widest whitespace-nowrap ml-4">
                        {new Date(n.createdAt).toLocaleDateString([], { month: 'short', day: 'numeric' })}
                      </span>
                    </div>
                    <p className={`text-[12px] leading-snug ${!n.isRead ? 'text-gray-600' : 'text-gray-400 opacity-80'}`}>
                      {n.body}
                    </p>
                    
                    {!n.isRead && (
                      <button
                        onClick={() => markAsRead(n._id)}
                        className="mt-2 flex items-center gap-1 text-[9px] font-bold uppercase tracking-widest text-primary hover:text-[#2d5a3a] transition-colors"
                      >
                        <DoneAllRoundedIcon sx={{ fontSize: 14 }} />
                        Mark Read
                      </button>
                    )}
                  </div>

                  {!n.isRead && (
                    <div className="absolute top-3 right-3">
                       <CircleRoundedIcon sx={{ fontSize: 6 }} className="text-primary animate-pulse" />
                    </div>
                  )}
                </motion.div>
              ))}
            </AnimatePresence>
          </div>
        ) : (
          <div className="py-20 text-center bg-white rounded-3xl border border-dashed border-gray-200">
            <NotificationsRoundedIcon className="text-gray-200 mb-4" sx={{ fontSize: 64 }} />
            <h3 className="text-lg font-semibold text-gray-400">All Caught Up</h3>
            <p className="text-sm text-gray-400 mt-1">No new notifications to show</p>
          </div>
        )}
      </div>
    </div>
  );
};

export default Notifications;
