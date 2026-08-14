import { useState, useEffect } from 'react';
import { motion } from 'framer-motion';
import NotificationsRoundedIcon from '@mui/icons-material/NotificationsRounded';
import LocalOfferRoundedIcon from '@mui/icons-material/LocalOfferRounded';
import ReceiptRoundedIcon from '@mui/icons-material/ReceiptRounded';
import CardGiftcardRoundedIcon from '@mui/icons-material/CardGiftcardRounded';
import DoneAllRoundedIcon from '@mui/icons-material/DoneAllRounded';
import { userAPI } from '../../../../api/user.api';
import { useApp } from '../../context/AppContext';
import PageTransition from '../../components/ui/PageTransition';

const typeConfig = {
  redemption: { icon: ReceiptRoundedIcon, color: 'text-[#5EB929]', bg: 'bg-[#5EB929]/5' },
  review: { icon: NotificationsRoundedIcon, color: 'text-amber-600', bg: 'bg-amber-50' },
  offer: { icon: LocalOfferRoundedIcon, color: 'text-blue-600', bg: 'bg-blue-50' },
  referral: { icon: CardGiftcardRoundedIcon, color: 'text-purple-600', bg: 'bg-purple-50' },
};

const Notifications = () => {
  const { refreshUnread, isLoggedIn } = useApp();
  const [notifications, setNotifications] = useState([]);
  const [loading, setLoading] = useState(true);

  const fetchNotifications = async () => {
    if (!isLoggedIn) return;
    try {
      const res = await userAPI.getNotifications();
      setNotifications(res.notifications || res.data || []);
    } catch (error) {
      console.error('Failed to fetch notifications:', error);
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    fetchNotifications();
  }, [isLoggedIn]);

  const handleMarkAllRead = async () => {
    try {
      await userAPI.markAllNotificationsRead();
      fetchNotifications();
      refreshUnread();
    } catch (error) {}
  };

  const handleRead = async (id) => {
    try {
      await userAPI.markNotificationRead(id);
      fetchNotifications();
      refreshUnread();
    } catch (error) {}
  };

  const unread = notifications.filter((n) => !n.isRead);
  const read = notifications.filter((n) => n.isRead);

  const formatDate = (dateStr) => {
    const date = new Date(dateStr);
    const now = new Date();
    const diff = Math.floor((now - date) / 1000);
    if (diff < 60) return 'Just now';
    if (diff < 3600) return `${Math.floor(diff / 60)}m ago`;
    if (diff < 86400) return `${Math.floor(diff / 3600)}h ago`;
    return date.toLocaleDateString('en-IN', { day: 'numeric', month: 'short' });
  };

  const NotifItem = ({ notif }) => {
    const config = typeConfig[notif.type] || typeConfig.offer;
    const Icon = config.icon;

    return (
      <motion.button
        whileTap={{ scale: 0.98 }}
        onClick={() => handleRead(notif.id)}
        className={`w-full flex items-start gap-3 p-4 rounded-2xl transition-all text-left ${
          !notif.read ? 'bg-primary-light border border-primary/20' : 'bg-surface'
        } shadow-card`}
      >
        <div className={`w-10 h-10 rounded-xl flex items-center justify-center flex-shrink-0 ${config.bg}`}>
          <Icon sx={{ fontSize: 20 }} className={config.color} />
        </div>
        <div className="flex-1 min-w-0">
          <div className="flex items-center justify-between gap-2">
            <p className="text-sm font-semibold text-text-primary">{notif.title}</p>
            {!notif.read && (
              <div className="w-2 h-2 bg-primary rounded-full flex-shrink-0" />
            )}
          </div>
          <p className="text-xs text-text-secondary mt-0.5 leading-relaxed">{notif.body}</p>
          <p className="text-xs text-text-secondary/70 mt-1.5">{formatDate(notif.createdAt)}</p>
        </div>
      </motion.button>
    );
  };

  return (
    <PageTransition>
      <div className="min-h-screen bg-background px-4 py-4 pb-24 space-y-4">
        
        {/* Header Strip */}
        <div className="flex items-center justify-between px-0.5">
          <div className="flex flex-col">
            <p className="text-[9px] text-gray-400 font-bold uppercase tracking-widest leading-none">System Alerts</p>
            <p className="text-[11px] text-gray-800 font-bold mt-0.5 uppercase">
              {unread.length > 0 ? `${unread.length} UNREAD NOTIFICATIONS` : 'ALL CAUGHT UP'}
            </p>
          </div>
          {unread.length > 0 && (
            <button
              onClick={handleMarkAllRead}
              className="text-[10px] font-bold text-[#5EB929] uppercase tracking-widest bg-[#5EB929]/5 px-3 py-1.5 rounded-xl active:scale-95 transition-all"
            >
              Mark all read
            </button>
          )}
        </div>

        {notifications.length === 0 ? (
          <div className="flex flex-col items-center justify-center py-28 text-center">
            <div className="w-20 h-20 bg-white rounded-3xl flex items-center justify-center mb-6 shadow-sm border border-gray-100">
              <NotificationsRoundedIcon sx={{ fontSize: 32 }} className="text-gray-200" />
            </div>
            <h2 className="text-sm font-bold text-gray-800 uppercase tracking-tight">Inbox is empty</h2>
            <p className="text-[11px] text-gray-400 font-medium px-10 mt-1 leading-relaxed">
              We'll notify you here about new offers, rewards, and redemption updates.
            </p>
          </div>
        ) : (
          <div className="space-y-6">
            {unread.length > 0 && (
              <section>
                <div className="flex items-center gap-2 mb-3">
                  <div className="h-1.5 w-1.5 rounded-full bg-[#5EB929] shadow-[0_0_8px_#5EB929]" />
                  <h3 className="text-[10px] font-bold text-gray-900 uppercase tracking-widest">New Alerts</h3>
                </div>
                <div className="space-y-2">
                  {unread.map((n, idx) => (
                    <motion.div
                      key={n.id}
                      initial={{ opacity: 0, y: 8 }}
                      animate={{ opacity: 1, y: 0 }}
                      transition={{ delay: idx * 0.05 }}
                    >
                      <NotifItem notif={n} />
                    </motion.div>
                  ))}
                </div>
              </section>
            )}

            {read.length > 0 && (
              <section>
                <div className="flex items-center gap-2 mb-3">
                  <div className="h-1.5 w-1.5 rounded-full bg-gray-300" />
                  <h3 className="text-[10px] font-bold text-gray-400 uppercase tracking-widest">Earlier</h3>
                </div>
                <div className="space-y-2">
                  {read.map((n, idx) => (
                    <motion.div
                      key={n.id}
                      initial={{ opacity: 0, y: 8 }}
                      animate={{ opacity: 1, y: 0 }}
                      transition={{ delay: idx * 0.05 }}
                    >
                      <NotifItem notif={n} />
                    </motion.div>
                  ))}
                </div>
              </section>
            )}
          </div>
        )}
      </div>
    </PageTransition>
  );
};

export default Notifications;
