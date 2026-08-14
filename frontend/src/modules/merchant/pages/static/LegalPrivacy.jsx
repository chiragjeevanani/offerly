import { useEffect } from 'react';
import { motion } from 'framer-motion';
import { useNavigate } from 'react-router-dom';
import ArrowBackRoundedIcon from '@mui/icons-material/ArrowBackRounded';
import SecurityRoundedIcon from '@mui/icons-material/SecurityRounded';
import ShieldRoundedIcon from '@mui/icons-material/ShieldRounded';
import LockRoundedIcon from '@mui/icons-material/LockRounded';

const PrivacyStrip = ({ title, content, idx }) => (
  <motion.div
    initial={{ opacity: 0, x: -10 }}
    whileInView={{ opacity: 1, x: 0 }}
    viewport={{ once: true }}
    transition={{ delay: idx * 0.05 }}
    className="bg-white rounded-2xl p-6 border border-gray-100 shadow-sm hover:border-[#3D7A4F]/20 transition-all group"
  >
    <div className="flex items-center gap-3 mb-4">
       <div className="w-8 h-8 rounded-lg bg-[#F8F5FF] text-[#3D7A4F] flex items-center justify-center">
          <ShieldRoundedIcon sx={{ fontSize: 16 }} />
       </div>
       <h3 className="text-[14px] font-black text-gray-900 uppercase tracking-tight">{title}</h3>
    </div>
    <div className="text-[12px] text-gray-500 font-medium leading-relaxed space-y-3">
       {content}
    </div>
  </motion.div>
);

const LegalPrivacy = () => {
  const navigate = useNavigate();

  useEffect(() => {
    window.scrollTo(0, 0);
  }, []);

  const policies = [
    {
      title: "Data Encryption",
      content: <p>All merchant and customer interaction data is encrypted at rest and in transit using industry-standard TLS protocols. Your business intelligence is shielded from unauthorized access.</p>
    },
    {
      title: "Information Collection",
      content: <ul className="list-disc pl-4 space-y-2">
        <li>Business Core: Identity, License, and Bank credentials.</li>
        <li>Transaction Data: Real-time booking and revenue metrics.</li>
        <li>Usage Patterns: Terminal interaction logs for performance optimization.</li>
      </ul>
    },
    {
      title: "Third-Party Safeguards",
      content: <p>We never sell your business data. Transmission to third-party providers (Payment Gateways/Cloud Hosting) is governed by strict non-disclosure agreements and technical barriers.</p>
    },
    {
      title: "Merchant Rights",
      content: <p>You maintain absolute ownership of your data. At any point, you can request an export of your transaction history or corrected business profiles via the support concierge.</p>
    },
    {
      title: "Cookie Architecture",
      content: <p>We use session-only cookies to maintain secure terminal access and remember your workspace preferences. No invasive cross-site tracking is deployed.</p>
    }
  ];

  return (
    <div className="min-h-screen bg-[#F8F5FF] pb-24">
      {/* Premium Header */}
      <div className="sticky top-0 z-50 bg-white/80 backdrop-blur-xl border-b border-gray-100 px-4 py-3 flex items-center gap-3">
        <button onClick={() => navigate(-1)} className="w-9 h-9 flex items-center justify-center rounded-xl bg-gray-50 text-gray-400 hover:bg-gray-100 transition-all">
          <ArrowBackRoundedIcon sx={{ fontSize: 20 }} />
        </button>
        <h1 className="text-[15px] font-black text-gray-900 uppercase tracking-widest">Privacy Protocol</h1>
      </div>

      <div className="max-w-3xl mx-auto px-4 py-8 space-y-8">
        
        {/* Identity Strip (Hero) */}
        <div className="bg-gray-900 rounded-[2.5rem] p-6 sm:p-10 relative overflow-hidden shadow-2xl">
           <div className="absolute top-0 right-0 w-80 h-80 bg-[#3D7A4F]/20 rounded-full blur-[90px] -translate-y-1/2 translate-x-1/2" />
           <div className="relative z-10 flex flex-col sm:flex-row items-center gap-6 lg:gap-10">
              <motion.div initial={{ scale: 0.9, opacity: 0 }} animate={{ scale: 1, opacity: 1 }} className="w-16 h-16 bg-white/5 border border-white/10 rounded-2xl flex items-center justify-center flex-shrink-0">
                 <SecurityRoundedIcon sx={{ fontSize: 32 }} className="text-[#3D7A4F]" />
              </motion.div>
              <div className="space-y-2 text-center sm:text-left">
                 <motion.h2 initial={{ opacity: 0, y: 10 }} animate={{ opacity: 1, y: 0 }} className="text-xl sm:text-2xl lg:text-3xl font-black text-white tracking-tighter leading-tight">Data <span className="text-[#3D7A4F]">Security Hub.</span></motion.h2>
                 <motion.p initial={{ opacity: 0, y: 10 }} animate={{ opacity: 1, y: 0 }} transition={{ delay: 0.1 }} className="text-gray-400 text-[12px] sm:text-sm font-medium leading-relaxed max-w-xl">Privacy by design. How we architect, shield, and manage your business intelligence within the ecosystem.</motion.p>
              </div>
           </div>
        </div>

        {/* Policy Grid */}
        <div className="space-y-4">
           {policies.map((policy, index) => (
             <PrivacyStrip key={index} idx={index} title={policy.title} content={policy.content} />
           ))}
        </div>

        {/* Trust Card */}
        <motion.div 
          initial={{ opacity: 0, scale: 0.95 }} whileInView={{ opacity: 1, scale: 1 }} viewport={{ once: true }}
          className="bg-white rounded-3xl p-8 border border-dashed border-gray-200 text-center space-y-4"
        >
           <div className="w-12 h-12 rounded-full bg-[#F8F5FF] text-[#3D7A4F] flex items-center justify-center mx-auto">
              <LockRoundedIcon sx={{ fontSize: 24 }} />
           </div>
           <h3 className="text-lg font-black text-gray-900 tracking-tight">Committed to Transparency</h3>
           <p className="text-[12px] text-gray-500 font-medium max-w-md mx-auto leading-relaxed">
             We understand the value of your commercial data. Our security protocols are updated every 24 hours to ensure 
             the highest level of shielding against modern digital threats.
           </p>
           <button onClick={() => navigate(-1)} className="px-10 py-3 bg-gray-900 text-white rounded-xl font-black text-[10px] uppercase tracking-widest hover:bg-[#3D7A4F] transition-all">
              Secure & Exit
           </button>
        </motion.div>

        <div className="text-center py-6">
           <p className="text-[10px] font-black text-gray-400 uppercase tracking-[0.4em]">Privacy Architecture v2.0.4</p>
        </div>
      </div>
    </div>
  );
};

export default LegalPrivacy;
