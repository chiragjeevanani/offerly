import { useState, useEffect, useRef } from 'react';
import { useParams, useNavigate, Navigate } from 'react-router-dom';
import { motion } from 'framer-motion';
import { toast } from 'react-hot-toast';
import ShoppingBagRoundedIcon from '@mui/icons-material/ShoppingBagRounded';
import StorefrontRoundedIcon from '@mui/icons-material/StorefrontRounded';
import AddRoundedIcon from '@mui/icons-material/AddRounded';
import RemoveRoundedIcon from '@mui/icons-material/RemoveRounded';
import ChevronRightRoundedIcon from '@mui/icons-material/ChevronRightRounded';
import { merchantAPI } from '../../../../api/merchant.api';
import { productAPI } from '../../../../api/product.api';
import { cartAPI } from '../../../../api/cart.api';
import PageTransition from '../../components/ui/PageTransition';
import FoodTypeMark, { getFoodType } from '../../../../components/ui/FoodTypeMark';
import { shouldShowVegIndicator } from '../../../../utils/storeTypeHelper';
import { storeCache } from './storeCache';
import { useStoreCart, useGoToCart, StoreCartDialogs, EMPTY_CART } from '../../hooks/useStoreCart';

const rupees = (n) => `₹${Math.round(Number(n) || 0).toLocaleString('en-IN')}`;

// Swipeable images with dots and thumbnails, like a shop's product gallery
const Gallery = ({ images, name }) => {
  const [index, setIndex] = useState(0);
  const [failed, setFailed] = useState({});
  const trackRef = useRef(null);
  const shown = images.filter((src) => src && !failed[src]);

  const goTo = (i) => {
    const track = trackRef.current;
    if (track) track.scrollTo({ left: i * track.clientWidth, behavior: 'smooth' });
  };

  if (shown.length === 0) {
    return (
      <div className="aspect-[4/3] max-h-[42vh] w-full bg-gradient-to-br from-gray-50 to-gray-100 flex items-center justify-center text-gray-300">
        <ShoppingBagRoundedIcon sx={{ fontSize: 72 }} />
      </div>
    );
  }

  return (
    <div className="bg-white">
      <div
        ref={trackRef}
        onScroll={(e) => {
          const el = e.currentTarget;
          setIndex(Math.round(el.scrollLeft / Math.max(1, el.clientWidth)));
        }}
        className="flex overflow-x-auto snap-x snap-mandatory scrollbar-hide"
        style={{ scrollbarWidth: 'none' }}
      >
        {shown.map((src) => (
          <div key={src} className="w-full shrink-0 snap-center aspect-[4/3] max-h-[42vh] flex items-center justify-center bg-white">
            <img
              src={src}
              alt={name}
              className="w-full h-full object-contain"
              onError={() => setFailed((f) => ({ ...f, [src]: true }))}
            />
          </div>
        ))}
      </div>
      {shown.length > 1 && (
        <>
          <div className="flex justify-center gap-1.5 py-2.5">
            {shown.map((src, i) => (
              <button
                key={src}
                type="button"
                aria-label={`Image ${i + 1}`}
                onClick={() => goTo(i)}
                className={`h-1.5 rounded-full transition-all ${i === index ? 'w-5 bg-primary' : 'w-1.5 bg-gray-300'}`}
              />
            ))}
          </div>
          <div className="flex gap-2 px-4 pb-3 overflow-x-auto" style={{ scrollbarWidth: 'none' }}>
            {shown.map((src, i) => (
              <button
                key={src}
                type="button"
                onClick={() => goTo(i)}
                className={`w-14 h-14 shrink-0 rounded-xl overflow-hidden border-2 transition-all ${i === index ? 'border-primary' : 'border-gray-100'}`}
              >
                <img src={src} alt="" className="w-full h-full object-cover" />
              </button>
            ))}
          </div>
        </>
      )}
    </div>
  );
};

