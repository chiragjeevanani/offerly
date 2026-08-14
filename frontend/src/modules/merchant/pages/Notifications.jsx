import { useState, useEffect } from 'react';
import { useNavigate } from 'react-router-dom';
import { motion, AnimatePresence } from 'framer-motion';
import ArrowBackRoundedIcon from '@mui/icons-material/ArrowBackRounded';
import NotificationsRoundedIcon from '@mui/icons-material/NotificationsRounded';
import ReceiptLongRoundedIcon from '@mui/icons-material/ReceiptLongRounded';
import LocalOfferRoundedIcon from '@mui/icons-material/LocalOfferRounded';
import PaymentRoundedIcon from '@mui/icons-material/PaymentRounded';
import StorefrontRoundedIcon from '@mui/icons-material/StorefrontRounded';
import WorkspacePremiumRoundedIcon from '@mui/icons-material/WorkspacePremiumRounded';
import DoneAllRoundedIcon from '@mui/icons-material/DoneAllRounded';
import { merchantAPI } from '../../../api/merchant.api';
import toast from 'react-hot-toast';

const typeConfig = {
  booking_new: { icon: ReceiptLongRoundedIcon, color: 'text-emerald-600', bg: 'bg-emerald-50' },
  booking_fulfilled: { icon: ReceiptLongRoundedIcon, color: 'text-[#3D7A4F]', bg: 'bg-[#3D7A4F]/10' },
  subscription_expiry: { icon: WorkspacePremiumRoundedIcon, color: 'text-amber-600', bg: 'bg-amber-50' },
  offer_approved: { icon: LocalOfferRoundedIcon, color: 'text-indigo-600', bg: 'bg-indigo-50' },
  payment: { icon: PaymentRoundedIcon, color: 'text-blue-600', bg: 'bg-blue-50' },
  store_status: { icon: StorefrontRoundedIcon, color: 'text-[#3D7A4F]', bg: 'bg-[#3D7A4F]/5' },
  general: { icon: NotificationsRoundedIcon, color: 'text-gray-400', bg: 'bg-gray-100' },
};

