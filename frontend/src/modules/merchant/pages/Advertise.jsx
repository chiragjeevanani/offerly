import { useState } from 'react';
import { motion } from 'framer-motion';
import { useQuery } from '@tanstack/react-query';
import { merchantAPI } from '../../../api/merchant.api';
import WorkspacePremiumRoundedIcon from '@mui/icons-material/WorkspacePremiumRounded';
import CampaignRoundedIcon from '@mui/icons-material/CampaignRounded';
import CheckCircleRoundedIcon from '@mui/icons-material/CheckCircleRounded';
import AddPhotoAlternateRoundedIcon from '@mui/icons-material/AddPhotoAlternateRounded';
import CloseRoundedIcon from '@mui/icons-material/CloseRounded';
import toast from 'react-hot-toast';
import { loadRazorpay } from '../../../utils/razorpay';

const Advertise = ({ merchant }) => {
  const [isRequestModalOpen, setIsRequestModalOpen] = useState(false);
  const [selectedPlan, setSelectedPlan] = useState(null);
  const [lastPaymentId, setLastPaymentId] = useState(null);
  const [uploading, setUploading] = useState(false);
  const [submitting, setSubmitting] = useState(false);
  
  const [adData, setAdData] = useState({
    image: '',
    imagePreview: null,
    adText: '',
  });

  const { data: plans = [], isLoading: plansLoading } = useQuery({
    queryKey: ['adPlans', merchant?.city],
    queryFn: async () => {
      const res = await merchantAPI.getAvailablePlans(merchant?.city);
      const allPlans = res.data || (res.success ? res.data : []) || [];
      return allPlans.filter(p => p.planType === 'advertisement' && p.status === 'active');
    },
    enabled: !!merchant?.city
  });

  const { data: dashboardData, isLoading: statsLoading } = useQuery({
    queryKey: ['merchantDashboardAds'],
    queryFn: () => merchantAPI.getDashboard(),
    enabled: !!merchant?._id
  });

  const isLoading = plansLoading || statsLoading;
  const stats = dashboardData?.stats || {};

  const handleImageUpload = async (e) => {
    const file = e.target.files?.[0];
    if (!file) return;
    try {
      setUploading(true);
      const reader = new FileReader();
      reader.onloadend = () => setAdData(prev => ({ ...prev, imagePreview: reader.result }));
      reader.readAsDataURL(file);
      
      const { uploadAPI } = await import('../../../api/upload.api');
      const response = await uploadAPI.uploadImage(file);
      setAdData(prev => ({ ...prev, image: response?.url || response }));
      toast.success('Banner ready');
    } catch (err) {
      toast.error('Image upload failed');
    } finally {
      setUploading(false);
    }
  };

  const handlePurchase = async (plan) => {
    const loadingToast = toast.loading(`Initiating ${plan.name} request...`);
    try {
      const res = await merchantAPI.activateSubscription(plan._id);
      
      if (res.requiresPayment) {
        toast.dismiss(loadingToast);
        const isLoaded = await loadRazorpay();
        if (!isLoaded) {
          toast.error('Razorpay SDK failed to load');
          return;
        }

        const options = {
          key: res.key,
          amount: res.amount,
          currency: res.currency,
          name: 'Offerly Ads',
          description: `Ad Package: ${plan.name}`,
          order_id: res.orderId,
          handler: async function (response) {
            const verifyingToast = toast.loading('Verifying transaction...');
            try {
              const verifyRes = await merchantAPI.verifySubscription({
                ...response,
                planId: plan._id
              });

              if (verifyRes.success) {
                toast.success('Ad package purchased! Now submit your banner.', { id: verifyingToast });
                setSelectedPlan(plan);
                setLastPaymentId(response.razorpay_payment_id);
                setIsRequestModalOpen(true);
              } else {
                toast.error('Verification failed', { id: verifyingToast });
              }
            } catch (err) {
               toast.error('Verification error', { id: verifyingToast });
            }
          },
          prefill: res.merchantDetails,
          theme: { color: '#5EB929' }
        };

        const rzp = new window.Razorpay(options);
        rzp.open();
      }
    } catch (err) {
      toast.error('Failed to initiate purchase', { id: loadingToast });
    }
  };

  const handleRequestSubmit = async () => {
    if (!adData.image) return toast.error('Please upload a banner image');
    
    setSubmitting(true);
    try {
      const payload = {
        planId: selectedPlan._id,
        paymentId: lastPaymentId,
        image: adData.image,
        adText: adData.adText,
        type: 'banner',
        storeName: merchant.storeName
      };

      const res = await merchantAPI.requestAd(payload);
      if (res.success) {
        toast.success('Ad request submitted for review! 🚀');
        setIsRequestModalOpen(false);
        setAdData({ image: '', imagePreview: null, adText: '' });
      } else {
        toast.error(res.message || 'Submission failed');
      }
    } catch (err) {
      toast.error('Submission failed');
    } finally {
      setSubmitting(false);
    }
  };

  return (
    <div className="space-y-4 pb-20">
      <div className="flex flex-col md:flex-row md:items-center justify-between gap-4">
        <div>
          <h1 className="text-2xl font-bold text-gray-900 tracking-tight uppercase">Boost & Advertise</h1>
          <p className="text-sm text-gray-500 font-medium">Get featured on the homepage and reach thousands of customers.</p>
        </div>
      </div>
      <div className="space-y-6">
        {/* Available Packages - Compact Horizontal Scroll */}
        <section>
          <div className="flex items-center justify-between mb-3">
            <h2 className="text-[12px] font-bold text-[#5EB929] uppercase tracking-widest">Available Ad Packages</h2>
            <div className="h-[1px] flex-1 bg-gray-100 ml-4"></div>
          </div>

          <div className="flex gap-3 overflow-x-auto pb-4 scrollbar-hide -mx-4 px-4">
            {isLoading ? (
               [1, 2, 3].map(i => (
                 <div key={i} className="w-[180px] h-[160px] bg-gray-50 rounded-2xl animate-pulse flex-shrink-0" />
               ))
            ) : plans.length > 0 ? (
              plans.map((plan) => (
                <motion.div 
                  key={plan._id}
                  whileTap={{ scale: 0.98 }}
                  className="w-[180px] flex-shrink-0 bg-white rounded-2xl p-4 border border-gray-100 shadow-sm relative overflow-hidden"
                >
                  <div className="absolute top-0 right-0 w-12 h-12 bg-indigo-50/50 rounded-bl-full flex items-center justify-center pl-2 pb-2">
                    <CampaignRoundedIcon sx={{ fontSize: 16 }} className="text-indigo-600" />
                  </div>
                  
                  <h3 className="text-xs font-bold text-gray-900 mb-0.5 line-clamp-1">{plan.name}</h3>
                  <p className="text-lg font-bold text-[#5EB929]">₹{plan.price}</p>
                  <p className="text-[8px] text-gray-400 font-bold uppercase mb-3">{plan.duration}</p>
                  
                  <button 
                    onClick={() => handlePurchase(plan)}
                    className="w-full py-2 bg-gray-900 text-white rounded-lg font-bold text-[9px] uppercase tracking-widest hover:bg-black transition-all"
                  >
                    Select
                  </button>
                </motion.div>
              ))
            ) : (
              <div className="w-full bg-white rounded-2xl p-6 border border-dashed border-gray-200 text-center">
                <p className="text-[10px] text-gray-400 font-bold">No packages in your city.</p>
              </div>
            )}
          </div>
        </section>

        {/* Ad Status - Compact Grid */}
        <section className="space-y-3">
          <div className="flex items-center justify-between mb-1">
            <h2 className="text-[12px] font-bold text-[#5EB929] uppercase tracking-widest">Your Ad Status</h2>
            <div className="h-[1px] flex-1 bg-gray-100 ml-4"></div>
          </div>

          <div className="bg-gray-900 rounded-3xl p-5 text-white shadow-xl relative overflow-hidden">
            {/* Quota Badge */}
            <div className="flex items-center justify-between mb-4">
              <div className="flex items-center gap-2">
                 <div className="w-8 h-8 bg-white/10 rounded-lg flex items-center justify-center text-amber-400">
                    <WorkspacePremiumRoundedIcon sx={{ fontSize: 16 }} />
                 </div>
                 <div>
                    <p className="text-[8px] font-bold uppercase text-gray-500 tracking-tight leading-none">Visibility</p>
                    <p className="text-[11px] font-bold uppercase tracking-tight truncate max-w-[120px]">
                      {merchant?.subscription?.planId?.name || 'Standard'}
                    </p>
                 </div>
              </div>
              
              {stats.availableAdSlots > 0 ? (
                <div className="bg-[#5EB929] px-2 py-1 rounded-md animate-pulse">
                   <p className="text-[8px] font-bold uppercase tracking-widest">{stats.availableAdSlots} Unused Slot{stats.availableAdSlots > 1 ? 's' : ''}</p>
                </div>
              ) : (
                <div className="bg-white/5 px-2 py-1 rounded-md border border-white/10">
                   <p className="text-[8px] font-bold uppercase tracking-widest text-gray-500">No Slots</p>
                </div>
              )}
            </div>

            <div className="grid grid-cols-2 gap-2 mb-4">
               <div className="p-3 bg-white/5 rounded-xl border border-white/5">
                  <p className="text-[8px] font-bold text-gray-500 uppercase mb-0.5">Active</p>
                  <p className="text-xl font-bold">{stats.activeAdsCount || 0}</p>
               </div>
               <div className="p-3 bg-white/5 rounded-xl border border-white/5">
                  <p className="text-[8px] font-bold text-gray-500 uppercase mb-0.5">Pending</p>
                  <p className="text-xl font-bold text-amber-500">{stats.pendingAdsCount || 0}</p>
               </div>
            </div>

            {stats.availableAdSlots > 0 ? (
              <button 
                onClick={() => setIsRequestModalOpen(true)}
                className="w-full py-3 bg-[#5EB929] text-white rounded-xl font-bold text-[10px] uppercase tracking-widest shadow-lg shadow-[#5EB929]/20"
              >
                Submit Banner Now
              </button>
            ) : (
              <p className="text-[9px] text-gray-500 font-bold text-center italic">
                {stats.totalAdPackages > 0 
                  ? "Buy more packages to increase visibility" 
                  : "Buy a banner package to appear on homepage"}
              </p>
            )}
          </div>
        </section>

        {/* Quick Help */}
        <section className="bg-white rounded-2xl p-4 border border-gray-100 flex items-center gap-4">
           <div className="w-10 h-10 bg-gray-50 rounded-full flex items-center justify-center flex-shrink-0">
              <CampaignRoundedIcon sx={{ fontSize: 20 }} className="text-gray-400" />
           </div>
           <div>
              <h4 className="text-[10px] font-bold text-gray-900 uppercase">Banner Guidelines</h4>
              <p className="text-[9px] text-gray-500 font-bold">1200x400px • JPG/PNG • 24h Approval</p>
           </div>
        </section>
      </div>

      {/* Banner Submission Modal */}
      {isRequestModalOpen && (
        <div className="fixed inset-0 z-[99999] bg-gray-950/80 backdrop-blur-md flex items-center justify-center p-4">
          <motion.div 
            initial={{ opacity: 0, scale: 0.9 }}
            animate={{ opacity: 1, scale: 1 }}
            className="w-full max-w-xl bg-white rounded-[2.5rem] overflow-hidden shadow-2xl"
          >
            <div className="bg-gray-900 p-6 text-white flex justify-between items-center">
               <div className="flex items-center gap-3">
                  <div className="w-10 h-10 bg-[#5EB929] rounded-xl flex items-center justify-center">
                    <AddPhotoAlternateRoundedIcon />
                  </div>
                  <div>
                    <h3 className="text-lg font-bold leading-none">Submit Your Banner</h3>
                    <p className="text-[10px] font-bold text-gray-400 uppercase tracking-widest mt-1">Package: {selectedPlan?.name}</p>
                  </div>
               </div>
               <button onClick={() => setIsRequestModalOpen(false)} className="text-gray-400 hover:text-white">
                 <CloseRoundedIcon />
               </button>
            </div>

            <div className="p-8 space-y-6">
              <div className="space-y-4">
                <div className="relative group">
                  <input 
                    type="file" 
                    accept="image/*" 
                    onChange={handleImageUpload}
                    className="absolute inset-0 opacity-0 z-10 cursor-pointer" 
                  />
                  <div className="w-full h-48 rounded-3xl bg-gray-50 border-2 border-dashed border-gray-200 flex flex-col items-center justify-center group-hover:border-[#5EB929]/30 transition-all overflow-hidden relative">
                    {adData.imagePreview ? (
                      <img src={adData.imagePreview} className="w-full h-full object-cover" alt="Banner" />
                    ) : (
                      <>
                        <div className="w-12 h-12 bg-white rounded-2xl flex items-center justify-center text-gray-300 shadow-sm mb-3">
                          <AddPhotoAlternateRoundedIcon sx={{ fontSize: 24 }} />
                        </div>
                        <p className="text-[11px] font-bold text-gray-400 uppercase tracking-widest">Click to upload banner</p>
                        <p className="text-[9px] text-gray-300 font-bold mt-1">Recommended size: 1200 x 400px</p>
                      </>
                    )}
                    {uploading && (
                      <div className="absolute inset-0 bg-white/80 flex items-center justify-center">
                        <div className="w-6 h-6 border-2 border-[#5EB929] border-t-transparent rounded-full animate-spin" />
                      </div>
                    )}
                  </div>
                </div>

                <div>
                  <label className="text-[10px] font-bold text-gray-400 uppercase tracking-widest mb-2 block ml-1">Promotional Text (Optional)</label>
                  <textarea 
                    value={adData.adText}
                    onChange={(e) => setAdData({...adData, adText: e.target.value})}
                    placeholder="e.g. Special weekend sale! Up to 50% off on all items."
                    className="w-full px-5 py-4 bg-gray-50 rounded-2xl border border-gray-100 focus:border-[#5EB929]/20 outline-none text-sm font-medium min-h-[100px] transition-all"
                  />
                </div>
              </div>

              <div className="flex gap-3 pt-2">
                <button 
                  onClick={() => setIsRequestModalOpen(false)}
                  className="flex-1 py-4 bg-gray-100 text-gray-600 rounded-2xl font-bold text-xs uppercase tracking-widest hover:bg-gray-200 transition-all"
                >
                  Cancel
                </button>
                <button 
                  onClick={handleRequestSubmit}
                  disabled={uploading || submitting || !adData.image}
                  className="flex-[2] py-4 bg-gray-900 text-white rounded-2xl font-bold text-xs uppercase tracking-widest hover:bg-black transition-all shadow-xl shadow-gray-900/20 disabled:opacity-50"
                >
                  {submitting ? 'Submitting...' : 'Submit Request 🚀'}
                </button>
              </div>
            </div>
          </motion.div>
        </div>
      )}
    </div>
  );
};

export default Advertise;
