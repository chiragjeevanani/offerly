import { useState } from 'react';
import { useQuery } from '@tanstack/react-query';
import { motion } from 'framer-motion';
import { merchantAPI } from '../../../api/merchant.api';
import WorkspacePremiumRoundedIcon from '@mui/icons-material/WorkspacePremiumRounded';
import LogoutRoundedIcon from '@mui/icons-material/LogoutRounded';
import BarChartRoundedIcon from '@mui/icons-material/BarChartRounded';
import GroupRoundedIcon from '@mui/icons-material/GroupRounded';
import RocketLaunchRoundedIcon from '@mui/icons-material/RocketLaunchRounded';
import FavoriteRoundedIcon from '@mui/icons-material/FavoriteRounded';
import ArrowBackRoundedIcon from '@mui/icons-material/ArrowBackRounded';
import { useApp } from '../../customer/context/AppContext';
import { useNavigate } from 'react-router-dom';
import toast from 'react-hot-toast';
import { loadRazorpay } from '../../../utils/razorpay';
import MerchantPlanCard from './MerchantPlanCard';

const SubscriptionRenewal = ({ merchant }) => {
  const { logout } = useApp();
  const navigate = useNavigate();
  const [showUpgrade, setShowUpgrade] = useState(false);
  const [activatingPlanId, setActivatingPlanId] = useState(null);

  const { data: plansRes, isLoading } = useQuery({
    queryKey: ['availablePlans', merchant?.city, showUpgrade],
    queryFn: async () => {
      const res = await merchantAPI.getAvailablePlans(merchant?.city);
      return res;
    }
  });

  const walletBalance = plansRes?.walletBalance || 0;
  const rawPlans = (plansRes?.data || (plansRes?.success ? plansRes.data : []) || []);
  const plans = rawPlans.filter(p => {
    const isMerchantType = p.planType === 'merchant' || !p.planType;
    const isActive = p.status === 'active';
    // If upgrading, hide free/trial plans
    if (showUpgrade && p.price === 0) return false;
    return isMerchantType && isActive;
  });

  const handleRenew = async (plan) => {
    setActivatingPlanId(plan._id || plan.id);
    const loadingToast = toast.loading(`Initiating ${plan.name} plan...`);
    try {
      // 1. Create Order / Activate Directly (if Free)
      const res = await merchantAPI.activateSubscription(plan._id || plan.id);
      
      if (res.success && !res.requiresPayment) {
        toast.success(res.message || `${plan.name} activated successfully!`, { id: loadingToast });
        setTimeout(() => { window.location.href = '/merchant'; }, 1200);
        return;
      }

      if (res.requiresPayment) {
        toast.dismiss(loadingToast);
        
        // 2. Load Razorpay Script
        const isLoaded = await loadRazorpay();
        if (!isLoaded) {
          toast.error('Razorpay SDK failed to load. Are you online?');
          setActivatingPlanId(null);
          return;
        }

        // 3. Open Razorpay Modal
        const options = {
          key: res.key,
          amount: res.amount,
          currency: res.currency,
          name: 'Offerly Premium',
          description: `Subscription for ${plan.name}`,
          image: '/offerly-logo-ring.png',
          order_id: res.orderId,
          handler: async function (response) {
            const verifyingToast = toast.loading('Verifying transaction...');
            try {
              const verifyRes = await merchantAPI.verifySubscription({
                ...response,
                planId: plan._id || plan.id
              });

              if (verifyRes.success) {
                toast.success('Payment successful! Subscription activated.', { id: verifyingToast });
                setTimeout(() => { window.location.href = '/merchant'; }, 1000);
              } else {
                toast.error(verifyRes.error || 'Verification failed', { id: verifyingToast });
              }
            } catch (err) {
              toast.error('Network error during verification', { id: verifyingToast });
            } finally {
              setActivatingPlanId(null);
            }
          },
          prefill: res.merchantDetails,
          theme: { color: '#16A34A' },
          modal: {
            ondismiss: function() {
              toast.error('Payment cancelled');
              setActivatingPlanId(null);
            }
          }
        };

        const rzp = new window.Razorpay(options);
        rzp.open();
      }
    } catch (err) {
      console.error('Activation error:', err);
      toast.error('Network error or invalid activation request', { id: loadingToast });
      setActivatingPlanId(null);
    }
  };

  const isExpiringSoon = merchant?.remainingDays > 0 && merchant?.remainingDays <= 3;
  const hasActivePlan = merchant?.subscription?.planId && merchant?.remainingDays > 3 && !showUpgrade;

  if (isLoading) {
    return (
      <div className="min-h-screen bg-slate-50 flex items-center justify-center">
        <div className="w-12 h-12 border-4 border-[#16A34A]/20 border-t-[#16A34A] rounded-full animate-spin" />
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-gradient-to-b from-white via-emerald-50/30 to-white py-8 px-4 font-sans selection:bg-[#16A34A]/20 relative overflow-hidden">
      {/* Soft Ambient Background Glows */}
      <div className="absolute -top-40 -left-40 w-96 h-96 bg-emerald-200/25 rounded-full blur-3xl pointer-events-none" />
      <div className="absolute top-1/3 -right-40 w-96 h-96 bg-emerald-300/20 rounded-full blur-3xl pointer-events-none" />
      <div className="absolute -bottom-40 left-1/3 w-96 h-96 bg-emerald-100/40 rounded-full blur-3xl pointer-events-none" />

      <div className="max-w-6xl w-full mx-auto relative z-10">
        {/* Brand Header */}
        <div className="flex items-center justify-between mb-8">
          <div className="flex items-center gap-2">
            <img src="/offerly-logo-ring.png" alt="Offerly" className="w-9 h-9 object-contain" />
            <span className="text-xl font-black tracking-tight text-gray-900 uppercase">
              OFFERLY<span className="text-[#16A34A] italic">BIZ</span>
            </span>
          </div>

          <div className="flex items-center gap-3">
            {showUpgrade && (
              <button
                onClick={() => setShowUpgrade(false)}
                className="flex items-center gap-1.5 text-xs font-bold text-gray-600 hover:text-gray-900 bg-white px-3.5 py-1.5 rounded-full border border-gray-200 shadow-sm transition-all"
              >
                <ArrowBackRoundedIcon sx={{ fontSize: 16 }} />
                <span>Back</span>
              </button>
            )}
            <button
              onClick={() => { logout(); navigate('/merchant'); }}
              className="flex items-center gap-1.5 text-xs font-bold text-gray-400 hover:text-red-500 bg-white px-3.5 py-1.5 rounded-full border border-gray-100 shadow-sm transition-all"
            >
              <LogoutRoundedIcon sx={{ fontSize: 14 }} />
              <span className="hidden sm:inline">Logout</span>
            </button>
          </div>
        </div>

        {/* Active Plan Card View (if already active and not in upgrade mode) */}
        {hasActivePlan ? (
          <div className="max-w-md mx-auto my-12 p-8 bg-white rounded-3xl border border-emerald-100 shadow-xl text-center">
            <div className="w-16 h-16 bg-emerald-50 rounded-2xl flex items-center justify-center mx-auto mb-4 text-[#16A34A]">
              <WorkspacePremiumRoundedIcon sx={{ fontSize: 32 }} />
            </div>
            <p className="text-[11px] font-extrabold text-[#16A34A] uppercase tracking-widest mb-1">
              Active Subscription
            </p>
            <h2 className="text-2xl font-black text-gray-900 mb-2">
              {merchant.subscription.planId.name}
            </h2>
            <p className="text-sm text-gray-500 font-medium mb-6">
              Your subscription is active for the next <span className="text-gray-900 font-bold">{merchant.remainingDays} days</span>.
            </p>

            <div className="flex flex-col gap-3">
              <button 
                onClick={() => setShowUpgrade(true)}
                className="w-full py-3.5 bg-[#16A34A] hover:bg-[#15803D] text-white rounded-full font-bold text-xs uppercase tracking-wider transition-all shadow-md shadow-emerald-600/20"
              >
                Explore & Upgrade Plans
              </button>
              <button 
                onClick={() => navigate('/merchant')}
                className="w-full py-3.5 bg-gray-100 hover:bg-gray-200 text-gray-700 rounded-full font-bold text-xs uppercase tracking-wider transition-all"
              >
                Return to Dashboard
              </button>
            </div>
          </div>
        ) : (
          <>
            {/* Wallet Balance Banner */}
            {walletBalance > 0 && (
              <div className="max-w-md mx-auto mb-6 flex items-center justify-center gap-2 px-4 py-2.5 rounded-full bg-emerald-50 border border-emerald-200/80 shadow-sm">
                <span className="text-xs font-bold text-gray-600">Discount wallet balance:</span>
                <span className="text-sm font-black text-[#16A34A]">₹{walletBalance}</span>
                <span className="text-[10px] text-gray-400 font-medium">(Auto-applied to renewal)</span>
              </div>
            )}

            {/* Expiring Soon Notice */}
            {isExpiringSoon && (
              <div className="max-w-md mx-auto mb-6 p-3 rounded-2xl bg-amber-50 border border-amber-200 text-center">
                <p className="text-xs font-bold text-amber-800">
                  ⚠️ Your current plan is expiring in {merchant.remainingDays} days. Renew now to avoid any interruption.
                </p>
              </div>
            )}

            {/* 3-Column Plan Grid Matching Client Mockup */}
            <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6 items-stretch my-6">
              {plans.map((plan, idx) => (
                <MerchantPlanCard
                  key={plan._id || plan.id || idx}
                  plan={plan}
                  index={idx}
                  onSelect={handleRenew}
                  loading={activatingPlanId === (plan._id || plan.id)}
                />
              ))}
            </div>

            {/* Bottom Value Proposition Banner from Mockup */}
            <div className="mt-14 pt-8 border-t border-emerald-100/90">
              <div className="flex flex-col md:flex-row items-center justify-between gap-6 px-4">
                <div className="flex flex-wrap items-center justify-center gap-6 sm:gap-10 text-gray-700 text-xs sm:text-sm font-bold">
                  <div className="flex items-center gap-2">
                    <div className="w-8 h-8 rounded-lg bg-emerald-100/70 text-[#16A34A] flex items-center justify-center">
                      <BarChartRoundedIcon sx={{ fontSize: 18 }} />
                    </div>
                    <span>More Visibility</span>
                  </div>

                  <div className="flex items-center gap-2">
                    <div className="w-8 h-8 rounded-lg bg-emerald-100/70 text-[#16A34A] flex items-center justify-center">
                      <GroupRoundedIcon sx={{ fontSize: 18 }} />
                    </div>
                    <span>More Customers</span>
                  </div>

                  <div className="flex items-center gap-2">
                    <div className="w-8 h-8 rounded-lg bg-emerald-100/70 text-[#16A34A] flex items-center justify-center">
                      <RocketLaunchRoundedIcon sx={{ fontSize: 18 }} />
                    </div>
                    <span>More Growth</span>
                  </div>

                  <div className="flex items-center gap-2">
                    <div className="w-8 h-8 rounded-lg bg-emerald-100/70 text-[#16A34A] flex items-center justify-center">
                      <FavoriteRoundedIcon sx={{ fontSize: 18 }} />
                    </div>
                    <span>A Stronger Local Community</span>
                  </div>
                </div>

                {/* Handwritten Style "Together We Grow" */}
                <div className="relative flex flex-col items-center select-none">
                  <span className="font-serif italic font-extrabold text-xl sm:text-2xl text-[#16A34A] tracking-tight">
                    Together We Grow
                  </span>
                  <svg className="w-32 h-3 text-[#16A34A] -mt-1" viewBox="0 0 120 12" fill="none" xmlns="http://www.w3.org/2000/svg">
                    <path d="M3 8C35 2 85 2 117 8" stroke="currentColor" strokeWidth="2.5" strokeLinecap="round" />
                  </svg>
                </div>
              </div>

              {/* Secure Payment Footer */}
              <div className="mt-8 text-center">
                <p className="text-[10px] text-gray-400 font-bold uppercase tracking-widest">
                  🔒 Bank-Grade 256-Bit SSL Encryption • Instant Account Activation
                </p>
              </div>
            </div>
          </>
        )}
      </div>
    </div>
  );
};

export default SubscriptionRenewal;

