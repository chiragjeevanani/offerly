import { useState, useEffect } from 'react';
import { motion } from 'framer-motion';
import { useNavigate } from 'react-router-dom';
import ArrowBackRoundedIcon from '@mui/icons-material/ArrowBackRounded';
import SearchRoundedIcon from '@mui/icons-material/SearchRounded';
import ExpandMoreRoundedIcon from '@mui/icons-material/ExpandMoreRounded';
import LockRoundedIcon from '@mui/icons-material/LockRounded';
import LocalOfferRoundedIcon from '@mui/icons-material/LocalOfferRounded';
import PaymentRoundedIcon from '@mui/icons-material/PaymentRounded';
import LocationOnRoundedIcon from '@mui/icons-material/LocationOnRounded';
import NotificationsRoundedIcon from '@mui/icons-material/NotificationsRounded';
import BugReportRoundedIcon from '@mui/icons-material/BugReportRounded';
import ChatRoundedIcon from '@mui/icons-material/ChatRounded';
import EmailRoundedIcon from '@mui/icons-material/EmailRounded';
import PhoneRoundedIcon from '@mui/icons-material/PhoneRounded';
import PageTransition from '../../components/ui/PageTransition';

const CategoryCard = ({ icon: Icon, title, count, color, bgColor, onClick }) => (
  <motion.button
    whileTap={{ scale: 0.97 }}
    onClick={onClick}
    className="bg-white rounded-xl p-5 border border-gray-200 hover:border-primary/30 hover:shadow-md transition-all text-left"
  >
    <div className={`w-12 h-12 rounded-xl ${bgColor} ${color} flex items-center justify-center mb-3`}>
      <Icon sx={{ fontSize: 24 }} />
    </div>
    <h3 className="font-bold text-gray-900 mb-1">{title}</h3>
    <p className="text-xs text-gray-500">{count} articles</p>
  </motion.button>
);

const FAQItem = ({ question, answer }) => {
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
        className="w-full flex items-center justify-between p-4 text-left hover:bg-gray-50 transition-colors"
      >
        <span className="font-semibold text-gray-900 text-sm pr-4">{question}</span>
        <ExpandMoreRoundedIcon
          className={`text-gray-400 transition-transform flex-shrink-0 ${isOpen ? 'rotate-180' : ''}`}
        />
      </button>
      {isOpen && (
        <motion.div
          initial={{ height: 0, opacity: 0 }}
          animate={{ height: 'auto', opacity: 1 }}
          className="px-4 pb-4 text-sm text-gray-600 leading-relaxed"
        >
          {answer}
        </motion.div>
      )}
    </motion.div>
  );
};

