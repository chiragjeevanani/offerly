import { useEffect } from 'react';
import { motion } from 'framer-motion';
import { useNavigate } from 'react-router-dom';
import ArrowBackRoundedIcon from '@mui/icons-material/ArrowBackRounded';
import StorefrontRoundedIcon from '@mui/icons-material/StorefrontRounded';
import TrendingUpRoundedIcon from '@mui/icons-material/TrendingUpRounded';
import QrCodeScannerRoundedIcon from '@mui/icons-material/QrCodeScannerRounded';
import LocalOfferRoundedIcon from '@mui/icons-material/LocalOfferRounded';
import PeopleRoundedIcon from '@mui/icons-material/PeopleRounded';
import VerifiedRoundedIcon from '@mui/icons-material/VerifiedRounded';
import BarChartRoundedIcon from '@mui/icons-material/BarChartRounded';
import RocketLaunchRoundedIcon from '@mui/icons-material/RocketLaunchRounded';

const FeatureStrip = ({ icon: Icon, title, description, idx }) => (
  <motion.div
    initial={{ opacity: 0, x: -10 }}
    whileInView={{ opacity: 1, x: 0 }}
    viewport={{ once: true }}
    transition={{ delay: idx * 0.1 }}
    className="bg-white rounded-2xl p-5 border border-gray-50 shadow-sm flex items-start gap-4 hover:border-[#3D7A4F]/20 transition-all"
  >
    <div className="w-10 h-10 rounded-xl bg-[#F8F5FF] text-[#3D7A4F] flex items-center justify-center flex-shrink-0">
      <Icon sx={{ fontSize: 20 }} />
    </div>
    <div className="min-w-0">
      <h3 className="text-[14px] font-black text-gray-900 leading-tight mb-1">{title}</h3>
      <p className="text-[12px] text-gray-500 font-medium leading-relaxed">{description}</p>
    </div>
  </motion.div>
);

