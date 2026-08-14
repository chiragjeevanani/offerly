import { useState, useEffect } from 'react';
import { motion } from 'framer-motion';
import CheckCircleRoundedIcon from '@mui/icons-material/CheckCircleRounded';
import { variantAPI } from '../../../api/variant.api';

const VariantSelector = ({ 
  productId, 
  selectedVariantId, 
  onSelect, 
  applyToAll = false,
  onApplyToAllChange 
}) => {
  const [variants, setVariants] = useState([]);
  const [loading, setLoading] = useState(false);

  useEffect(() => {
    if (productId) {
      loadVariants();
    }
  }, [productId]);

  const loadVariants = async () => {
    setLoading(true);
    try {
      const response = await variantAPI.getByProduct(productId);
      setVariants(response.variants || []);
    } catch (error) {
      console.error('Load variants error:', error);
      setVariants([]);
    } finally {
      setLoading(false);
    }
  };

  if (loading) {
    return (
      <div className="py-8 text-center">
        <div className="w-8 h-8 border-2 border-primary/30 border-t-primary rounded-full animate-spin mx-auto mb-3" />
        <p className="text-sm text-gray-400 font-medium">Loading variants...</p>
      </div>
    );
  }

  if (!variants || variants.length === 0) {
    return null; // Don't show anything if no variants
  }

  return (
    <div className="space-y-4">
      <label className="merchant-label">Select Variant</label>

      {/* Apply to All Toggle */}
      <div className="flex items-center gap-3 p-4 bg-blue-50 border border-blue-100 rounded-2xl">
        <input
          type="checkbox"
          id="applyToAll"
          checked={applyToAll}
          onChange={(e) => onApplyToAllChange(e.target.checked)}
          className="w-5 h-5 rounded border-gray-300 text-primary focus:ring-primary"
        />
        <label htmlFor="applyToAll" className="text-sm font-bold text-blue-900 cursor-pointer flex-1">
          Apply offer to ALL variants
        </label>
      </div>

      {/* Variant Grid */}
      {!applyToAll && (
        <div className="grid grid-cols-2 md:grid-cols-3 gap-3">
          {variants.map((variant) => {
            const isSelected = selectedVariantId === variant._id;
            
            return (
              <motion.button
                key={variant._id}
                type="button"
                onClick={() => onSelect(variant._id)}
                whileHover={{ scale: 1.02 }}
                whileTap={{ scale: 0.98 }}
                className={`relative p-4 rounded-xl border-2 transition-all text-left ${
                  isSelected
                    ? 'border-primary bg-primary/5 shadow-lg shadow-primary/20'
                    : 'border-gray-200 bg-white hover:border-gray-300 hover:shadow-md'
                }`}
              >
                {/* Selected Indicator */}
                {isSelected && (
                  <div className="absolute -top-2 -right-2 w-6 h-6 bg-primary rounded-full flex items-center justify-center shadow-lg">
                    <CheckCircleRoundedIcon sx={{ fontSize: 16 }} className="text-white" />
                  </div>
                )}

                {/* Variant Name */}
                <h4 className={`font-bold text-sm mb-2 ${isSelected ? 'text-primary' : 'text-gray-900'}`}>
                  {variant.name}
                </h4>

                {/* Pricing */}
                <div className="space-y-1">
                  <div className="flex items-baseline gap-2">
                    <span className="text-lg font-mono font-bold text-gray-900">
                      ₹{variant.offerPrice}
                    </span>
                    {variant.price > variant.offerPrice && (
                      <span className="text-xs text-gray-400 line-through">
                        ₹{variant.price}
                      </span>
                    )}
                  </div>
                  
                  {variant.discount > 0 && (
                    <span className="inline-block text-[10px] font-bold text-green-600 bg-green-50 px-2 py-0.5 rounded-md">
                      {variant.discount}% OFF
                    </span>
                  )}
                </div>

                {/* Stock Info */}
                {variant.stock !== undefined && (
                  <div className="mt-2 pt-2 border-t border-gray-100">
                    <span className="text-xs text-gray-400">
                      Stock: <span className="font-bold text-gray-600">{variant.stock}</span>
                    </span>
                  </div>
                )}
              </motion.button>
            );
          })}
        </div>
      )}

      {/* All Variants Applied Message */}
      {applyToAll && (
        <motion.div
          initial={{ opacity: 0, scale: 0.95 }}
          animate={{ opacity: 1, scale: 1 }}
          className="bg-gradient-to-br from-primary/5 to-primary/10 rounded-2xl border-2 border-primary/20 p-5 text-center"
        >
          <CheckCircleRoundedIcon className="text-primary mb-2" sx={{ fontSize: 32 }} />
          <p className="text-sm font-bold text-primary">
            Offer will apply to all {variants.length} variant{variants.length > 1 ? 's' : ''}
          </p>
          <p className="text-xs text-gray-600 mt-1">
            Customers can choose any variant at the offer price
          </p>
        </motion.div>
      )}
    </div>
  );
};

export default VariantSelector;
