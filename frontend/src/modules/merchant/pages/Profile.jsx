import { useNavigate } from 'react-router-dom';
import { motion, AnimatePresence } from 'framer-motion';
import { useApp } from '../../customer/context/AppContext';
import ArrowBackRoundedIcon from '@mui/icons-material/ArrowBackRounded';
import BusinessRoundedIcon from '@mui/icons-material/BusinessRounded';
import LocationOnRoundedIcon from '@mui/icons-material/LocationOnRounded';
import AccountBalanceRoundedIcon from '@mui/icons-material/AccountBalanceRounded';
import LockRoundedIcon from '@mui/icons-material/LockRounded';
import NotificationsRoundedIcon from '@mui/icons-material/NotificationsRounded';
import LanguageRoundedIcon from '@mui/icons-material/LanguageRounded';
import InfoRoundedIcon from '@mui/icons-material/InfoRounded';
import HelpRoundedIcon from '@mui/icons-material/HelpRounded';
import ContactSupportRoundedIcon from '@mui/icons-material/ContactSupportRounded';
import DescriptionRoundedIcon from '@mui/icons-material/DescriptionRounded';
import SecurityRoundedIcon from '@mui/icons-material/SecurityRounded';
import LogoutRoundedIcon from '@mui/icons-material/LogoutRounded';
import ChevronRightRoundedIcon from '@mui/icons-material/ChevronRightRounded';
import EditRoundedIcon from '@mui/icons-material/EditRounded';
import WorkspacePremiumRoundedIcon from '@mui/icons-material/WorkspacePremiumRounded';
import VerifiedRoundedIcon from '@mui/icons-material/VerifiedRounded';
import { useEffect, useState } from 'react';
import { merchantAPI } from '../../../api/merchant.api';

const menuSections = [
  {
    title: 'Commercial HQ',
    items: [
      { label: 'Store Core Profile', icon: BusinessRoundedIcon, path: '/merchant/profile/store-details' },
      { label: 'Map & Service Radius', icon: LocationOnRoundedIcon, path: '/merchant/profile/location' },
      { label: 'Settlement Account', icon: AccountBalanceRoundedIcon, path: '/merchant/profile/bank' },
    ],
  },
  {
    title: 'Security & Interface',
    items: [
      { label: 'Access Credentials', icon: LockRoundedIcon, path: '/merchant/profile/change-password' },
      { label: 'Notification Hub', icon: NotificationsRoundedIcon, path: '/merchant/profile/notifications-settings' },
      { label: 'App Language', icon: LanguageRoundedIcon, path: '/merchant/profile/language' },
    ],
  },
  {
    title: 'Network & Compliance',
    items: [
      { label: 'Platform Knowledge', icon: InfoRoundedIcon, path: '/merchant/about' },
      { label: 'Concierge Support', icon: HelpRoundedIcon, path: '/merchant/support' },
      { label: 'Legal Architecture', icon: DescriptionRoundedIcon, path: '/merchant/terms' },
    ],
  },
];

