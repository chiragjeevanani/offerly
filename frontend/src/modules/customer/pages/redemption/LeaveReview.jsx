import { useState, useEffect } from 'react';
import { useParams, useNavigate } from 'react-router-dom';
import { motion } from 'framer-motion';
import StarRoundedIcon from '@mui/icons-material/StarRounded';
import StarBorderRoundedIcon from '@mui/icons-material/StarBorderRounded';
import { bookingAPI } from '../../../../api/booking.api';
import { reviewAPI } from '../../../../api/review.api';
import PageTransition from '../../components/ui/PageTransition';
import toast from 'react-hot-toast';

const LeaveReview = () => {
  const { id } = useParams();
  const navigate = useNavigate();

  const [redemption, setRedemption] = useState(null);
  const [offer, setOffer] = useState(null);
  const [merchant, setMerchant] = useState(null);
  const [rating, setRating] = useState(0);
  const [hovered, setHovered] = useState(0);
  const [text, setText] = useState('');
  const [isSubmitting, setIsSubmitting] = useState(false);

  useEffect(() => {
    const loadData = async () => {
      try {
        const res = await bookingAPI.getById(id);
        if (res && res.success) {
          setRedemption(res.data);
          setOffer(res.data.offerId);
          setMerchant(res.data.merchantId);
        }
      } catch (error) {
        console.error('Failed to load redemption:', error);
        toast.error('Booking not found');
        navigate('/redemptions');
      }
    };
    loadData();
  }, [id, navigate]);

  const handleSubmit = async () => {
    if (rating === 0) {
      toast.error('Please select a rating');
      return;
    }
    setIsSubmitting(true);
    try {
      await reviewAPI.create({
        merchantId: redemption.merchantId._id || redemption.merchantId,
        offerId: redemption.offerId?._id || redemption.offerId,
        rating,
        text
      });
      toast.success('Review submitted! Thank you 🙏');
      navigate('/redemptions');
    } catch (error) {
      console.error('Failed to submit review:', error);
      toast.error('Failed to submit review');
    } finally {
      setIsSubmitting(false);
    }
  };

  const ratingLabels = ['', 'Poor', 'Fair', 'Good', 'Great', 'Excellent!'];

  return (
    <PageTransition>
      <div className="min-h-screen bg-background flex flex-col">
        <div className="px-5 py-6 flex-1">
          {/* Merchant info */}
          {merchant && (
            <div className="flex items-center gap-3 bg-surface rounded-2xl shadow-card p-4 mb-6">
              <img src={merchant.coverImage} alt="" className="w-14 h-14 rounded-xl object-cover" />
              <div>
                <p className="text-sm font-semibold text-text-primary">{merchant.storeName}</p>
                <p className="text-xs text-text-secondary">{offer?.title}</p>
              </div>
            </div>
          )}

          <div className="text-center mb-8">
            <h2 className="text-xl font-bold text-text-primary">How was your experience?</h2>
            <p className="text-text-secondary text-sm mt-1">Your review helps others discover great offers</p>
          </div>

          {/* Star rating */}
          <div className="flex justify-center gap-3 mb-3">
            {[1, 2, 3, 4, 5].map((star) => (
              <motion.button
                key={star}
                whileHover={{ scale: 1.2 }}
                whileTap={{ scale: 0.9 }}
                onClick={() => setRating(star)}
                onMouseEnter={() => setHovered(star)}
                onMouseLeave={() => setHovered(0)}
                className="transition-all"
              >
                {star <= (hovered || rating)
                  ? <StarRoundedIcon sx={{ fontSize: 44 }} className="text-amber-400" />
                  : <StarBorderRoundedIcon sx={{ fontSize: 44 }} className="text-gray-300" />
                }
              </motion.button>
            ))}
          </div>

          {/* Rating label */}
          <motion.div
            className="text-center mb-6"
            animate={{ opacity: rating > 0 ? 1 : 0, y: rating > 0 ? 0 : 8 }}
          >
            <span className="text-lg font-bold text-primary">{ratingLabels[rating]}</span>
          </motion.div>

          {/* Text review */}
          <div>
            <label className="text-sm font-medium text-text-primary mb-2 block">
              Write a Review <span className="text-text-secondary font-normal">(optional)</span>
            </label>
            <textarea
              placeholder="Share your experience with others..."
              value={text}
              onChange={(e) => setText(e.target.value.slice(0, 300))}
              rows={4}
              className="w-full bg-background border border-border rounded-2xl px-4 py-3 text-sm text-text-primary placeholder:text-text-secondary resize-none focus:border-primary focus:ring-2 focus:ring-primary/10 outline-none transition-all"
            />
            <p className="text-right text-xs text-text-secondary mt-1">{text.length}/300</p>
          </div>

          <motion.button
            whileTap={{ scale: 0.97 }}
            onClick={handleSubmit}
            disabled={isSubmitting || rating === 0}
            className="btn-primary mt-4"
          >
            {isSubmitting ? (
              <div className="w-5 h-5 border-2 border-white/40 border-t-white rounded-full animate-spin" />
            ) : (
              'Submit Review'
            )}
          </motion.button>

          <button
            onClick={() => navigate('/redemptions')}
            className="w-full text-center text-sm text-text-secondary mt-3 py-2"
          >
            Skip for now
          </button>
        </div>
      </div>
    </PageTransition>
  );
};

export default LeaveReview;
