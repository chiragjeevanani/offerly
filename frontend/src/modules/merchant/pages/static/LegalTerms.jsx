import { useEffect } from 'react';
import { motion } from 'framer-motion';
import { useNavigate } from 'react-router-dom';
import ArrowBackRoundedIcon from '@mui/icons-material/ArrowBackRounded';
import DescriptionRoundedIcon from '@mui/icons-material/DescriptionRounded';
import PolicyRoundedIcon from '@mui/icons-material/PolicyRounded';

const TermCard = ({ title, content, idx }) => (
  <motion.div
    initial={{ opacity: 0, x: -10 }}
    whileInView={{ opacity: 1, x: 0 }}
    viewport={{ once: true }}
    transition={{ delay: idx * 0.05 }}
    className="bg-white rounded-2xl p-6 border border-gray-100 shadow-sm hover:border-[#5EB929]/20 transition-all group"
  >
    <div className="flex items-center gap-3 mb-4">
       <div className="w-8 h-8 rounded-lg bg-background text-[#5EB929] flex items-center justify-center font-bold text-xs">
          {idx + 1}
       </div>
       <h3 className="text-[14px] font-bold text-gray-900 uppercase tracking-tight">{title}</h3>
    </div>
    <div className="text-[12px] text-gray-500 font-medium leading-relaxed space-y-3">
       {content}
    </div>
  </motion.div>
);

const LegalTerms = () => {
  const navigate = useNavigate();

  useEffect(() => {
    window.scrollTo(0, 0);
  }, []);

  const sections = [
    {
      title: "Protocol Acceptance",
      content: <p>By accessing the Offerly Business Terminal, you enter into a binding agreement with the platform ecosystem. Usage constitutes absolute consent to these operational protocols.</p>
    },
    {
      title: "Merchant Verification",
      content: <ul className="list-disc pl-4 space-y-2">
        <li>Valid Commercial Identity required.</li>
        <li>Active Subscription maintenance is mandatory for terminal access.</li>
        <li>Accuracy in product/service data transmission.</li>
      </ul>
    },
    {
      title: "Operational Ethics",
      content: <p>Merchants must honor 100% of the offers deployed via the Rocket Campaign engine. Refusal to fulfill verified QR bookings may lead to immediate terminal suspension.</p>
    },
    {
      title: "Financial Settlements",
      content: <p>Payouts are architected on a weekly cycle (Every Monday). Settlements are calculated based on net redemptions minus platform architectural fees.</p>
    },
    {
      title: "Data Sovereignty",
      content: <p>Customer data accessed via the scanner is for fulfillment only. Transmission or leak of user data to third-party entities is a critical violation of platform integrity.</p>
    },
    {
      title: "Account Integrity",
      content: <p>Offerly reserves the absolute right to terminate access for fraudulent activity, misleading offer deployment, or consistent low-rating performance.</p>
    }
  ];

  return (
    <div className="min-h-screen bg-background pb-24">
      {/* Premium Header */}
      <div className="sticky top-0 z-50 bg-white/80 backdrop-blur-xl border-b border-gray-100 px-4 py-3 flex items-center gap-3">
        <button onClick={() => navigate(-1)} className="w-9 h-9 flex items-center justify-center rounded-xl bg-gray-50 text-gray-400 hover:bg-gray-100 transition-all">
          <ArrowBackRoundedIcon sx={{ fontSize: 20 }} />
        </button>
        <h1 className="text-[15px] font-bold text-gray-900 uppercase tracking-widest">Legal Terminal</h1>
      </div>

      <div className="max-w-3xl mx-auto px-4 py-8 space-y-8">
        
        {/* Identity Strip (Hero) */}
        <div className="bg-gray-900 rounded-[2.5rem] p-6 sm:p-10 relative overflow-hidden shadow-2xl">
           <div className="absolute top-0 right-0 w-80 h-80 bg-[#5EB929]/20 rounded-full blur-[90px] -translate-y-1/2 translate-x-1/2" />
           <div className="relative z-10 flex flex-col sm:flex-row items-center gap-6 lg:gap-10">
              <motion.div initial={{ scale: 0.9, opacity: 0 }} animate={{ scale: 1, opacity: 1 }} className="w-16 h-16 bg-white/5 border border-white/10 rounded-2xl flex items-center justify-center flex-shrink-0">
                 <PolicyRoundedIcon sx={{ fontSize: 32 }} className="text-[#5EB929]" />
              </motion.div>
              <div className="space-y-2 text-center sm:text-left">
                 <motion.h2 initial={{ opacity: 0, y: 10 }} animate={{ opacity: 1, y: 0 }} className="text-xl sm:text-2xl lg:text-3xl font-bold text-white tracking-tight leading-tight">Terms of <span className="text-[#5EB929]">Operation.</span></motion.h2>
                 <motion.p initial={{ opacity: 0, y: 10 }} animate={{ opacity: 1, y: 0 }} transition={{ delay: 0.1 }} className="text-gray-400 text-[12px] sm:text-sm font-medium leading-relaxed max-w-xl">Last Revision: April 16, 2026. Governing the interaction between merchants and the Offerly ecosystem.</motion.p>
              </div>
           </div>
        </div>

        {/* Content Hub */}
        <div className="space-y-4">
           {sections.map((section, index) => (
             <TermCard key={index} idx={index} title={section.title} content={section.content} />
           ))}
        </div>

        {/* Final Acceptance Card */}
        <motion.div 
          initial={{ opacity: 0, y: 20 }} whileInView={{ opacity: 1, y: 0 }} viewport={{ once: true }}
          className="bg-[#5EB929] rounded-3xl p-8 text-white text-center relative overflow-hidden shadow-xl shadow-[#5EB929]/20"
        >
           <div className="absolute top-0 right-0 w-48 h-48 bg-white/5 rounded-full blur-3xl -translate-y-1/2 translate-x-1/2" />
           <DescriptionRoundedIcon className="text-white/30 mb-4" sx={{ fontSize: 40 }} />
           <h3 className="text-xl font-bold mb-2">Architected for Fairness</h3>
           <p className="text-white/70 text-[12px] font-medium max-w-md mx-auto">By continuing your operations on the Offerly Terminal, you acknowledge and accept these governed protocols.</p>
           <button onClick={() => navigate(-1)} className="mt-8 px-10 py-3 bg-white text-[#5EB929] rounded-xl font-bold text-[11px] uppercase tracking-widest hover:scale-105 transition-all active:scale-95">
              Acknowledge
           </button>
        </motion.div>

        <div className="text-center py-6">
           <p className="text-[10px] font-bold text-gray-400 uppercase tracking-[0.4em]">Legal Architecture v2.0.4</p>
        </div>
      </div>
    </div>
  );
};

export default LegalTerms;
