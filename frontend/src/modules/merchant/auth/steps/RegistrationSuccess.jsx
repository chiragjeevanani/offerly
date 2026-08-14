import { motion } from 'framer-motion';
import { useNavigate } from 'react-router-dom';
import CheckCircleRoundedIcon from '@mui/icons-material/CheckCircleRounded';
import RocketLaunchRoundedIcon from '@mui/icons-material/RocketLaunchRounded';
import VerifiedUserRoundedIcon from '@mui/icons-material/VerifiedUserRounded';
import StorefrontRoundedIcon from '@mui/icons-material/StorefrontRounded';
import ArrowForwardRoundedIcon from '@mui/icons-material/ArrowForwardRounded';

const RegistrationSuccess = ({ merchant }) => {
  const navigate = useNavigate();

  return (
    <div className="max-w-md mx-auto py-6 px-4">
      <motion.div
        initial={{ scale: 0.95, opacity: 0 }}
        animate={{ scale: 1, opacity: 1 }}
        className="bg-white rounded-[2.5rem] shadow-2xl shadow-gray-200/50 p-6 md:p-8 text-center border border-white relative overflow-hidden"
      >
        {/* Background Sparkle */}
        <div className="absolute top-0 right-0 w-24 h-24 bg-[#5EB929]/5 rounded-full blur-3xl -translate-y-1/2 translate-x-1/2" />
        
        <div className="relative z-10 space-y-6">
          <motion.div
            initial={{ scale: 0 }}
            animate={{ scale: 1 }}
            transition={{ delay: 0.2, type: 'spring', stiffness: 200 }}
            className="w-16 h-16 bg-[#5EB929]/10 rounded-[1.5rem] flex items-center justify-center mx-auto shadow-lg shadow-[#5EB929]/5"
          >
            <CheckCircleRoundedIcon sx={{ fontSize: 32 }} className="text-[#5EB929]" />
          </motion.div>

          <div className="space-y-1.5">
            <h1 className="text-gray-900 font-bold text-xl tracking-tight uppercase leading-tight">
              Application Synchronized!
            </h1>
            <p className="text-gray-400 text-[9px] font-bold tracking-tight uppercase px-4 leading-relaxed">
              Your merchant protocol is now entering verification
            </p>
          </div>

          <div className="bg-background rounded-[2rem] p-5 md:p-6 space-y-5 text-left border border-gray-50">
             <div className="flex items-center gap-2 mb-1">
                <div className="w-1 h-1 bg-[#5EB929] rounded-full" />
                <h3 className="text-[9px] font-bold text-gray-400 uppercase tracking-widest">Protocol timeline</h3>
             </div>

             <div className="space-y-4">
                {[
                  { icon: VerifiedUserRoundedIcon, title: "Identity verification", desc: "Verification of submitted documentation" },
                  { icon: RocketLaunchRoundedIcon, title: "Activation dispatch", desc: "Secure notification once approved" },
                  { icon: StorefrontRoundedIcon, title: "Marketplace entry", desc: "Access full dashboard and live offers" }
                ].map((step, idx) => (
                  <div key={idx} className="flex gap-3.5 relative">
                    {idx < 2 && <div className="absolute left-4 top-10 w-px h-4 bg-gray-200" />}
                    <div className="w-9 h-9 bg-white rounded-xl border border-gray-100 flex items-center justify-center flex-shrink-0 shadow-sm relative z-10">
                      <step.icon sx={{ fontSize: 16 }} className="text-[#5EB929]" />
                    </div>
                    <div className="space-y-0">
                      <p className="text-[11px] font-bold text-gray-900 tracking-tight">{step.title}</p>
                      <p className="text-[9px] font-bold text-gray-400 leading-snug">{step.desc}</p>
                    </div>
                  </div>
                ))}
             </div>
          </div>

          <div className="bg-[#5EB929]/5 rounded-xl p-3 flex items-center justify-between">
             <div className="flex flex-col items-start">
                <span className="text-[8px] font-bold text-[#5EB929] uppercase tracking-widest">Est. verification</span>
                <span className="text-[10px] font-bold text-gray-600">24 - 48 Hours</span>
             </div>
             <div className="w-7 h-7 bg-white rounded-lg flex items-center justify-center shadow-sm">
                <div className="w-1.5 h-1.5 bg-[#5EB929] rounded-full animate-pulse" />
             </div>
          </div>

          <motion.button
            whileTap={{ scale: 0.98 }}
            onClick={() => navigate('/merchant/status')}
            className="w-full h-12 bg-[#5EB929] text-white rounded-2xl font-bold text-[11px] shadow-lg shadow-[#5EB929]/20 flex items-center justify-center gap-2 active:scale-95 transition-all"
          >
            Check Application Status
            <ArrowForwardRoundedIcon sx={{ fontSize: 14 }} />
          </motion.button>
        </div>
      </motion.div>
    </div>
  );
};

export default RegistrationSuccess;
