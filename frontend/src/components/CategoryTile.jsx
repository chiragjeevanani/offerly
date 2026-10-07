import { getCategoryVisual } from '../utils/categoryVisuals';

// Rounded tile used for the customer home "Select Services" row and the admin preview.
const CategoryTile = ({ category, size = 52, iconSize = 22, className = '' }) => {
  const { Icon, color, image } = getCategoryVisual(category);
  return (
    <div
      className={`rounded-2xl shadow-sm flex items-center justify-center border border-gray-100 overflow-hidden ${className}`}
      style={{ width: size, height: size, backgroundColor: `${color}1A`, color }}
    >
      {image ? (
        <img src={image} alt={category?.name || ''} className="w-full h-full object-cover" loading="lazy" />
      ) : (
        <Icon sx={{ fontSize: iconSize }} className="transition-transform group-hover:scale-110" />
      )}
    </div>
  );
};

export default CategoryTile;
