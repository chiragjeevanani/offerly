import { useEffect, useState } from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import { useNavigate } from 'react-router-dom';
import ArrowBackRoundedIcon from '@mui/icons-material/ArrowBackRounded';
import HelpRoundedIcon from '@mui/icons-material/HelpRounded';
import ExpandMoreRoundedIcon from '@mui/icons-material/ExpandMoreRounded';
import WhatsAppIcon from '@mui/icons-material/WhatsApp';
import MailRoundedIcon from '@mui/icons-material/MailRounded';
import CallRoundedIcon from '@mui/icons-material/CallRounded';
import QrCodeScannerRoundedIcon from '@mui/icons-material/QrCodeScannerRounded';
import LocalOfferRoundedIcon from '@mui/icons-material/LocalOfferRounded';
import PaymentRoundedIcon from '@mui/icons-material/PaymentRounded';
import StorefrontRoundedIcon from '@mui/icons-material/StorefrontRounded';
import TrendingUpRoundedIcon from '@mui/icons-material/TrendingUpRounded';
import SettingsRoundedIcon from '@mui/icons-material/SettingsRounded';

const FAQItem = ({ question, answer, idx }) => {
  const [isOpen, setIsOpen] = useState(false);

  return (
    <motion.div
      initial={{ opacity: 0, x: -10 }}
      whileInView={{ opacity: 1, x: 0 }}
      viewport={{ once: true }}
      transition={{ delay: idx * 0.05 }}
      className={`rounded-2xl border transition-all overflow-hidden ${isOpen ? 'bg-white border-[#5EB929]/20 shadow-lg' : 'bg-white/50 border-gray-100 hover:border-gray-200'}`}
    >
      <button
        onClick={() => setIsOpen(!isOpen)}
        className="w-full px-5 py-4 flex items-center justify-between text-left"
      >
        <span className={`text-[13px] font-bold tracking-tight ${isOpen ? 'text-[#5EB929]' : 'text-gray-800'}`}>{question}</span>
        <div className={`w-8 h-8 rounded-lg flex items-center justify-center transition-all ${isOpen ? 'bg-[#5EB929] text-white rotate-180' : 'bg-gray-100 text-gray-400'}`}>
           <ExpandMoreRoundedIcon sx={{ fontSize: 20 }} />
        </div>
      </button>
      <AnimatePresence>
        {isOpen && (
          <motion.div
            initial={{ height: 0, opacity: 0 }}
            animate={{ height: 'auto', opacity: 1 }}
            exit={{ height: 0, opacity: 0 }}
            className="px-5 pb-5 text-[12px] font-medium text-gray-500 leading-relaxed"
          >
            <div className="pt-2 border-t border-gray-50">
               {answer}
            </div>
          </motion.div>
        )}
      </AnimatePresence>
    </motion.div>
  );
};

