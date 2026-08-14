import { useState, useEffect } from 'react';
import { motion } from 'framer-motion';
import { useNavigate } from 'react-router-dom';
import HourglassEmptyRoundedIcon from '@mui/icons-material/HourglassEmptyRounded';
import ErrorOutlineRoundedIcon from '@mui/icons-material/ErrorOutlineRounded';
import CheckCircleRoundedIcon from '@mui/icons-material/CheckCircleRounded';
import DashboardRoundedIcon from '@mui/icons-material/DashboardRounded';
import RefreshRoundedIcon from '@mui/icons-material/RefreshRounded';
import ExitToAppRoundedIcon from '@mui/icons-material/ExitToAppRounded';
import EmailRoundedIcon from '@mui/icons-material/EmailRounded';
import PhoneRoundedIcon from '@mui/icons-material/PhoneRounded';
import StorefrontRoundedIcon from '@mui/icons-material/StorefrontRounded';
import InfoRoundedIcon from '@mui/icons-material/InfoRounded';
import LocationOnRoundedIcon from '@mui/icons-material/LocationOnRounded';
import CategoryRoundedIcon from '@mui/icons-material/CategoryRounded';
import HelpOutlineRoundedIcon from '@mui/icons-material/HelpOutlineRounded';
import { useApp } from '../../customer/context/AppContext';
import { merchantAPI } from '../../../api/merchant.api';
import toast from 'react-hot-toast';
import { useSocket } from '../../../context/SocketContext';

