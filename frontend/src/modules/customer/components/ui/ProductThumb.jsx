import { useState } from 'react';
import ShoppingBagRoundedIcon from '@mui/icons-material/ShoppingBagRounded';

// Product image for cart / booking line items. Images are optional for some
// store types (restaurants), so fall back to a neutral icon tile.
const ProductThumb = ({ src, alt = '', className = 'w-14 h-14' }) => {
  const [failed, setFailed] = useState(false);

  if (!src || failed) {
    return (
      <div className={`${className} shrink-0 rounded-xl bg-[#F8FAFC] border border-gray-100 flex items-center justify-center text-gray-300`}>
        <ShoppingBagRoundedIcon sx={{ fontSize: 20 }} />
      </div>
    );
  }

  return (
    <img
      src={src}
      alt={alt}
      loading="lazy"
      onError={() => setFailed(true)}
      className={`${className} shrink-0 rounded-xl object-cover border border-gray-100 bg-gray-50`}
    />
  );
};

export default ProductThumb;