const Support = () => {
  const navigate = useNavigate();
  const [searchQuery, setSearchQuery] = useState('');

  const categories = [
    { icon: LockRoundedIcon, title: 'Account & Login', count: 8, color: 'text-blue-600', bgColor: 'bg-blue-50' },
    { icon: LocalOfferRoundedIcon, title: 'Offers & Booking', count: 12, color: 'text-green-600', bgColor: 'bg-green-50' },
    { icon: PaymentRoundedIcon, title: 'Payments', count: 6, color: 'text-purple-600', bgColor: 'bg-purple-50' },
    { icon: LocationOnRoundedIcon, title: 'Location & Search', count: 5, color: 'text-amber-600', bgColor: 'bg-amber-50' },
    { icon: NotificationsRoundedIcon, title: 'Notifications', count: 4, color: 'text-pink-600', bgColor: 'bg-pink-50' },
    { icon: BugReportRoundedIcon, title: 'Technical Issues', count: 7, color: 'text-red-600', bgColor: 'bg-red-50' },
  ];

  const faqs = [
    {
      question: 'How do I sign up for Offerly?',
      answer: 'Download the Offerly app or visit our website. Click on "Sign Up" and enter your phone number. You\'ll receive an OTP to verify your account. Once verified, complete your profile and start exploring offers!'
    },
    {
      question: 'I didn\'t receive my OTP. What should I do?',
      answer: 'First, check if you entered the correct phone number. Wait for 2-3 minutes as there might be a delay. If you still don\'t receive it, click on "Resend OTP". Make sure you have good network connectivity.'
    },
    {
      question: 'How do I book an offer?',
      answer: 'Browse offers on the home page or search for specific categories. Click on an offer to view details. Tap "Book Now" to generate your QR code. Show this QR code to the merchant when you visit their store.'
    },
    {
      question: 'Can I cancel a booking?',
      answer: 'Yes, you can cancel a booking before it\'s redeemed. Go to "My Bookings", select the booking, and tap "Cancel". Once a QR code is scanned by the merchant, it cannot be cancelled.'
    },
    {
      question: 'Do I need to pay online?',
      answer: 'No! Offerly doesn\'t charge you anything online. All payments are made directly to the merchant at the time of service. Generating a QR code is completely free.'
    },
    {
      question: 'My QR code is not working. What should I do?',
      answer: 'Make sure your QR code hasn\'t expired. Check your internet connection. If the issue persists, try refreshing the booking page. Contact the merchant or our support team if the problem continues.'
    },
    {
      question: 'How do I change my location?',
      answer: 'Tap on the location dropdown at the top of the home page. Select your preferred city from the list. The app will show offers available in that location.'
    },
    {
      question: 'Can I use multiple offers at once?',
      answer: 'Generally, only one offer can be used per transaction. However, this depends on the merchant\'s policy. Check the offer terms and conditions for specific details.'
    },
  ];

  return (
    <PageTransition>
      <div className="min-h-screen bg-background px-4 py-4 pb-24 space-y-8">
        
        {/* Support Hub Identity */}
        <div className="bg-[#5EB929] rounded-[2.5rem] p-10 text-center relative overflow-hidden shadow-lg shadow-[#5EB929]/20">
           <div className="absolute top-0 right-0 w-32 h-32 bg-white/5 rounded-full -mr-16 -mt-16 blur-3xl" />
           <motion.div
             initial={{ scale: 0.8 }}
             animate={{ scale: 1 }}
             className="w-16 h-16 bg-white/10 rounded-2xl flex items-center justify-center mx-auto mb-5 backdrop-blur-md border border-white/10"
           >
             <ChatRoundedIcon sx={{ fontSize: 28 }} className="text-white" />
           </motion.div>
           <h1 className="text-white font-bold text-2xl uppercase tracking-tight">Support Center</h1>
           <p className="text-white/60 text-[10px] font-bold uppercase tracking-widest mt-2 max-w-xs mx-auto leading-relaxed">
             Central knowledge base for the Offerly digital network
           </p>
        </div>

        {/* Search Terminal */}
        <div className="space-y-4">
           <div className="relative">
              <SearchRoundedIcon className="absolute left-4 top-1/2 -translate-y-1/2 text-gray-400" sx={{ fontSize: 20 }} />
              <input
                type="text"
                placeholder="Search Knowledge Base..."
                value={searchQuery}
                onChange={(e) => setSearchQuery(e.target.value)}
                className="w-full pl-12 pr-4 py-4.5 rounded-[1.5rem] border border-gray-100 bg-white shadow-sm focus:border-[#5EB929] focus:ring-4 focus:ring-[#5EB929]/5 outline-none transition-all text-[11px] font-bold uppercase tracking-widest"
              />
           </div>
        </div>

        {/* Category Grid */}
        <div className="space-y-4">
           <p className="text-[10px] font-bold text-gray-400 uppercase tracking-widest px-1">Protocol Categories</p>
           <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
              {categories.map((category, idx) => (
                <button
                  key={idx}
                  className="bg-white rounded-[1.25rem] p-4 flex items-center gap-4 border border-gray-50 shadow-sm active:scale-95 transition-all text-left"
                >
                   <div className="w-10 h-10 bg-[#5EB929]/5 rounded-xl flex items-center justify-center border border-[#5EB929]/10 flex-shrink-0">
                      <category.icon sx={{ fontSize: 18 }} className="text-[#5EB929]" />
                   </div>
                   <div>
                      <p className="text-[10px] font-bold text-gray-900 uppercase tracking-tight">{category.title}</p>
                      <p className="text-[8px] font-bold text-gray-400 uppercase tracking-widest mt-0.5">{category.count} Protocols</p>
                   </div>
                </button>
              ))}
           </div>
        </div>

        {/* FAQ Terminal */}
        <div className="space-y-4">
           <p className="text-[10px] font-bold text-gray-400 uppercase tracking-widest px-1">Active Protocols (FAQ)</p>
           <div className="space-y-2">
              {faqs.map((faq, idx) => (
                <FAQItem key={idx} {...faq} />
              ))}
           </div>
        </div>

        {/* Contact Strip */}
        <div className="space-y-4">
           <p className="text-[10px] font-bold text-gray-400 uppercase tracking-widest px-1">Direct Assistance</p>
           <div className="bg-white rounded-[2rem] p-8 text-center border border-gray-100 shadow-xl shadow-gray-200/20">
              <h3 className="text-gray-900 font-bold text-xl uppercase tracking-tight mb-2">Still Stuck?</h3>
              <p className="text-gray-500 text-[11px] font-medium mb-6 px-4">Our specialized support squad is ready to assist with your custom request.</p>
              <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
                 <button onClick={() => navigate('/contact')} className="bg-[#5EB929] text-white font-bold text-[10px] uppercase tracking-widest py-3.5 rounded-xl">Initialize Chat</button>
                 <button className="bg-gray-50 text-gray-400 font-bold text-[10px] uppercase tracking-widest py-3.5 rounded-xl border border-gray-100">Voice Support</button>
              </div>
           </div>
        </div>

      </div>
    </PageTransition>
  );
};

export default Support;
