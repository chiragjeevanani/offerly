import { useState } from 'react';
import { useNavigate } from 'react-router-dom';
import { motion } from 'framer-motion';
import PersonRoundedIcon from '@mui/icons-material/PersonRounded';
import LocationOnRoundedIcon from '@mui/icons-material/LocationOnRounded';
import ReceiptLongRoundedIcon from '@mui/icons-material/ReceiptLongRounded';
import BookmarkRoundedIcon from '@mui/icons-material/BookmarkRounded';
import CardGiftcardRoundedIcon from '@mui/icons-material/CardGiftcardRounded';
import NotificationsRoundedIcon from '@mui/icons-material/NotificationsRounded';
import HelpOutlineRoundedIcon from '@mui/icons-material/HelpOutlineRounded';
import LogoutRoundedIcon from '@mui/icons-material/LogoutRounded';
import ChevronRightRoundedIcon from '@mui/icons-material/ChevronRightRounded';
import EditRoundedIcon from '@mui/icons-material/EditRounded';
import ContentCopyRoundedIcon from '@mui/icons-material/ContentCopyRounded';
import AccountBalanceWalletRoundedIcon from '@mui/icons-material/AccountBalanceWalletRounded';
import SaveRoundedIcon from '@mui/icons-material/SaveRounded';
import MyLocationRoundedIcon from '@mui/icons-material/MyLocationRounded';
import axios from 'axios';
import { useApp } from '../../context/AppContext';
import { bookingAPI } from '../../../../api/booking.api';
import { userAPI } from '../../../../api/user.api';
import { cityAPI } from '../../../../api/city.api';
import PageTransition from '../../components/ui/PageTransition';
import BottomSheet from '../../components/ui/BottomSheet';
import toast from 'react-hot-toast';
import { useEffect } from 'react';

const menuSections = [
  {
    title: 'Activity',
    items: [
      { label: 'My Redemptions', icon: ReceiptLongRoundedIcon, path: '/redemptions' },
      { label: 'Saved Offers', icon: BookmarkRoundedIcon, path: '/saved' },
      { label: 'Referral Program', icon: CardGiftcardRoundedIcon, path: '/referral' },
    ],
  },
  {
    title: 'Preferences',
    items: [
      { label: 'Notifications', icon: NotificationsRoundedIcon, path: '/notifications' },
    ],
  },
  {
    title: 'Help & Legal',
    items: [
      { label: 'Support Center', icon: HelpOutlineRoundedIcon, path: '/support' },
      { label: 'Contact Us', icon: PersonRoundedIcon, path: '/contact' },
      { label: 'About Offerly', icon: CardGiftcardRoundedIcon, path: '/about' },
      { label: 'Terms & Conditions', icon: ReceiptLongRoundedIcon, path: '/terms' },
      { label: 'Privacy Policy', icon: LocationOnRoundedIcon, path: '/privacy' },
    ],
  },
];

