import React, { useState } from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import KeyboardArrowDownRoundedIcon from '@mui/icons-material/KeyboardArrowDownRounded';
import VisibilityRoundedIcon from '@mui/icons-material/VisibilityRounded';
import BlockRoundedIcon from '@mui/icons-material/BlockRounded';
import CheckCircleRoundedIcon from '@mui/icons-material/CheckCircleRounded';
import StarRoundedIcon from '@mui/icons-material/StarRounded';
import EventAvailableRoundedIcon from '@mui/icons-material/EventAvailableRounded';
import CancelRoundedIcon from '@mui/icons-material/CancelRounded';
import HistoryRoundedIcon from '@mui/icons-material/HistoryRounded';
import TimerRoundedIcon from '@mui/icons-material/TimerRounded';
import PaymentsRoundedIcon from '@mui/icons-material/PaymentsRounded';
import PlaceRoundedIcon from '@mui/icons-material/PlaceRounded';
import LocalPhoneRoundedIcon from '@mui/icons-material/LocalPhoneRounded';
import ChevronRightRoundedIcon from '@mui/icons-material/ChevronRightRounded';
import { getOptimizedImageUrl } from '../../../utils/cloudinaryUtils';

const StatBox = ({ icon: Icon, label, value, colorClass = "text-gray-900" }) => (
  <div className="flex flex-col gap-0.5 p-1.5 rounded-lg bg-gray-50/50 border border-transparent hover:border-gray-100 hover:bg-white transition-all duration-300 group/stat">
    <div className="flex items-center gap-1 text-[8px] font-bold text-gray-400 uppercase tracking-widest group-hover/stat:text-primary transition-colors">
      <Icon sx={{ fontSize: 10 }} className="opacity-70" />
      {label}
    </div>
    <div className={`text-xs font-bold tracking-tight ${colorClass}`}>
      {value === '0' || value === '0.0' || value === '0%' ? (
        <span className="text-gray-300 font-medium">--</span>
      ) : value}
    </div>
  </div>
);

