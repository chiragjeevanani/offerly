import { useState, useEffect } from 'react';
import { motion } from 'framer-motion';
import { useNavigate } from 'react-router-dom';
import ArrowBackRoundedIcon from '@mui/icons-material/ArrowBackRounded';
import ExpandMoreRoundedIcon from '@mui/icons-material/ExpandMoreRounded';
import SecurityRoundedIcon from '@mui/icons-material/SecurityRounded';
import PageTransition from '../../components/ui/PageTransition';

const Section = ({ title, children, number, icon: Icon }) => {
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
          {Icon && (
            <div className="w-8 h-8 rounded-full bg-primary/10 text-primary flex items-center justify-center flex-shrink-0">
              <Icon sx={{ fontSize: 18 }} />
            </div>
          )}
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
          className="px-4 sm:px-5 pb-5 text-sm text-gray-600 leading-relaxed space-y-3"
        >
          {children}
        </motion.div>
      )}
    </motion.div>
  );
};

const PrivacyPolicy = () => {
  const navigate = useNavigate();

  // Scroll to top on component mount
  useEffect(() => {
    window.scrollTo(0, 0);
  }, []);

  return (
    <PageTransition>
      <div className="min-h-screen bg-background px-4 py-4 pb-24 space-y-8">
        
        {/* Privacy Identity Strip */}
        <div className="bg-[#5EB929] rounded-[2.5rem] p-8 text-center relative overflow-hidden shadow-lg shadow-[#5EB929]/20">
           <div className="absolute top-0 right-0 w-32 h-32 bg-white/5 rounded-full -mr-16 -mt-16 blur-3xl" />
           <motion.div
             initial={{ scale: 0.8 }}
             animate={{ scale: 1 }}
             className="w-16 h-16 bg-white/10 rounded-2xl flex items-center justify-center mx-auto mb-5 backdrop-blur-md border border-white/10"
           >
             <SecurityRoundedIcon sx={{ fontSize: 28 }} className="text-white" />
           </motion.div>
           <h1 className="text-white font-bold text-2xl uppercase tracking-tight">Privacy Policy</h1>
           <p className="text-white/60 text-[10px] font-bold uppercase tracking-widest mt-2 max-w-xs mx-auto leading-relaxed">
             Data governance protocols for the Offerly digital network
           </p>
        </div>

        <div className="space-y-6">
          <div className="bg-white rounded-2xl p-4 border border-gray-50 shadow-sm flex items-center justify-between">
             <p className="text-[10px] font-bold text-gray-400 uppercase tracking-widest">Data Protection v1.0</p>
             <p className="text-[10px] font-bold text-[#5EB929] uppercase tracking-widest">Active Status</p>
          </div>

          <div className="space-y-3">
             <p className="text-[10px] font-bold text-gray-400 uppercase tracking-widest px-1">Privacy Protocols</p>
             
             <Section title="Data Collection" icon={SecurityRoundedIcon}>
               <p><strong>Personal Data:</strong> We collect only essential identification markers including phone numbers and digital profiles.</p>
               <p><strong>Telemetry:</strong> Device identifiers and location telemetry are utilized strictly for proximity offer matching.</p>
             </Section>

             <Section title="Utilization Logic" icon={SecurityRoundedIcon}>
               <p>Data is utilized to personalize your discovery feed and facilitate redemption pass generation.</p>
               <p>Automated telemetry is used to monitor network health and detect fraudulent pass activities.</p>
             </Section>

             <Section title="Sharing Protocols" icon={SecurityRoundedIcon}>
               <p><strong>Merchant Node:</strong> Necessary booking ID and user handles are shared with merchants upon pass redemption.</p>
               <p><strong>Third-Party:</strong> We utilize specialized nodes for OTP dispatch and location mapping services only.</p>
             </Section>

             <Section title="Security Infrastructure" icon={SecurityRoundedIcon}>
               <p>All data packets are encrypted in transit via industry-standard protocols.</p>
               <p>Our digital infrastructure undergoes periodic security audits to ensure ledger integrity.</p>
             </Section>

             <Section title="User Sovereignty" icon={SecurityRoundedIcon}>
               <p>Users maintain full sovereignty over their data. You may request identity deletion or data porting via the Support Terminal.</p>
             </Section>
          </div>

          {/* commitment strip */}
          <div className="bg-white rounded-[2rem] p-8 text-center border border-gray-100 shadow-sm">
             <p className="text-gray-400 text-[10px] font-bold uppercase tracking-[0.2em] leading-relaxed">
               Your trust is our primary asset. We adhere to a strict 'Zero-Sale' policy for your personal identification data.
             </p>
          </div>
        </div>

      </div>
    </PageTransition>
  );
};

export default PrivacyPolicy;
