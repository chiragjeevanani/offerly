import { useState } from 'react';
import { useNavigate } from 'react-router-dom';
import { motion, AnimatePresence } from 'framer-motion';
import { toast } from 'react-hot-toast';
import ShoppingCartRoundedIcon from '@mui/icons-material/ShoppingCartRounded';
import ArrowForwardRoundedIcon from '@mui/icons-material/ArrowForwardRounded';
import { cartAPI } from '../../../api/cart.api';
import VariantPickerSheet from '../components/ui/VariantPickerSheet';
import ConfirmDialog from '../../../components/ui/ConfirmDialog';

export const EMPTY_CART = { merchantId: null, items: [] };

// The cart as seen from one store's pages (store menu, product page): adding
// and removing, the "start a new cart?" prompt when another store's items are
// in it, and the size/colour picker for products with variants.
export const useStoreCart = (merchant, initialCart = EMPTY_CART) => {
  const [cart, setCart] = useState(initialCart);
  const [pendingCartAction, setPendingCartAction] = useState(null);
  // Products with sizes/colours go through the picker sheet instead of +/-.
  const [variantProduct, setVariantProduct] = useState(null);
  const [variantBusy, setVariantBusy] = useState(false);
  const merchantId = merchant?._id || merchant?.id;

  const applyCartUpdate = async (product, newQty, variantId = null) => {
    try {
      const productId = product._id || product.id;
      const response = await cartAPI.updateCart(merchantId, productId, newQty, variantId);

      if (response && response.data) {
        const fullCart = {
          ...response.data,
          merchantId: merchant,
        };
        setCart({
          merchantId: response.data.merchantId._id || response.data.merchantId,
          items: response.data.items || [],
        });
        try {
          sessionStorage.setItem('offerly_cached_cart', JSON.stringify(fullCart));
        } catch {}
      } else {
        setCart(EMPTY_CART);
        try {
          sessionStorage.removeItem('offerly_cached_cart');
        } catch {}
      }
      return true;
    } catch (error) {
      console.error('Failed to update cart:', error);
      toast.error(error?.error || 'Failed to update cart');
      return false;
    }
  };

  const handleUpdateQty = (product, newQty, variantId = null) => {
    // Adding from a different merchant than the one already in the cart
    // requires confirming the old cart gets cleared first.
    if (cart.merchantId && cart.merchantId !== merchantId && newQty > 0) {
      setPendingCartAction({ product, newQty, variantId });
      return true;
    }
    return applyCartUpdate(product, newQty, variantId);
  };

  const getQty = (productId) => {
    if (cart.merchantId !== merchantId) return 0;
    // Sum across lines: a product with variants can be in the cart several times.
    return cart.items
      .filter((i) => (i.product._id || i.product) === productId)
      .reduce((sum, i) => sum + i.qty, 0);
  };

  const getVariantQty = (productId, variantId) => {
    if (cart.merchantId !== merchantId) return 0;
    const item = cart.items.find(
      (i) => (i.product._id || i.product) === productId && String(i.variant?._id || i.variant || '') === String(variantId)
    );
    return item ? item.qty : 0;
  };

  const confirmVariant = async (variant, qty) => {
    setVariantBusy(true);
    const ok = await handleUpdateQty(variantProduct, qty, variant._id);
    setVariantBusy(false);
    if (ok !== false) setVariantProduct(null);
  };

  const confirmMerchantSwitch = () => {
    if (pendingCartAction) {
      applyCartUpdate(pendingCartAction.product, pendingCartAction.newQty, pendingCartAction.variantId);
    }
    setPendingCartAction(null);
  };

  const inThisStore = cart.merchantId === merchantId;
  const cartTotalItems = inThisStore ? cart.items.reduce((sum, item) => sum + item.qty, 0) : 0;
  const cartTotalPrice = inThisStore
    ? cart.items.reduce((sum, item) => sum + ((item.product.price || item.product.offerPrice || 0) * item.qty), 0)
    : 0;

  return {
    cart,
    setCart,
    handleUpdateQty,
    getQty,
    getVariantQty,
    variantProduct,
    setVariantProduct,
    variantBusy,
    confirmVariant,
    pendingCartAction,
    setPendingCartAction,
    confirmMerchantSwitch,
    cartTotalItems,
    cartTotalPrice,
  };
};

// The variant picker and the "start a new cart?" prompt for a useStoreCart
export const StoreCartDialogs = ({ storeCart }) => {
  const { variantProduct, setVariantProduct, getVariantQty, confirmVariant, variantBusy, pendingCartAction, setPendingCartAction, confirmMerchantSwitch } = storeCart;
  return (
    <>
      {variantProduct && (
        <VariantPickerSheet
          product={variantProduct}
          qtyInCart={(variantId) => getVariantQty(variantProduct._id || variantProduct.id, variantId)}
          onConfirm={confirmVariant}
          onClose={() => setVariantProduct(null)}
          busy={variantBusy}
        />
      )}

      <ConfirmDialog
        isOpen={!!pendingCartAction}
        title="Start a new cart?"
        message="You have items from another store in your cart. Adding this item will clear them."
        confirmText="Clear & Add"
        confirmColor="primary"
        onConfirm={confirmMerchantSwitch}
        onCancel={() => setPendingCartAction(null)}
      />
    </>
  );
};

