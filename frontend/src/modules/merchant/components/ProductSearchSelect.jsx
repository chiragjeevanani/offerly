import { useState, useEffect, useRef } from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import KeyboardArrowDownRoundedIcon from '@mui/icons-material/KeyboardArrowDownRounded';
import CheckCircleRoundedIcon from '@mui/icons-material/CheckCircleRounded';
import Inventory2RoundedIcon from '@mui/icons-material/Inventory2Rounded';
import { productAPI } from '../../../api/product.api';

const ProductSearchSelect = ({ onSelect, selectedProduct, filterType = 'product_based' }) => {
  const [products, setProducts] = useState([]);
  const [loading, setLoading] = useState(false);
  const [showDropdown, setShowDropdown] = useState(false);
  const dropdownRef = useRef(null);

  useEffect(() => {
    const handleClickOutside = (event) => {
      if (dropdownRef.current && !dropdownRef.current.contains(event.target)) {
        setShowDropdown(false);
      }
    };

    document.addEventListener('mousedown', handleClickOutside);
    return () => document.removeEventListener('mousedown', handleClickOutside);
  }, []);

  useEffect(() => {
    loadProducts();
  }, [filterType]);

  const loadProducts = async () => {
    setLoading(true);
    try {
      console.log('🚀 Loading products with filterType:', filterType);
      
      const response = await productAPI.getByMerchant('me');
      console.log('📡 API Response:', response);
      
      const allProducts = response.products || [];
      
      console.log('🔍 Total Products Found:', allProducts.length);
      console.log('🔍 Filter Type:', filterType);
      
      if (allProducts.length > 0) {
        console.log('🔍 Sample Product Structure:', allProducts[0]);
        console.log('🔍 All Products categoryType:', allProducts.map(p => ({
          id: p._id || p.id,
          name: p.name,
          categoryType: p.categoryType,
          category: p.category
        })));
      }
      
      // Filter based on categoryType
      const filtered = allProducts.filter(p => p.categoryType === filterType);
      
      console.log('✅ Filtered Products Count:', filtered.length);
      console.log('✅ Filtered Products:', filtered.map(p => p.name));
      
      // If no products match filter, show all products (fallback)
      if (filtered.length === 0 && allProducts.length > 0) {
        console.warn('⚠️ No products match filter, showing all products');
        setProducts(allProducts);
      } else {
        setProducts(filtered);
      }
    } catch (error) {
      console.error('❌ Load products error:', error);
      console.error('❌ Error details:', {
        message: error.message,
        response: error.response,
        stack: error.stack
      });
      setProducts([]);
    } finally {
      setLoading(false);
    }
  };

  const handleSelect = (product) => {
    onSelect(product);
    setShowDropdown(false);
  };

  const handleClear = () => {
    onSelect(null);
  };

  return (
    <div className="space-y-4">
      {/* Dropdown Select */}
      <div ref={dropdownRef} className="relative">
        <label className="merchant-label">
          Select {filterType === 'service_based' ? 'Service Plan' : 'Product'} *
        </label>
        <button
          type="button"
          onClick={() => !selectedProduct && setShowDropdown(!showDropdown)}
          disabled={!!selectedProduct || loading}
          className="w-full flex items-center justify-between px-4 py-3 bg-white border-2 border-gray-200 rounded-lg hover:border-primary/50 transition-colors text-left disabled:opacity-50 disabled:cursor-not-allowed"
        >
          <span className={selectedProduct ? 'text-gray-900 font-medium' : 'text-gray-400'}>
            {loading 
              ? `Loading ${filterType === 'service_based' ? 'service plans' : 'products'}...` 
              : selectedProduct 
                ? selectedProduct.name 
                : `Choose a ${filterType === 'service_based' ? 'service plan' : 'product'} from your catalogue`
            }
          </span>
          <KeyboardArrowDownRoundedIcon 
            className={`text-gray-400 transition-transform ${showDropdown ? 'rotate-180' : ''}`}
            sx={{ fontSize: 20 }} 
          />
        </button>

        {/* Dropdown Menu */}
        <AnimatePresence>
          {showDropdown && !selectedProduct && (
            <motion.div
              initial={{ opacity: 0, y: -10 }}
              animate={{ opacity: 1, y: 0 }}
              exit={{ opacity: 0, y: -10 }}
              className="absolute z-50 w-full mt-2 bg-white rounded-lg border-2 border-gray-100 shadow-xl max-h-80 overflow-y-auto"
            >
              {products.length === 0 ? (
                <div className="p-8 text-center">
                  <Inventory2RoundedIcon sx={{ fontSize: 48 }} className="text-gray-300 mb-2" />
                  <p className="text-sm text-gray-400 font-medium">
                    No {filterType === 'service_based' ? 'service plans' : 'products'} available
                  </p>
                  <p className="text-xs text-gray-300 mt-1">
                    Add {filterType === 'service_based' ? 'service plans' : 'products'} first to create offers
                  </p>
                </div>
              ) : (
                <div className="p-2">
                  {products.map((product) => (
                    <button
                      key={product.id || product._id}
                      type="button"
                      onClick={() => handleSelect(product)}
                      className="w-full flex items-center gap-4 p-3 rounded-lg hover:bg-gray-50 transition-colors text-left group"
                    >
                      {/* Product Image */}
                      <div className="w-12 h-12 bg-gray-100 rounded-lg overflow-hidden flex-shrink-0">
                        {product.images && product.images[0] ? (
                          <img 
                            src={product.images[0]} 
                            alt={product.name}
                            className="w-full h-full object-cover"
                          />
                        ) : (
                          <div className="w-full h-full flex items-center justify-center">
                            <Inventory2RoundedIcon sx={{ fontSize: 20 }} className="text-gray-300" />
                          </div>
                        )}
                      </div>

                      {/* Product Info */}
                      <div className="flex-1 min-w-0">
                        <h4 className="font-bold text-sm text-gray-900 group-hover:text-primary transition-colors truncate">
                          {product.name}
                        </h4>
                        <div className="flex items-center gap-2 mt-0.5">
                          <span className="text-sm font-mono font-bold text-gray-900">₹{product.offerPrice}</span>
                          {product.price > product.offerPrice && (
                            <>
                              <span className="text-xs text-gray-400 line-through">₹{product.price}</span>
                              <span className="text-xs font-bold text-green-600">{product.discount}% off</span>
                            </>
                          )}
                        </div>
                      </div>
                    </button>
                  ))}
                </div>
              )}
            </motion.div>
          )}
        </AnimatePresence>
      </div>

      {/* Selected Product Display */}
      {selectedProduct && (
        <motion.div
          initial={{ opacity: 0, scale: 0.95 }}
          animate={{ opacity: 1, scale: 1 }}
          className="bg-gradient-to-br from-primary/5 to-primary/10 rounded-lg border-2 border-primary/20 p-4"
        >
          <div className="flex items-center gap-2 mb-3">
            <CheckCircleRoundedIcon className="text-primary" sx={{ fontSize: 18 }} />
            <span className="text-xs font-bold text-primary uppercase tracking-wider">
              Selected {filterType === 'service_based' ? 'Service Plan' : 'Product'}
            </span>
          </div>

          <div className="flex items-center gap-4">
            {/* Product Image */}
            <div className="w-16 h-16 bg-white rounded-lg overflow-hidden flex-shrink-0 border-2 border-white shadow-md">
              {selectedProduct.images && selectedProduct.images[0] ? (
                <img 
                  src={selectedProduct.images[0]} 
                  alt={selectedProduct.name}
                  className="w-full h-full object-cover"
                />
              ) : (
                <div className="w-full h-full flex items-center justify-center bg-gray-50">
                  <Inventory2RoundedIcon sx={{ fontSize: 28 }} className="text-gray-300" />
                </div>
              )}
            </div>

            {/* Product Info */}
            <div className="flex-1 min-w-0">
              <h4 className="font-bold text-gray-900 text-base leading-tight truncate">
                {selectedProduct.name}
              </h4>
              <div className="flex items-center gap-2 mt-1">
                <span className="text-base font-mono font-bold text-gray-900">₹{selectedProduct.offerPrice}</span>
                {selectedProduct.price > selectedProduct.offerPrice && (
                  <span className="text-sm text-gray-400 line-through">₹{selectedProduct.price}</span>
                )}
              </div>
              {selectedProduct.category && (
                <span className="text-xs text-gray-500 mt-1 block">{selectedProduct.category}</span>
              )}
            </div>

            {/* Change Button */}
            <button
              type="button"
              onClick={handleClear}
              className="px-4 py-2 bg-white text-gray-600 rounded-lg text-xs font-bold uppercase tracking-wider hover:bg-gray-50 transition-colors border border-gray-200"
            >
              Change
            </button>
          </div>
        </motion.div>
      )}
    </div>
  );
};

export default ProductSearchSelect;