const Profile = ({ merchant }) => {
  const navigate = useNavigate();
  const { logout } = useApp();
  const [stats, setStats] = useState({ revenue: 0, bookings: 0, offers: 0, rating: 0 });

  useEffect(() => {
    const fetchStats = async () => {
      try {
        const response = await merchantAPI.getDashboard();
        if (response?.stats) {
          setStats({
            revenue: response.stats.revenue || 0,
            bookings: response.stats.bookingsCount || 0,
            offers: response.stats.offersCount || 0,
            rating: merchant?.avgRating || 0,
          });
        }
      } catch (err) {}
    };
    fetchStats();
  }, [merchant]);

  return (
    <div className="min-h-screen bg-background pb-24">
      {/* Mobile Top Bar */}
      <div className="lg:hidden sticky top-0 z-50 bg-white/80 backdrop-blur-xl border-b border-gray-100 px-4 py-3 flex items-center justify-between">
        <button onClick={() => navigate(-1)} className="w-9 h-9 flex items-center justify-center rounded-xl bg-gray-50 text-gray-400">
           <ArrowBackRoundedIcon sx={{ fontSize: 20 }} />
        </button>
        <h1 className="text-[15px] font-bold text-gray-900 uppercase tracking-widest">Command Center</h1>
        <div className="w-9" />
      </div>

      <div className="max-w-4xl mx-auto px-4 py-6 sm:py-10 space-y-8">
         
         {/* Identity Strip (Optimized for Desktop Scale) */}
         <div className="bg-gray-900 rounded-[2rem] p-4 sm:p-6 lg:p-8 relative overflow-hidden shadow-2xl">
            <div className="absolute top-0 right-0 w-64 h-64 bg-[#5EB929]/20 rounded-full blur-[80px] -translate-y-1/2 translate-x-1/2" />
            <div className="relative z-10 flex items-center gap-4 sm:gap-6 lg:gap-8">
               <div className="relative group">
                  <div className="w-16 h-16 sm:w-20 lg:w-24 rounded-full overflow-hidden border-2 border-white/10 shadow-2xl bg-white/5 flex items-center justify-center">
                     {merchant?.logo ? <img src={merchant.logo} className="w-full h-full object-cover" alt="" /> : <span className="text-xl sm:text-2xl font-bold text-[#5EB929]">{merchant?.storeName?.charAt(0)}</span>}
                  </div>
                  <button onClick={() => navigate('/merchant/profile/edit')} className="absolute -bottom-0.5 -right-0.5 w-6 h-6 sm:w-7 bg-[#5EB929] text-white rounded-full flex items-center justify-center shadow-lg border-2 border-gray-900">
                     <EditRoundedIcon sx={{ fontSize: 10 }} />
                  </button>
               </div>
               <div className="flex-1 min-w-0">
                  <div className="flex flex-col sm:flex-row sm:items-center gap-1 sm:gap-4">
                     <h2 className="text-lg sm:text-xl lg:text-2xl font-bold text-white tracking-tight leading-tight truncate">{merchant?.storeName}</h2>
                     <div className="flex items-center gap-1.5 px-2 py-0.5 bg-[#5EB929]/10 border border-[#5EB929]/20 rounded-full w-fit">
                        <VerifiedRoundedIcon className="text-[#5EB929]" sx={{ fontSize: 10 }} />
                        <span className="text-[8px] font-bold text-[#5EB929] uppercase tracking-widest">Verified</span>
                     </div>
                  </div>
                  <p className="text-gray-400 font-bold text-[10px] sm:text-xs tracking-wide mt-1 truncate uppercase opacity-60">{merchant?.category} • {merchant?.city} • #OFF-{merchant?._id?.slice(-6).toUpperCase()}</p>
               </div>
            </div>
         </div>

         {/* Stats Bar (High Density) */}
         <div className="grid grid-cols-2 lg:grid-cols-4 gap-4">
            {[
               { label: 'Revenue', value: `₹${stats.revenue.toLocaleString()}`, color: 'text-[#5EB929]' },
               { label: 'Bookings', value: stats.bookings, color: 'text-gray-900' },
               { label: 'Campaigns', value: stats.offers, color: 'text-gray-900' },
               { label: 'Performance', value: stats.rating.toFixed(1) + ' ⭐', color: 'text-amber-500' },
            ].map(s => (
               <div key={s.label} className="bg-white p-4 rounded-2xl border border-gray-100 shadow-sm flex flex-col items-center justify-center text-center group hover:border-[#5EB929]/20 transition-all">
                  <span className="text-[10px] font-bold text-gray-400 uppercase tracking-widest mb-1">{s.label}</span>
                  <span className={`text-lg font-bold ${s.color} tracking-tight`}>{s.value}</span>
               </div>
            ))}
         </div>

         {/* Subscription Strip (More Compact) */}
         <div className="bg-[#5EB929] rounded-2xl p-4 sm:p-6 text-white relative overflow-hidden shadow-xl shadow-[#5EB929]/20">
            <div className="absolute top-0 right-0 w-48 h-48 bg-white/5 rounded-full blur-3xl -translate-y-1/2 translate-x-1/2" />
            <div className="flex items-center justify-between gap-4 relative z-10">
               <div className="flex items-center gap-3">
                  <div className="w-10 h-10 rounded-lg bg-white/10 flex items-center justify-center border border-white/20 flex-shrink-0">
                     <WorkspacePremiumRoundedIcon sx={{ fontSize: 20 }} />
                  </div>
                  <div>
                     <p className="text-[8px] font-bold uppercase tracking-widest opacity-60 leading-none">Elite Active</p>
                     <h3 className="text-base sm:text-xl font-bold mt-1 leading-none">{merchant?.subscription?.plan?.name || 'Standard'}</h3>
                  </div>
               </div>
               <button className="px-4 py-2 bg-white text-[#5EB929] rounded-lg font-bold text-[9px] uppercase tracking-widest active:scale-95 transition-all shadow-lg">
                  Plan
               </button>
            </div>
         </div>

         {/* Menu Hub (High Density Compact) */}
         <div className="space-y-6">
            {menuSections.map((section, idx) => (
               <div key={section.title} className="space-y-2">
                  <div className="flex items-center gap-2 px-1">
                     <div className="w-1 h-3 bg-gray-300 rounded-full" />
                     <h3 className="text-[9px] font-bold text-gray-400 uppercase tracking-widest">{section.title}</h3>
                  </div>
                  <div className="bg-white rounded-2xl border border-gray-100 shadow-sm overflow-hidden divide-y divide-gray-50">
                     {section.items.map(item => (
                        <button key={item.label} onClick={() => navigate(item.path)} className="w-full flex items-center gap-3 px-4 py-3 hover:bg-background transition-all group">
                           <div className="w-8 h-8 rounded-lg bg-background text-[#5EB929] flex items-center justify-center group-hover:scale-105 transition-transform flex-shrink-0">
                              <item.icon sx={{ fontSize: 16 }} />
                           </div>
                           <span className="flex-1 text-[12px] font-bold text-gray-700 text-left truncate">{item.label}</span>
                           <ChevronRightRoundedIcon sx={{ fontSize: 16 }} className="text-gray-300 group-hover:translate-x-1 transition-transform" />
                        </button>
                     ))}
                  </div>
               </div>
            ))}
         </div>

         {/* Logout Area */}
         <motion.button 
            whileTap={{ scale: 0.98 }} onClick={() => logout() & navigate('/merchant/login')}
            className="w-full py-4 bg-red-50 text-red-600 rounded-2xl font-bold text-[11px] uppercase tracking-widest border border-red-100 flex items-center justify-center gap-3 hover:bg-red-100 transition-all"
         >
            <LogoutRoundedIcon sx={{ fontSize: 18 }} />
            Terminate Session
         </motion.button>

         <div className="text-center space-y-1 py-4">
            <p className="text-[9px] font-bold text-gray-400 uppercase tracking-[0.2em]">Offerly Business Enterprise</p>
            <p className="text-[8px] font-bold text-gray-300">SECURE TERMINAL V1.0.4-SHARP</p>
         </div>
      </div>
    </div>
  );
};

export default Profile;