const Support = () => {
  const navigate = useNavigate();

  useEffect(() => {
    window.scrollTo(0, 0);
  }, []);

  const faqs = [
    { question: "How do I scan customer QR codes?", answer: "Navigate to the 'Verify QR' terminal. Allow camera access and align the code within the frame. Verification is instant." },
    { question: "When do I receive my payouts?", answer: "Settlements are processed weekly every Monday to your linked bank account for all fulfilled bookings." },
    { question: "How to increase my store visibility?", answer: "Launch high-discount 'Rocket Campaigns' and maintain a 4.5+ star rating to get featured on the customer home page." },
    { question: "Can I cancel an active campaign?", answer: "Yes, you can terminate any campaign from the 'Active Offers' page by clicking the 'Terminate' icon." }
  ];

  return (
    <div className="min-h-screen bg-background pb-24">
      {/* Premium Header */}
      <div className="sticky top-0 z-50 bg-white/80 backdrop-blur-xl border-b border-gray-100 px-4 py-3 flex items-center gap-3">
        <button onClick={() => navigate(-1)} className="w-9 h-9 flex items-center justify-center rounded-xl bg-gray-50 text-gray-400 hover:bg-gray-100 transition-all">
          <ArrowBackRoundedIcon sx={{ fontSize: 20 }} />
        </button>
        <h1 className="text-[15px] font-bold text-gray-900 uppercase tracking-widest">Support Concierge</h1>
      </div>

      <div className="max-w-4xl mx-auto px-4 py-8 space-y-10">
        
        {/* Identity Strip (Hero) */}
        <div className="bg-gray-900 rounded-[2.5rem] p-6 sm:p-10 relative overflow-hidden shadow-2xl">
           <div className="absolute top-0 right-0 w-80 h-80 bg-[#5EB929]/20 rounded-full blur-[90px] -translate-y-1/2 translate-x-1/2" />
           <div className="relative z-10 flex flex-col sm:flex-row items-center gap-6 lg:gap-10">
              <motion.div initial={{ scale: 0.9, opacity: 0 }} animate={{ scale: 1, opacity: 1 }} className="w-16 h-16 bg-white/5 border border-white/10 rounded-2xl flex items-center justify-center flex-shrink-0">
                 <HelpRoundedIcon sx={{ fontSize: 32 }} className="text-[#5EB929]" />
              </motion.div>
              <div className="space-y-2 text-center sm:text-left">
                 <motion.h2 initial={{ opacity: 0, y: 10 }} animate={{ opacity: 1, y: 0 }} className="text-xl sm:text-2xl lg:text-3xl font-bold text-white tracking-tight leading-tight">Merchant <span className="text-[#5EB929]">Concierge.</span></motion.h2>
                 <motion.p initial={{ opacity: 0, y: 10 }} animate={{ opacity: 1, y: 0 }} transition={{ delay: 0.1 }} className="text-gray-400 text-[12px] sm:text-sm font-medium leading-relaxed max-w-xl">Find rapid solutions or connect with our support architects for enterprise assistance.</motion.p>
              </div>
           </div>
        </div>

        {/* Contact Strips */}
        <div className="grid grid-cols-1 sm:grid-cols-3 gap-4">
           {[
              { label: 'WhatsApp Chat', value: 'Instant Response', icon: WhatsAppIcon, color: 'text-green-500', action: () => window.open('https://wa.me/911800OFFERLY') },
              { label: 'Email Desk', value: '4hr Turnaround', icon: MailRoundedIcon, color: 'text-blue-500', action: () => window.open('mailto:support@offerly.com') },
              { label: 'Direct Line', value: '24/7 Priority', icon: CallRoundedIcon, color: 'text-[#5EB929]', action: () => window.open('tel:+911800OFFERLY') },
           ].map((c, i) => (
              <motion.button key={i} whileTap={{ scale: 0.98 }} onClick={c.action} className="bg-white p-5 rounded-2xl border border-gray-50 shadow-sm flex items-center gap-4 hover:border-[#5EB929]/20 transition-all text-left">
                 <div className={`w-10 h-10 rounded-xl bg-background ${c.color} flex items-center justify-center flex-shrink-0`}><c.icon sx={{ fontSize: 20 }} /></div>
                 <div>
                    <p className="text-[12px] font-bold text-gray-900 leading-none">{c.label}</p>
                    <p className="text-[10px] font-bold text-gray-400 mt-1 uppercase tracking-tight">{c.value}</p>
                 </div>
              </motion.button>
           ))}
        </div>

        {/* Categories Grid */}
        <div className="space-y-6">
           <div className="flex items-center gap-3 px-1">
              <div className="w-1 h-4 bg-[#5EB929] rounded-full" />
              <h3 className="text-[11px] font-bold text-gray-900 uppercase tracking-widest">Help Architecture</h3>
           </div>
           <div className="grid grid-cols-2 sm:grid-cols-3 lg:grid-cols-6 gap-3">
              {[
                 { icon: QrCodeScannerRoundedIcon, label: 'Scanning' },
                 { icon: LocalOfferRoundedIcon, label: 'Campaigns' },
                 { icon: PaymentRoundedIcon, label: 'Billing' },
                 { icon: StorefrontRoundedIcon, label: 'Store' },
                 { icon: TrendingUpRoundedIcon, label: 'Growth' },
                 { icon: SettingsRoundedIcon, label: 'Account' },
              ].map((cat, i) => (
                 <motion.button key={i} whileHover={{ y: -4 }} className="bg-white p-4 rounded-xl border border-gray-50 shadow-sm flex flex-col items-center gap-3 text-center">
                    <div className="w-10 h-10 rounded-lg bg-background text-[#5EB929] flex items-center justify-center"><cat.icon sx={{ fontSize: 20 }} /></div>
                    <span className="text-[10px] font-bold text-gray-600 uppercase tracking-tight">{cat.label}</span>
                 </motion.button>
              ))}
           </div>
        </div>

        {/* Knowledge Base (FAQs) */}
        <div className="space-y-6">
           <div className="flex items-center gap-3 px-1">
              <div className="w-1 h-4 bg-[#5EB929] rounded-full" />
              <h3 className="text-[11px] font-bold text-gray-900 uppercase tracking-widest">Knowledge Base</h3>
           </div>
           <div className="space-y-3">
              {faqs.map((faq, index) => (
                <FAQItem key={index} idx={index} question={faq.question} answer={faq.answer} />
              ))}
           </div>
        </div>

        <div className="text-center py-6">
           <p className="text-[10px] font-bold text-gray-400 uppercase tracking-[0.4em]">Secure Concierge Terminal</p>
        </div>
      </div>
    </div>
  );
};

export default Support;
