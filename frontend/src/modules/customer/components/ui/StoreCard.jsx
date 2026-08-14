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
        <div className="w-10 h-10 rounded-xl overflow-hidden bg-primary-50 border border-gray-100 flex-shrink-0 flex items-center justify-center">
          {merchant.logo ? (
            <img 
              src={merchant.logo} 
              alt={merchant.storeName} 
              className="w-full h-full object-cover"
              onError={(e) => {
                e.currentTarget.style.display = 'none';
                if (e.currentTarget.nextElementSibling) {
                  e.currentTarget.nextElementSibling.style.display = 'flex';
                }
              }}
            />
          ) : null}
          <span 
            style={{ display: merchant.logo ? 'none' : 'flex' }}
            className="w-full h-full items-center justify-center text-base font-bold text-primary"
          >
            {merchant.storeName?.charAt(0) || 'O'}
          </span>
        </div>

        <div className="flex-1 min-w-0">
          <div className="flex items-center gap-1.5">
            <span className="text-sm font-semibold text-gray-900 truncate">{merchant.storeName}</span>
            {merchant.verified && (
              <VerifiedRoundedIcon sx={{ fontSize: 13 }} className="text-blue-500 flex-shrink-0" />
            )}
          </div>
          
          <div className="flex items-center gap-2 mt-0.5">
            <p className="text-xs font-normal text-gray-500 capitalize">{merchant.category}</p>
            <div className="w-1 h-1 bg-gray-300 rounded-full" />
            <div className="flex items-center gap-0.5">
              <StarRoundedIcon sx={{ fontSize: 13 }} className="text-amber-400" />
              <span className="text-xs font-medium text-gray-600">{merchant.avgRating || '4.5'}</span>
            </div>
          </div>
        </div>

        <div className="flex items-center gap-2">
           {offerCount !== undefined && offerCount > 0 ? (
              <div className="bg-primary-50 border border-primary/20 px-2.5 py-1 rounded-full">
                 <span className="text-xs font-semibold text-primary">{offerCount} {offerCount === 1 ? 'Offer' : 'Offers'}</span>
              </div>
            ) : null}
           <ChevronRightRoundedIcon sx={{ fontSize: 18 }} className="text-gray-300 flex-shrink-0" />
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
      <div className="h-24 relative overflow-hidden bg-gray-100">
        <img
          src={merchant.coverImage || 'https://images.unsplash.com/photo-1555396273-367ea4eb4db5?w=500&auto=format&fit=crop&q=60'}
          alt={merchant.storeName}
          className="w-full h-full object-cover transition-transform group-hover:scale-105"
          loading="lazy"
          onError={(e) => {
            e.currentTarget.src = 'https://images.unsplash.com/photo-1555396273-367ea4eb4db5?w=500&auto=format&fit=crop&q=60';
          }}
        />
        {offerCount !== undefined && offerCount > 0 && (
          <span className="absolute bottom-2 right-2 bg-primary/95 backdrop-blur-md text-white text-[10px] font-semibold px-2 py-0.5 rounded-md shadow-md">
            {offerCount} {offerCount === 1 ? 'Offer' : 'Offers'}
          </span>
        )}
      </div>
      <div className="p-3 space-y-1">
        <p className="text-xs font-semibold text-gray-900 truncate">{merchant.storeName}</p>
        <div className="flex items-center justify-between">
           <p className="text-[11px] font-normal text-gray-500 capitalize">{merchant.category}</p>
           <div className="flex items-center gap-0.5">
              <StarRoundedIcon sx={{ fontSize: 13 }} className="text-amber-400" />
              <span className="text-xs font-medium text-gray-700">{merchant.avgRating || '4.5'}</span>
           </div>
        </div>
      </div>
    </motion.div>
  );
};

export default StoreCard;
