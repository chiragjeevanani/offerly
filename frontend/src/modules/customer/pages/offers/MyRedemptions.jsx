import { useState, useEffect } from 'react';
import { useNavigate } from 'react-router-dom';
import { motion } from 'framer-motion';
import ReceiptLongRoundedIcon from '@mui/icons-material/ReceiptLongRounded';
import CheckCircleRoundedIcon from '@mui/icons-material/CheckCircleRounded';
import AccessTimeRoundedIcon from '@mui/icons-material/AccessTimeRounded';
import CancelRoundedIcon from '@mui/icons-material/CancelRounded';
import ChevronRightRoundedIcon from '@mui/icons-material/ChevronRightRounded';
import RateReviewRoundedIcon from '@mui/icons-material/RateReviewRounded';
import { bookingAPI } from '../../../../api/booking.api';
import PageTransition from '../../components/ui/PageTransition';

const statusConfig = {
  completed: { icon: CheckCircleRoundedIcon, color: 'text-green-600', bg: 'bg-green-50', label: 'Completed' },
  pending: { icon: AccessTimeRoundedIcon, color: 'text-amber-600', bg: 'bg-amber-50', label: 'Pending' },
  expired: { icon: CancelRoundedIcon, color: 'text-red-500', bg: 'bg-red-50', label: 'Expired' },
  invalid: { icon: CancelRoundedIcon, color: 'text-gray-500', bg: 'bg-gray-50', label: 'Invalid' },
};

const MyRedemptions = () => {
  const navigate = useNavigate();
  const [redemptions, setRedemptions] = useState([]);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    const loadRedemptions = async () => {
      try {
        const res = await bookingAPI.getCustomerRedemptions();
        if (res && res.success) {
          setRedemptions(res.data);
        }
      } catch (error) {
        console.error('Failed to fetch redemptions:', error);
      } finally {
        setLoading(false);
      }
    };
    loadRedemptions();
  }, []);

  if (loading) {
    return (
      <PageTransition>
        <div className="px-4 py-4 pb-6 space-y-4">
          {[1, 2, 3].map(i => (
            <div key={i} className="h-24 bg-surface rounded-2xl animate-pulse"></div>
          ))}
        </div>
      </PageTransition>
    );
  }

  return (
    <PageTransition>
      <div className="min-h-screen bg-background px-4 py-4 pb-24 space-y-4">
        
        {redemptions.length === 0 ? (
          <motion.div
            initial={{ opacity: 0, scale: 0.95 }}
            animate={{ opacity: 1, scale: 1 }}
            className="flex flex-col items-center justify-center py-28 text-center"
          >
            <div className="w-20 h-20 bg-white rounded-3xl flex items-center justify-center mb-6 shadow-sm border border-gray-100">
              <ReceiptLongRoundedIcon sx={{ fontSize: 32 }} className="text-gray-200" />
            </div>
            <h2 className="text-sm font-bold text-gray-800 uppercase tracking-tight">No redemptions yet</h2>
            <p className="text-[11px] text-gray-400 font-medium px-10 mt-1 leading-relaxed">
              Your redeemed offers will appear here as a digital record of your savings.
            </p>
            <button 
              onClick={() => navigate('/explore')}
              className="mt-8 text-[10px] font-bold text-[#5EB929] uppercase tracking-widest bg-white border border-gray-100 px-6 py-2.5 rounded-xl shadow-sm active:scale-95 transition-all"
            >
              Start Discovering
            </button>
          </motion.div>
        ) : (
          <>
            {/* Header Result Count */}
            <div className="flex flex-col px-0.5">
              <p className="text-[9px] text-gray-400 font-bold uppercase tracking-widest leading-none">Your Savings History</p>
              <p className="text-[11px] text-gray-800 font-bold mt-0.5">
                {redemptions.length} {redemptions.length === 1 ? 'REDEMPTION' : 'REDEMPTIONS'} RECORDED
              </p>
            </div>

            <div className="space-y-2.5">
              {redemptions.map((redemption, idx) => {
                const offer = redemption.offerId;
                const merchant = redemption.merchantId;
                const isLocalExpired = redemption.status === 'pending' && new Date(redemption.qrExpiry) < new Date();
                const displayStatus = isLocalExpired ? 'expired' : redemption.status;
                const config = statusConfig[displayStatus] || statusConfig.pending;
                const StatusIcon = config.icon;
                const date = new Date(redemption.createdAt).toLocaleDateString('en-IN', {
                  day: 'numeric', month: 'short', year: 'numeric',
                });

                return (
                  <motion.div
                    key={redemption._id || redemption.id}
                    initial={{ opacity: 0, y: 10 }}
                    animate={{ opacity: 1, y: 0 }}
                    transition={{ delay: idx * 0.05 }}
                    className="bg-white rounded-2xl border border-gray-50 p-3 shadow-[0_2px_8px_rgba(0,0,0,0.02)]"
                  >
                    <div className="flex items-center gap-3">
                      {/* Slim Image */}
                      <div className="w-12 h-12 rounded-xl overflow-hidden flex-shrink-0 border border-gray-50 shadow-sm">
                        <img src={offer?.image || merchant?.logo} alt="" className="w-full h-full object-cover" />
                      </div>

                      <div className="flex-1 min-w-0">
                        <h4 className="text-[13px] font-bold text-gray-900 truncate tracking-tight leading-tight uppercase">
                          {offer?.title || 'Offer'}
                        </h4>
                        <div className="flex items-center gap-1.5 mt-0.5">
                           <span className="text-[9px] font-bold text-[#5EB929] uppercase tracking-widest">{merchant?.storeName}</span>
                           <div className="w-0.5 h-0.5 rounded-full bg-gray-300" />
                           <span className="text-[9px] font-bold text-gray-400 uppercase tracking-widest">{date}</span>
                        </div>

                        {/* Status Strip */}
                        <div className={`inline-flex items-center gap-1 mt-2 px-2 py-0.5 rounded-lg ${config.bg}`}>
                          <StatusIcon sx={{ fontSize: 10 }} className={config.color.includes('green') ? 'text-[#5EB929]' : config.color} />
                          <span className={`text-[8px] font-bold uppercase tracking-widest ${config.color.includes('green') ? 'text-[#5EB929]' : config.color}`}>
                            {config.label}
                          </span>
                        </div>
                      </div>

                      {/* Action Buttons */}
                      <div className="flex flex-col items-end gap-2">
                        {redemption.status === 'completed' && !redemption.hasReview && (
                          <button
                            onClick={() => navigate(`/review/${redemption._id || redemption.id}`)}
                            className="text-[9px] font-bold text-[#5EB929] uppercase tracking-widest bg-[#5EB929]/5 px-3 py-2 rounded-xl active:scale-95 transition-all"
                          >
                            Add Review
                          </button>
                        )}
                        {displayStatus === 'pending' && (
                          <button
                            onClick={() => navigate(`/redeem/${redemption._id || redemption.id}`)}
                            className="flex items-center gap-1 text-[9px] font-bold text-white uppercase tracking-widest bg-[#5EB929] px-3 py-2 rounded-xl shadow-lg shadow-[#5EB929]/20 active:scale-95 transition-all"
                          >
                            View QR <ChevronRightRoundedIcon sx={{ fontSize: 10 }} />
                          </button>
                        )}
                      </div>
                    </div>
                  </motion.div>
                );
              })}
            </div>
          </>
        )}
      </div>
    </PageTransition>
  );
};

export default MyRedemptions;
