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
import Inventory2RoundedIcon from '@mui/icons-material/Inventory2Rounded';
import SpaRoundedIcon from '@mui/icons-material/SpaRounded';
import CloseRoundedIcon from '@mui/icons-material/CloseRounded';
import SaveRoundedIcon from '@mui/icons-material/SaveRounded';
import StorefrontRoundedIcon from '@mui/icons-material/StorefrontRounded';
import { useEffect, useState } from 'react';
import { merchantAPI } from '../../../api/merchant.api';
import toast from 'react-hot-toast';

const menuSections = [
  {
    title: 'Commercial HQ',
    items: [
      { label: 'Store Core Profile', icon: BusinessRoundedIcon, action: 'edit-store' },
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

const Profile = ({ merchant, onMerchantUpdate }) => {
  const navigate = useNavigate();
  const { logout } = useApp();
  const [stats, setStats] = useState({ revenue: 0, bookings: 0, offers: 0, rating: 0 });
  const [updatingStoreType, setUpdatingStoreType] = useState(false);
  const [storeType, setStoreType] = useState(merchant?.storeType || 'product_based');
  
  // Store Profile Edit Modal State
  const [isEditModalOpen, setIsEditModalOpen] = useState(false);
  const [savingProfile, setSavingProfile] = useState(false);
  const [profileFormData, setProfileFormData] = useState({
    storeName: merchant?.storeName || '',
    category: merchant?.category || '',
    storeType: merchant?.storeType || 'product_based',
    description: merchant?.description || '',
    phone: merchant?.phone || '',
    email: merchant?.email || '',
    address: merchant?.address || '',
  });

  useEffect(() => {
    if (merchant) {
      setStoreType(merchant.storeType || 'product_based');
      setProfileFormData({
        storeName: merchant.storeName || '',
        category: merchant.category || '',
        storeType: merchant.storeType || 'product_based',
        description: merchant.description || '',
        phone: merchant.phone || '',
        email: merchant.email || '',
        address: merchant.address || '',
      });
    }
  }, [merchant]);

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

  const handleStoreTypeChange = async (nextType) => {
    if (storeType === nextType || updatingStoreType) return;
    setUpdatingStoreType(true);
    setStoreType(nextType);
    try {
      await merchantAPI.updateStore({ storeType: nextType });
      toast.success(`Store offering mode set to ${nextType === 'service_based' ? 'Services' : 'Products'}`);
      await onMerchantUpdate?.();
    } catch (error) {
      toast.error('Failed to update store type');
      setStoreType(merchant?.storeType || 'product_based');
    } finally {
      setUpdatingStoreType(false);
    }
  };

  const handleSaveStoreProfile = async (e) => {
    e.preventDefault();
    if (!profileFormData.storeName.trim()) {
      return toast.error('Store name is required');
    }
    setSavingProfile(true);
    try {
      await merchantAPI.updateStore(profileFormData);
      toast.success('Store profile updated successfully');
      setIsEditModalOpen(false);
      await onMerchantUpdate?.();
    } catch (error) {
      toast.error(error?.response?.data?.message || 'Failed to update store profile');
    } finally {
      setSavingProfile(false);
    }
  };

  const isService = storeType === 'service_based';

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
         
         {/* Identity Strip */}
         <div className="bg-gray-900 rounded-[2rem] p-4 sm:p-6 lg:p-8 relative overflow-hidden shadow-2xl">
            <div className="absolute top-0 right-0 w-64 h-64 bg-[#5EB929]/20 rounded-full blur-[80px] -translate-y-1/2 translate-x-1/2" />
            <div className="relative z-10 flex items-center gap-4 sm:gap-6 lg:gap-8">
               <div className="relative group">
                  <div className="w-16 h-16 sm:w-20 lg:w-24 rounded-full overflow-hidden border-2 border-white/10 shadow-2xl bg-white/5 flex items-center justify-center">
                     {merchant?.logo ? <img src={merchant.logo} className="w-full h-full object-cover" alt="" /> : <span className="text-xl sm:text-2xl font-bold text-[#5EB929]">{merchant?.storeName?.charAt(0)}</span>}
                  </div>
                  <button 
                    onClick={() => setIsEditModalOpen(true)} 
                    className="absolute -bottom-0.5 -right-0.5 w-7 h-7 bg-[#5EB929] text-white rounded-full flex items-center justify-center shadow-lg border-2 border-gray-900 hover:scale-105 transition-transform"
                    title="Edit Store Details"
                  >
                     <EditRoundedIcon sx={{ fontSize: 12 }} />
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
                  <p className="text-gray-400 font-bold text-[10px] sm:text-xs tracking-wide mt-1 truncate uppercase opacity-60">
                    {merchant?.category} • {merchant?.city} • #OFF-{merchant?._id?.slice(-6).toUpperCase()}
                  </p>
                  
                  {/* Store Type Badge */}
                  <div className="flex items-center gap-1.5 px-2.5 py-1 bg-white/10 rounded-full w-fit mt-2.5 border border-white/10 backdrop-blur-md">
                    {isService ? (
                      <SpaRoundedIcon sx={{ fontSize: 12 }} className="text-[#5EB929]" />
                    ) : (
                      <Inventory2RoundedIcon sx={{ fontSize: 12 }} className="text-[#5EB929]" />
                    )}
                    <span className="text-[9px] font-bold text-white tracking-wide uppercase">
                      {isService ? 'Service-Based Store' : 'Product-Based Store'}
                    </span>
                  </div>
               </div>
            </div>
         </div>

         {/* Store Offering Mode Selector (Product vs Service) */}
         <div className="bg-white rounded-[2rem] p-5 sm:p-6 border border-gray-100 shadow-sm space-y-4">
            <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-2">
              <div>
                <h3 className="text-sm font-bold text-gray-900 tracking-tight">Store Offering Mode</h3>
                <p className="text-[11px] text-gray-500 font-medium mt-0.5">
                  Select what kind of store you run. Customers will see your button as <strong>{isService ? '"Services"' : '"Products"'}</strong>.
                </p>
              </div>
              <span className={`text-[10px] font-bold px-2.5 py-1 rounded-full uppercase tracking-wider self-start sm:self-auto ${
                isService ? 'bg-purple-50 text-purple-700 border border-purple-100' : 'bg-green-50 text-green-700 border border-green-100'
              }`}>
                Current: {isService ? 'Services' : 'Products'}
              </span>
            </div>

            <div className="grid grid-cols-1 sm:grid-cols-2 gap-3 pt-1">
              {/* Product Based Card */}
              <button
                type="button"
                disabled={updatingStoreType}
                onClick={() => handleStoreTypeChange('product_based')}
                className={`p-4 rounded-2xl border-2 text-left transition-all flex items-start gap-3.5 select-none ${
                  !isService
                    ? 'border-[#5EB929] bg-[#5EB929]/5 shadow-sm ring-1 ring-[#5EB929]/30'
                    : 'border-gray-100 bg-gray-50/60 hover:bg-white hover:border-gray-200'
                }`}
              >
                <div className={`w-9 h-9 rounded-xl flex items-center justify-center flex-shrink-0 transition-colors ${
                  !isService ? 'bg-[#5EB929] text-white shadow-sm' : 'bg-gray-100 text-gray-400'
                }`}>
                  <Inventory2RoundedIcon sx={{ fontSize: 18 }} />
                </div>
                <div className="flex-1 min-w-0">
                  <div className="flex items-center justify-between">
                    <p className={`text-xs font-bold ${!isService ? 'text-gray-900' : 'text-gray-700'}`}>
                      Product Based
                    </p>
                    <div className={`w-4 h-4 rounded-full border flex items-center justify-center ${
                      !isService ? 'border-[#5EB929] bg-[#5EB929]' : 'border-gray-300'
                    }`}>
                      {!isService && <div className="w-1.5 h-1.5 rounded-full bg-white" />}
                    </div>
                  </div>
                  <p className="text-[10px] text-gray-500 font-medium mt-1 leading-normal">
                    Button displays as <strong>Products</strong>. For retail, groceries, menus, electronics & physical items.
                  </p>
                </div>
              </button>

              {/* Service Based Card */}
              <button
                type="button"
                disabled={updatingStoreType}
                onClick={() => handleStoreTypeChange('service_based')}
                className={`p-4 rounded-2xl border-2 text-left transition-all flex items-start gap-3.5 select-none ${
                  isService
                    ? 'border-[#5EB929] bg-[#5EB929]/5 shadow-sm ring-1 ring-[#5EB929]/30'
                    : 'border-gray-100 bg-gray-50/60 hover:bg-white hover:border-gray-200'
                }`}
              >
                <div className={`w-9 h-9 rounded-xl flex items-center justify-center flex-shrink-0 transition-colors ${
                  isService ? 'bg-[#5EB929] text-white shadow-sm' : 'bg-gray-100 text-gray-400'
                }`}>
                  <SpaRoundedIcon sx={{ fontSize: 18 }} />
                </div>
                <div className="flex-1 min-w-0">
                  <div className="flex items-center justify-between">
                    <p className={`text-xs font-bold ${isService ? 'text-gray-900' : 'text-gray-700'}`}>
                      Service Based
                    </p>
                    <div className={`w-4 h-4 rounded-full border flex items-center justify-center ${
                      isService ? 'border-[#5EB929] bg-[#5EB929]' : 'border-gray-300'
                    }`}>
                      {isService && <div className="w-1.5 h-1.5 rounded-full bg-white" />}
                    </div>
                  </div>
                  <p className="text-[10px] text-gray-500 font-medium mt-1 leading-normal">
                    Button displays as <strong>Services</strong>. For salons, spas, fitness gyms, health, repairs & bookings.
                  </p>
                </div>
              </button>
            </div>
         </div>

         {/* Stats Bar */}
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

         {/* Subscription Strip */}
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
               <button onClick={() => navigate('/merchant/subscription')} className="px-4 py-2 bg-white text-[#5EB929] rounded-lg font-bold text-[9px] uppercase tracking-widest active:scale-95 transition-all shadow-lg">
                  Plan
               </button>
            </div>
         </div>

         {/* Menu Hub */}
         <div className="space-y-6">
            {menuSections.map((section) => (
               <div key={section.title} className="space-y-2">
                  <div className="flex items-center gap-2 px-1">
                     <div className="w-1 h-3 bg-gray-300 rounded-full" />
                     <h3 className="text-[9px] font-bold text-gray-400 uppercase tracking-widest">{section.title}</h3>
                  </div>
                  <div className="bg-white rounded-2xl border border-gray-100 shadow-sm overflow-hidden divide-y divide-gray-50">
                     {section.items.map(item => (
                        <button 
                          key={item.label} 
                          onClick={() => {
                            if (item.action === 'edit-store') {
                              setIsEditModalOpen(true);
                            } else if (item.path) {
                              navigate(item.path);
                            }
                          }} 
                          className="w-full flex items-center gap-3 px-4 py-3.5 hover:bg-background transition-all group text-left"
                        >
                           <div className="w-8 h-8 rounded-lg bg-background text-[#5EB929] flex items-center justify-center group-hover:scale-105 transition-transform flex-shrink-0">
                              <item.icon sx={{ fontSize: 16 }} />
                           </div>
                           <span className="flex-1 text-[12px] font-bold text-gray-700 truncate">{item.label}</span>
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

      {/* Edit Store Core Profile Modal */}
      <AnimatePresence>
        {isEditModalOpen && (
          <div className="fixed inset-0 z-[99999] bg-black/60 backdrop-blur-sm flex items-center justify-center p-4">
            <motion.div
              initial={{ opacity: 0, scale: 0.95 }}
              animate={{ opacity: 1, scale: 1 }}
              exit={{ opacity: 0, scale: 0.95 }}
              className="bg-white rounded-[2rem] w-full max-w-lg overflow-hidden shadow-2xl border border-gray-100 flex flex-col max-h-[90vh]"
            >
              {/* Modal Header */}
              <div className="px-6 py-4 bg-gray-900 text-white flex items-center justify-between">
                <div className="flex items-center gap-2.5">
                  <StorefrontRoundedIcon sx={{ fontSize: 20 }} className="text-[#5EB929]" />
                  <h3 className="text-sm font-bold tracking-tight">Store Core Profile</h3>
                </div>
                <button
                  type="button"
                  onClick={() => setIsEditModalOpen(false)}
                  className="w-8 h-8 rounded-full bg-white/10 hover:bg-white/20 flex items-center justify-center text-white transition-colors"
                >
                  <CloseRoundedIcon sx={{ fontSize: 16 }} />
                </button>
              </div>

              {/* Modal Form */}
              <form onSubmit={handleSaveStoreProfile} className="p-6 space-y-4 overflow-y-auto flex-1">
                {/* Store Type Selection */}
                <div className="space-y-2">
                  <label className="text-[10px] font-bold text-gray-400 uppercase tracking-wider">Business Type</label>
                  <div className="grid grid-cols-2 gap-2.5">
                    <button
                      type="button"
                      onClick={() => setProfileFormData(p => ({ ...p, storeType: 'product_based' }))}
                      className={`p-3 rounded-xl border text-left flex items-center gap-2.5 transition-all ${
                        profileFormData.storeType === 'product_based'
                          ? 'border-[#5EB929] bg-[#5EB929]/5 text-gray-900 font-bold'
                          : 'border-gray-200 text-gray-600'
                      }`}
                    >
                      <Inventory2RoundedIcon sx={{ fontSize: 16 }} className={profileFormData.storeType === 'product_based' ? 'text-[#5EB929]' : 'text-gray-400'} />
                      <span className="text-xs">Product Based</span>
                    </button>
                    <button
                      type="button"
                      onClick={() => setProfileFormData(p => ({ ...p, storeType: 'service_based' }))}
                      className={`p-3 rounded-xl border text-left flex items-center gap-2.5 transition-all ${
                        profileFormData.storeType === 'service_based'
                          ? 'border-[#5EB929] bg-[#5EB929]/5 text-gray-900 font-bold'
                          : 'border-gray-200 text-gray-600'
                      }`}
                    >
                      <SpaRoundedIcon sx={{ fontSize: 16 }} className={profileFormData.storeType === 'service_based' ? 'text-[#5EB929]' : 'text-gray-400'} />
                      <span className="text-xs">Service Based</span>
                    </button>
                  </div>
                </div>

                <div className="space-y-1.5">
                  <label className="text-[10px] font-bold text-gray-400 uppercase tracking-wider">Store Name</label>
                  <input
                    type="text"
                    value={profileFormData.storeName}
                    onChange={(e) => setProfileFormData(p => ({ ...p, storeName: e.target.value }))}
                    className="w-full px-3.5 py-2.5 bg-gray-50 border border-gray-200 rounded-xl text-xs font-bold text-gray-900 outline-none focus:bg-white focus:border-[#5EB929]"
                    required
                  />
                </div>

                <div className="space-y-1.5">
                  <label className="text-[10px] font-bold text-gray-400 uppercase tracking-wider">Category</label>
                  <input
                    type="text"
                    value={profileFormData.category}
                    onChange={(e) => setProfileFormData(p => ({ ...p, category: e.target.value }))}
                    className="w-full px-3.5 py-2.5 bg-gray-50 border border-gray-200 rounded-xl text-xs font-bold text-gray-900 outline-none focus:bg-white focus:border-[#5EB929]"
                  />
                </div>

                <div className="space-y-1.5">
                  <label className="text-[10px] font-bold text-gray-400 uppercase tracking-wider">Description</label>
                  <textarea
                    rows="3"
                    value={profileFormData.description}
                    onChange={(e) => setProfileFormData(p => ({ ...p, description: e.target.value }))}
                    className="w-full px-3.5 py-2.5 bg-gray-50 border border-gray-200 rounded-xl text-xs font-bold text-gray-900 outline-none focus:bg-white focus:border-[#5EB929] resize-none"
                  />
                </div>

                <div className="space-y-1.5">
                  <label className="text-[10px] font-bold text-gray-400 uppercase tracking-wider">Address</label>
                  <input
                    type="text"
                    value={profileFormData.address}
                    onChange={(e) => setProfileFormData(p => ({ ...p, address: e.target.value }))}
                    className="w-full px-3.5 py-2.5 bg-gray-50 border border-gray-200 rounded-xl text-xs font-bold text-gray-900 outline-none focus:bg-white focus:border-[#5EB929]"
                  />
                </div>

                <div className="grid grid-cols-2 gap-3">
                  <div className="space-y-1.5">
                    <label className="text-[10px] font-bold text-gray-400 uppercase tracking-wider">Contact Phone</label>
                    <input
                      type="text"
                      value={profileFormData.phone}
                      onChange={(e) => setProfileFormData(p => ({ ...p, phone: e.target.value }))}
                      className="w-full px-3.5 py-2.5 bg-gray-50 border border-gray-200 rounded-xl text-xs font-bold text-gray-900 outline-none focus:bg-white focus:border-[#5EB929]"
                    />
                  </div>
                  <div className="space-y-1.5">
                    <label className="text-[10px] font-bold text-gray-400 uppercase tracking-wider">Business Email</label>
                    <input
                      type="email"
                      value={profileFormData.email}
                      onChange={(e) => setProfileFormData(p => ({ ...p, email: e.target.value }))}
                      className="w-full px-3.5 py-2.5 bg-gray-50 border border-gray-200 rounded-xl text-xs font-bold text-gray-900 outline-none focus:bg-white focus:border-[#5EB929]"
                    />
                  </div>
                </div>

                {/* Modal Footer */}
                <div className="flex items-center justify-end gap-2.5 pt-3 border-t border-gray-100">
                  <button
                    type="button"
                    onClick={() => setIsEditModalOpen(false)}
                    className="px-4 py-2.5 rounded-xl border border-gray-200 text-xs font-bold text-gray-600 hover:bg-gray-50 transition-colors"
                  >
                    Cancel
                  </button>
                  <button
                    type="submit"
                    disabled={savingProfile}
                    className="px-5 py-2.5 rounded-xl bg-[#5EB929] hover:bg-[#52a623] text-white text-xs font-bold flex items-center gap-1.5 shadow-md shadow-[#5EB929]/20 transition-all disabled:opacity-50"
                  >
                    <SaveRoundedIcon sx={{ fontSize: 16 }} />
                    {savingProfile ? 'Saving...' : 'Save Profile'}
                  </button>
                </div>
              </form>
            </motion.div>
          </div>
        )}
      </AnimatePresence>
    </div>
  );
};

export default Profile;