const ProductDetailPage = () => {
  const { id: storeId, productId } = useParams();
  const navigate = useNavigate();
  const cached = storeCache.get(storeId);
  const [merchant, setMerchant] = useState(cached?.merchant || null);
  const [products, setProducts] = useState(cached?.products || []);
  const [loading, setLoading] = useState(!cached);
  const [busy, setBusy] = useState(false);
  const storeCart = useStoreCart(merchant, cached?.cart || EMPTY_CART);
  const { cart, setCart, handleUpdateQty, getQty, setVariantProduct, cartTotalItems } = storeCart;
  const goToCart = useGoToCart(merchant, cart);

  useEffect(() => {
    let cancelled = false;
    (async () => {
      try {
        const [merchantRes, productsRes, cartRes] = await Promise.all([
          merchantAPI.getById(storeId),
          productAPI.getByMerchant(storeId).catch(() => ({ products: [] })),
          cartAPI.getCart().catch(() => ({ data: null })),
        ]);
        if (cancelled) return;
        const m = merchantRes?.merchant;
        if (!m || m.status !== 'approved') throw new Error('unavailable');
        const backendCart = cartRes?.data;
        const nextCart =
          backendCart?.merchantId && (backendCart.merchantId._id || backendCart.merchantId) === storeId
            ? { merchantId: backendCart.merchantId._id || backendCart.merchantId, items: backendCart.items || [] }
            : EMPTY_CART;
        setMerchant(m);
        setProducts(productsRes.products || []);
        setCart(nextCart);
        storeCache.set(storeId, { ...(storeCache.get(storeId) || {}), merchant: m, products: productsRes.products || [], cart: nextCart });
      } catch {
        if (cancelled || storeCache.has(storeId)) return;
        toast.error('This product is not available');
        navigate(`/store/${storeId}`, { replace: true });
      } finally {
        if (!cancelled) setLoading(false);
      }
    })();
    return () => {
      cancelled = true;
    };
  }, [storeId, navigate, setCart]);

  // Keep the store page's cached cart in step, so Back shows the new count
  useEffect(() => {
    const hit = storeCache.get(storeId);
    if (hit) hit.cart = cart;
  }, [cart, storeId]);

  const product = products.find((p) => (p._id || p.id) === productId);

  if (loading && !product) {
    return (
      <div className="flex items-center justify-center min-h-screen">
        <div className="w-10 h-10 border-4 border-primary border-t-transparent rounded-full animate-spin" />
      </div>
    );
  }

  // A direct link to an item whose page the merchant switched off
  if (merchant && product && product.showDetailPage === false) {
    return <Navigate to={`/store/${storeId}`} replace />;
  }

  if (!merchant || !product) {
    return (
      <div className="min-h-[60vh] flex flex-col items-center justify-center gap-3 px-6 text-center">
        <p className="text-sm font-semibold text-gray-600">This product isn't available any more.</p>
        <button onClick={() => navigate(`/store/${storeId}`)} className="px-5 py-2.5 bg-primary text-white text-sm font-bold rounded-xl">
          Back to store
        </button>
      </div>
    );
  }

  const qty = getQty(productId);
  const soldOut = product.inStock === false;
  const available = product.totalAvailable ?? product.totalStock ?? 0;
  const atStockLimit = product.trackInventory && !product.hasVariants && qty >= available;
  const price = Number(product.price) || 0;
  const offerPrice = Number(product.offerPrice) || price;
  const percentOff = price > 0 && offerPrice < price ? Math.round(((price - offerPrice) / price) * 100) : 0;
  const foodType = shouldShowVegIndicator(merchant, product) ? getFoodType(product) : null;
  const images = [...new Set([...(product.images || []), product.image].filter(Boolean))];

  const add = async (next) => {
    setBusy(true);
    await handleUpdateQty(product, next);
    setBusy(false);
  };

  return (
    <PageTransition>
      <div className="min-h-screen bg-background pb-44 lg:pb-28 max-w-3xl mx-auto">
        <Gallery images={images} name={product.name} />

        {/* Name, price, stock */}
        <div className="bg-white px-4 pt-4 pb-5 border-b border-gray-100 space-y-2">
          {foodType && <FoodTypeMark type={foodType} size={14} />}
          <h1 className="text-lg font-bold text-gray-900 leading-snug">{product.name}</h1>
          {product.categoryName && product.categoryName !== 'Uncategorized' && (
            <p className="text-xs font-medium text-gray-400">{product.categoryName}</p>
          )}
          <div className="flex items-baseline flex-wrap gap-x-2.5 gap-y-1 pt-1">
            {percentOff > 0 && <span className="text-base font-bold text-green-600">{percentOff}% off</span>}
            {percentOff > 0 && <span className="text-sm text-gray-400 line-through">{rupees(price)}</span>}
            <span className="text-2xl font-bold text-gray-900">{rupees(offerPrice)}</span>
          </div>
          {product.hasVariants && (
            <button
              type="button"
              onClick={() => setVariantProduct(product)}
              className="w-full mt-2 flex items-center justify-between gap-3 px-3.5 py-3 rounded-xl border border-gray-200 text-left"
            >
              <span className="min-w-0">
                <span className="block text-xs font-bold text-gray-800">
                  {product.variantOptions.map((o) => o.name).join(' & ') || 'Options'}
                </span>
                <span className="block text-[11px] text-gray-500 truncate">
                  {product.variantOptions.map((o) => o.values.join(', ')).join(' · ')}
                </span>
              </span>
              <ChevronRightRoundedIcon className="text-gray-400" />
            </button>
          )}
          {soldOut ? (
            <p className="text-sm font-bold text-red-500">Sold out</p>
          ) : (
            product.trackInventory && available <= 5 && <p className="text-xs font-bold text-amber-600">Only {available} left</p>
          )}
        </div>

        {/* Description */}
        <div className="bg-white mt-2 px-4 py-4 border-y border-gray-100">
          <h2 className="text-sm font-bold text-gray-900 mb-2">Product details</h2>
          {product.description?.trim() ? (
            <p className="text-sm text-gray-600 leading-relaxed whitespace-pre-line">{product.description}</p>
          ) : (
            <p className="text-sm text-gray-400">The store hasn't added a description yet.</p>
          )}
        </div>

        {/* Store */}
        <button
          type="button"
          onClick={() => navigate(`/store/${storeId}`)}
          className="w-full bg-white mt-2 px-4 py-3.5 border-y border-gray-100 flex items-center gap-3 text-left"
        >
          <div className="w-10 h-10 rounded-xl overflow-hidden bg-gray-50 border border-gray-100 flex items-center justify-center shrink-0">
            {merchant.logo ? <img src={merchant.logo} alt="" className="w-full h-full object-cover" /> : <StorefrontRoundedIcon className="text-gray-400" />}
          </div>
          <div className="flex-1 min-w-0">
            <p className="text-[11px] text-gray-400 font-medium">Sold by</p>
            <p className="text-sm font-bold text-gray-900 truncate">{merchant.storeName}</p>
          </div>
          <ChevronRightRoundedIcon className="text-gray-400" />
        </button>
      </div>

      {/* Add to cart bar, above the bottom navigation */}
      <div className="fixed bottom-20 lg:bottom-0 left-0 right-0 z-40 bg-white border-t border-gray-100">
        <div className="max-w-3xl mx-auto p-3 flex gap-2.5">
          {soldOut && qty === 0 ? (
            <div className="flex-1 py-3.5 rounded-xl bg-gray-100 text-gray-400 text-sm font-bold text-center">Sold out</div>
          ) : product.hasVariants ? (
            <motion.button
              whileTap={{ scale: 0.97 }}
              onClick={() => setVariantProduct(product)}
              className="flex-1 py-3.5 rounded-xl border-2 border-primary text-primary text-sm font-bold"
            >
              {qty > 0 ? `${qty} in cart · Edit` : 'Add to cart'}
            </motion.button>
          ) : qty === 0 ? (
            <motion.button
              whileTap={{ scale: 0.97 }}
              disabled={busy}
              onClick={() => add(1)}
              className="flex-1 py-3.5 rounded-xl border-2 border-primary text-primary text-sm font-bold disabled:opacity-50"
            >
              Add to cart
            </motion.button>
          ) : (
            <div className="flex-1 flex items-center justify-between rounded-xl border-2 border-primary text-primary overflow-hidden">
              <button disabled={busy} onClick={() => add(qty - 1)} aria-label="Remove one" className="px-4 py-3 disabled:opacity-40">
                <RemoveRoundedIcon sx={{ fontSize: 20 }} />
              </button>
              <span className="text-sm font-bold">{qty} in cart</span>
              <button disabled={busy || atStockLimit} onClick={() => add(qty + 1)} aria-label="Add one" className="px-4 py-3 disabled:opacity-40">
                <AddRoundedIcon sx={{ fontSize: 20 }} />
              </button>
            </div>
          )}
          <motion.button
            whileTap={{ scale: 0.97 }}
            disabled={cartTotalItems === 0}
            onClick={goToCart}
            className="flex-1 py-3.5 rounded-xl bg-primary text-white text-sm font-bold shadow-md shadow-primary/20 disabled:opacity-40 disabled:shadow-none"
          >
            Go to cart
          </motion.button>
        </div>
      </div>

      <StoreCartDialogs storeCart={storeCart} />
    </PageTransition>
  );
};

// Keyed so moving between products remounts with that product's data
const ProductDetail = () => {
  const { id, productId } = useParams();
  return <ProductDetailPage key={`${id}-${productId}`} />;
};

export default ProductDetail;