const MerchantStatus = ({ merchant, onStatusChange }) => {
  const navigate = useNavigate();
  const { logout } = useApp();
  const [checking, setChecking] = useState(false);
  
  const isRejected = merchant?.status === 'rejected';
  const isPending = merchant?.status === 'pending';
  const isApproved = merchant?.status === 'approved';

  const { socket } = useSocket();

  const handleCheckStatus = async (silent = false) => {
    if (!silent) setChecking(true);
    try {
      const response = await merchantAPI.getById('me');
      if (response.merchant) {
        // Only toast if status changed or it was a manual check
        if (response.merchant.status !== merchant?.status || !silent) {
          if (response.merchant.status === 'approved') {
            toast.success('Your store has been approved! 🎉');
            if (onStatusChange) await onStatusChange();
          } else if (response.merchant.status === 'rejected') {
            toast.error('Your application was rejected');
            if (onStatusChange) await onStatusChange();
          } else if (!silent) {
            toast.success('Application is still pending approval', { icon: '⏳' });
          }
        }
      }
    } catch (error) {
      if (!silent) {
        console.error('Status check error:', error);
        toast.error(error?.message || 'Failed to check status');
      }
    } finally {
      if (!silent) setChecking(false);
    }
  };

  // Auto-polling when pending
  useEffect(() => {
    if (!isPending) return;
    const interval = setInterval(() => {
      handleCheckStatus(true); // silent check
    }, 30000);
    return () => clearInterval(interval);
  }, [isPending]);

  // Real-time socket listener
  useEffect(() => {
    if (!socket || !isPending) return;

    const handleNotification = (notification) => {
      if (notification.type === 'store_status') {
        handleCheckStatus(true);
      }
    };

    socket.on('merchant_notification', handleNotification);
    return () => socket.off('merchant_notification', handleNotification);
  }, [socket, isPending]);

  const handleGoToDashboard = () => {
    if (isApproved) navigate('/merchant');
  };

  const steps = [
    { label: 'Registration', status: 'completed' },
    { label: 'Verification', status: isApproved ? 'completed' : isRejected ? 'failed' : 'current' },
    { label: 'Approval', status: isApproved ? 'completed' : 'pending' }
  ];

  return (
    <div className="min-h-screen bg-[#F9FAFB] flex items-center justify-center p-6 font-sans">
      <div className="max-w-2xl w-full">
        <motion.div 
          initial={{ y: 20, opacity: 0 }}
          animate={{ y: 0, opacity: 1 }}
          transition={{ duration: 0.5 }}
          className="bg-white rounded-[2rem] shadow-[0_20px_50px_rgba(0,0,0,0.08)] border border-gray-100 overflow-hidden"
        >
          {/* Enhanced Header */}
          <div className={`relative p-10 pb-12 bg-gradient-to-br ${
            isRejected ? 'from-red-600 to-red-800' : 
            isApproved ? 'from-primary-600 to-primary-800' : 
            'from-primary-800 to-gray-900'
          }`}>
            {/* Abstract Background Pattern */}
            <div className="absolute inset-0 opacity-10 pointer-events-none">
              <svg width="100%" height="100%" xmlns="http://www.w3.org/2000/svg">
                <defs>
                  <pattern id="grid" width="40" height="40" patternUnits="userSpaceOnUse">
                    <path d="M 40 0 L 0 0 0 40" fill="none" stroke="white" strokeWidth="1"/>
                  </pattern>
                </defs>
                <rect width="100%" height="100%" fill="url(#grid)" />
              </svg>
            </div>
            
            <div className="relative z-10 flex flex-col items-center text-center">
              <motion.div 
                initial={{ scale: 0 }}
                animate={{ scale: 1 }}
                transition={{ type: 'spring', damping: 12, delay: 0.2 }}
                className="w-20 h-20 bg-white/10 backdrop-blur-xl rounded-[1.5rem] flex items-center justify-center border border-white/20 shadow-2xl mb-6"
              >
                {isRejected ? (
                  <ErrorOutlineRoundedIcon className="text-white" sx={{fontSize: 40}} />
                ) : isApproved ? (
                  <CheckCircleRoundedIcon className="text-white" sx={{fontSize: 40}} />
                ) : (
                  <HourglassEmptyRoundedIcon className="text-white animate-pulse" sx={{fontSize: 40}} />
                )}
              </motion.div>
              
              <h1 className="text-4xl font-bold text-white leading-none uppercase tracking-tight mb-2">
                {isRejected ? 'Rejected' : isApproved ? 'Approved' : 'Pending'}
              </h1>
              <div className="flex items-center gap-2 px-4 py-1.5 bg-black/20 backdrop-blur-md rounded-full border border-white/10">
                <StorefrontRoundedIcon className="text-white/60" sx={{fontSize: 16}} />
                <span className="text-white font-bold text-sm tracking-wide">{merchant?.storeName}</span>
              </div>
            </div>
          </div>

          <div className="p-10 -mt-8 relative z-10 bg-white rounded-t-[2.5rem] space-y-8">
            {/* Status Stepper */}
            <div className="flex items-center justify-between px-4">
              {steps.map((step, idx) => (
                <div key={idx} className="flex flex-col items-center gap-2 flex-1 relative">
                  <div className={`w-10 h-10 rounded-full flex items-center justify-center z-10 border-4 ${
                    step.status === 'completed' ? 'bg-primary-600 border-primary-100 text-white' :
                    step.status === 'failed' ? 'bg-red-500 border-red-100 text-white' :
                    step.status === 'current' ? 'bg-white border-primary-600 text-primary-600' :
                    'bg-gray-100 border-gray-50 text-gray-400'
                  }`}>
                    {step.status === 'completed' ? <CheckCircleRoundedIcon sx={{fontSize: 20}} /> : 
                     step.status === 'failed' ? <ErrorOutlineRoundedIcon sx={{fontSize: 20}} /> :
                     <span className="text-sm font-bold">{idx + 1}</span>}
                  </div>
                  <span className={`text-[10px] font-bold uppercase tracking-widest ${
                    step.status === 'completed' || step.status === 'current' ? 'text-primary-700' : 
                    step.status === 'failed' ? 'text-red-600' : 'text-gray-400'
                  }`}>{step.label}</span>
                  
                  {idx < steps.length - 1 && (
                    <div className={`absolute top-5 left-1/2 w-full h-[2px] -z-0 ${
                      step.status === 'completed' ? 'bg-primary-600' : 'bg-gray-100'
                    }`} />
                  )}
                </div>
              ))}
            </div>

            {/* Main Message Card */}
            <div className={`rounded-3xl p-8 border ${
              isRejected ? 'bg-red-50/50 border-red-100' : 
              isApproved ? 'bg-primary-50/50 border-primary-100' : 
              'bg-blue-50/30 border-blue-100/50'
            }`}>
              <div className="flex items-start gap-4">
                <div className={`p-2.5 rounded-2xl ${
                  isRejected ? 'bg-red-100 text-red-600' : 
                  isApproved ? 'bg-primary-100 text-primary-700' : 
                  'bg-blue-100 text-blue-600'
                }`}>
                  <InfoRoundedIcon sx={{fontSize: 24}} />
                </div>
                <div>
                  <h3 className={`text-lg font-bold mb-1 ${
                    isRejected ? 'text-red-900' : 
                    isApproved ? 'text-primary-900' : 
                    'text-blue-900'
                  }`}>
                    {isRejected ? 'Action Required' : isApproved ? 'Welcome to OfferlyBiz!' : 'Verification in Progress'}
                  </h3>
                  <p className="text-gray-600 text-sm font-medium leading-relaxed">
                    {isRejected 
                      ? 'Your application was not approved. Please see the rejection reason below and contact support for assistance.' 
                      : isApproved
                        ? 'Your store is live! You can now start creating offers and growing your business with Offerly.'
                        : 'Our team is currently reviewing your documents and business details. This typically takes 24-48 hours.'}
                  </p>
                </div>
              </div>
            </div>

            {/* Rejection Reason Section */}
            {isRejected && merchant?.rejectionReason && (
              <div className="bg-gray-50 rounded-3xl p-8 border border-gray-200">
                <div className="flex items-center gap-2 mb-3">
                  <ErrorOutlineRoundedIcon className="text-red-500" sx={{fontSize: 20}} />
                  <span className="text-xs font-bold text-gray-500 uppercase tracking-widest">Reason for Rejection</span>
                </div>
                <p className="text-gray-900 font-bold leading-relaxed italic">
                  "{merchant.rejectionReason}"
                </p>
              </div>
            )}

            {/* Organized Store Info */}
            <div className="grid grid-cols-2 gap-4">
              <div className="bg-white border border-gray-100 rounded-3xl p-5 shadow-sm">
                <div className="flex items-center gap-3 mb-3">
                  <div className="w-8 h-8 rounded-xl bg-gray-50 flex items-center justify-center text-gray-400">
                    <CategoryRoundedIcon sx={{fontSize: 18}} />
                  </div>
                  <span className="text-[10px] font-bold text-gray-400 uppercase tracking-widest">Category</span>
                </div>
                <p className="text-sm font-bold text-gray-900 ml-1">{merchant?.category}</p>
              </div>
              
              <div className="bg-white border border-gray-100 rounded-3xl p-5 shadow-sm">
                <div className="flex items-center gap-3 mb-3">
                  <div className="w-8 h-8 rounded-xl bg-gray-50 flex items-center justify-center text-gray-400">
                    <LocationOnRoundedIcon sx={{fontSize: 18}} />
                  </div>
                  <span className="text-[10px] font-bold text-gray-400 uppercase tracking-widest">Location</span>
                </div>
                <p className="text-sm font-bold text-gray-900 ml-1">{merchant?.city}</p>
              </div>
            </div>

            {/* Prominent Support for Rejected Users */}
            {isRejected && (
              <div className="bg-primary-900 rounded-3xl p-8 text-white relative overflow-hidden group">
                <div className="absolute top-0 right-0 w-32 h-32 bg-white/5 rounded-full blur-2xl group-hover:bg-white/10 transition-colors" />
                <div className="relative z-10">
                  <div className="flex items-center gap-3 mb-4">
                    <HelpOutlineRoundedIcon className="text-primary-400" />
                    <h3 className="font-bold">Need Help or Clarification?</h3>
                  </div>
                  <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
                    <div className="flex items-center gap-3 bg-white/5 rounded-2xl p-3 hover:bg-white/10 transition-colors cursor-pointer">
                      <EmailRoundedIcon className="text-primary-400" sx={{fontSize: 18}} />
                      <span className="text-xs font-medium">support@offerly.in</span>
                    </div>
                    <div className="flex items-center gap-3 bg-white/5 rounded-2xl p-3 hover:bg-white/10 transition-colors cursor-pointer">
                      <PhoneRoundedIcon className="text-primary-400" sx={{fontSize: 18}} />
                      <span className="text-xs font-medium">+91 00000 00000</span>
                    </div>
                  </div>
                </div>
              </div>
            )}

            {/* Enhanced Action Buttons */}
            <div className="flex flex-col gap-3 pt-4">
              <div className="grid grid-cols-2 gap-4">
                <motion.button
                  whileTap={{ scale: 0.98 }}
                  onClick={handleCheckStatus}
                  disabled={checking}
                  className="h-14 bg-gray-50 hover:bg-gray-100 text-gray-900 font-bold rounded-2xl flex items-center justify-center gap-3 transition-all border border-gray-200 disabled:opacity-50"
                >
                  {checking ? (
                    <div className="w-5 h-5 border-2 border-gray-300 border-t-primary-700 rounded-full animate-spin" />
                  ) : (
                    <>
                      <RefreshRoundedIcon sx={{fontSize: 20}} />
                      <span>Sync Status</span>
                    </>
                  )}
                </motion.button>

                <motion.button
                  whileTap={isApproved ? { scale: 0.98 } : {}}
                  onClick={handleGoToDashboard}
                  disabled={!isApproved}
                  className={`h-14 font-bold rounded-2xl flex items-center justify-center gap-3 transition-all shadow-lg ${
                    isApproved
                      ? 'bg-primary-700 hover:bg-primary-800 text-white shadow-primary-700/20'
                      : 'bg-gray-100 text-gray-400 cursor-not-allowed shadow-none border border-gray-200'
                  }`}
                >
                  <DashboardRoundedIcon sx={{fontSize: 20}} />
                  <span>Dashboard</span>
                </motion.button>
              </div>

              {/* Minimalist Sign-out */}
              <button 
                onClick={() => { logout(); navigate('/merchant'); }}
                className="mt-4 flex items-center justify-center gap-2 text-xs font-bold text-gray-400 hover:text-gray-600 uppercase tracking-widest transition-colors py-2"
              >
                <ExitToAppRoundedIcon sx={{fontSize: 14}} />
                Sign out from this account
              </button>
            </div>
          </div>
        </motion.div>
        
        {/* Modern Footer */}
        <div className="mt-10 flex flex-col items-center opacity-30">
          <div className="flex items-center gap-2 mb-2">
            <div className="w-6 h-6 bg-gray-900 rounded flex items-center justify-center">
              <span className="text-white text-[10px] font-bold">O</span>
            </div>
            <span className="text-xs font-bold tracking-widest text-gray-900 uppercase">OFFERLY<span className="text-primary-700">BIZ</span></span>
          </div>
          <p className="text-[10px] font-bold text-gray-500 uppercase tracking-widest">Secured Merchant Portal v2.0</p>
        </div>
      </div>
    </div>
  );
};

export default MerchantStatus;
