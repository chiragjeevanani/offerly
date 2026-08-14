import { useState, useEffect } from 'react';
import { motion } from 'framer-motion';
import { useNavigate } from 'react-router-dom';
import ArrowBackRoundedIcon from '@mui/icons-material/ArrowBackRounded';
import EmailRoundedIcon from '@mui/icons-material/EmailRounded';
import PhoneRoundedIcon from '@mui/icons-material/PhoneRounded';
import LocationOnRoundedIcon from '@mui/icons-material/LocationOnRounded';
import AccessTimeRoundedIcon from '@mui/icons-material/AccessTimeRounded';
import SendRoundedIcon from '@mui/icons-material/SendRounded';
import PageTransition from '../../components/ui/PageTransition';
import toast from 'react-hot-toast';

const ContactCard = ({ icon: Icon, title, content, color, bgColor }) => (
  <motion.div
    initial={{ opacity: 0, y: 20 }}
    whileInView={{ opacity: 1, y: 0 }}
    viewport={{ once: true }}
    className="bg-white rounded-xl p-5 border border-gray-200 flex items-start gap-4"
  >
    <div className={`w-12 h-12 rounded-xl ${bgColor} ${color} flex items-center justify-center flex-shrink-0`}>
      <Icon sx={{ fontSize: 24 }} />
    </div>
    <div>
      <h3 className="font-bold text-gray-900 mb-1">{title}</h3>
      <p className="text-sm text-gray-600">{content}</p>
    </div>
  </motion.div>
);

