// The Indian food mark: green square + dot (veg), red square + triangle
// (non-veg), amber square + dot (egg).
export const FOOD_TYPES = [
  { value: 'veg', label: 'Veg' },
  { value: 'non_veg', label: 'Non-Veg' },
  { value: 'egg', label: 'Egg' },
];

const COLORS = {
  veg: { border: 'border-green-600', fill: 'bg-green-600', text: 'text-green-600' },
  non_veg: { border: 'border-red-600', fill: 'bg-red-600', text: 'text-red-600' },
  egg: { border: 'border-amber-500', fill: 'bg-amber-500', text: 'text-amber-500' },
};

// foodType, falling back to the older isVeg flag
export const getFoodType = (product) => {
  if (!product) return null;
  if (product.foodType) return product.foodType;
  if (product.isVeg === true) return 'veg';
  if (product.isVeg === false) return 'non_veg';
  return null;
};

const FoodTypeMark = ({ type, size = 12, className = '' }) => {
  const c = COLORS[type];
  if (!c) return null;
  const label = FOOD_TYPES.find((t) => t.value === type)?.label;
  const inner = Math.round(size * 0.5);
  return (
    <span
      role="img"
      aria-label={label}
      title={label}
      className={`inline-grid place-items-center shrink-0 border-[1.5px] rounded-[2px] bg-white ${c.border} ${className}`}
      style={{ width: size, height: size }}
    >
      {type === 'non_veg' ? (
        <span
          className={c.text}
          style={{
            width: 0,
            height: 0,
            borderLeft: `${inner / 2 + 0.5}px solid transparent`,
            borderRight: `${inner / 2 + 0.5}px solid transparent`,
            borderBottom: `${inner}px solid currentColor`,
          }}
        />
      ) : (
        <span className={`rounded-full ${c.fill}`} style={{ width: inner, height: inner }} />
      )}
    </span>
  );
};

export default FoodTypeMark;
