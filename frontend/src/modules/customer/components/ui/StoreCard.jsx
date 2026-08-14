import { useNavigate } from 'react-router-dom';
import { motion } from 'framer-motion';
import LocationOnRoundedIcon from '@mui/icons-material/LocationOnRounded';
import StarRoundedIcon from '@mui/icons-material/StarRounded';
import VerifiedRoundedIcon from '@mui/icons-material/VerifiedRounded';
import ChevronRightRoundedIcon from '@mui/icons-material/ChevronRightRounded';

const StoreCard = ({ merchant, offerCount, variant = 'row' }) => {
  const navigate = useNavigate();
  const merchantId = merchant._id || merchant.id;

  if (variant === 'row') {
    return (
      <motion.div
        whileTap={{ scale: 0.98 }}
        onClick={() => navigate(`/store/${merchantId}`)}
        className="flex items-center gap-3 bg-white border border-gray-100 rounded-2xl p-2 cursor-pointer shadow-sm active:bg-gray-50 transition-colors"
      >
        {/* Store logo / category icon */}
        <div className="w-10 h-10 rounded-xl overflow-hidden bg-[#F8F5FF] border border-gray-100 flex-shrink-0 flex items-center justify-center">
          {merchant.logo ? (
            <img src={merchant.logo} alt={merchant.storeName} className="w-full h-full object-cover" />
          ) : (
            <span className="text-base font-black text-[#3D7A4F]">{merchant.storeName.charAt(0)}</span>
          )}
        </div>

        <div className="flex-1 min-w-0">
          <div className="flex items-center gap-1.5">
            <span className="text-[11px] font-black text-gray-900 uppercase tracking-tight truncate">{merchant.storeName}</span>
            {merchant.verified && (
              <VerifiedRoundedIcon sx={{ fontSize: 10 }} className="text-blue-500 flex-shrink-0" />
            )}
          </div>
          
          <div className="flex items-center gap-2 mt-0.5">
            <p className="text-[8px] font-bold text-gray-400 uppercase tracking-widest">{merchant.category}</p>
            <div className="w-1 h-1 bg-gray-200 rounded-full" />
            <div className="flex items-center gap-0.5">
              <StarRoundedIcon sx={{ fontSize: 9 }} className="text-amber-400" />
              <span className="text-[8px] font-black text-gray-400">{merchant.avgRating}</span>
            </div>
          </div>
        </div>

        <div className="flex items-center gap-3">
           {offerCount !== undefined && (
              <div className="bg-[#3D7A4F]/10 px-2 py-0.5 rounded-md">
                 <span className="text-[9px] font-black text-[#3D7A4F] uppercase tracking-tighter">{offerCount} ON</span>
              </div>
            )}
           <ChevronRightRoundedIcon sx={{ fontSize: 14 }} className="text-gray-300 flex-shrink-0" />
        </div>
      </motion.div>
    );
  }

  // Card (vertical) variant
  return (
    <motion.div
      whileTap={{ scale: 0.97 }}
      onClick={() => navigate(`/store/${merchantId}`)}
      className="bg-white rounded-2xl border border-gray-100 shadow-sm overflow-hidden cursor-pointer w-40 flex-shrink-0 active:bg-gray-50 transition-colors"
    >
      <div className="h-24 relative overflow-hidden">
        <img
          src={merchant.coverImage}
          alt={merchant.storeName}
          className="w-full h-full object-cover transition-transform group-hover:scale-105"
          loading="lazy"
        />
        {offerCount !== undefined && (
          <span className="absolute bottom-2 right-2 bg-[#3D7A4F]/90 backdrop-blur-md text-white text-[8px] font-black px-1.5 py-0.5 rounded-md uppercase tracking-widest shadow-lg">
            {offerCount} Offers
          </span>
        )}
      </div>
      <div className="p-2.5 space-y-1">
        <p className="text-[11px] font-black text-gray-900 uppercase tracking-tight truncate">{merchant.storeName}</p>
        <div className="flex items-center justify-between">
           <p className="text-[8px] font-bold text-gray-400 uppercase tracking-widest">{merchant.category}</p>
           <div className="flex items-center gap-0.5">
              <StarRoundedIcon sx={{ fontSize: 10 }} className="text-amber-400" />
              <span className="text-[9px] font-black text-gray-400">{merchant.avgRating}</span>
           </div>
        </div>
      </div>
    </motion.div>
  );
};

export default StoreCard;
