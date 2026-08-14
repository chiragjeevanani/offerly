import { motion } from 'framer-motion';
import StorefrontRoundedIcon from '@mui/icons-material/StorefrontRounded';
import CalendarMonthRoundedIcon from '@mui/icons-material/CalendarMonthRounded';
import EventAvailableRoundedIcon from '@mui/icons-material/EventAvailableRounded';
import CheckCircleRoundedIcon from '@mui/icons-material/CheckCircleRounded';

const OfferPreviewCard = ({ 
  offerData, 
  merchant, 
  offerType = 'product' 
}) => {
  const {
    title = 'Offer Title',
    description = '',
    discountType = 'percentage',
    discountValue = 0,
    validTo = new Date(),
    maxRedemptions = 100,
    image = '',
    // Product specific
    productName = '',
    productPrice = 0,
    // Service specific
    duration = '',
    inclusions = [],
    bookingRequired = false
  } = offerData || {};

  // Calculate offer price
  const calculateOfferPrice = () => {
    if (!productPrice || !discountValue) return 0;
    
    if (discountType === 'percentage') {
      return Math.round(productPrice - (productPrice * discountValue / 100));
    } else if (discountType === 'flat') {
      return Math.max(0, productPrice - discountValue);
    } else if (discountType === 'fixed') {
      return discountValue;
    }
    return productPrice;
  };

  const offerPrice = calculateOfferPrice();
  const savings = productPrice - offerPrice;

  const formatDate = (date) => {
    if (!date) return 'N/A';
    const d = new Date(date);
    return d.toLocaleDateString('en-US', { month: 'short', day: 'numeric', year: 'numeric' });
  };

  const getDiscountBadge = () => {
    if (discountType === 'percentage') {
      return `${discountValue}% OFF`;
    } else if (discountType === 'flat') {
      return `₹${discountValue} OFF`;
    } else if (discountType === 'fixed') {
      return `AT ₹${discountValue}`;
    }
    return 'OFFER';
  };

  return (
    <div className="space-y-3">
      <div className="flex items-center gap-2 text-xs font-bold text-gray-400 uppercase tracking-widest">
        <div className="w-2 h-2 bg-primary rounded-full animate-pulse" />
        Live Preview
      </div>

      <motion.div
        initial={{ opacity: 0, scale: 0.95 }}
        animate={{ opacity: 1, scale: 1 }}
        className="bg-white rounded-2xl border-2 border-gray-100 shadow-[0_8px_30px_rgba(0,0,0,0.08)] overflow-hidden"
      >
        {/* Image Section */}
        <div className="relative h-48 bg-gradient-to-br from-gray-100 to-gray-50">
          {image ? (
            <img src={image} alt="" className="w-full h-full object-cover" />
          ) : (
            <div className="w-full h-full flex items-center justify-center">
              <StorefrontRoundedIcon sx={{ fontSize: 64 }} className="text-gray-300" />
            </div>
          )}
          
          {/* Discount Badge */}
          <div className="absolute top-4 left-4 bg-primary text-white px-4 py-2 rounded-xl font-bold text-sm shadow-lg">
            {getDiscountBadge()}
          </div>

          {/* Store Logo */}
          {merchant?.logo && (
            <div className="absolute bottom-4 left-4 w-14 h-14 bg-white rounded-xl border-2 border-white shadow-lg overflow-hidden">
              <img src={merchant.logo} alt="" className="w-full h-full object-cover" />
            </div>
          )}
        </div>

        {/* Content Section */}
        <div className="p-5 space-y-4">
          {/* Store Name */}
          <div className="flex items-center gap-2">
            <span className="text-xs font-bold text-gray-400 uppercase tracking-widest">
              {merchant?.storeName || 'Your Store'}
            </span>
            {merchant?.category && (
              <span className="text-xs text-gray-300">•</span>
            )}
            {merchant?.category && (
              <span className="text-xs text-gray-400">{merchant.category}</span>
            )}
          </div>

          {/* Offer Title */}
          <h3 className="text-xl font-bold text-gray-900 leading-tight">
            {title || (offerType === 'product' ? productName : 'Service Offer')}
          </h3>

          {/* Description */}
          {description && (
            <p className="text-sm text-gray-600 leading-relaxed line-clamp-2">
              {description}
            </p>
          )}

          {/* Product Pricing */}
          {offerType === 'product' && productPrice > 0 && (
            <div className="flex items-baseline gap-3">
              <span className="text-3xl font-bold text-primary">₹{offerPrice}</span>
              {savings > 0 && (
                <>
                  <span className="text-lg text-gray-400 line-through">₹{productPrice}</span>
                  <span className="text-sm font-bold text-green-600">Save ₹{savings}</span>
                </>
              )}
            </div>
          )}

          {/* Service Details */}
          {offerType === 'service' && (
            <div className="space-y-3">
              {duration && (
                <div className="flex items-center gap-2 text-sm text-gray-600">
                  <CalendarMonthRoundedIcon sx={{ fontSize: 16 }} className="text-primary" />
                  <span className="font-medium">{duration}</span>
                </div>
              )}

              {inclusions && inclusions.length > 0 && (
                <div className="space-y-1.5">
                  {inclusions.slice(0, 3).map((item, idx) => (
                    item && (
                      <div key={idx} className="flex items-center gap-2 text-sm text-gray-600">
                        <CheckCircleRoundedIcon sx={{ fontSize: 14 }} className="text-green-500" />
                        <span>{item}</span>
                      </div>
                    )
                  ))}
                  {inclusions.length > 3 && (
                    <span className="text-xs text-gray-400 ml-5">+{inclusions.length - 3} more</span>
                  )}
                </div>
              )}

              {bookingRequired && (
                <div className="flex items-center gap-2 px-3 py-2 bg-blue-50 rounded-lg">
                  <EventAvailableRoundedIcon sx={{ fontSize: 16 }} className="text-blue-600" />
                  <span className="text-xs font-bold text-blue-600 uppercase tracking-wider">
                    Booking Required
                  </span>
                </div>
              )}
            </div>
          )}

          {/* Footer Info */}
          <div className="pt-4 border-t border-gray-100 flex items-center justify-between text-xs">
            <div className="flex items-center gap-1.5 text-gray-400">
              <CalendarMonthRoundedIcon sx={{ fontSize: 14 }} />
              <span>Valid till {formatDate(validTo)}</span>
            </div>
            {maxRedemptions > 0 && (
              <span className="text-gray-400">{maxRedemptions} claims</span>
            )}
          </div>
        </div>
      </motion.div>
    </div>
  );
};

export default OfferPreviewCard;