const Contact = () => {
  const navigate = useNavigate();
  const [formData, setFormData] = useState({
    name: '',
    email: '',
    phone: '',
    subject: '',
    message: ''
  });
  const [isSubmitting, setIsSubmitting] = useState(false);

  // Scroll to top on component mount
  useEffect(() => {
    window.scrollTo(0, 0);
  }, []);

  const handleChange = (e) => {
    setFormData({ ...formData, [e.target.name]: e.target.value });
  };

  const handleSubmit = async (e) => {
    e.preventDefault();
    
    if (!formData.name || !formData.email || !formData.subject || !formData.message) {
      toast.error('Please fill in all required fields');
      return;
    }

    setIsSubmitting(true);
    
    // Simulate API call
    setTimeout(() => {
      toast.success('Message sent successfully! We\'ll get back to you soon.');
      setFormData({ name: '', email: '', phone: '', subject: '', message: '' });
      setIsSubmitting(false);
    }, 1500);
  };

  return (
    <PageTransition>
      <div className="min-h-screen bg-[#F8F5FF] px-4 py-4 pb-24 space-y-8">
        
        {/* Contact Identity Strip */}
        <div className="bg-[#3D7A4F] rounded-[2.5rem] p-8 text-center relative overflow-hidden shadow-lg shadow-[#3D7A4F]/20">
           <div className="absolute top-0 right-0 w-32 h-32 bg-white/5 rounded-full -mr-16 -mt-16 blur-3xl" />
           <motion.div
             initial={{ scale: 0.8 }}
             animate={{ scale: 1 }}
             className="w-16 h-16 bg-white/10 rounded-2xl flex items-center justify-center mx-auto mb-5 backdrop-blur-md border border-white/10"
           >
             <EmailRoundedIcon sx={{ fontSize: 28 }} className="text-white" />
           </motion.div>
           <h1 className="text-white font-black text-2xl uppercase tracking-tight">Contact Support</h1>
           <p className="text-white/60 text-[10px] font-black uppercase tracking-widest mt-2 max-w-xs mx-auto leading-relaxed">
             Direct digital link to the Offerly command center
           </p>
        </div>

        <div className="grid grid-cols-1 gap-8">
          
          {/* Communication Terminal */}
          <div className="space-y-6">
            <div className="px-1">
               <p className="text-[10px] font-black text-gray-400 uppercase tracking-widest mb-1">Inquiry Terminal</p>
               <h2 className="text-gray-900 font-black text-xl uppercase tracking-tighter">Submit Your Request</h2>
            </div>

            <form onSubmit={handleSubmit} className="space-y-3">
              <div className="bg-white rounded-2xl p-4 border border-gray-50 shadow-sm space-y-4">
                 <div>
                   <label className="block text-[10px] font-black text-gray-400 uppercase tracking-widest mb-2 px-1">
                     Full Name <span className="text-red-500">*</span>
                   </label>
                   <input
                     type="text"
                     name="name"
                     value={formData.name}
                     onChange={handleChange}
                     placeholder="John Doe"
                     className="w-full px-4 py-3.5 rounded-xl border border-gray-100 bg-[#F8F5FF]/50 focus:bg-white focus:border-[#3D7A4F] outline-none transition-all text-sm font-bold"
                     required
                   />
                 </div>

                 <div>
                   <label className="block text-[10px] font-black text-gray-400 uppercase tracking-widest mb-2 px-1">
                     Email Address <span className="text-red-500">*</span>
                   </label>
                   <input
                     type="email"
                     name="email"
                     value={formData.email}
                     onChange={handleChange}
                     placeholder="john@example.com"
                     className="w-full px-4 py-3.5 rounded-xl border border-gray-100 bg-[#F8F5FF]/50 focus:bg-white focus:border-[#3D7A4F] outline-none transition-all text-sm font-bold"
                     required
                   />
                 </div>

                 <div>
                   <label className="block text-[10px] font-black text-gray-400 uppercase tracking-widest mb-2 px-1">
                     Request Subject <span className="text-red-500">*</span>
                   </label>
                   <select
                     name="subject"
                     value={formData.subject}
                     onChange={handleChange}
                     className="w-full px-4 py-3.5 rounded-xl border border-gray-100 bg-[#F8F5FF]/50 focus:bg-white focus:border-[#3D7A4F] outline-none transition-all text-sm font-bold uppercase tracking-tight"
                     required
                   >
                     <option value="">Select Category</option>
                     <option value="general">General Inquiry</option>
                     <option value="booking">Redemption Issue</option>
                     <option value="payment">Credit Balance</option>
                     <option value="technical">App Support</option>
                   </select>
                 </div>

                 <div>
                   <label className="block text-[10px] font-black text-gray-400 uppercase tracking-widest mb-2 px-1">
                     Detailed Message <span className="text-red-500">*</span>
                   </label>
                   <textarea
                     name="message"
                     value={formData.message}
                     onChange={handleChange}
                     placeholder="Describe your inquiry in detail..."
                     rows="4"
                     className="w-full px-4 py-3.5 rounded-xl border border-gray-100 bg-[#F8F5FF]/50 focus:bg-white focus:border-[#3D7A4F] outline-none transition-all text-sm font-bold resize-none"
                     required
                   />
                 </div>
              </div>

              <button
                type="submit"
                disabled={isSubmitting}
                className="w-full bg-[#3D7A4F] text-white font-black text-[11px] uppercase tracking-[0.2em] py-4 rounded-2xl shadow-lg shadow-[#3D7A4F]/20 active:scale-95 transition-all flex items-center justify-center gap-2"
              >
                {isSubmitting ? (
                  <div className="w-5 h-5 border-2 border-white/30 border-t-white rounded-full animate-spin" />
                ) : (
                  <>
                    <SendRoundedIcon sx={{ fontSize: 16 }} />
                    Initialize Dispatch
                  </>
                )}
              </button>
            </form>
          </div>

          {/* Quick Access Channels */}
          <div className="space-y-6">
            <div className="px-1">
               <p className="text-[10px] font-black text-gray-400 uppercase tracking-widest mb-1">Support Channels</p>
               <h2 className="text-gray-900 font-black text-xl uppercase tracking-tighter">Direct Access</h2>
            </div>

            <div className="grid grid-cols-1 gap-3">
              {[
                { i: EmailRoundedIcon, t: 'Digital Mail', c: 'support@offerly.com' },
                { i: PhoneRoundedIcon, t: 'Voice Link', c: '+91 XXXXX XXXXX' },
                { i: AccessTimeRoundedIcon, t: 'Operating Hours', c: 'Mon - Sat: 09:00 - 18:00' },
              ].map((channel, idx) => (
                <div key={idx} className="bg-white rounded-2xl p-4 flex items-center gap-4 border border-gray-50 shadow-sm">
                   <div className="w-11 h-11 bg-[#3D7A4F]/5 rounded-xl flex items-center justify-center border border-[#3D7A4F]/10 flex-shrink-0">
                      <channel.i sx={{ fontSize: 18 }} className="text-[#3D7A4F]" />
                   </div>
                   <div>
                      <p className="text-[10px] font-black text-gray-900 uppercase tracking-tight">{channel.t}</p>
                      <p className="text-[11px] font-bold text-gray-400 uppercase tracking-widest mt-0.5">{channel.c}</p>
                   </div>
                </div>
              ))}
            </div>

            {/* Quick Links Footer */}
            <div className="bg-white rounded-[2rem] p-6 border border-gray-100 shadow-sm">
               <h3 className="text-[10px] font-black text-gray-900 uppercase tracking-widest mb-4">Quick Protocols</h3>
               <div className="grid grid-cols-2 gap-3">
                  <button onClick={() => navigate('/support')} className="text-[10px] font-black text-[#3D7A4F] uppercase tracking-widest bg-[#3D7A4F]/5 py-2.5 rounded-xl border border-[#3D7A4F]/10">Support Hub</button>
                  <button onClick={() => navigate('/terms')} className="text-[10px] font-black text-gray-400 uppercase tracking-widest bg-gray-50 py-2.5 rounded-xl border border-gray-100">Legal Docs</button>
               </div>
            </div>
          </div>
          
        </div>
      </div>
    </PageTransition>
  );
};

export default Contact;
