import { useState, useEffect } from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import SearchRoundedIcon from '@mui/icons-material/SearchRounded';
import QrCodeScannerRoundedIcon from '@mui/icons-material/QrCodeScannerRounded';
import CheckCircleRoundedIcon from '@mui/icons-material/CheckCircleRounded';
import HourglassEmptyRoundedIcon from '@mui/icons-material/HourglassEmptyRounded';
import VisibilityRoundedIcon from '@mui/icons-material/VisibilityRounded';
import ReceiptLongRoundedIcon from '@mui/icons-material/ReceiptLongRounded';
import TrendingUpRoundedIcon from '@mui/icons-material/TrendingUpRounded';
import PersonRoundedIcon from '@mui/icons-material/PersonRounded';
import CloseRoundedIcon from '@mui/icons-material/CloseRounded';
import AccessTimeRoundedIcon from '@mui/icons-material/AccessTimeRounded';
import ChevronRightRoundedIcon from '@mui/icons-material/ChevronRightRounded';
import { QRCodeSVG } from 'qrcode.react';
import { bookingAPI } from '../../../api/booking.api';
import { useNavigate } from 'react-router-dom';
import toast from 'react-hot-toast';
import { useSocket } from '../../../context/SocketContext';
import { playNotificationSound } from '../../../utils/notificationSound';

/* ─── Premium Slim Stat Card (3D Icon) ────────── */
const SlimStatCard = ({ title, value, icon: Icon, colorClass, delay = 0 }) => (
  <motion.div
    initial={{ opacity: 0, y: 15 }}
    animate={{ opacity: 1, y: 0 }}
    transition={{ delay, duration: 0.4 }}
    className="bg-white rounded-xl p-4 border border-gray-100 shadow-[0_2px_8px_rgba(0,0,0,0.02)] flex items-center justify-between group"
  >
    <div className="flex items-center gap-3">
      <div className={`w-11 h-11 rounded-xl ${colorClass} bg-opacity-10 flex items-center justify-center shadow-[inset_0_-2px_4px_rgba(0,0,0,0.05),0_4px_10px_rgba(0,0,0,0.05)]`}>
        <Icon className={colorClass.replace('bg-', 'text-')} sx={{ fontSize: 22 }} />
      </div>
      <div>
        <p className="text-[10px] font-black text-gray-400 uppercase tracking-widest leading-none">{title}</p>
        <h3 className="text-xl font-black text-gray-900 mt-1.5">{value}</h3>
      </div>
    </div>
  </motion.div>
);