const Notifications = () => {
  const navigate = useNavigate();
  const [notifications, setNotifications] = useState([]);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    fetchNotifications();
  }, []);

  const fetchNotifications = async () => {
    try {
      setLoading(true);
      const response = await merchantAPI.getNotifications();
      if (response.success) setNotifications(response.notifications || []);
    } catch (error) { toast.error('Sync Error'); }
    finally { setLoading(false); }
  };

  const handleMarkAllRead = async () => {
    try {
      const response = await merchantAPI.markAllNotificationsRead();
      if (response.success) {
        setNotifications(notifications.map(n => ({ ...n, isRead: true })));
        toast.success('Caught up! ✅');
      }
    } catch (error) { toast.error('Failed'); }
  };

  const handleRead = async (id) => {
    try {
      const response = await merchantAPI.markNotificationRead(id);
      if (response.success) {
        setNotifications(notifications.map(n => n._id === id ? { ...n, isRead: true } : n));
      }
    } catch (error) {}
  };

  const formatDate = (dateStr) => {
    const date = new Date(dateStr);
    const now = new Date();
    const diff = Math.floor((now - date) / 1000);
    if (diff < 60) return 'Now';
    if (diff < 3600) return `${Math.floor(diff / 60)}m`;
    if (diff < 86400) return `${Math.floor(diff / 3600)}h`;
    return date.toLocaleDateString(undefined, { day: 'numeric', month: 'short' });
  };

  const unread = notifications.filter((n) => !n.isRead);
  const read = notifications.filter((n) => n.isRead);

  if (loading) {
    return (
      <div className="min-h-screen bg-[#F8F5FF] flex flex-col items-center justify-center gap-3">
        <div className="w-10 h-10 border-2 border-[#3D7A4F]/20 border-t-[#3D7A4F] rounded-full animate-spin" />
        <p className="text-[10px] font-black text-gray-400 uppercase tracking-widest">Checking Feed...</p>
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-[#F8F5FF] pb-20">
      {/* Premium Sticky Header */}
      <div className="sticky top-0 z-50 bg-white/80 backdrop-blur-xl border-b border-gray-100 px-4 py-3 flex items-center justify-between gap-4">
        <div className="flex items-center gap-3">
          <button onClick={() => navigate(-1)} className="w-9 h-9 flex items-center justify-center rounded-xl bg-gray-50 text-gray-400 hover:bg-gray-100 transition-all active:scale-95">
            <ArrowBackRoundedIcon sx={{ fontSize: 20 }} />
          </button>
          <div>
            <h1 className="text-[15px] font-black text-gray-900 leading-none">Notifications</h1>
            <p className="text-[9px] font-bold text-[#3D7A4F] uppercase tracking-widest mt-1.5">{unread.length} Unread Actions</p>
          </div>
        </div>
        
        {unread.length > 0 && (
          <button onClick={handleMarkAllRead} className="flex items-center gap-2 px-3 py-1.5 bg-[#3D7A4F]/10 text-[#3D7A4F] rounded-lg text-[10px] font-black uppercase hover:bg-[#3D7A4F] hover:text-white transition-all">
            <DoneAllRoundedIcon sx={{ fontSize: 16 }} />
            Mark All
          </button>
        )}
      </div>

      {/* Main Content Area */}
      <div className="max-w-3xl mx-auto px-4 py-6">
        {notifications.length === 0 ? (
          <motion.div initial={{ opacity: 0, y: 20 }} animate={{ opacity: 1, y: 0 }} className="flex flex-col items-center justify-center py-32 text-center">
            <div className="w-24 h-24 bg-white rounded-3xl flex items-center justify-center mb-6 shadow-xl shadow-gray-200/50 border border-gray-50">
              <NotificationsRoundedIcon sx={{ fontSize: 48 }} className="text-gray-200" />
            </div>
            <h2 className="text-lg font-black text-gray-900 tracking-tight">Inbox Zero</h2>
            <p className="text-xs font-medium text-gray-500 mt-2">You've cleared all your alerts. Take a break!</p>
          </motion.div>
        ) : (
          <div className="space-y-8">
            {unread.length > 0 && (
              <section>
                <div className="flex items-center gap-3 mb-4 px-1">
                   <div className="w-1.5 h-4 bg-[#3D7A4F] rounded-full" />
                   <h3 className="text-[11px] font-black text-gray-900 uppercase tracking-widest">Active Alerts</h3>
                </div>
                <div className="space-y-3">
                  {unread.map((n, idx) => (
                    <NotifStrip key={n._id} notif={n} idx={idx} handleRead={handleRead} formatDate={formatDate} />
                  ))}
                </div>
              </section>
            )}

            {read.length > 0 && (
              <section>
                <div className="flex items-center gap-3 mb-4 px-1">
                   <div className="w-1.5 h-4 bg-gray-300 rounded-full" />
                   <h3 className="text-[11px] font-black text-gray-400 uppercase tracking-widest">Earlier Feed</h3>
                </div>
                <div className="space-y-3">
                  {read.map((n, idx) => (
                    <NotifStrip key={n._id} notif={n} idx={idx} handleRead={handleRead} formatDate={formatDate} isRead />
                  ))}
                </div>
              </section>
            )}
          </div>
        )}
      </div>
    </div>
  );
};

const NotifStrip = ({ notif, idx, handleRead, formatDate, isRead }) => {
  const config = typeConfig[notif.type] || typeConfig.general;
  const Icon = config.icon;

  return (
    <motion.div
      initial={{ opacity: 0, x: -10 }}
      animate={{ opacity: 1, x: 0 }}
      transition={{ delay: idx * 0.05 }}
      onClick={() => !isRead && handleRead(notif._id)}
      className={`group flex items-start gap-4 p-4 rounded-2xl border transition-all cursor-pointer ${
        !isRead 
        ? 'bg-white border-[#3D7A4F]/20 shadow-lg shadow-[#3D7A4F]/5 ring-1 ring-[#3D7A4F]/5' 
        : 'bg-white/50 border-gray-100 hover:bg-white hover:border-gray-200'
      }`}
    >
      <div className={`w-11 h-11 rounded-xl flex items-center justify-center flex-shrink-0 transition-transform group-hover:scale-110 ${config.bg}`}>
        <Icon sx={{ fontSize: 20 }} className={config.color} />
      </div>
      <div className="flex-1 min-w-0">
        <div className="flex items-start justify-between gap-3">
           <div className="min-w-0">
              <h4 className={`text-[13px] font-black leading-tight truncate ${!isRead ? 'text-gray-900' : 'text-gray-500'}`}>{notif.title}</h4>
              <p className={`text-[12px] font-medium mt-1 leading-relaxed ${!isRead ? 'text-gray-600' : 'text-gray-400'}`}>{notif.body}</p>
           </div>
           {!isRead && (
             <div className="w-2 h-2 bg-[#3D7A4F] rounded-full shadow-[0_0_8px_rgba(61,122,79,0.5)] flex-shrink-0 mt-1" />
           )}
        </div>
        <div className="flex items-center justify-between mt-3">
           <span className="text-[10px] font-black text-gray-400 uppercase tracking-tighter">{formatDate(notif.createdAt)}</span>
           <span className="text-[9px] font-bold text-[#3D7A4F] opacity-0 group-hover:opacity-100 transition-opacity">Dismiss</span>
        </div>
      </div>
    </motion.div>
  );
};

export default Notifications;
