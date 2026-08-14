import { useState, useEffect } from 'react';
import { useNavigate } from 'react-router-dom';
import { motion } from 'framer-motion';
import ArrowBackRoundedIcon from '@mui/icons-material/ArrowBackRounded';
import ShoppingCartRoundedIcon from '@mui/icons-material/ShoppingCartRounded';
import ReceiptLongRoundedIcon from '@mui/icons-material/ReceiptLongRounded';
import StorefrontRoundedIcon from '@mui/icons-material/StorefrontRounded';
import PersonRoundedIcon from '@mui/icons-material/PersonRounded';
import InfoOutlinedIcon from '@mui/icons-material/InfoOutlined';
import QrCode2RoundedIcon from '@mui/icons-material/QrCode2Rounded';
import AddRoundedIcon from '@mui/icons-material/AddRounded';
import RemoveRoundedIcon from '@mui/icons-material/RemoveRounded';

import { cartAPI } from '../../../../api/cart.api';
import { merchantAPI } from '../../../../api/merchant.api';
import { useApp } from '../../context/AppContext';
import PageTransition from '../../components/ui/PageTransition';

const CartView = () => {
  const navigate = useNavigate();
  const { user } = useApp();
  const [cart, setCart] = useState(null);
  const [merchant, setMerchant] = useState(null);

  const loadCart = async () => {
    try {
      const cartRes = await cartAPI.getCart();
      const backendCart = cartRes.data;
      
      if (backendCart && backendCart.merchantId && backendCart.items && backendCart.items.length > 0) {
        setCart(backendCart);
        
        const merchantId = backendCart.merchantId._id || backendCart.merchantId;
        const merchantRes = await merchantAPI.getById(merchantId);
        if (merchantRes && merchantRes.merchant) {
          setMerchant(merchantRes.merchant);
        }
      } else {
        setCart(null);
      }
    } catch (error) {
      console.error('Failed to load cart:', error);
      setCart(null);
    }
  };

  useEffect(() => {
    loadCart();
  }, []);

  const handleUpdateQty = async (product, newQty) => {
    if (!merchant) return;
    try {
      const productId = product._id || product.id;
      const response = await cartAPI.updateCart(merchant._id || merchant.id, productId, newQty);
      if (response && response.data) {
        setCart(response.data);
      } else {
        setCart(null);
      }
      loadCart(); // Refresh merchant details if needed
    } catch (error) {
      console.error('Failed to update cart:', error);
    }
  };

  if (!cart || !merchant) {
    return (
      <PageTransition>
        <div className="min-h-screen bg-gray-50 flex flex-col pt-safe">
          <div className="px-4 py-4 flex items-center bg-white shadow-sm sticky top-0 z-20">
            <button onClick={() => navigate(-1)} className="p-2 -ml-2 text-gray-700">
              <ArrowBackRoundedIcon />
            </button>
            <h1 className="text-lg font-bold text-gray-900 ml-2">Booking Cart</h1>
          </div>
          <div className="flex-1 flex flex-col items-center justify-center p-6 text-center">
            <div className="w-24 h-24 bg-gray-200 rounded-full flex items-center justify-center mb-4 text-gray-400">
              <ShoppingCartRoundedIcon sx={{fontSize: 40}} />
            </div>
            <h2 className="text-xl font-bold text-gray-900 mb-2">Your Cart is Empty</h2>
            <p className="text-gray-500 mb-6">Looks like you haven't added any services or products yet.</p>
            <button 
              onClick={() => navigate('/home')}
              className="px-6 py-3 bg-primary text-white rounded-xl font-bold"
            >
              Explore Offers
            </button>
          </div>
        </div>
      </PageTransition>
    );
  }

  // Mathematics Calculations - Fix Floating Point Issues
  const totalBasePrice = Math.round(cart.items.reduce((sum, item) => sum + (item.product.price * item.qty), 0));
  const totalOfferPrice = Math.round(cart.items.reduce((sum, item) => sum + (item.product.offerPrice * item.qty), 0));
  const totalDiscount = Math.round(totalBasePrice - totalOfferPrice);

  const handleProceed = () => {
     navigate('/redeem/draft');
  };

  return (
    <PageTransition>
      <div className="min-h-screen bg-[#F8FAFC] pb-32">
        {/* Concise Premium Header */}
        <div className="px-5 py-5 flex items-center justify-between bg-white border-b border-gray-100 sticky top-0 z-30 shadow-sm backdrop-blur-md bg-white/90">
          <div className="flex items-center gap-4">
            <button onClick={() => navigate(-1)} className="w-10 h-10 flex items-center justify-center bg-gray-50 rounded-xl text-gray-900 border border-gray-100 hover:scale-105 transition-all">
              <ArrowBackRoundedIcon sx={{ fontSize: 20 }} />
            </button>
            <div>
               <h1 className="text-lg font-bold text-gray-900 leading-none uppercase tracking-tight">Review Booking</h1>
               <div className="flex items-center gap-1.5 mt-1.5">
                  <div className="w-1.5 h-1.5 bg-[#5EB929] rounded-full" />
                  <p className="text-[10px] font-bold text-gray-400 uppercase tracking-widest">{merchant.storeName}</p>
               </div>
            </div>
          </div>
          {merchant.logo && (
            <img src={merchant.logo} alt="" className="w-10 h-10 rounded-xl shadow-lg object-cover border-2 border-white" />
          )}
        </div>

        <div className="p-4 space-y-4 max-w-2xl mx-auto">
          {/* Party Details - Concierge Card */}
          <div className="bg-white rounded-[2rem] p-5 shadow-sm border border-gray-50 grid grid-cols-2 gap-4 relative overflow-hidden">
             <div className="absolute top-0 bottom-0 left-1/2 -translate-x-1/2 w-[1px] bg-gray-50" />
             
             <div>
               <p className="text-[9px] font-bold text-gray-400 uppercase tracking-widest mb-2">Customer</p>
               <h3 className="text-sm font-bold text-gray-900 leading-none mb-1">{user?.name || 'Guest'}</h3>
               <p className="text-[11px] font-bold text-gray-400">{user?.phone || 'No phone'}</p>
             </div>

             <div className="pl-4">
               <p className="text-[9px] font-bold text-gray-400 uppercase tracking-widest mb-2">Merchant</p>
               <h3 className="text-sm font-bold text-[#5EB929] leading-none mb-1">{merchant.storeName}</h3>
               <p className="text-[11px] font-bold text-gray-400 truncate">{merchant.locality}</p>
             </div>
          </div>

          {/* Service Items - High-Density List */}
          <div className="bg-white rounded-[2rem] p-6 shadow-sm border border-gray-50">
             <div className="flex items-center justify-between mb-6">
               <div className="flex items-center gap-2">
                 <div className="w-8 h-8 bg-gray-50 rounded-lg flex items-center justify-center text-gray-400">
                   <ReceiptLongRoundedIcon sx={{ fontSize: 18 }} />
                 </div>
                 <h3 className="text-xs font-bold text-gray-900 uppercase tracking-widest">Service Items</h3>
               </div>
               <span className="text-[10px] font-bold text-gray-400">{cart.items.length} Items</span>
             </div>
             
             <div className="space-y-6">
               {cart.items.map((item, idx) => {
                 const product = item.product;
                 const productPrice = Math.round(product.offerPrice || 0);
                 const basePrice = Math.round(product.price || 0);
                 const itemTotal = productPrice * item.qty;
                 const savings = Math.round((basePrice - productPrice) * item.qty);

                 return (
                  <div key={idx} className="flex justify-between items-center gap-4 relative">
                    <div className="flex-1">
                      <p className="text-[13px] font-bold text-gray-900 mb-2">{product.name}</p>
                      
                      <div className="flex items-center gap-3">
                         <div className="flex items-center bg-[#F8FAFC] rounded-xl border border-gray-100 p-0.5">
                            <motion.button 
                              whileTap={{ scale: 0.9 }} 
                              onClick={() => handleUpdateQty(product, item.qty - 1)}
                              className="w-8 h-8 flex items-center justify-center text-gray-400 hover:text-gray-900 transition-colors"
                            >
                              <RemoveRoundedIcon sx={{ fontSize: 14 }} />
                            </motion.button>
                            <span className="w-6 text-center text-[12px] font-bold text-gray-900">{item.qty}</span>
                            <motion.button 
                              whileTap={{ scale: 0.9 }} 
                              onClick={() => handleUpdateQty(product, item.qty + 1)}
                              className="w-8 h-8 flex items-center justify-center text-gray-400 hover:text-gray-900 transition-colors"
                            >
                              <AddRoundedIcon sx={{ fontSize: 14 }} />
                            </motion.button>
                         </div>
                         <p className="text-[11px] font-bold text-gray-400">× ₹{productPrice}</p>
                      </div>
                    </div>

                    <div className="text-right">
                      <p className="text-sm font-bold text-gray-900">₹{itemTotal}</p>
                      {savings > 0 && (
                         <div className="mt-1 flex items-center justify-end gap-1">
                            <div className="w-1 h-1 bg-green-500 rounded-full" />
                            <p className="text-[9px] font-bold text-green-600 uppercase">Save ₹{savings}</p>
                         </div>
                      )}
                    </div>
                  </div>
                 );
               })}
             </div>
          </div>

          {/* Payment Summary - Structured Receipt */}
          <div className="bg-white rounded-[2rem] p-6 shadow-sm border border-gray-50 relative overflow-hidden">
             <div className="absolute top-0 left-0 w-full h-1 bg-gradient-to-r from-gray-100 via-[#5EB929]/20 to-gray-100" />

             <h3 className="text-[11px] font-bold text-gray-400 uppercase tracking-widest mb-5">Bill Summary</h3>
             
             <div className="space-y-3 mb-6">
               <div className="flex justify-between items-center">
                 <span className="text-[12px] font-bold text-gray-400 uppercase tracking-tight">Base Amount</span>
                 <span className="text-[13px] font-bold text-gray-900">₹{totalBasePrice}</span>
               </div>
               <div className="flex justify-between items-center">
                 <div className="flex items-center gap-1.5">
                    <span className="text-[12px] font-bold text-gray-400 uppercase tracking-tight">Offer Benefit</span>
                    <div className="px-1.5 py-0.5 bg-green-50 text-green-600 rounded text-[8px] font-bold uppercase">Apply</div>
                 </div>
                 <span className="text-[13px] font-bold text-green-600">- ₹{totalDiscount}</span>
               </div>
             </div>

             <div className="pt-5 border-t border-dashed border-gray-100 flex justify-between items-end">
                <div>
                   <p className="text-[10px] font-bold text-gray-400 uppercase tracking-widest mb-1">Total Payable</p>
                   <p className="text-[12px] font-bold text-gray-400 leading-none">Net Amount</p>
                </div>
                <div className="text-right">
                   <p className="text-2xl font-bold text-[#5EB929] leading-none tracking-tight">₹{totalOfferPrice}</p>
                </div>
             </div>

             {/* Dynamic Disclaimer */}
             <div className="mt-6 p-4 bg-[#FFF8F1] rounded-2xl border border-[#FFE8D1] flex gap-3">
               <InfoOutlinedIcon className="text-[#B56D24]" sx={{ fontSize: 16 }} />
               <p className="text-[10px] text-[#8C541B] font-bold uppercase tracking-wide leading-relaxed">
                 Pay at store directly. This is a digital reservation, not an online payment.
               </p>
             </div>
          </div>
        </div>

        {/* Action Button - Sticky Bottom */}
        <div className="fixed bottom-20 lg:bottom-0 left-0 right-0 bg-white border-t border-gray-100 z-40 backdrop-blur-xl bg-white/95">
           <div className="p-3">
              <motion.button
                whileTap={{ scale: 0.98 }}
                onClick={handleProceed}
                className="w-full bg-gray-900 text-white rounded-xl py-4 font-bold text-[11px] uppercase tracking-[0.25em] flex items-center justify-center gap-3 shadow-2xl shadow-black/20 active:scale-95 transition-all"
              >
                <QrCode2RoundedIcon sx={{ fontSize: 18 }} />
                Generate Booking QR
              </motion.button>
           </div>
        </div>
      </div>
    </PageTransition>
  );
};

export default CartView;
