import { memo } from 'react';
import { motion } from 'framer-motion';
import StorefrontRoundedIcon from '@mui/icons-material/StorefrontRounded';
import PlaceRoundedIcon from '@mui/icons-material/PlaceRounded';
import CheckCircleRoundedIcon from '@mui/icons-material/CheckCircleRounded';
import CancelRoundedIcon from '@mui/icons-material/CancelRounded';
import CategoryRoundedIcon from '@mui/icons-material/CategoryRounded';

const MerchantCard = ({ merchant, onApprove, onReject, onClick }) => {
  const handleCardClick = (e) => {
    // Don't trigger onClick if clicking on action buttons
    if (e.target.closest('.action-button')) {
      return;
    }
    onClick(merchant);
  };

  const handleApprove = (e) => {
    e.stopPropagation();
    onApprove(merchant.id);
  };

  const handleReject = (e) => {
    e.stopPropagation();
    onReject(merchant.id);
  };

  return (
    <motion.div
      initial={{ opacity: 0, y: 10 }}
      animate={{ opacity: 1, y: 0 }}
      className="bg-white rounded-3xl p-6 shadow-sm border border-gray-100 hover:shadow-lg hover:border-primary/20 transition-all cursor-pointer group"
      onClick={handleCardClick}
      role="article"
      aria-label={`Merchant: ${merchant.storeName}`}
    >
      <div className="flex flex-col md:flex-row items-start md:items-center justify-between gap-6">
        {/* Left Side - Profile Information */}
        <div className="flex items-start gap-4 flex-1">
          {/* Profile Image */}
          <div className="w-20 h-20 rounded-2xl overflow-hidden bg-gradient-to-br from-gray-50 to-gray-100 border-2 border-gray-200 flex-shrink-0 shadow-sm">
            <img 
              src={merchant.logo || 'https://images.unsplash.com/photo-1555396273-367ea4eb4db5?w=200&q=80'} 
              alt={`${merchant.storeName} logo`}
              className="w-full h-full object-cover"
            />
          </div>

          {/* Merchant Details */}
          <div className="flex-1 min-w-0">
            {/* Store Name */}
            <h3 className="text-xl font-black text-gray-900 group-hover:text-primary transition-colors leading-tight mb-2">
              {merchant.storeName}
            </h3>

            {/* Location */}
            <div className="flex items-center gap-2 text-sm text-gray-600 mb-2">
              <PlaceRoundedIcon sx={{ fontSize: 16 }} className="text-gray-400" aria-hidden="true" />
              <span className="font-semibold">{merchant.locality}, {merchant.city}</span>
            </div>

            {/* Category */}
            <div className="flex items-center gap-2 text-sm text-gray-600 mb-3">
              <CategoryRoundedIcon sx={{ fontSize: 16 }} className="text-gray-400" aria-hidden="true" />
              <span className="font-semibold">{merchant.category}</span>
            </div>

            {/* Status Badge */}
            <span 
              className={`inline-flex items-center px-3 py-1.5 rounded-full text-xs font-black uppercase tracking-widest ${
                merchant.status === 'pending' 
                  ? 'bg-amber-50 text-amber-700 border-2 border-amber-200' 
                  : merchant.status === 'approved'
                  ? 'bg-green-50 text-green-700 border-2 border-green-200'
                  : 'bg-red-50 text-red-700 border-2 border-red-200'
              }`}
              role="status"
              aria-label={`Status: ${merchant.status}`}
            >
              {merchant.status}
            </span>
          </div>
        </div>

        {/* Right Side - Action Buttons */}
        <div className="flex flex-row md:flex-col gap-3 w-full md:w-auto">
          <button
            onClick={handleApprove}
            className="action-button flex-1 md:flex-none flex items-center justify-center gap-2 bg-gradient-to-r from-green-600 to-green-700 hover:from-green-700 hover:to-green-800 text-white px-8 py-3.5 rounded-2xl font-bold transition-all shadow-lg shadow-green-600/25 hover:shadow-xl hover:shadow-green-600/30 hover:scale-[1.02] active:scale-95 focus:outline-none focus:ring-2 focus:ring-green-500 focus:ring-offset-2"
            aria-label={`Accept ${merchant.storeName}`}
          >
            <CheckCircleRoundedIcon sx={{ fontSize: 20 }} aria-hidden="true" />
            <span className="text-sm uppercase tracking-wider">Accept</span>
          </button>
          <button
            onClick={handleReject}
            className="action-button flex-1 md:flex-none flex items-center justify-center gap-2 bg-white hover:bg-gray-50 text-gray-700 border-2 border-gray-300 hover:border-gray-400 px-8 py-3.5 rounded-2xl font-bold transition-all shadow-sm hover:shadow-md hover:scale-[1.02] active:scale-95 focus:outline-none focus:ring-2 focus:ring-gray-400 focus:ring-offset-2"
            aria-label={`Reject ${merchant.storeName}`}
          >
            <CancelRoundedIcon sx={{ fontSize: 20 }} aria-hidden="true" />
            <span className="text-sm uppercase tracking-wider">Reject</span>
          </button>
        </div>
      </div>
    </motion.div>
  );
};

export default memo(MerchantCard);
