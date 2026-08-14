import { useState, useEffect } from 'react';
import { motion } from 'framer-motion';
import ContentCopyRoundedIcon from '@mui/icons-material/ContentCopyRounded';
import ShareRoundedIcon from '@mui/icons-material/ShareRounded';
import CheckCircleRoundedIcon from '@mui/icons-material/CheckCircleRounded';
import CardGiftcardRoundedIcon from '@mui/icons-material/CardGiftcardRounded';
import PeopleRoundedIcon from '@mui/icons-material/PeopleRounded';
import { userAPI } from '../../../../api/user.api';
import { useApp } from '../../context/AppContext';
import PageTransition from '../../components/ui/PageTransition';
import toast from 'react-hot-toast';

const Referral = () => {
  const { user, isLoggedIn } = useApp();
  const [history, setHistory] = useState([]);
  const [loading, setLoading] = useState(true);

  const fetchHistory = async () => {
    if (!isLoggedIn) return;
    try {
      const res = await userAPI.getReferralHistory();
      setHistory(res.referrals || res.data || []);
    } catch (error) {
      console.error('Failed to load referral history:', error);
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    fetchHistory();
  }, [isLoggedIn]);

  const handleRedeem = async () => {
    if (!user?.credits || user.credits < 100) {
      toast.error('Minimum ₹100 credits required to redeem');
      return;
    }
    try {
      await userAPI.redeemCredits(user.credits);
      toast.success('Redemption request submitted! 💰');
      fetchHistory();
    } catch (error) {
      toast.error('Failed to submit redemption request');
    }
  };

  const handleCopy = () => {
    navigator.clipboard.writeText(user?.referralCode || '');
    toast.success('Referral code copied! 🎉');
  };

  const handleShare = async () => {
    try {
      await navigator.share({
        title: 'Join Offerly!',
        text: `Use my referral code ${user?.referralCode} on Offerly and get exclusive local deals!`,
        url: 'https://app.offerly.com',
      });
    } catch {
      handleCopy();
    }
  };

  const totalEarned = history.reduce((sum, r) => sum + r.credits, 0);

  return (
    <PageTransition>
      <div className="min-h-screen bg-[#F8F5FF] px-4 py-4 pb-24 space-y-5">
        
        {/* Hero Section - Compact High Density */}
        <motion.div
          initial={{ opacity: 0, scale: 0.95 }}
          animate={{ opacity: 1, scale: 1 }}
          className="bg-[#3D7A4F] rounded-[2rem] p-5 text-center shadow-lg shadow-[#3D7A4F]/20 relative overflow-hidden"
        >
          <div className="absolute top-0 right-0 w-24 h-24 bg-white/5 rounded-full -mr-12 -mt-12 blur-3xl" />
          
          <motion.div
            initial={{ scale: 0 }}
            animate={{ scale: 1 }}
            className="w-14 h-14 bg-white/10 rounded-2xl flex items-center justify-center mx-auto mb-4 backdrop-blur-sm border border-white/10"
          >
            <CardGiftcardRoundedIcon sx={{ fontSize: 28 }} className="text-white" />
          </motion.div>
          
          <h2 className="text-white font-black text-xl uppercase tracking-tight">Invite & Earn</h2>
          <p className="text-white/70 text-[9px] font-black uppercase tracking-widest mt-1.5 leading-relaxed px-4">
            Earn ₹50 credits for every friend joined
          </p>

          {/* Referral Code Terminal - Slim */}
          <div className="mt-5 bg-black/10 rounded-2xl px-4 py-3.5 flex items-center justify-between border border-white/5 backdrop-blur-md">
            <div className="text-left">
              <p className="text-white/40 text-[8px] font-black uppercase tracking-widest">Your Code</p>
              <p className="text-white font-black text-xl tracking-[0.2em] mt-0.5">{user?.referralCode || 'OFFER50'}</p>
            </div>
            <div className="flex items-center gap-2">
              <motion.button
                whileTap={{ scale: 0.9 }}
                onClick={handleCopy}
                className="w-9 h-9 bg-white/10 rounded-xl flex items-center justify-center border border-white/10"
              >
                <ContentCopyRoundedIcon sx={{ fontSize: 14 }} className="text-white" />
              </motion.button>
              <motion.button
                whileTap={{ scale: 0.9 }}
                onClick={handleShare}
                className="w-9 h-9 bg-white rounded-xl flex items-center justify-center shadow-lg"
              >
                <ShareRoundedIcon sx={{ fontSize: 14 }} className="text-[#3D7A4F]" />
              </motion.button>
            </div>
          </div>
        </motion.div>

        {/* Stats Grid - Slim Cards */}
        <div className="grid grid-cols-2 gap-3">
          <div className="bg-white rounded-3xl p-5 shadow-[0_2px_12px_rgba(0,0,0,0.02)] border border-gray-50 text-center">
            <p className="text-[10px] font-black text-gray-400 uppercase tracking-widest mb-1">Friends Referred</p>
            <p className="text-2xl font-black text-gray-900 tracking-tighter">{history.length}</p>
          </div>
          <div className="bg-white rounded-3xl p-5 shadow-[0_2px_12px_rgba(0,0,0,0.02)] border border-gray-50 text-center">
            <p className="text-[10px] font-black text-gray-400 uppercase tracking-widest mb-1">Total Rewards</p>
            <p className="text-2xl font-black text-[#3D7A4F] tracking-tighter">₹{totalEarned}</p>
          </div>
        </div>

        {/* Balance Strip */}
        <div className="bg-white rounded-3xl p-4 flex items-center justify-between shadow-[0_2px_12px_rgba(0,0,0,0.02)] border border-gray-50">
          <div className="flex items-center gap-3">
             <div className="w-10 h-10 bg-[#3D7A4F]/5 rounded-xl flex items-center justify-center">
               <span className="text-lg">💰</span>
             </div>
             <div>
                <p className="text-[9px] font-black text-gray-400 uppercase tracking-widest leading-none">Available Balance</p>
                <p className="text-lg font-black text-gray-900 tracking-tighter mt-1">₹{user?.credits || 0}</p>
             </div>
          </div>
          <button 
            onClick={handleRedeem}
            className="text-[10px] font-black text-white uppercase tracking-widest bg-[#3D7A4F] px-5 py-2.5 rounded-xl shadow-lg shadow-[#3D7A4F]/10 active:scale-95 transition-all"
          >
            Redeem Now
          </button>
        </div>

        {/* How it Works - Slim Rows */}
        <div className="pt-2">
           <p className="text-[11px] font-black text-gray-900 uppercase tracking-tighter mb-4 px-1">How it works</p>
           <div className="space-y-2.5">
             {[
               { step: '01', label: 'Share your code with friends' },
               { step: '02', label: 'Friends sign up on the platform' },
               { step: '03', label: 'Earn ₹50 credits instantly' },
             ].map((item) => (
               <div key={item.step} className="flex items-center gap-4 bg-white rounded-2xl p-3 border border-gray-50">
                 <div className="w-8 h-8 bg-[#3D7A4F]/5 rounded-xl flex items-center justify-center flex-shrink-0">
                    <span className="text-[10px] font-black text-[#3D7A4F]">{item.step}</span>
                 </div>
                 <p className="text-[11px] font-bold text-gray-500 uppercase tracking-tight">{item.label}</p>
               </div>
             ))}
           </div>
        </div>

        {/* History - Slim Strips */}
        {history.length > 0 && (
          <div className="pt-2">
            <p className="text-[11px] font-black text-gray-900 uppercase tracking-tighter mb-4 px-1">Success History</p>
            <div className="space-y-2">
              {history.map((ref, idx) => (
                <motion.div
                  key={ref.id}
                  initial={{ opacity: 0, y: 8 }}
                  animate={{ opacity: 1, y: 0 }}
                  transition={{ delay: idx * 0.05 }}
                  className="bg-white rounded-2xl p-3 flex items-center gap-3 border border-gray-50"
                >
                  <div className="w-10 h-10 bg-[#3D7A4F]/5 rounded-xl flex items-center justify-center border border-[#3D7A4F]/10">
                    <span className="text-[#3D7A4F] font-black text-[11px] uppercase">{ref.friendName.charAt(0)}</span>
                  </div>
                  <div className="flex-1">
                    <p className="text-[11px] font-black text-gray-900 uppercase tracking-tight">{ref.friendName}</p>
                    <p className="text-[9px] font-bold text-gray-400 uppercase tracking-widest">{ref.date}</p>
                  </div>
                  <div className="flex items-center gap-1.5 bg-[#3D7A4F]/5 px-2.5 py-1 rounded-lg">
                    <CheckCircleRoundedIcon sx={{ fontSize: 10 }} className="text-[#3D7A4F]" />
                    <span className="text-[10px] font-black text-[#3D7A4F] tracking-tighter">+₹{ref.credits}</span>
                  </div>
                </motion.div>
              ))}
            </div>
          </div>
        )}
      </div>
    </PageTransition>
  );
};

export default Referral;
