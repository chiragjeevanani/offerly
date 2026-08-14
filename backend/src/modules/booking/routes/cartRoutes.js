import express from 'express';
import { 
    getCart, 
    updateCart, 
    clearCart 
} from '../controllers/cartController.js';
import { protect } from '../../../middlewares/auth.js';

const router = express.Router();

router.route('/')
    .get(protect, getCart)
    .put(protect, updateCart)
    .delete(protect, clearCart);

export default router;
