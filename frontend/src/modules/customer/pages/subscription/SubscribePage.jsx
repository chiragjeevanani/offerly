import { useState } from 'react';
import { useNavigate, useLocation } from 'react-router-dom';
import { useQuery, useQueryClient } from '@tanstack/react-query';
import { motion } from 'framer-motion';
import toast from 'react-hot-toast';
import ArrowBackRoundedIcon from '@mui/icons-material/ArrowBackRounded';
import WorkspacePremiumRoundedIcon from '@mui/icons-material/WorkspacePremiumRounded';
import CheckCircleRoundedIcon from '@mui/icons-material/CheckCircleRounded';
import VerifiedRoundedIcon from '@mui/icons-material/VerifiedRounded';

import { planAPI } from '../../../../api/plan.api';
import { userAPI } from '../../../../api/user.api';
import { loadRazorpay } from '../../../../utils/razorpay';
import { useCustomerSubscription } from '../../../../hooks/useCustomerSubscription';
import PageTransition from '../../components/ui/PageTransition';

const SubscribePage = () => {
  const navigate = useNavigate();
  const location = useLocation();
  const queryClient = useQueryClient();
  const { isSubscribed, subscription } = useCustomerSubscription();
  const [processingPlanId, setProcessingPlanId] = useState(null);

  const redirectTo = location.state?.from || '/cart';

  const { data: plans = [], isLoading } = useQuery({
    queryKey: ['customerPlans'],
    queryFn: async () => {
      const res = await planAPI.getAll({ planType: 'customer' });
      return res?.data || [];
    },
  });

  const handleSubscribed = async () => {
    await queryClient.invalidateQueries({ queryKey: ['customerSubscriptionStatus'] });
    toast.success('Subscription activated! You can now claim offers.');
    setTimeout(() => navigate(redirectTo, { replace: true }), 800);
  };

  const handleSubscribe = async (plan) => {
    setProcessingPlanId(plan._id || plan.id);
    const loadingToast = toast.loading(`Activating ${plan.name}...`);
    try {
      const res = await userAPI.purchaseSubscription(plan._id || plan.id);

      if (res.success && !res.requiresPayment) {
        toast.dismiss(loadingToast);
        await handleSubscribed();
        return;
      }

      if (res.requiresPayment) {
        toast.dismiss(loadingToast);

        const isLoaded = await loadRazorpay();
        if (!isLoaded) {
          toast.error('Payment gateway failed to load. Are you online?');
          setProcessingPlanId(null);
          return;
        }

        const options = {
          key: res.key,
          amount: res.amount,
          currency: res.currency,
          name: 'Offerly Subscription',
          description: `Subscription for ${plan.name}`,
          order_id: res.orderId,
          handler: async (response) => {
            const verifyingToast = toast.loading('Verifying payment...');
            try {
              const verifyRes = await userAPI.verifySubscription({
                ...response,
                planId: plan._id || plan.id,
              });
              toast.dismiss(verifyingToast);
              if (verifyRes.success) {
                await handleSubscribed();
              } else {
                toast.error(verifyRes.error || 'Verification failed');
              }
            } catch (err) {
              toast.dismiss(verifyingToast);
              toast.error(err?.error || err?.message || 'Verification failed');
            } finally {
              setProcessingPlanId(null);
            }
          },
          prefill: res.customerDetails,
          theme: { color: '#5EB929' },
          modal: {
            ondismiss: () => {
              toast.error('Payment cancelled');
              setProcessingPlanId(null);
            },
          },
        };

        const rzp = new window.Razorpay(options);
        rzp.open();
      }
    } catch (err) {
      toast.dismiss(loadingToast);
      toast.error(err?.error || err?.message || 'Failed to start subscription');
      setProcessingPlanId(null);
    }
  };

  return (
    <PageTransition>
      <div className="min-h-screen bg-background pt-safe pb-10 px-4">
        <div className="max-w-4xl mx-auto">
          <div className="flex items-center gap-3 py-4">
            <button
              onClick={() => navigate(-1)}
              className="w-9 h-9 rounded-full bg-white shadow-sm flex items-center justify-center"
            >
              <ArrowBackRoundedIcon sx={{ fontSize: 18 }} className="text-gray-700" />
            </button>
            <h1 className="text-lg font-bold text-gray-900">Offerly Subscription</h1>
          </div>

          <div className="text-center mb-6">
            <div className="inline-flex items-center gap-1.5 px-3 py-1 rounded-lg bg-white shadow-sm text-primary text-[10px] font-bold tracking-tight mb-2 border border-primary/10">
              <WorkspacePremiumRoundedIcon sx={{ fontSize: 14 }} />
              {isSubscribed ? 'Active subscription' : 'Subscribe to claim offers'}
            </div>
            <p className="text-gray-500 text-sm max-w-md mx-auto">
              {isSubscribed
                ? `You're all set — your plan is active${subscription?.endDate ? ` until ${new Date(subscription.endDate).toLocaleDateString('en-IN')}` : ''}.`
                : 'Claiming offers requires an active Offerly subscription. Pick a plan to continue.'}
            </p>
          </div>

          {isLoading ? (
            <div className="flex justify-center py-16">
              <div className="w-10 h-10 border-4 border-primary/20 border-t-primary rounded-full animate-spin" />
            </div>
          ) : plans.length === 0 ? (
            <div className="text-center py-16 bg-white rounded-2xl border border-gray-100">
              <VerifiedRoundedIcon sx={{ fontSize: 32 }} className="text-gray-300 mb-2" />
              <p className="text-gray-500 text-sm font-medium">No subscription plans are available right now.</p>
              <p className="text-gray-400 text-xs mt-1">Please check back soon.</p>
            </div>
          ) : (
            <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-4">
              {plans.map((plan, idx) => {
                const planId = plan._id || plan.id;
                const isProcessing = processingPlanId === planId;
                const isCurrentPlan = isSubscribed && subscription?.plan?.id === planId;

                return (
                  <motion.div
                    key={planId}
                    initial={{ opacity: 0, y: 12 }}
                    animate={{ opacity: 1, y: 0 }}
                    transition={{ delay: idx * 0.08 }}
                    className="bg-white rounded-2xl p-5 flex flex-col shadow-sm border border-gray-100"
                  >
                    <h3 className="text-base font-bold text-gray-900">{plan.name}</h3>
                    <p className="text-[10px] font-bold uppercase tracking-widest text-gray-400 mb-3">
                      {plan.duration}
                    </p>

                    <div className="flex items-baseline gap-1 mb-4">
                      <span className="text-xs font-bold text-gray-500">₹</span>
                      <span className="text-3xl font-bold text-gray-900">{plan.price}</span>
                      {plan.price > 0 && (
                        <span className="text-[10px] font-bold text-gray-400 uppercase ml-1">
                          / {plan.duration === 'Yearly' ? 'yr' : 'mo'}
                        </span>
                      )}
                    </div>

                    {plan.features?.length > 0 && (
                      <div className="space-y-1.5 mb-5 flex-1">
                        {plan.features.map((feature, fIdx) => (
                          <div key={fIdx} className="flex items-center gap-2 text-xs text-gray-600">
                            <CheckCircleRoundedIcon sx={{ fontSize: 14 }} className="text-primary" />
                            {feature}
                          </div>
                        ))}
                      </div>
                    )}

                    <button
                      onClick={() => handleSubscribe(plan)}
                      disabled={isProcessing || isCurrentPlan}
                      className={`w-full py-2.5 rounded-xl font-bold text-xs uppercase tracking-widest transition-all active:scale-95 ${
                        isCurrentPlan
                          ? 'bg-gray-100 text-gray-400 cursor-not-allowed'
                          : 'bg-primary text-white hover:opacity-90'
                      }`}
                    >
                      {isCurrentPlan ? 'Current plan' : isProcessing ? 'Processing...' : plan.price > 0 ? 'Subscribe' : 'Activate free plan'}
                    </button>
                  </motion.div>
                );
              })}
            </div>
          )}
        </div>
      </div>
    </PageTransition>
  );
};

export default SubscribePage;
