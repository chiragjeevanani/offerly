import { AnimatePresence } from 'framer-motion';
import MerchantCard from './MerchantCard';
import StorefrontRoundedIcon from '@mui/icons-material/StorefrontRounded';

const MerchantCardList = ({ 
  merchants, 
  onApprove, 
  onReject, 
  onCardClick, 
  searchQuery = '', 
  searchKey = 'storeName' 
}) => {
  // Filter merchants based on search query
  const filteredMerchants = merchants.filter(merchant => {
    if (!searchQuery) return true;
    const value = merchant[searchKey];
    return value && value.toLowerCase().includes(searchQuery.toLowerCase());
  });

  // Empty state
  if (filteredMerchants.length === 0) {
    return (
      <div className="bg-white rounded-2xl border border-gray-100 p-20 text-center">
        <StorefrontRoundedIcon className="text-gray-200 mb-4" sx={{ fontSize: 80 }} />
        <p className="text-gray-400 font-bold uppercase tracking-widest">
          {searchQuery ? 'No merchants found matching your search' : 'No merchant requests found'}
        </p>
      </div>
    );
  }

  return (
    <div className="space-y-5">
      <AnimatePresence mode="popLayout">
        {filteredMerchants.map((merchant) => (
          <MerchantCard
            key={merchant.id}
            merchant={merchant}
            onApprove={onApprove}
            onReject={onReject}
            onClick={onCardClick}
          />
        ))}
      </AnimatePresence>
    </div>
  );
};

export default MerchantCardList;
