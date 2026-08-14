import { useEffect, useState } from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import { useNavigate } from 'react-router-dom';
import ArrowBackRoundedIcon from '@mui/icons-material/ArrowBackRounded';
import EmailRoundedIcon from '@mui/icons-material/EmailRounded';
import PhoneRoundedIcon from '@mui/icons-material/PhoneRounded';
import LocationOnRoundedIcon from '@mui/icons-material/LocationOnRounded';
import AccessTimeRoundedIcon from '@mui/icons-material/AccessTimeRounded';
import WhatsAppIcon from '@mui/icons-material/WhatsApp';
import SupportAgentRoundedIcon from '@mui/icons-material/SupportAgentRounded';
import SendRoundedIcon from '@mui/icons-material/SendRounded';
import toast from 'react-hot-toast';

const ContactStrip = ({ icon: Icon, title, value, action, color, idx }) => (
  <motion.div
    initial={{ opacity: 0, x: -10 }}
    whileInView={{ opacity: 1, x: 0 }}
    viewport={{ once: true }}
    transition={{ delay: idx * 0.05 }}
    onClick={action}
    className="bg-white p-4 rounded-2xl border border-gray-50 shadow-sm flex items-center gap-4 hover:border-[#3D7A4F]/20 hover:shadow-md transition-all cursor-pointer group"
  >
    <div className={`w-10 h-10 rounded-xl bg-[#F8F5FF] ${color} flex items-center justify-center flex-shrink-0 group-hover:scale-110 transition-transform`}>
      <Icon sx={{ fontSize: 20 }} />
    </div>
    <div className="flex-1 min-w-0">
      <p className="text-[10px] font-black text-gray-400 uppercase tracking-widest leading-none mb-1">{title}</p>
      <p className="text-[13px] font-black text-gray-900 truncate">{value}</p>
    </div>
  </motion.div>
);