const About = () => {
  const navigate = useNavigate();

  useEffect(() => {
    window.scrollTo(0, 0);
  }, []);

  return (
    <div className="min-h-screen bg-[#F8F5FF] pb-24">
      {/* Premium Header */}
      <div className="sticky top-0 z-50 bg-white/80 backdrop-blur-xl border-b border-gray-100 px-4 py-3 flex items-center gap-3">
        <button onClick={() => navigate(-1)} className="w-9 h-9 flex items-center justify-center rounded-xl bg-gray-50 text-gray-400 hover:bg-gray-100 transition-all">
          <ArrowBackRoundedIcon sx={{ fontSize: 20 }} />
        </button>
        <h1 className="text-[15px] font-black text-gray-900 uppercase tracking-widest">About Enterprise</h1>
      </div>

      <div className="max-w-4xl mx-auto px-4 py-8 space-y-10">
        
        {/* Identity Strip (Optimized Compact Hero) */}
        <div className="bg-gray-900 rounded-[2.5rem] p-6 sm:p-8 lg:p-10 relative overflow-hidden shadow-2xl">
           <div className="absolute top-0 right-0 w-80 h-80 bg-[#3D7A4F]/20 rounded-full blur-[90px] -translate-y-1/2 translate-x-1/2" />
           <div className="relative z-10 flex flex-col sm:flex-row items-center gap-6 lg:gap-10">
              <motion.div initial={{ scale: 0.9, opacity: 0 }} animate={{ scale: 1, opacity: 1 }} className="w-12 h-12 lg:w-16 lg:h-16 bg-white/5 border border-white/10 rounded-2xl flex items-center justify-center flex-shrink-0">
                 <StorefrontRoundedIcon sx={{ fontSize: { xs: 24, lg: 32 } }} className="text-[#3D7A4F]" />
              </motion.div>
              <div className="space-y-2 text-center sm:text-left">
                 <motion.h2 initial={{ opacity: 0, y: 10 }} animate={{ opacity: 1, y: 0 }} className="text-xl sm:text-2xl lg:text-3xl font-black text-white tracking-tighter leading-tight">Powering the <span className="text-[#3D7A4F]">Local Economy.</span></motion.h2>
                 <motion.p initial={{ opacity: 0, y: 10 }} animate={{ opacity: 1, y: 0 }} transition={{ delay: 0.1 }} className="text-gray-400 text-[12px] sm:text-sm lg:text-base font-medium leading-relaxed max-w-xl">Offerly Business provides the tools to attract and retain customers through a seamless deal ecosystem.</motion.p>
              </div>
           </div>
        </div>

        {/* Network Scale Strips */}
        <div className="grid grid-cols-2 sm:grid-cols-4 gap-4">
           {[
              { label: 'Merchant Network', value: '500+' },
              { label: 'Customer Reach', value: '50K+' },
              { label: 'Redemptions', value: '100K+' },
              { label: 'System Uptime', value: '99.9%' },
           ].map((s, idx) => (
              <div key={idx} className="bg-white p-4 rounded-2xl border border-gray-50 text-center">
                 <p className="text-[10px] font-black text-gray-400 uppercase tracking-widest mb-1">{s.label}</p>
                 <p className="text-xl font-black text-gray-900">{s.value}</p>
              </div>
           ))}
        </div>

        {/* Mission Architecture */}
        <div className="space-y-6">
           <div className="flex items-center gap-3 px-1">
              <div className="w-1 h-4 bg-[#3D7A4F] rounded-full" />
              <h3 className="text-[11px] font-black text-gray-900 uppercase tracking-widest">Platform DNA</h3>
           </div>
           <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
              {[
                { icon: TrendingUpRoundedIcon, title: "Hyper-Growth", desc: "Engineered to drive massive foot traffic and scale your monthly revenue through smart offers." },
                { icon: QrCodeScannerRoundedIcon, title: "Instant Verification", desc: "Secure QR-based redemption engine for fraud-proof deal fulfillment in seconds." },
                { icon: BarChartRoundedIcon, title: "Data Sovereignty", desc: "Access deep insights into customer behavior and campaign performance at your fingertips." },
                { icon: VerifiedRoundedIcon, title: "Trusted Network", desc: "Join a curated ecosystem of verified local merchants and premium shoppers." }
              ].map((f, i) => (
                 <FeatureStrip key={i} idx={i} icon={f.icon} title={f.title} description={f.desc} />
              ))}
           </div>
        </div>

        {/* Workflow Strip (Animated Loop) */}
        <div className="bg-[#3D7A4F]/5 rounded-3xl p-8 border border-[#3D7A4F]/10">
           <h3 className="text-center text-[12px] font-black text-[#3D7A4F] uppercase tracking-[0.3em] mb-8">The Fulfillment Loop</h3>
           <div className="grid grid-cols-1 sm:grid-cols-4 gap-8">
              {[
                 { t: 'Register', d: 'Setup Store Identity' },
                 { t: 'Deploy', d: 'Launch Rocket Offers' },
                 { t: 'Discover', d: 'Customer Booking' },
                 { t: 'Verify', d: 'Scan & Fulfill' },
              ].map((step, i) => (
                 <motion.div 
                    key={i} 
                    initial={{ opacity: 0, scale: 0.9 }}
                    whileInView={{ opacity: 1, scale: 1 }}
                    viewport={{ once: true }}
                    transition={{ delay: i * 0.1 }}
                    className="text-center relative"
                 >
                    <div className="w-10 h-10 rounded-full bg-[#3D7A4F] text-white flex items-center justify-center font-black text-sm mx-auto mb-3 shadow-lg shadow-[#3D7A4F]/20">{i+1}</div>
                    <h4 className="text-[13px] font-black text-gray-900 mb-1">{step.t}</h4>
                    <p className="text-[10px] text-gray-500 font-bold uppercase tracking-tight">{step.d}</p>
                 </motion.div>
              ))}
           </div>
        </div>

        {/* Final CTA Strip */}
        <div className="bg-[#3D7A4F] rounded-[2rem] p-10 text-center space-y-6 relative overflow-hidden shadow-2xl shadow-[#3D7A4F]/20">
           <div className="absolute bottom-0 left-0 w-64 h-64 bg-white/5 rounded-full blur-[80px] translate-y-1/2 -translate-x-1/2" />
           <div className="relative z-10">
              <RocketLaunchRoundedIcon className="text-white/40 mb-4" sx={{ fontSize: 40 }} />
              <h3 className="text-2xl sm:text-3xl font-black text-white leading-none">Ready to Accelerate?</h3>
              <p className="text-white/70 text-sm font-medium mt-3">Access your command center and start scaling your local reach.</p>
              <button onClick={() => navigate('/merchant')} className="mt-8 px-12 py-4 bg-white text-[#3D7A4F] rounded-2xl font-black text-[11px] uppercase tracking-widest shadow-xl hover:scale-105 transition-all active:scale-95">
                 Return to Terminal
              </button>
           </div>
        </div>

        <div className="text-center py-6">
           <p className="text-[10px] font-black text-gray-400 uppercase tracking-[0.4em]">Offerly Enterprise v1.0.4</p>
        </div>
      </div>
    </div>
  );
};

export default About;
