import { useState, useEffect } from 'react';
import { motion } from 'framer-motion';
import { useNavigate } from 'react-router-dom';
import ArrowBackRoundedIcon from '@mui/icons-material/ArrowBackRounded';
import ExpandMoreRoundedIcon from '@mui/icons-material/ExpandMoreRounded';
import ReceiptLongRoundedIcon from '@mui/icons-material/ReceiptLongRounded';
import PageTransition from '../../components/ui/PageTransition';

const Section = ({ title, children, number }) => {
  const [isOpen, setIsOpen] = useState(false);

  return (
    <motion.div
      initial={{ opacity: 0, y: 10 }}
      whileInView={{ opacity: 1, y: 0 }}
      viewport={{ once: true }}
      className="bg-white rounded-xl border border-gray-200 overflow-hidden"
    >
      <button
        onClick={() => setIsOpen(!isOpen)}
        className="w-full flex items-center justify-between p-4 sm:p-5 text-left hover:bg-gray-50 transition-colors"
      >
        <div className="flex items-center gap-3">
          <span className="w-8 h-8 rounded-full bg-primary/10 text-primary font-bold text-sm flex items-center justify-center flex-shrink-0">
            {number}
          </span>
          <h3 className="font-bold text-gray-900 text-sm sm:text-base">{title}</h3>
        </div>
        <ExpandMoreRoundedIcon
          className={`text-gray-400 transition-transform ${isOpen ? 'rotate-180' : ''}`}
        />
      </button>
      {isOpen && (
        <motion.div
          initial={{ height: 0, opacity: 0 }}
          animate={{ height: 'auto', opacity: 1 }}
          exit={{ height: 0, opacity: 0 }}
          className="px-4 sm:px-5 pb-5 text-sm text-gray-600 leading-relaxed space-y-3"
        >
          {children}
        </motion.div>
      )}
    </motion.div>
  );
};

const TermsAndConditions = () => {
  const navigate = useNavigate();

  // Scroll to top on component mount
  useEffect(() => {
    window.scrollTo(0, 0);
  }, []);

  return (
    <PageTransition>
      <div className="min-h-screen bg-background px-4 py-4 pb-24 space-y-8">
        
        {/* Terms Identity Strip */}
        <div className="bg-[#5EB929] rounded-[2.5rem] p-8 text-center relative overflow-hidden shadow-lg shadow-[#5EB929]/20">
           <div className="absolute top-0 right-0 w-32 h-32 bg-white/5 rounded-full -mr-16 -mt-16 blur-3xl" />
           <motion.div
             initial={{ scale: 0.8 }}
             animate={{ scale: 1 }}
             className="w-16 h-16 bg-white/10 rounded-2xl flex items-center justify-center mx-auto mb-5 backdrop-blur-md border border-white/10"
           >
             <ReceiptLongRoundedIcon sx={{ fontSize: 28 }} className="text-white" />
           </motion.div>
           <h1 className="text-white font-bold text-2xl uppercase tracking-tight">Terms & Conditions</h1>
           <p className="text-white/60 text-[10px] font-bold uppercase tracking-widest mt-2 max-w-xs mx-auto leading-relaxed">
             Legal operating protocols for the Offerly network
           </p>
        </div>

        <div className="space-y-6">
          <div className="bg-white rounded-2xl p-4 border border-gray-50 shadow-sm flex items-center justify-between">
             <p className="text-[10px] font-bold text-gray-400 uppercase tracking-widest">Version Alpha 1.0.0</p>
             <p className="text-[10px] font-bold text-[#5EB929] uppercase tracking-widest">Updated April 2026</p>
          </div>

          <div className="space-y-3">
             <p className="text-[10px] font-bold text-gray-400 uppercase tracking-widest px-1">Legal Clauses</p>
             
             <Section number="01" title="Acceptance of Terms">
               <p>By accessing the Offerly platform, you enter into a binding digital agreement to adhere to our operational protocols.</p>
               <p>Failure to comply with these terms may result in immediate termination of your digital access to the network.</p>
             </Section>

             <Section number="02" title="User Identity">
               <p><strong>Registration:</strong> Users must maintain valid and accurate identification profiles within the network.</p>
               <p><strong>Security:</strong> You are the sole custodian of your access credentials and responsible for all ledger activity under your ID.</p>
             </Section>

             <Section number="03" title="Service Utilization">
               <p>Offerly provides a discovery layer for merchant offerings. All transactional fulfillment occurs directly at the merchant facility.</p>
               <p>The network is provided for non-commercial, personal utilization of registered customers only.</p>
             </Section>

             <Section number="04" title="Digital Redemption">
               <p><strong>Protocol:</strong> Redemption is executed via unique QR pass verification at the merchant terminal.</p>
               <p><strong>Expiry:</strong> All digital passes carry a cryptographic timestamp and must be utilized before expiration.</p>
             </Section>

             <Section number="05" title="Financial Protocols">
               <p><strong>Direct Settlement:</strong> All financial settlements occur at the merchant location. Offerly does not process customer-to-merchant payments.</p>
               <p><strong>Credits:</strong> Referral credits are digital utility tokens within the Offerly ecosystem and have no direct cash value outside the network.</p>
             </Section>
          </div>

          {/* Footer Commitment */}
          <div className="bg-white rounded-[2rem] p-8 text-center border border-gray-100 shadow-sm">
             <p className="text-gray-400 text-[10px] font-bold uppercase tracking-[0.2em] leading-relaxed">
               By continuing utilization of this platform, you acknowledge full compliance with the aforementioned legal protocols.
             </p>
          </div>
        </div>

      </div>
    </PageTransition>
  );
};

export default TermsAndConditions;
