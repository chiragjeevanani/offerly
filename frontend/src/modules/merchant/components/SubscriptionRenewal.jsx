import { useState } from 'react';
import { useQuery } from '@tanstack/react-query';
import { motion } from 'framer-motion';
import { merchantAPI } from '../../../api/merchant.api';
import WorkspacePremiumRoundedIcon from '@mui/icons-material/WorkspacePremiumRounded';
import CheckCircleRoundedIcon from '@mui/icons-material/CheckCircleRounded';
import Inventory2RoundedIcon from '@mui/icons-material/Inventory2Rounded';
import LocalOfferRoundedIcon from '@mui/icons-material/LocalOfferRounded';
import LogoutRoundedIcon from '@mui/icons-material/LogoutRounded';
import { useApp } from '../../customer/context/AppContext';
import { useNavigate } from 'react-router-dom';
import toast from 'react-hot-toast';
import { loadRazorpay } from '../../../utils/razorpay';

const SubscriptionRenewal = ({ merchant }) => {
  const { logout } = useApp();
  const navigate = useNavigate();
  const [showUpgrade, setShowUpgrade] = useState(false);

  const { data: plansRes, isLoading } = useQuery({
    queryKey: ['availablePlans', merchant?.city, showUpgrade],
    queryFn: async () => {
      const res = await merchantAPI.getAvailablePlans(merchant?.city);
      return res;
    }
  });

  const walletBalance = plansRes?.walletBalance || 0;
  const plans = (plansRes?.data || (plansRes?.success ? plansRes.data : []) || []).filter(p => {
    const isMerchantType = p.planType === 'merchant' || !p.planType;
    const isActive = p.status === 'active';
    // If upgrading, hide free/trial plans
    if (showUpgrade && p.price === 0) return false;
    return isMerchantType && isActive;
  });

  const handleRenew = async (plan) => {
    const loadingToast = toast.loading(`Initiating ${plan.name} protocol...`);
    try {
      // 1. Create Order / Activate Directly (if Free)
      const res = await merchantAPI.activateSubscription(plan._id);
      
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
          return;
        }

        // 3. Open Razorpay Modal
        const options = {
          key: res.key,
          amount: res.amount,
          currency: res.currency,
          name: 'Offerly Premium',
          description: `Subscription for ${plan.name}`,
          image: 'https://cdn-icons-png.flaticon.com/512/3135/3135715.png',
          order_id: res.orderId,
          handler: async function (response) {
            const verifyingToast = toast.loading('Verifying transaction...');
            try {
              const verifyRes = await merchantAPI.verifySubscription({
                ...response,
                planId: plan._id
              });

              if (verifyRes.success) {
                toast.success('Payment successful! Account unlocked.', { id: verifyingToast });
                setTimeout(() => { window.location.href = '/merchant'; }, 1000);
              } else {
                toast.error(verifyRes.error || 'Verification failed', { id: verifyingToast });
              }
            } catch (err) {
              toast.error('Network error during verification', { id: verifyingToast });
            }
          },
          prefill: res.merchantDetails,
          theme: { color: '#5EB929' },
          modal: {
            ondismiss: function() {
              toast.error('Payment cancelled by user');
            }
          }
        };

        const rzp = new window.Razorpay(options);
        rzp.open();
      }
    } catch (err) {
      console.error('Activation error:', err);
      toast.error('Network error or invalid activation request', { id: loadingToast });
    }
  };

  const isExpiringSoon = merchant?.remainingDays > 0 && merchant?.remainingDays <= 3;
  const hasActivePlan = merchant?.subscription?.planId && merchant?.remainingDays > 3 && !showUpgrade;

  if (isLoading) {
    return (
      <div className="min-h-screen bg-background flex items-center justify-center">
        <div className="w-12 h-12 border-4 border-[#5EB929]/20 border-t-[#5EB929] rounded-full animate-spin" />
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-background py-1 px-4 font-sans selection:bg-[#5EB929]/20 flex items-center justify-center">
      <div className="max-w-4xl w-full mx-auto">
        {/* One-Screen Header */}
        <div className="text-center mb-3">
          <motion.div 
            initial={{ opacity: 0, scale: 0.9 }}
            animate={{ opacity: 1, scale: 1 }}
            className="inline-flex items-center gap-1.5 px-2 py-0.5 rounded-lg bg-white shadow-sm text-indigo-600 text-[8px] font-bold tracking-tight mb-0.5 border border-indigo-50"
          >
            <WorkspacePremiumRoundedIcon sx={{ fontSize: 12 }} />
            {hasActivePlan ? 'Active Premium Protocol' : 'Premium access protocol'}
          </motion.div>
          
          <h1 className="mt-0 text-xl sm:text-3xl font-bold text-gray-900 tracking-tight mb-0 leading-none">
            {hasActivePlan ? (
              <>Your current plan: <span className="text-[#5EB929]">{merchant.subscription.planId.name}</span></>
            ) : (
              <>{showUpgrade ? 'Upgrade to' : 'Select your'} <span className="text-[#5EB929]">Offerly</span> plan</>
            )}
          </h1>

          {hasActivePlan ? (
            <div className="mt-4 p-6 bg-white rounded-3xl border border-[#5EB929]/10 shadow-sm max-w-md mx-auto">
              <div className="flex items-center justify-center gap-3 mb-4">
                 <div className="w-12 h-12 bg-[#5EB929]/10 rounded-2xl flex items-center justify-center">
                    <WorkspacePremiumRoundedIcon sx={{ fontSize: 24 }} className="text-[#5EB929]" />
                 </div>
                 <div className="text-left">
                    <p className="text-[10px] font-bold text-gray-400 uppercase tracking-widest leading-none mb-1">Status: Active</p>
                    <p className="text-lg font-bold text-gray-900 leading-none">{merchant.subscription.planId.name}</p>
                 </div>
              </div>
              <p className="text-[11px] font-bold text-gray-500 mb-6">
                Your subscription is active for the next <span className="text-gray-900 font-bold">{merchant.remainingDays} days</span>. 
              </p>
              
              <div className="flex flex-col gap-2">
                <button 
                  onClick={() => setShowUpgrade(true)}
                  className="w-full py-3 bg-[#5EB929] text-white rounded-xl font-bold text-xs uppercase tracking-widest hover:bg-[#2D5A3A] transition-all shadow-lg shadow-[#5EB929]/20"
                >
                  Upgrade Subscription
                </button>
                <button 
                  onClick={() => navigate('/merchant')}
                  className="w-full py-3 bg-gray-100 text-gray-600 rounded-xl font-bold text-xs uppercase tracking-widest hover:bg-gray-200 transition-all"
                >
                  Return to Dashboard
                </button>
              </div>
            </div>
          ) : (
            <p className="mt-1 text-gray-400 font-bold max-w-lg mx-auto text-[10px] leading-none opacity-80">
              {isExpiringSoon 
                ? `Your current plan is expiring in ${merchant.remainingDays} days. Renew now to avoid service interruption.`
                : 'Scale your business with enterprise-grade architecture.'}
            </p>
          )}
        </div>

        {walletBalance > 0 && (
          <div className="max-w-md mx-auto mb-3 flex items-center justify-center gap-2 px-4 py-2 rounded-xl bg-[#5EB929]/5 border border-[#5EB929]/10">
            <span className="text-[10px] font-bold text-gray-500">Discount wallet balance:</span>
            <span className="text-[11px] font-bold text-[#5EB929]">₹{walletBalance}</span>
          </div>
        )}

        {!hasActivePlan && (
          <div className="grid grid-cols-1 md:grid-cols-3 gap-3 items-stretch mb-3">
          {plans.map((plan, idx) => {
            const isPopular = idx === 1; 
            return (
              <motion.div
                key={plan._id || idx}
                initial={{ opacity: 0, y: 15 }}
                animate={{ opacity: 1, y: 0 }}
                transition={{ delay: idx * 0.1 }}
                className={`relative rounded-[1.5rem] p-4 flex flex-col transition-all duration-300 ${
                  isPopular 
                    ? 'bg-gray-900 text-white shadow-xl z-10 border-none md:scale-[1.03]' 
                    : 'bg-white text-gray-900 shadow-sm border border-gray-100'
                }`}
              >
                {isPopular && (
                  <div className="absolute -top-2 left-1/2 -translate-x-1/2 px-3 py-1 rounded-md bg-gradient-to-r from-amber-400 to-orange-500 text-white text-[8px] font-bold tracking-widest shadow-lg">
                    Best value
                  </div>
                )}

                <div className="mb-2">
                  <h3 className={`text-[15px] font-bold tracking-tight mb-0 ${isPopular ? 'text-white' : 'text-gray-900'}`}>
                    {plan.name}
                  </h3>
                  <p className={`text-[8px] font-bold tracking-widest opacity-40 ${isPopular ? 'text-gray-300' : 'text-gray-400'}`}>
                    {plan.price === 0 && plan.trialDays ? `${plan.trialDays} days trial` : plan.duration}
                  </p>
                </div>

                <div className="mb-3">
                  <div className="flex items-baseline gap-0.5">
                    <span className="text-[9px] font-bold opacity-60">₹</span>
                    <span className="text-2xl font-bold tracking-tight leading-none">{plan.payable ?? plan.price}</span>
                    <span className={`text-[8px] font-bold uppercase tracking-widest opacity-30 ml-0.5`}>/mo</span>
                  </div>
                  {plan.walletDiscount > 0 && (
                    <div className="flex items-center gap-1.5 mt-1">
                      <span className={`text-[10px] font-bold line-through opacity-40 ${isPopular ? 'text-gray-300' : 'text-gray-400'}`}>₹{plan.listPrice}</span>
                      <span className="text-[8px] font-bold px-1.5 py-0.5 rounded bg-emerald-500/15 text-emerald-500">-₹{plan.walletDiscount} wallet</span>
                    </div>
                  )}
                </div>

                {/* Compact Features */}
                <div className="space-y-2 mb-4 flex-1">
                  <div className="flex items-center gap-2">
                    <div className={`w-6 h-6 rounded-lg flex items-center justify-center ${isPopular ? 'bg-white/10 text-white' : 'bg-gray-50 text-[#5EB929]'}`}>
                      <Inventory2RoundedIcon sx={{ fontSize: 12 }} />
                    </div>
                    <div>
                      <p className={`text-[7px] font-bold uppercase tracking-tight opacity-40 ${isPopular ? 'text-gray-300' : 'text-gray-400'}`}>Products</p>
                      <p className="text-[10px] font-bold leading-none">{plan.maxProducts === 999 ? 'Unlimited' : plan.maxProducts} Slots</p>
                    </div>
                  </div>
                  <div className="flex items-center gap-2">
                    <div className={`w-6 h-6 rounded-lg flex items-center justify-center ${isPopular ? 'bg-white/10 text-white' : 'bg-gray-50 text-[#5EB929]'}`}>
                      <LocalOfferRoundedIcon sx={{ fontSize: 12 }} />
                    </div>
                    <div>
                      <p className={`text-[7px] font-bold uppercase tracking-tight opacity-40 ${isPopular ? 'text-gray-300' : 'text-gray-400'}`}>Offers</p>
                      <p className="text-[10px] font-bold leading-none">{plan.maxOffers === 999 ? 'Unlimited' : plan.maxOffers} Live</p>
                    </div>
                  </div>

                  <div className={`h-px ${isPopular ? 'bg-white/10' : 'bg-gray-100'} my-1`} />

                  <div className="space-y-1">
                    {plan.features?.map((feature, fIdx) => (
                      <div key={fIdx} className="flex items-center gap-1.5 text-[10px] font-bold leading-tight">
                        <CheckCircleRoundedIcon sx={{ fontSize: 11 }} className={isPopular ? 'text-emerald-400' : 'text-[#5EB929]'} />
                        <span className={isPopular ? 'text-gray-300' : 'text-gray-500'}>{feature}</span>
                      </div>
                    ))}

                  </div>
                </div>

                <button
                  onClick={() => handleRenew(plan)}
                  className={`w-full py-2 rounded-lg font-bold text-[10px] uppercase tracking-widest transition-all active:scale-95 ${
                    isPopular 
                      ? 'bg-gradient-to-r from-emerald-500 to-teal-600 text-white shadow-md' 
                      : 'bg-gray-900 text-white hover:bg-black'
                  }`}
                >
                  Choose plan
                </button>
              </motion.div>
          );
          })}
        </div>
      )}

        {/* Minimized Footer */}
        <div className="flex flex-col items-center gap-2">
          <p className="text-[8px] text-gray-400 font-bold uppercase tracking-widest opacity-50">
            Secure payment gateway active 🔒
          </p>
          <button
            onClick={() => { logout(); navigate('/merchant'); }}
            className="flex items-center gap-1 text-gray-400 hover:text-red-500 transition-colors font-bold text-[8px] uppercase tracking-widest"
          >
            <LogoutRoundedIcon sx={{ fontSize: 10 }} />
            Terminate current session
          </button>
        </div>
      </div>
    </div>
  );
};

export default SubscriptionRenewal;
