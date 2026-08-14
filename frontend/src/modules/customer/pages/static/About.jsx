import { useEffect } from 'react';
import { motion } from 'framer-motion';
import { useNavigate } from 'react-router-dom';
import ArrowBackRoundedIcon from '@mui/icons-material/ArrowBackRounded';
import CardGiftcardRoundedIcon from '@mui/icons-material/CardGiftcardRounded';
import SearchRoundedIcon from '@mui/icons-material/SearchRounded';
import QrCodeScannerRoundedIcon from '@mui/icons-material/QrCodeScannerRounded';
import LocalOfferRoundedIcon from '@mui/icons-material/LocalOfferRounded';
import LocationOnRoundedIcon from '@mui/icons-material/LocationOnRounded';
import VerifiedRoundedIcon from '@mui/icons-material/VerifiedRounded';
import SavingsRoundedIcon from '@mui/icons-material/SavingsRounded';
import PageTransition from '../../components/ui/PageTransition';

const FeatureCard = ({ icon: Icon, title, description, color, bgColor }) => (
  <motion.div
    initial={{ opacity: 0, y: 20 }}
    whileInView={{ opacity: 1, y: 0 }}
    viewport={{ once: true }}
    className="bg-white rounded-xl p-6 shadow-sm border border-gray-100"
  >
    <div className={`w-12 h-12 rounded-xl ${bgColor} ${color} flex items-center justify-center mb-4`}>
      <Icon sx={{ fontSize: 24 }} />
    </div>
    <h3 className="text-lg font-bold text-gray-900 mb-2">{title}</h3>
    <p className="text-sm text-gray-600 leading-relaxed">{description}</p>
  </motion.div>
);

const StepCard = ({ number, title, description }) => (
  <motion.div
    initial={{ opacity: 0, y: 20 }}
    whileInView={{ opacity: 1, y: 0 }}
    viewport={{ once: true }}
    className="flex gap-4"
  >
    <div className="w-12 h-12 rounded-full bg-primary text-white flex items-center justify-center font-bold text-xl flex-shrink-0">
      {number}
    </div>
    <div>
      <h3 className="text-lg font-bold text-gray-900 mb-1">{title}</h3>
      <p className="text-sm text-gray-600">{description}</p>
    </div>
  </motion.div>
);