/* ─── Booking Detail Modal ──────────────────────────────────────────────────── */
const BookingDetailModal = ({ booking, onClose, onFulfilled }) => {
  const [fulfilling, setFulfilling] = useState(false);
  const [fulfilled, setFulfilled] = useState(false);
  const [confirmFulfill, setConfirmFulfill] = useState(false);

  if (!booking) return null;

  const isPending = booking.status === 'pending';
  const isExpired = booking.qrExpiry && new Date(booking.qrExpiry) < new Date();

  const handleFulfill = async () => {
    if (!booking.qrToken) {
      toast.error('No QR token found');
      return;
    }
    setFulfilling(true);
    try {
      const res = await bookingAPI.verifyQR(booking.qrToken);
      if (res && res.success) {
        onFulfilled(booking._id);
        setFulfilled(true);
      } else {
        toast.error(res?.error || 'Verification failed');
      }
    } catch (err) {
      toast.error(err.response?.data?.error || 'Network error');
    } finally {
      setFulfilling(false);
    }
  };

  if (fulfilled) {
    return (
      <div className="fixed inset-0 bg-gray-950/40 backdrop-blur-sm flex items-center justify-center p-4 z-[100]">
        <motion.div initial={{ scale: 0.9, opacity: 0 }} animate={{ scale: 1, opacity: 1 }} className="bg-white rounded-2xl w-full max-w-sm shadow-2xl overflow-hidden p-8 text-center">
           <div className="w-16 h-16 bg-green-500 rounded-full flex items-center justify-center mx-auto mb-4 shadow-[0_4px_12px_rgba(34,197,94,0.3)]">
              <CheckCircleRoundedIcon className="text-white" sx={{ fontSize: 32 }} />
           </div>
           <h2 className="text-xl font-black text-gray-900 mb-1">Success!</h2>
           <p className="text-sm text-gray-500 mb-6 font-medium">Payment confirmed and booking fulfilled.</p>
           <button onClick={onClose} className="w-full py-3 bg-primary text-white rounded-xl font-bold shadow-lg shadow-primary/20 hover:scale-105 transition-all">Done</button>
        </motion.div>
      </div>
    );
  }

  return (
    <div className="fixed inset-0 bg-gray-950/40 backdrop-blur-sm flex items-center justify-center p-4 z-[100]">
      <motion.div initial={{ y: 20, opacity: 0 }} animate={{ y: 0, opacity: 1 }} className="bg-white rounded-2xl w-full max-w-md shadow-2xl overflow-hidden">
        <div className="p-5 border-b border-gray-50 flex items-center justify-between bg-gray-50/50">
          <div>
            <p className="text-[10px] font-black text-gray-400 uppercase tracking-widest">Order ID</p>
            <h2 className="text-base font-black text-gray-900">#{booking.internalId || booking._id?.slice(-6)}</h2>
          </div>
          <button onClick={onClose} className="w-8 h-8 rounded-lg bg-white border border-gray-100 flex items-center justify-center text-gray-400 hover:text-gray-600 transition-all">
            <CloseRoundedIcon sx={{ fontSize: 18 }} />
          </button>
        </div>

        <div className="p-6 space-y-5 max-h-[70vh] overflow-y-auto">
          <div className="flex items-center gap-3">
             <div className="w-10 h-10 rounded-full bg-primary/5 flex items-center justify-center text-primary shadow-[inset_0_2px_4px_rgba(0,0,0,0.05)]">
                <PersonRoundedIcon sx={{ fontSize: 20 }} />
             </div>
             <div>
                <h3 className="text-sm font-bold text-gray-900">{booking.customerName || 'Guest Customer'}</h3>
                <p className="text-[11px] text-gray-400 font-medium">Member since 0 Months</p>
             </div>
          </div>

          <div className="bg-[#F8F5FF] rounded-xl p-4 border border-gray-100">
             <h4 className="text-[10px] font-black text-gray-400 uppercase tracking-widest mb-3">Order Items</h4>
             <div className="space-y-2">
                {booking.items?.map((it, idx) => (
                  <div key={idx} className="flex justify-between items-center text-xs font-bold text-gray-700">
                    <span>{it.qty} × {it.product?.name || 'Product'}</span>
                    <span className="text-gray-900">₹{(it.qty * (it.product?.offerPrice || it.product?.price || 0)).toLocaleString()}</span>
                  </div>
                ))}
             </div>
             <div className="mt-3 pt-3 border-t border-gray-200 flex justify-between items-center">
                <span className="text-xs font-black text-gray-900 uppercase">Total to Collect</span>
                <span className="text-lg font-black text-[#3D7A4F]">₹{(booking.totals?.final || 0).toLocaleString()}</span>
             </div>
          </div>

          {booking.qrToken && isPending && !isExpired && (
            <div className="flex flex-col items-center gap-3 py-2">
               <div className="bg-white p-3 rounded-2xl border border-gray-100 shadow-lg">
                  <QRCodeSVG value={booking.qrToken} size={150} level="H" />
               </div>
               <p className="text-[10px] text-gray-400 font-bold uppercase tracking-widest">Verify QR Code at Counter</p>
            </div>
          )}
        </div>

        <div className="p-5 bg-gray-50 flex gap-3">
           <button onClick={onClose} className="flex-1 py-3 bg-white border border-gray-200 text-gray-500 rounded-xl font-bold text-sm hover:bg-gray-100 transition-all">Cancel</button>
           {isPending && !isExpired ? (
             <button 
              onClick={handleFulfill}
              disabled={fulfilling}
              className="flex-[2] py-3 bg-[#3D7A4F] text-white rounded-xl font-bold text-sm shadow-lg shadow-[#3D7A4F]/20 flex items-center justify-center gap-2 hover:scale-105 active:scale-95 transition-all shadow-[inset_0_-2px_4px_rgba(0,0,0,0.1)]"
             >
                {fulfilling ? <div className="w-4 h-4 border-2 border-white/20 border-t-white rounded-full animate-spin" /> : <QrCodeScannerRoundedIcon sx={{ fontSize: 18 }} />}
                Fulfill Booking
             </button>
           ) : (
             <div className="flex-[2] py-3 bg-gray-200 text-gray-400 rounded-xl font-bold text-sm text-center">Expired / Completed</div>
           )}
        </div>
      </motion.div>
    </div>
  );
};

