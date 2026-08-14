import Joi from 'joi';
import Cart from '../models/Cart.js';
import Product from '../../merchant/models/Product.js';

// @desc    Get customer's cart
// @route   GET /api/cart
// @access  Private
export const getCart = async (req, res) => {
  try {
    const cart = await Cart.findOne({ customerId: req.user.id })
      .populate('merchantId', 'storeName logo address locality phone')
      .populate('items.product', 'name category price offerPrice image isVeg');

    if (!cart) {
      return res.status(200).json({ success: true, data: null });
    }

    res.status(200).json({ success: true, data: cart });
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
    qty: Joi.number().min(0).required(), // 0 means remove item
  });

  const { error } = schema.validate(req.body);
  if (error) {
    return res.status(400).json({ success: false, error: error.details[0].message });
  }

  try {
    const { merchantId, productId, qty } = req.body;

    // Validate product exists
    const product = await Product.findById(productId);
    if (!product) {
      return res.status(404).json({ success: false, error: 'Product not found' });
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
        items: [{ product: productId, qty }],
      });
    } else {
      // Same merchant - update existing cart
      const itemIndex = cart.items.findIndex(
        (item) => item.product.toString() === productId
      );

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
          cart.items.push({ product: productId, qty });
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
    const updatedCart = await Cart.findById(cart._id)
      .populate('merchantId', 'storeName logo address locality phone')
      .populate('items.product', 'name category price offerPrice image isVeg');

    res.status(200).json({ success: true, data: updatedCart });
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