const About = () => {
  const navigate = useNavigate();

  // Scroll to top on component mount
  useEffect(() => {
    window.scrollTo(0, 0);
  }, []);

  return (
    <PageTransition>
      <div className="min-h-screen bg-background px-4 py-4 pb-24 space-y-8">
        
        {/* Hero Section - Premium Branding */}
        <div className="bg-[#5EB929] rounded-[2.5rem] p-10 text-center relative overflow-hidden shadow-lg shadow-[#5EB929]/20">
          <div className="absolute top-0 right-0 w-40 h-40 bg-white/5 rounded-full -mr-20 -mt-20 blur-3xl" />
          
          <motion.div
            initial={{ scale: 0.8, opacity: 0 }}
            animate={{ scale: 1, opacity: 1 }}
            className="w-20 h-20 bg-white/10 rounded-3xl flex items-center justify-center mx-auto mb-6 backdrop-blur-md border border-white/10 p-3"
          >
            <img src="/offerly-logo-ring.png" alt="Offerly" className="w-full h-full object-contain" />
          </motion.div>
          
          <motion.h1
            initial={{ opacity: 0, y: 15 }}
            animate={{ opacity: 1, y: 0 }}
            className="text-white font-bold text-3xl uppercase tracking-tight leading-tight px-4"
          >
            Discover Amazing Deals Near You
          </motion.h1>
          <motion.p
            initial={{ opacity: 0, y: 15 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ delay: 0.1 }}
            className="text-white/60 text-[11px] font-bold uppercase tracking-widest mt-4 max-w-xs mx-auto leading-relaxed"
          >
            Digital savings ledger for your favorite local services
          </motion.p>
        </div>

        {/* Narrative Section */}
        <div className="space-y-4 px-1">
          <p className="text-[10px] font-bold text-gray-400 uppercase tracking-widest">Platform Vision</p>
          <h2 className="text-gray-900 font-bold text-2xl uppercase tracking-tight">What is Offerly?</h2>
          <p className="text-gray-600 text-[13px] font-medium leading-relaxed">
            Offerly is a high-utility platform designed to bridge the gap between premium local merchants and value-conscious customers. We provide a digital infrastructure for discovering and redeeming exclusive deals.
          </p>
        </div>

        {/* How It Works - Slim Steps */}
        <div className="space-y-4">
           <p className="text-[10px] font-bold text-gray-400 uppercase tracking-widest px-1">Execution Flow</p>
           <div className="space-y-3">
              {[
                { n: '01', t: 'Browse Near You', d: 'Explore exclusive deals from verified local businesses in your immediate vicinity.' },
                { n: '02', t: 'Generate Pass', d: 'Select an offer and generate your unique digital redemption pass instantly.' },
                { n: '03', t: 'Verify at Store', d: 'Show your pass at the merchant location to unlock your digital savings.' },
              ].map(step => (
                <div key={step.n} className="bg-white rounded-3xl p-5 flex gap-5 border border-gray-50 shadow-sm">
                   <div className="w-12 h-12 bg-[#5EB929]/5 rounded-2xl flex items-center justify-center flex-shrink-0 border border-[#5EB929]/10">
                      <span className="text-[#5EB929] font-bold text-sm">{step.n}</span>
                   </div>
                   <div>
                      <h3 className="text-gray-900 font-bold text-sm uppercase tracking-tight mb-1">{step.t}</h3>
                      <p className="text-gray-500 text-[11px] leading-relaxed font-medium">{step.d}</p>
                   </div>
                </div>
              ))}
           </div>
        </div>

        {/* Features Micro-Grid */}
        <div className="space-y-4">
           <p className="text-[10px] font-bold text-gray-400 uppercase tracking-widest px-1">Core Benefits</p>
           <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
              {[
                { i: LocalOfferRoundedIcon, t: 'Exclusive Deals', d: 'Access specialized offers with deep discounts.' },
                { i: LocationOnRoundedIcon, t: 'Proximity Logic', d: 'Real-time discovery based on your coordinates.' },
                { i: VerifiedRoundedIcon, t: 'Verified Network', d: 'Strictly curated merchant ecosystem.' },
                { i: QrCodeScannerRoundedIcon, t: 'Instant Digital', d: 'Zero friction pass generation system.' },
              ].map((feat, idx) => (
                <div key={idx} className="bg-white rounded-2xl p-5 border border-gray-50 shadow-sm flex flex-col items-start text-left">
                   <div className="w-10 h-10 bg-background rounded-xl flex items-center justify-center mb-4">
                      <feat.i sx={{ fontSize: 18 }} className="text-[#5EB929]" />
                   </div>
                   <h4 className="text-gray-900 font-bold text-[12px] uppercase tracking-tight mb-1">{feat.t}</h4>
                   <p className="text-gray-500 text-[10px] leading-relaxed font-medium">{feat.d}</p>
                </div>
              ))}
           </div>
        </div>

        {/* CTA Banner */}
        <div className="bg-white rounded-[2rem] p-8 text-center border border-gray-100 shadow-xl shadow-gray-200/20">
           <h3 className="text-gray-900 font-bold text-xl uppercase tracking-tight mb-2">Ready to Start?</h3>
           <p className="text-gray-500 text-[11px] font-medium mb-6">Join thousands of users discovering digital savings every day.</p>
           <button
             onClick={() => navigate('/explore')}
             className="w-full bg-[#5EB929] text-white font-bold text-[11px] uppercase tracking-[0.2em] py-4 rounded-2xl shadow-lg shadow-[#5EB929]/20 active:scale-95 transition-all"
           >
             Explore Deals
           </button>
        </div>

      </div>
    </PageTransition>
  );
};

export default About;