/* ─── Main Bookings Page ────────────────────────────────────────────────────── */
const Bookings = ({ merchant }) => {
  const navigate = useNavigate();
  const [activeTab, setActiveTab] = useState('pending');
  const [bookings, setBookings] = useState([]);
  const [searchQuery, setSearchQuery] = useState('');
  const [selectedBooking, setSelectedBooking] = useState(null);
  const { socket } = useSocket();

  const fetchBookings = async () => {
    try {
      const response = await bookingAPI.getMerchantRedemptions();
      if (response.success) setBookings(response.data);
    } catch (err) {
      toast.error('Sync failed');
    }
  };

  useEffect(() => {
    if (merchant) {
      fetchBookings();
      const interval = setInterval(fetchBookings, 20000);
      return () => clearInterval(interval);
    }
  }, [merchant]);

  useEffect(() => {
    if (!socket || !merchant) return;
    const handleNotification = (notif) => {
      if (notif.type === 'new_booking') {
        playNotificationSound({ type: 'chime' });
        toast.success(`New request from ${notif.data?.customerName || 'Customer'}!`);
        fetchBookings();
      }
    };
    socket.on('merchant_notification', handleNotification);
    return () => socket.off('merchant_notification', handleNotification);
  }, [socket, merchant]);

  const handleFulfilled = (bookingId) => {
    setBookings(prev => prev.map(b =>
      b._id === bookingId ? { ...b, status: 'completed', scannedAt: new Date().toISOString() } : b
    ));
    setSelectedBooking(null);
  };

  const filtered = bookings.filter(b =>
    b.status === activeTab &&
    ((b.internalId || b._id || '').toLowerCase().includes(searchQuery.toLowerCase()) ||
      (b.customerName || '').toLowerCase().includes(searchQuery.toLowerCase()))
  );

  const pendingCount = bookings.filter(b => b.status === 'pending').length;
  const completedCount = bookings.filter(b => b.status === 'completed' || b.status === 'fulfilled').length;
  const totalRevenue = bookings.filter(b => b.status === 'completed' || b.status === 'fulfilled').reduce((sum, b) => sum + (b.totals?.final || 0), 0);

  return (
    <div className="min-h-screen bg-[#F8F5FF] p-4 lg:p-8 -m-6 lg:-m-8">
      <div className="max-w-7xl mx-auto space-y-6 pb-20">
        {/* Header */}
        <div className="flex flex-col md:flex-row md:items-center justify-between gap-4">
          <div>
            <div className="flex items-center gap-2 mb-1">
               <span className="w-2 h-2 rounded-full bg-red-500 animate-pulse" />
               <p className="text-[11px] font-black text-gray-400 uppercase tracking-widest">Live Booking Queue</p>
            </div>
            <h1 className="text-xl lg:text-2xl font-black text-gray-900">Manage Requests</h1>
          </div>
          <button 
            onClick={() => navigate('/merchant/scanner')}
            className="flex items-center justify-center gap-2 bg-[#3D7A4F] text-white px-5 py-2.5 rounded-xl font-bold shadow-[0_4px_12px_rgba(61,122,79,0.2),inset_0_-2px_4px_rgba(0,0,0,0.1)] hover:scale-105 transition-all text-xs active:scale-95"
          >
            <QrCodeScannerRoundedIcon sx={{ fontSize: 18 }} />
            Open Scanner
          </button>
        </div>

        {/* Stats Row */}
        <div className="grid grid-cols-1 sm:grid-cols-3 gap-4">
          <SlimStatCard title="Live Requests" value={pendingCount} icon={HourglassEmptyRoundedIcon} colorClass="bg-amber-500" delay={0.1} />
          <SlimStatCard title="Total Fulfilled" value={completedCount} icon={CheckCircleRoundedIcon} colorClass="bg-emerald-500" delay={0.2} />
          <SlimStatCard title="Booking Revenue" value={`₹${totalRevenue.toLocaleString()}`} icon={TrendingUpRoundedIcon} colorClass="bg-blue-500" delay={0.3} />
        </div>

        {/* Filters & Content */}
        <div className="space-y-4">
          <div className="flex flex-col md:flex-row gap-4 items-center justify-between">
            <div className="flex bg-white p-1 rounded-xl border border-gray-100 shadow-sm w-full md:w-auto">
              {[
                { key: 'pending', label: 'Live Queue', count: pendingCount },
                { key: 'completed', label: 'History', count: completedCount },
              ].map((tab) => (
                <button key={tab.key} onClick={() => setActiveTab(tab.key)}
                  className={`px-6 py-2 rounded-lg text-xs font-black uppercase tracking-widest transition-all flex items-center gap-2 ${
                    activeTab === tab.key ? 'bg-primary text-white shadow-md' : 'text-gray-400 hover:bg-gray-50'
                  }`}>
                  {tab.label}
                  <span className={`text-[9px] px-1.5 py-0.5 rounded-md ${activeTab === tab.key ? 'bg-white/20 text-white' : 'bg-gray-100 text-gray-400'}`}>{tab.count}</span>
                </button>
              ))}
            </div>
            <div className="relative w-full md:w-72 group">
              <SearchRoundedIcon className="absolute left-3.5 top-1/2 -translate-y-1/2 text-gray-400 group-focus-within:text-primary transition-colors" sx={{ fontSize: 18 }} />
              <input 
                type="text" placeholder="Search ID or Customer..." 
                value={searchQuery} onChange={(e) => setSearchQuery(e.target.value)}
                className="w-full pl-10 pr-4 py-2.5 bg-white rounded-xl border border-gray-100 outline-none focus:border-primary/30 text-xs font-bold transition-all shadow-sm"
              />
            </div>
          </div>

          <div className="space-y-2.5">
            <AnimatePresence mode="popLayout">
              {filtered.length === 0 ? (
                <motion.div initial={{ opacity: 0 }} animate={{ opacity: 1 }} className="py-20 text-center bg-white/50 rounded-2xl border border-dashed border-gray-200">
                  <ReceiptLongRoundedIcon sx={{ fontSize: 48 }} className="text-gray-200 mb-2" />
                  <p className="text-xs font-bold text-gray-400 uppercase tracking-widest">No matching requests</p>
                </motion.div>
              ) : (
                filtered.map((booking, idx) => (
                  <motion.div 
                    key={booking._id} 
                    initial={{ opacity: 0, x: -10 }} animate={{ opacity: 1, x: 0 }} transition={{ delay: idx * 0.05 }}
                    onClick={() => setSelectedBooking(booking)}
                    className="flex items-center justify-between p-3.5 bg-white rounded-xl border border-gray-50 hover:border-primary/30 hover:shadow-md transition-all group cursor-pointer"
                  >
                    <div className="flex items-center gap-4">
                      <div className="w-10 h-10 rounded-full bg-gray-50 flex items-center justify-center text-gray-400 font-black text-sm shadow-[inset_0_2px_4px_rgba(0,0,0,0.05)]">
                        {booking.customerName?.[0]?.toUpperCase() || 'G'}
                      </div>
                      <div>
                        <div className="flex items-center gap-2">
                           <h4 className="text-[13px] font-bold text-gray-800 leading-tight">{booking.customerName || 'Guest Customer'}</h4>
                           <span className={`text-[8px] font-black uppercase px-2 py-0.5 rounded-full ${booking.status === 'pending' ? 'bg-amber-50 text-amber-600' : 'bg-green-50 text-green-600'}`}>
                              {booking.status}
                           </span>
                        </div>
                        <div className="flex items-center gap-2 mt-1">
                          <span className="text-[9px] font-mono font-bold text-primary">#{booking.internalId || booking._id?.slice(-6)}</span>
                          <span className="text-[9px] text-gray-400 font-medium">• {new Date(booking.scannedAt || booking.createdAt).toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' })}</span>
                        </div>
                      </div>
                    </div>
                    <div className="flex items-center gap-4">
                       <div className="text-right hidden sm:block">
                          <p className="text-[10px] font-black text-gray-400 uppercase tracking-widest leading-none mb-1">Total Bill</p>
                          <p className="text-[14px] font-black text-[#3D7A4F]">₹{(booking.totals?.final || 0).toLocaleString()}</p>
                       </div>
                       <div className="w-8 h-8 rounded-lg bg-gray-50 flex items-center justify-center text-gray-300 group-hover:bg-primary/10 group-hover:text-primary transition-all">
                          <ChevronRightRoundedIcon sx={{ fontSize: 18 }} />
                       </div>
                    </div>
                  </motion.div>
                ))
              )}
            </AnimatePresence>
          </div>
        </div>
      </div>

      <AnimatePresence>
        {selectedBooking && (
          <BookingDetailModal
            booking={selectedBooking}
            onClose={() => setSelectedBooking(null)}
            onFulfilled={handleFulfilled}
          />
        )}
      </AnimatePresence>
    </div>
  );
};

export default Bookings;
