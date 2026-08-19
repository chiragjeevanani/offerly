import { useState, useEffect } from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import BookmarkRoundedIcon from '@mui/icons-material/BookmarkRounded';
import { userAPI } from '../../../../api/user.api';
import { useApp } from '../../context/AppContext';
import OfferCard from '../../components/ui/OfferCard';
import PageTransition from '../../components/ui/PageTransition';
import toast from 'react-hot-toast';

const SavedOffers = () => {
  const { isLoggedIn } = useApp();
  const [saved, setSaved] = useState([]);
  const [loading, setLoading] = useState(true);

  const loadSaved = async () => {
    if (!isLoggedIn) {
      setLoading(false);
      return;
    }
    
    setLoading(true);
    try {
      const response = await userAPI.getSavedOffers();
      setSaved(response.offers || []);
    } catch (error) {
      console.error('Failed to load saved offers:', error);
      toast.error('Failed to load saved offers');
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => { loadSaved(); }, [isLoggedIn]);

  if (loading) {
    return (
      <PageTransition>
        <div className="flex items-center justify-center min-h-screen">
          <div className="w-12 h-12 border-4 border-primary border-t-transparent rounded-full animate-spin" />
        </div>
      </PageTransition>
    );
  }

  return (
    <PageTransition>
      <div className="min-h-screen bg-background px-4 py-4 pb-24 space-y-4">
        
        {saved.length === 0 ? (
          <motion.div
            initial={{ opacity: 0, scale: 0.95 }}
            animate={{ opacity: 1, scale: 1 }}
            className="flex flex-col items-center justify-center py-28 text-center"
          >
            <div className="w-20 h-20 bg-white rounded-3xl flex items-center justify-center mb-6 shadow-sm border border-gray-100">
              <BookmarkRoundedIcon sx={{ fontSize: 32 }} className="text-gray-200" />
            </div>
            <h2 className="text-sm font-bold text-gray-800 uppercase tracking-tight">Your vault is empty</h2>
            <p className="text-[11px] text-gray-400 font-medium px-10 mt-1 leading-relaxed">
              Save offers you love to keep them safe and access them instantly anytime.
            </p>
            <button 
              onClick={() => window.location.href = '/explore'}
              className="mt-8 text-[10px] font-bold text-[#5EB929] uppercase tracking-widest bg-white border border-gray-100 px-6 py-2.5 rounded-xl shadow-sm active:scale-95 transition-all"
            >
              Discover Offers
            </button>
          </motion.div>
        ) : (
          <>
            <div className="flex flex-col px-0.5">
              <p className="text-[9px] text-gray-400 font-bold uppercase tracking-widest leading-none">Your Curated Collection</p>
              <p className="text-[11px] text-gray-800 font-bold mt-0.5">
                {saved.length} {saved.length === 1 ? 'SAVED DEAL' : 'SAVED DEALS'} IN YOUR VAULT
              </p>
            </div>

            <AnimatePresence>
              <div className="space-y-3">
                {saved.map((offer, idx) => (
                  <motion.div
                    key={offer.id || offer._id}
                    initial={{ opacity: 0, y: 10 }}
                    animate={{ opacity: 1, y: 0 }}
                    exit={{ opacity: 0, x: -20 }}
                    transition={{ delay: idx * 0.05 }}
                  >
                    <OfferCard offer={offer} variant="list" viewSource="saved" onSaveToggle={loadSaved} />
                  </motion.div>
                ))}
              </div>
            </AnimatePresence>
          </>
        )}
      </div>
    </PageTransition>
  );
};

export default SavedOffers;