// Takes the customer to the cart, handing over what's loaded so it paints at once
export const useGoToCart = (merchant, cart) => {
  const navigate = useNavigate();
  return () => {
    const fullCart = { ...cart, merchantId: merchant };
    try {
      sessionStorage.setItem('offerly_cached_cart', JSON.stringify(fullCart));
    } catch {}
    navigate('/cart', {
      state: {
        initialCart: fullCart,
        initialMerchant: merchant,
        autoCelebrate: true,
      },
    });
  };
};

// Floating "₹X • N items · View Cart" pill
export const CartPill = ({ storeCart, merchant, bottomClass = 'bottom-[5.5rem] sm:bottom-24 lg:bottom-7' }) => {
  const { cart, cartTotalItems, cartTotalPrice } = storeCart;
  const goToCart = useGoToCart(merchant, cart);

  return (
    <AnimatePresence>
      {cartTotalItems > 0 && (
        <div className={`fixed ${bottomClass} left-0 right-0 z-40 pointer-events-none flex justify-center px-4`}>
          <motion.div
            initial={{ y: 50, opacity: 0, scale: 0.9 }}
            animate={{ y: 0, opacity: 1, scale: 1 }}
            exit={{ y: 50, opacity: 0, scale: 0.9 }}
            transition={{ type: 'spring', stiffness: 450, damping: 26 }}
            className="pointer-events-auto"
          >
            <div
              role="button"
              tabIndex={0}
              onClick={goToCart}
              onKeyDown={(e) => {
                if (e.key === 'Enter' || e.key === ' ') {
                  e.preventDefault();
                  goToCart();
                }
              }}
              className="group cursor-pointer bg-gray-900/95 hover:bg-gray-900 active:scale-[0.97] transition-all duration-200 backdrop-blur-xl rounded-full shadow-[0_12px_32px_rgba(0,0,0,0.45),0_0_24px_rgba(94,185,41,0.22)] border border-white/15 ring-1 ring-primary/25 pl-3.5 pr-2 py-1.5 flex items-center gap-3 select-none"
            >
              {/* Mini Cart Icon with Item Count Badge & Lively Bounce */}
              <motion.div
                key={cartTotalItems}
                initial={{ scale: 0.85, rotate: -10 }}
                animate={{ scale: 1, rotate: 0 }}
                transition={{ type: 'spring', stiffness: 500, damping: 15 }}
                className="relative flex items-center justify-center w-8 h-8 rounded-full bg-primary/20 text-primary border border-primary/30 shrink-0"
              >
                <ShoppingCartRoundedIcon sx={{ fontSize: 16 }} />
                <motion.span
                  key={`badge-${cartTotalItems}`}
                  initial={{ scale: 0 }}
                  animate={{ scale: 1 }}
                  transition={{ type: 'spring', stiffness: 600, damping: 12 }}
                  className="absolute -top-1 -right-1 bg-primary text-white text-[10px] font-extrabold w-4 h-4 rounded-full flex items-center justify-center ring-2 ring-gray-900 shadow-sm"
                >
                  {cartTotalItems}
                </motion.span>
              </motion.div>

              {/* Price & Cart Info */}
              <div className="flex flex-col min-w-0 pr-0.5">
                <div className="flex items-center gap-1.5 leading-none">
                  <span className="text-sm font-bold text-white tracking-tight">
                    ₹{cartTotalPrice.toLocaleString()}
                  </span>
                  <span className="text-[11px] text-gray-400 font-medium">
                    • {cartTotalItems} {cartTotalItems > 1 ? 'items' : 'item'}
                  </span>
                </div>
                <div className="flex items-center gap-1.5 mt-1">
                  <span className="relative flex h-1.5 w-1.5">
                    <span className="animate-ping absolute inline-flex h-full w-full rounded-full bg-emerald-400 opacity-75"></span>
                    <span className="relative inline-flex rounded-full h-1.5 w-1.5 bg-emerald-400"></span>
                  </span>
                  <span className="text-[10px] text-emerald-400 font-semibold leading-none">
                    Discounts in cart
                  </span>
                </div>
              </div>

              {/* View Cart Pill Button with Animated Arrow */}
              <div className="bg-white group-hover:bg-primary group-hover:text-white text-gray-900 font-bold text-xs px-3.5 py-1.5 rounded-full flex items-center gap-1 shadow-sm transition-colors duration-200 shrink-0">
                <span>View Cart</span>
                <motion.span
                  animate={{ x: [0, 3, 0] }}
                  transition={{ repeat: Infinity, duration: 1.8, ease: 'easeInOut' }}
                  className="flex items-center"
                >
                  <ArrowForwardRoundedIcon sx={{ fontSize: 13 }} />
                </motion.span>
              </div>
            </div>
          </motion.div>
        </div>
      )}
    </AnimatePresence>
  );
};
