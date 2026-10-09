import Joi from 'joi';
import Cart from '../models/Cart.js';
import Product from '../../merchant/models/Product.js';
import Merchant from '../../merchant/models/Merchant.js';
import Redemption from '../models/Redemption.js';
import WalletSettings from '../../admin/models/WalletSettings.js';
import { resolveLine, stockError, variantLabel } from '../../merchant/services/inventoryService.js';

const calculateOfferlyExtraDiscount = async (cart, customerId) => {
  if (!cart || !cart.merchantId || !cart.items || cart.items.length === 0) return 0;

  try {
    const hasCompletedBefore = await Redemption.exists({ customerId, status: 'completed' });
    if (hasCompletedBefore) return 0;

    const merchantId = cart.merchantId._id || cart.merchantId;
    const [merchantDoc, walletSettings] = await Promise.all([
      Merchant.findById(merchantId).select('discountWallet'),
      WalletSettings.findOne(),
    ]);

    const configuredAmount = walletSettings?.newUserDiscountAmount || 0;
    const availableBalance = merchantDoc?.discountWallet?.balance || 0;
    const totalOfferPrice = cart.items.reduce(
      (sum, item) => sum + ((item.product?.offerPrice || 0) * (item.qty || 1)),
      0
    );

    return Math.max(0, Math.round(Math.min(configuredAmount, availableBalance, totalOfferPrice)));
  } catch (e) {
    console.error('Error calculating extra discount:', e);
    return 0;
  }
};

const populateCart = (query) =>
  query
    .populate('merchantId', 'storeName logo address locality phone discountWallet')
    .populate({
      path: 'items.product',
      select: 'name categoryId price offerPrice images isVeg variantOptions trackInventory stock reserved',
      populate: { path: 'categoryId', select: 'name discountPercent' },
    })
    .populate('items.variant', 'attributes name price offerPrice stock reserved isActive');

// Plain cart for the client. For variant lines the variant's price is folded
// into item.product so every existing price calculation keeps working, and
// item.variant carries the label ("M / Red") and stock.
const shapeCart = (cart) => {
  const data = cart.toObject();
  data.items = (data.items || []).map((item) => {
    if (!item.variant || !item.product) return { ...item, variant: null };
    const options = item.product.variantOptions || [];
    return {
      ...item,
      product: { ...item.product, price: item.variant.price, offerPrice: item.variant.offerPrice },
      variant: {
        _id: item.variant._id,
        attributes: item.variant.attributes,
        label: variantLabel(item.variant.attributes, options) || item.variant.name,
        stock: item.variant.stock,
        available: Math.max(0, (item.variant.stock || 0) - (item.variant.reserved || 0)),
      },
    };
  });
  return data;
};

const sendCart = async (res, cart, customerId) => {
  const cartData = shapeCart(cart);
  cartData.offerlyExtraDiscount = await calculateOfferlyExtraDiscount(cartData, customerId);
  return res.status(200).json({ success: true, data: cartData });
};

const sameLine = (item, productId, variantId) =>
  item.product.toString() === productId && String(item.variant || '') === String(variantId || '');

// @desc    Get customer's cart
// @route   GET /api/cart
// @access  Private
export const getCart = async (req, res) => {
  try {
    const cart = await populateCart(Cart.findOne({ customerId: req.user.id }));

    if (!cart) {
      return res.status(200).json({ success: true, data: null });
    }

    return sendCart(res, cart, req.user.id);
  } catch (err) {
    res.status(500).json({ success: false, error: 'Server Error' });
  }
};

// @desc    Update cart (add/update item or clear cart)
// @route   PUT /api/cart
// @access  Private
export const updateCart = async (req, res) => {
  const schema = Joi.object({
    merchantId: Joi.string().required(),
    productId: Joi.string().required(),
    variantId: Joi.string().allow(null, ''),
    qty: Joi.number().integer().min(0).required(), // 0 means remove item
  });

  const { error } = schema.validate(req.body);
  if (error) {
    return res.status(400).json({ success: false, error: error.details[0].message });
  }

  try {
    const { merchantId, productId, qty } = req.body;
    const variantId = req.body.variantId || null;

    // Validate product exists
    const product = await Product.findById(productId);
    if (!product) {
      return res.status(404).json({ success: false, error: 'Product not found' });
    }

    // Only block adding new items - removing (qty 0) or trimming an existing
    // item down should always be allowed even if the store closed meanwhile.
    if (qty > 0) {
      const merchant = await Merchant.findById(merchantId).select('isOpen').lean();
      if (merchant && merchant.isOpen === false) {
        return res.status(400).json({ success: false, error: 'This store is closed for now' });
      }

      const line = await resolveLine({ product, variantId });
      if (line.error) {
        return res.status(400).json({ success: false, error: line.error, code: line.code });
      }
      const stockErr = stockError(line, qty);
      if (stockErr) {
        return res.status(400).json({ success: false, error: stockErr, code: 'OUT_OF_STOCK', available: line.available });
      }
    }

    let cart = await Cart.findOne({ customerId: req.user.id });

    // If no cart exists or different merchant, create new cart
    if (!cart || cart.merchantId.toString() !== merchantId) {
      if (qty === 0) {
        return res.status(200).json({ success: true, data: null });
      }

      // Clear old cart if exists (different merchant)
      if (cart) {
        await Cart.deleteOne({ _id: cart._id });
      }

      // Create new cart with single item
      cart = await Cart.create({
        customerId: req.user.id,
        merchantId,
        items: [{ product: productId, variant: variantId, qty }],
      });
    } else {
      // Same merchant - update existing cart
      const itemIndex = cart.items.findIndex((item) => sameLine(item, productId, variantId));

      if (qty === 0) {
        // Remove item
        if (itemIndex > -1) {
          cart.items.splice(itemIndex, 1);
        }
      } else {
        // Update or add item
        if (itemIndex > -1) {
          cart.items[itemIndex].qty = qty;
        } else {
          cart.items.push({ product: productId, variant: variantId, qty });
        }
      }

      // If cart is empty, delete it
      if (cart.items.length === 0) {
        await Cart.deleteOne({ _id: cart._id });
        return res.status(200).json({ success: true, data: null });
      }
    }

    // Save and return updated cart
    await cart.save();
    const updatedCart = await populateCart(Cart.findById(cart._id));
    return sendCart(res, updatedCart, req.user.id);
  } catch (err) {
    res.status(500).json({ success: false, error: err.message });
  }
};

// @desc    Clear cart
// @route   DELETE /api/cart
// @access  Private
export const clearCart = async (req, res) => {
  try {
    await Cart.deleteOne({ customerId: req.user.id });
    res.status(200).json({ success: true, message: 'Cart cleared' });
  } catch (err) {
    res.status(500).json({ success: false, error: 'Server Error' });
  }
};
