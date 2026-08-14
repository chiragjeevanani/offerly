import mongoose from 'mongoose';

const cartItemSchema = new mongoose.Schema({
  product: {
    type: mongoose.Schema.Types.ObjectId,
    ref: 'Product',
    required: true,
  },
  qty: {
    type: Number,
    required: true,
    min: 1,
  },
}, { _id: false });

const cartSchema = new mongoose.Schema({
  customerId: {
    type: mongoose.Schema.Types.ObjectId,
    ref: 'User',
    required: true,
    unique: true,
  },
  merchantId: {
    type: mongoose.Schema.Types.ObjectId,
    ref: 'Merchant',
    required: true,
  },
  items: [cartItemSchema],
  createdAt: {
    type: Date,
    default: Date.now,
  },
  updatedAt: {
    type: Date,
    default: Date.now,
  },
});

cartSchema.pre('save', function() {
  this.updatedAt = new Date();
});

const Cart = mongoose.model('Cart', cartSchema);

export default Cart;