const Contact = () => {
  const navigate = useNavigate();
  const [loading, setLoading] = useState(false);

  useEffect(() => {
    window.scrollTo(0, 0);
  }, []);

  const handleSendMessage = (e) => {
    e.preventDefault();
    setLoading(true);
    setTimeout(() => {
      setLoading(false);
      toast.success('Transmission Successful 🚀');
      e.target.reset();
    }, 1500);
  };

  return (
    <div className="min-h-screen bg-[#F8F5FF] pb-24">
      {/* Premium Header */}
      <div className="sticky top-0 z-50 bg-white/80 backdrop-blur-xl border-b border-gray-100 px-4 py-3 flex items-center gap-3">
        <button onClick={() => navigate(-1)} className="w-9 h-9 flex items-center justify-center rounded-xl bg-gray-50 text-gray-400 hover:bg-gray-100 transition-all">
          <ArrowBackRoundedIcon sx={{ fontSize: 20 }} />
        </button>
        <h1 className="text-[15px] font-black text-gray-900 uppercase tracking-widest">Contact Terminal</h1>
      </div>

      <div className="max-w-4xl mx-auto px-4 py-8 space-y-10">
        
        {/* Identity Strip (Hero) */}
        <div className="bg-gray-900 rounded-[2.5rem] p-6 sm:p-10 relative overflow-hidden shadow-2xl">
           <div className="absolute top-0 right-0 w-80 h-80 bg-[#3D7A4F]/20 rounded-full blur-[90px] -translate-y-1/2 translate-x-1/2" />
           <div className="relative z-10 flex flex-col sm:flex-row items-center gap-6 lg:gap-10">
              <motion.div initial={{ scale: 0.9, opacity: 0 }} animate={{ scale: 1, opacity: 1 }} className="w-16 h-16 bg-white/5 border border-white/10 rounded-2xl flex items-center justify-center flex-shrink-0">
                 <SupportAgentRoundedIcon sx={{ fontSize: 32 }} className="text-[#3D7A4F]" />
              </motion.div>
              <div className="space-y-2 text-center sm:text-left">
                 <motion.h2 initial={{ opacity: 0, y: 10 }} animate={{ opacity: 1, y: 0 }} className="text-xl sm:text-2xl lg:text-3xl font-black text-white tracking-tighter leading-tight">Secure <span className="text-[#3D7A4F]">Connect Desk.</span></motion.h2>
                 <motion.p initial={{ opacity: 0, y: 10 }} animate={{ opacity: 1, y: 0 }} transition={{ delay: 0.1 }} className="text-gray-400 text-[12px] sm:text-sm font-medium leading-relaxed max-w-xl">Direct access to our merchant success team. Rapid response, precision assistance.</motion.p>
              </div>
           </div>
        </div>

        {/* Contact Grid */}
        <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
           <ContactStrip 
              idx={0} icon={WhatsAppIcon} title="WhatsApp Sync" value="+91 98765-43210" color="text-green-500" 
              action={() => window.open('https://wa.me/919876543210')}
           />
           <ContactStrip 
              idx={1} icon={EmailRoundedIcon} title="Support Desk" value="support@offerly.com" color="text-blue-500" 
              action={() => window.open('mailto:support@offerly.com')}
           />
           <ContactStrip 
              idx={2} icon={PhoneRoundedIcon} title="Priority Line" value="1800-OFFERLY" color="text-[#3D7A4F]" 
              action={() => window.open('tel:+911800OFFERLY')}
           />
           <ContactStrip 
              idx={3} icon={LocationOnRoundedIcon} title="HQ Architecture" value="Business Park, Tech City" color="text-indigo-500" 
              action={() => {}}
           />
        </div>

        {/* Message Form (Animated Terminal) */}
        <div className="space-y-6">
           <div className="flex items-center gap-3 px-1">
              <div className="w-1 h-4 bg-[#3D7A4F] rounded-full" />
              <h3 className="text-[11px] font-black text-gray-900 uppercase tracking-widest">Message Terminal</h3>
           </div>
           
           <motion.form 
             initial={{ opacity: 0, y: 10 }} whileInView={{ opacity: 1, y: 0 }} viewport={{ once: true }}
             onSubmit={handleSendMessage} className="bg-white rounded-3xl p-6 sm:p-8 border border-gray-100 shadow-sm space-y-6"
           >
              <div className="grid grid-cols-1 sm:grid-cols-2 gap-6">
                 <div className="space-y-2">
                    <label className="text-[10px] font-black text-gray-400 uppercase tracking-widest px-1">Identity Name</label>
                    <input required type="text" placeholder="Full Name" className="w-full bg-[#F8F5FF] border border-transparent focus:border-[#3D7A4F]/20 rounded-xl px-4 py-3 text-[13px] font-bold outline-none transition-all" />
                 </div>
                 <div className="space-y-2">
                    <label className="text-[10px] font-black text-gray-400 uppercase tracking-widest px-1">Communication Email</label>
                    <input required type="email" placeholder="email@address.com" className="w-full bg-[#F8F5FF] border border-transparent focus:border-[#3D7A4F]/20 rounded-xl px-4 py-3 text-[13px] font-bold outline-none transition-all" />
                 </div>
              </div>
              <div className="space-y-2">
                 <label className="text-[10px] font-black text-gray-400 uppercase tracking-widest px-1">Transmission Message</label>
                 <textarea required rows="4" placeholder="Briefly describe your inquiry..." className="w-full bg-[#F8F5FF] border border-transparent focus:border-[#3D7A4F]/20 rounded-xl px-4 py-3 text-[13px] font-bold outline-none transition-all resize-none"></textarea>
              </div>
              <button 
                disabled={loading} type="submit"
                className="w-full sm:w-auto px-10 py-4 bg-[#3D7A4F] text-white rounded-2xl font-black text-[11px] uppercase tracking-[0.2em] shadow-xl shadow-[#3D7A4F]/20 hover:scale-105 transition-all active:scale-95 flex items-center justify-center gap-3 disabled:opacity-50"
              >
                 {loading ? 'Transmitting...' : 'Transmit Message'}
                 {!loading && <SendRoundedIcon sx={{ fontSize: 16 }} />}
              </button>
           </motion.form>
        </div>

        {/* Operational Hours */}
        <div className="bg-[#3D7A4F]/5 rounded-3xl p-8 border border-[#3D7A4F]/10">
           <div className="flex items-center gap-4 mb-6">
              <div className="w-10 h-10 rounded-xl bg-white text-[#3D7A4F] flex items-center justify-center shadow-sm"><AccessTimeRoundedIcon sx={{ fontSize: 20 }} /></div>
              <h3 className="text-[14px] font-black text-gray-900 uppercase tracking-widest">Support Uptime</h3>
           </div>
           <div className="grid grid-cols-1 sm:grid-cols-2 gap-8 text-[12px] font-bold">
              <div className="flex justify-between items-center border-b border-[#3D7A4F]/10 pb-4">
                 <span className="text-gray-500 uppercase tracking-tight">Technical Deck (Mon-Fri)</span>
                 <span className="text-gray-900">09:00 - 20:00</span>
              </div>
              <div className="flex justify-between items-center border-b border-[#3D7A4F]/10 pb-4">
                 <span className="text-gray-500 uppercase tracking-tight">Weekend Ops (Sat)</span>
                 <span className="text-gray-900">10:00 - 18:00</span>
              </div>
              <div className="flex justify-between items-center col-span-full">
                 <span className="text-[10px] font-black text-[#3D7A4F] uppercase tracking-widest">* Emergency Call Desk Active 24/7</span>
              </div>
           </div>
        </div>

        <div className="text-center py-6">
           <p className="text-[10px] font-black text-gray-400 uppercase tracking-[0.4em]">Offerly Enterprise Contact Hub</p>
        </div>
      </div>
    </div>
  );
};

export default Contact;