const Profile = () => {
  const navigate = useNavigate();
  const { user, logout, refreshUser } = useApp();
  const [redemptionCount, setRedemptionCount] = useState(0);
  const [editSheetOpen, setEditSheetOpen] = useState(false);
  const [availableCities, setAvailableCities] = useState([]);
  const [saving, setSaving] = useState(false);
  const [editForm, setEditForm] = useState({
    name: '',
    address: '',
    city: '',
  });

  useEffect(() => {
    const fetchStats = async () => {
      try {
        const res = await bookingAPI.getCustomerRedemptions();
        if (res && res.success) {
          setRedemptionCount(res.data.length);
        }
      } catch (err) {
        console.error('Failed to fetch profile stats:', err);
      }
    };
    fetchStats();
  }, []);

  useEffect(() => {
    const fetchCities = async () => {
      try {
        const response = await cityAPI.getAll();
        setAvailableCities(response.cities || []);
      } catch (error) {
        console.error('Failed to fetch cities:', error);
      }
    };
    fetchCities();
  }, []);

  // Initialize form when user data is available or sheet opens
  useEffect(() => {
    if (user && editSheetOpen) {
      setEditForm({
        name: user.name || '',
        address: user.address || '',
        city: user.city || '',
      });
    }
  }, [user, editSheetOpen]);

  const savedCount = user?.savedOffers?.length || 0;

  const handleCopyReferral = () => {
    navigator.clipboard.writeText(user?.referralCode || '');
    toast.success('Referral code copied!');
  };

  const handleLogout = () => {
    logout();
    navigate('/login');
  };

  const [detecting, setDetecting] = useState(false);
  const handleDetectAddress = async () => {
    if (!navigator.geolocation) {
      toast.error('Geolocation not supported');
      return;
    }

    try {
      setDetecting(true);
      navigator.geolocation.getCurrentPosition(async (position) => {
        const { latitude, longitude } = position.coords;
        try {
          const response = await axios.get(
            `https://nominatim.openstreetmap.org/reverse?format=json&lat=${latitude}&lon=${longitude}&zoom=18`
          );
          
          if (response.data && response.data.display_name) {
            setEditForm(prev => ({ ...prev, address: response.data.display_name }));
            toast.success('Location detected!');
          }
        } catch (error) {
          toast.error('Failed to fetch address details');
        } finally {
          setDetecting(false);
        }
      }, (error) => {
        toast.error('Location access denied');
        setDetecting(false);
      });
    } catch (err) {
      setDetecting(false);
    }
  };

  const handleEditProfile = () => {
    setEditSheetOpen(true);
  };

  const handleSaveProfile = async () => {
    // Validation
    if (!editForm.name.trim()) {
      toast.error('Name is required');
      return;
    }

    if (!editForm.city) {
      toast.error('Please select a city');
      return;
    }

    try {
      setSaving(true);
      const response = await userAPI.updateProfile({
        name: editForm.name.trim(),
        address: editForm.address.trim(),
        city: editForm.city,
      });

      if (response && response.user) {
        toast.success('Profile updated successfully!');
        await refreshUser(); // Refresh user data in context
        setEditSheetOpen(false);
      }
    } catch (error) {
      console.error('Failed to update profile:', error);
      toast.error(error.response?.data?.message || 'Failed to update profile');
    } finally {
      setSaving(false);
    }
  };

  return (
    <PageTransition>
      <div className="min-h-screen bg-[#F8F5FF] pb-24">
        
        {/* Profile Identity Strip - High Density */}
        <div className="px-5 pt-8 pb-12 relative overflow-hidden bg-white rounded-b-[3rem] shadow-[0_4px_24px_rgba(0,0,0,0.03)] border-b border-gray-100">
           {/* Abstract Decoration */}
           <div className="absolute top-0 right-0 w-32 h-32 bg-[#3D7A4F]/5 rounded-full -mr-16 -mt-16 blur-3xl" />
           
           <div className="flex items-center gap-5 relative z-10">
              <div className="w-20 h-20 bg-[#3D7A4F]/5 rounded-3xl flex items-center justify-center border-2 border-[#3D7A4F]/10 shadow-sm">
                <span className="text-[#3D7A4F] text-4xl font-black uppercase">
                  {user?.name?.charAt(0) || 'U'}
                </span>
              </div>
              <div className="flex-1">
                <p className="text-[10px] font-black text-gray-400 uppercase tracking-widest leading-none">Customer Identity</p>
                <h2 className="text-gray-900 font-black text-2xl uppercase tracking-tight mt-1">{user?.name}</h2>
                <div className="flex flex-col gap-1.5 mt-2">
                  <div className="flex items-center gap-1.5 bg-[#F8F5FF] w-fit px-2.5 py-1 rounded-lg border border-gray-100">
                    <LocationOnRoundedIcon sx={{ fontSize: 12 }} className="text-[#3D7A4F]" />
                    <span className="text-gray-600 text-[10px] font-black uppercase tracking-tight">{user?.city || 'Not Set'}</span>
                  </div>
                  {user?.address && (
                    <p className="text-[9px] font-bold text-gray-400 uppercase tracking-tight px-1 line-clamp-1 max-w-[200px]">
                      {user.address}
                    </p>
                  )}
                </div>
              </div>
              <motion.button
                whileTap={{ scale: 0.9 }}
                onClick={handleEditProfile}
                className="w-11 h-11 bg-white rounded-2xl flex items-center justify-center border border-gray-100 shadow-sm hover:shadow-md transition-all"
              >
                <EditRoundedIcon sx={{ fontSize: 18 }} className="text-gray-400" />
              </motion.button>
           </div>
        </div>

        <div className="px-5 -mt-6 relative z-20 space-y-4">
          
          {/* Quick Stats Ledger */}
          <div className="bg-white rounded-[2rem] p-4 shadow-[0_8px_30px_rgba(0,0,0,0.04)] border border-gray-50 grid grid-cols-3 gap-3">
             {[
               { label: 'Redeemed', value: redemptionCount, icon: ReceiptLongRoundedIcon },
               { label: 'Saved', value: savedCount, icon: BookmarkRoundedIcon },
               { label: 'Balance', value: `₹${user?.credits || 0}`, icon: AccountBalanceWalletRoundedIcon },
             ].map((stat) => (
               <div key={stat.label} className="text-center p-2 rounded-2xl hover:bg-gray-50 transition-colors">
                  <stat.icon sx={{ fontSize: 18 }} className="text-[#3D7A4F] mb-1.5 opacity-40" />
                  <p className="text-lg font-black text-gray-900 tracking-tighter leading-none">{stat.value}</p>
                  <p className="text-[8px] font-black text-gray-400 uppercase tracking-widest mt-1.5">{stat.label}</p>
               </div>
             ))}
          </div>

          {/* Referral Mini Terminal */}
          {user?.referralCode && (
            <div className="bg-[#3D7A4F] rounded-[2rem] p-5 flex items-center justify-between shadow-lg shadow-[#3D7A4F]/20 relative overflow-hidden">
               <div className="absolute top-0 right-0 w-24 h-24 bg-white/10 rounded-full blur-2xl -mr-12 -mt-12" />
               <div>
                  <p className="text-white/40 text-[8px] font-black uppercase tracking-widest">Growth Code</p>
                  <p className="text-white font-black text-lg tracking-[0.2em] mt-0.5 uppercase">{user.referralCode}</p>
               </div>
               <motion.button
                 whileTap={{ scale: 0.9 }}
                 onClick={handleCopyReferral}
                 className="w-10 h-10 bg-white rounded-xl flex items-center justify-center shadow-lg active:scale-95 transition-all"
               >
                 <ContentCopyRoundedIcon sx={{ fontSize: 16 }} className="text-[#3D7A4F]" />
               </motion.button>
            </div>
          )}

          {/* Menu Sections - Slim Strips */}
          {menuSections.map((section, sIdx) => (
            <div key={section.title} className="pt-2">
              <p className="text-[10px] font-black text-gray-400 uppercase tracking-widest mb-3 px-1">
                {section.title}
              </p>
              <div className="space-y-2">
                {section.items.map((item) => (
                  <motion.button
                    key={item.label}
                    whileTap={{ scale: 0.98 }}
                    onClick={() => item.path && navigate(item.path)}
                    className="w-full flex items-center gap-4 bg-white rounded-[1.25rem] p-3.5 border border-gray-50 shadow-sm active:shadow-none transition-all"
                  >
                    <div className="w-9 h-9 bg-[#F8F5FF] rounded-xl flex items-center justify-center flex-shrink-0">
                      <item.icon sx={{ fontSize: 18 }} className="text-gray-400" />
                    </div>
                    <span className="flex-1 text-[11px] font-black text-gray-800 uppercase tracking-tight text-left">
                      {item.label}
                    </span>
                    <ChevronRightRoundedIcon sx={{ fontSize: 16 }} className="text-gray-300" />
                  </motion.button>
                ))}
              </div>
            </div>
          ))}

          {/* Danger Zone */}
          <div className="pt-4">
            <motion.button
              whileTap={{ scale: 0.98 }}
              onClick={handleLogout}
              className="w-full flex items-center justify-center gap-2.5 bg-red-50 rounded-[1.5rem] p-4 border border-red-100 shadow-sm group"
            >
              <LogoutRoundedIcon sx={{ fontSize: 18 }} className="text-red-500 group-hover:rotate-12 transition-transform" />
              <span className="text-[11px] font-black text-red-500 uppercase tracking-widest">Terminate Session</span>
            </motion.button>
          </div>

          <p className="text-center text-[8px] font-black text-gray-300 uppercase tracking-[0.2em] mt-8 pb-4">
            Offerly Digital Network · v1.0.0
          </p>
        </div>
      </div>

      {/* Edit Profile Bottom Sheet */}
      <BottomSheet
        isOpen={editSheetOpen}
        onClose={() => setEditSheetOpen(false)}
        title="Edit Profile"
      >
        <div className="p-5 space-y-4 pb-8">
          {/* Name Field */}
          <div>
            <label className="block text-[10px] font-black text-gray-400 uppercase tracking-widest mb-2 px-1">
              Full Name
            </label>
            <input
              type="text"
              value={editForm.name}
              onChange={(e) => setEditForm({ ...editForm, name: e.target.value })}
              placeholder="Enter your name"
              className="w-full px-4 py-3.5 rounded-xl border border-gray-100 bg-[#F8F5FF]/50 focus:bg-white focus:border-[#3D7A4F] outline-none transition-all text-sm font-bold"
            />
          </div>

          <div>
            <div className="flex items-center justify-between mb-2 px-1">
              <label className="block text-[10px] font-black text-gray-400 uppercase tracking-widest">
                Complete Address
              </label>
              <button 
                onClick={handleDetectAddress}
                disabled={detecting}
                className="flex items-center gap-1 text-[9px] font-black text-[#3D7A4F] uppercase tracking-tighter bg-[#3D7A4F]/5 px-2 py-1 rounded-lg border border-[#3D7A4F]/10 active:scale-95 transition-all"
              >
                {detecting ? (
                  <div className="w-2.5 h-2.5 border border-[#3D7A4F]/30 border-t-[#3D7A4F] rounded-full animate-spin" />
                ) : (
                  <MyLocationRoundedIcon sx={{ fontSize: 10 }} />
                )}
                Set Current
              </button>
            </div>
            <textarea
              value={editForm.address}
              onChange={(e) => setEditForm({ ...editForm, address: e.target.value })}
              placeholder="House No, Building, Street, Area..."
              rows="3"
              className="w-full px-4 py-3.5 rounded-xl border border-gray-100 bg-[#F8F5FF]/50 focus:bg-white focus:border-[#3D7A4F] outline-none transition-all text-sm font-bold resize-none"
            />
          </div>

          {/* City Field */}
          <div>
            <label className="block text-[10px] font-black text-gray-400 uppercase tracking-widest mb-2 px-1">
              Operating City
            </label>
            <select
              value={editForm.city}
              onChange={(e) => setEditForm({ ...editForm, city: e.target.value })}
              className="w-full px-4 py-3.5 rounded-xl border border-gray-100 bg-white focus:border-[#3D7A4F] outline-none transition-all text-sm font-bold uppercase tracking-tight"
            >
              <option value="">Select City</option>
              {availableCities.map((city) => (
                <option key={city._id || city.id} value={city.name}>
                  {city.name}
                </option>
              ))}
            </select>
          </div>

          {/* Phone (Read-only) */}
          <div>
            <label className="block text-[10px] font-black text-gray-400 uppercase tracking-widest mb-2 px-1">
              Phone Number (Identity)
            </label>
            <input
              type="text"
              value={user?.phone || ''}
              disabled
              className="w-full px-4 py-3.5 rounded-xl border border-gray-100 bg-gray-50 text-sm font-bold text-gray-400 cursor-not-allowed"
            />
            <p className="text-[8px] font-black text-gray-300 uppercase tracking-widest mt-2 px-1">Primary identifier cannot be modified</p>
          </div>

          {/* Save Button */}
          <motion.button
            whileTap={{ scale: 0.98 }}
            onClick={handleSaveProfile}
            disabled={saving}
            className="w-full bg-[#3D7A4F] text-white font-black text-[11px] uppercase tracking-[0.2em] py-4 rounded-2xl shadow-lg shadow-[#3D7A4F]/20 active:scale-95 transition-all flex items-center justify-center gap-2 disabled:opacity-50"
          >
            {saving ? (
              <div className="w-5 h-5 border-2 border-white/30 border-t-white rounded-full animate-spin" />
            ) : (
              <>
                <SaveRoundedIcon sx={{ fontSize: 16 }} />
                Update Identity
              </>
            )}
          </motion.button>
        </div>
      </BottomSheet>
    </PageTransition>
  );
};

export default Profile;