const AdminEntityCard = ({ 
  entity, 
  type = 'merchant', // or 'customer'
  onView, 
  onStatusToggle 
}) => {
  const isMerchant = type === 'merchant';
  const name = isMerchant ? entity.storeName : entity.name;
  const ownerName = isMerchant ? entity.ownerName : null;
  const subtext = entity.phone;
  const location = isMerchant ? `${entity.locality || ''} ${entity.city || ''}` : entity.city || 'N/A';
  const status = entity.status || 'active';
  
  // Dynamic stats based on entity type
  const stats = isMerchant ? [
    { icon: StarRoundedIcon, label: 'Rating', value: entity.avgRating || '0.0', color: 'text-amber-600' },
    { icon: EventAvailableRoundedIcon, label: 'Bookings', value: entity.totalRedemptions || '0', color: 'text-primary' },
  ] : [
    { icon: EventAvailableRoundedIcon, label: 'Redemptions', value: entity.redemptionsCount || '0', color: 'text-primary' },
  ];

  const profileImg = entity.logo || entity.logoUrl || entity.profilePhoto;

  const [isExpanded, setIsExpanded] = useState(false);

  return (
    <motion.div
      initial={{ opacity: 0, y: 15 }}
      animate={{ opacity: 1, y: 0 }}
      whileHover={{ y: -4 }}
      transition={{ duration: 0.4, ease: "easeOut" }}
      className="group"
    >
      {/* Desktop Card (Original Design Refined) */}
      <div className="hidden lg:block bg-white border border-gray-100 rounded-[12px] p-2 shadow-sm hover:shadow-md hover:border-[#5EB929]/20 transition-all duration-300 relative overflow-hidden">
        <div className="absolute top-0 right-0 w-24 h-24 bg-[#5EB929]/5 rounded-full blur-2xl -translate-y-1/2 translate-x-1/2 opacity-0 group-hover:opacity-100 transition-opacity duration-500" />

        <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4 relative z-10">
          <div className="flex items-center gap-4">
            <div className="relative">
              <div className="w-12 h-12 rounded-[10px] bg-gray-50 flex items-center justify-center text-[#5EB929] font-semibold text-xl border border-gray-100 group-hover:scale-105 transition-all duration-300 overflow-hidden">
                {profileImg ? (
                  <img src={getOptimizedImageUrl(profileImg, 100, 100)} alt="" className="w-full h-full object-cover" />
                ) : (
                  name?.[0]?.toUpperCase()
                )}
              </div>
              <div className={`absolute -bottom-1 -right-1 w-4 h-4 rounded-full border-2 border-white flex items-center justify-center shadow-sm ${
                status === 'approved' || status === 'active' ? 'bg-green-500' : 'bg-amber-500'
              }`}>
                {status === 'approved' || status === 'active' ? (
                  <CheckCircleRoundedIcon sx={{ fontSize: 8 }} className="text-white" />
                ) : (
                  <HistoryRoundedIcon sx={{ fontSize: 8 }} className="text-white" />
                )}
              </div>
            </div>

            <div>
              <div className="flex flex-wrap items-center gap-2 mb-0.5">
                <h3 className="text-gray-800 font-semibold text-[16px] leading-tight tracking-tight group-hover:text-[#5EB929] transition-colors">
                  {name}
                </h3>
                {ownerName && (
                  <span className="text-[9px] font-medium text-[#5EB929] bg-[#5EB929]/5 px-2 py-0.5 rounded-full border border-[#5EB929]/10 uppercase tracking-widest">
                    {ownerName}
                  </span>
                )}
              </div>
              
              <div className="flex flex-wrap items-center gap-x-3 gap-y-1">
                <div className="flex items-center gap-1 text-gray-400 font-medium text-[10px] uppercase tracking-wider">
                  <LocalPhoneRoundedIcon sx={{ fontSize: 12 }} />
                  <span className="text-gray-500">{subtext}</span>
                </div>
                <div className="flex items-center gap-1 text-gray-400 font-medium text-[10px] uppercase tracking-wider">
                  <PlaceRoundedIcon sx={{ fontSize: 12 }} />
                  <span className="text-gray-500">{location}</span>
                </div>
              </div>
            </div>
          </div>

          <div className="flex items-center gap-2 self-end sm:self-center">
            <button 
              onClick={() => setIsExpanded(!isExpanded)}
              className={`p-2 rounded-lg transition-all ${isExpanded ? 'bg-[#5EB929]/10 text-[#5EB929]' : 'bg-gray-50 text-gray-400 hover:bg-gray-100'}`}
            >
              <KeyboardArrowDownRoundedIcon className={`transition-transform duration-300 ${isExpanded ? 'rotate-180' : ''}`} />
            </button>
            <button 
              onClick={() => onView(entity)}
              className="flex items-center gap-2 px-3 py-1.5 rounded-[10px] bg-gray-50 text-gray-600 hover:bg-[#5EB929] hover:text-white transition-all duration-300 border border-gray-100 font-medium text-[11px] shadow-sm"
            >
              <VisibilityRoundedIcon sx={{ fontSize: 14 }} />
              View Profile
            </button>
            <button 
              onClick={() => onStatusToggle(entity)}
              className="flex items-center gap-2 px-3 py-1.5 rounded-[10px] bg-white text-red-500 border border-red-100 hover:border-red-200 hover:bg-red-50 hover:text-red-600 transition-all duration-300 font-medium text-[11px] shadow-sm"
            >
              <BlockRoundedIcon sx={{ fontSize: 14 }} />
              {isMerchant ? 'Restrict' : 'Suspend'}
            </button>
          </div>
        </div>

        <AnimatePresence>
          {isExpanded && (
            <motion.div 
              initial={{ height: 0, opacity: 0, marginTop: 0 }}
              animate={{ height: 'auto', opacity: 1, marginTop: 16 }}
              exit={{ height: 0, opacity: 0, marginTop: 0 }}
              transition={{ duration: 0.3 }}
              className="overflow-hidden"
            >
              <div className="grid grid-cols-2 gap-2 p-2 bg-gray-50/50 rounded-lg border border-gray-100">
                {stats.map((stat, idx) => (
                  <StatBox key={idx} {...stat} colorClass={stat.color} />
                ))}
              </div>
            </motion.div>
          )}
        </AnimatePresence>
      </div>

      {/* Mobile Card (As per client image) */}
      <div 
        onClick={() => onView(entity)}
        className="lg:hidden bg-white rounded-xl p-2.5 border border-gray-100 shadow-sm active:scale-[0.98] transition-all relative flex flex-col gap-1.5"
      >
        <div className="flex items-start justify-between">
          <div className="flex gap-3">
            {/* Circular Icon */}
            <div className="w-11 h-11 rounded-full bg-gray-100 flex items-center justify-center border border-gray-200 overflow-hidden flex-shrink-0">
              {profileImg ? (
                <img src={getOptimizedImageUrl(profileImg, 80, 80)} alt="" className="w-full h-full object-cover" />
              ) : (
                <span className="text-gray-400 font-bold text-lg">{name?.[0]?.toUpperCase()}</span>
              )}
            </div>
            {/* Details */}
            <div className="flex flex-col">
              <h4 className="text-[14px] font-semibold text-gray-800 leading-tight">{name}</h4>
              <p className="text-[11px] text-gray-500 mt-0.5">{entity.category || 'Business'} • {entity.city || 'Location'}</p>
              <p className="text-[11px] text-gray-400 font-medium leading-none mt-1">{subtext}</p>
            </div>
          </div>

          <div className="flex flex-col items-end gap-1">
            <div className="flex items-center gap-1">
              <span className={`px-2 py-0.5 rounded-full text-[9px] font-bold uppercase tracking-wider ${
                status === 'pending' ? 'bg-amber-50 text-amber-600' : 'bg-green-50 text-green-600'
              }`}>
                {status === 'pending' ? 'Pending' : 'Active'}
              </span>
              <ChevronRightRoundedIcon sx={{ fontSize: 16 }} className="text-gray-400" />
            </div>
            <span className="text-[9px] text-gray-400 font-bold uppercase tracking-tight">
              {status === 'pending' ? (
                `Pend: ${Math.max(1, Math.floor((new Date() - new Date(entity.createdAt)) / (1000 * 60 * 60 * 24)))}d`
              ) : (
                `${Math.max(0, Math.floor((new Date() - new Date(entity.joinedAt || entity.createdAt)) / (1000 * 60 * 60 * 24 * 30)))} Months`
              )}
            </span>
          </div>
        </div>
      </div>
    </motion.div>
  );
};

export default AdminEntityCard;
