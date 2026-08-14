import { motion } from 'framer-motion';
import RestaurantRoundedIcon from '@mui/icons-material/RestaurantRounded';
import ContentCutRoundedIcon from '@mui/icons-material/ContentCutRounded';
import StorefrontRoundedIcon from '@mui/icons-material/StorefrontRounded';
import FitnessCenterRoundedIcon from '@mui/icons-material/FitnessCenterRounded';
import BuildRoundedIcon from '@mui/icons-material/BuildRounded';
import LocalCafeRoundedIcon from '@mui/icons-material/LocalCafeRounded';
import HealthAndSafetyRoundedIcon from '@mui/icons-material/HealthAndSafetyRounded';
import CheckroomRoundedIcon from '@mui/icons-material/CheckroomRounded';
import AddCircleRoundedIcon from '@mui/icons-material/AddCircleRounded';

const iconMap = {
  Food: RestaurantRoundedIcon,
  Saloon: ContentCutRoundedIcon,
  Shops: StorefrontRoundedIcon,
  Gym: FitnessCenterRoundedIcon,
  Services: BuildRoundedIcon,
  Cafe: LocalCafeRoundedIcon,
  Health: HealthAndSafetyRoundedIcon,
  Fashion: CheckroomRoundedIcon,
  More: AddCircleRoundedIcon,
};

const colorMap = {
  Food: '#FF6B35',
  Saloon: '#9B59B6',
  Shops: '#3498DB',
  Gym: '#E74C3C',
  Services: '#F39C12',
  Cafe: '#795548',
  Health: '#2ECC71',
  Fashion: '#E91E63',
  More: '#6B7280',
};

// ── Chip (horizontal scroll pill) variant ────────────────────────────────────
export const CategoryChip = ({ label, isActive, onClick }) => {
  const Icon = iconMap[label] || StorefrontRoundedIcon;

  return (
    <motion.button
      whileTap={{ scale: 0.93 }}
      onClick={onClick}
      className={`flex items-center gap-1.5 px-4 py-2 rounded-full text-sm font-medium flex-shrink-0 transition-all duration-200 ${
        isActive
          ? 'bg-primary text-white shadow-sm'
          : 'bg-surface text-text-secondary border border-border'
      }`}
    >
      <Icon sx={{ fontSize: 16 }} />
      {label}
    </motion.button>
  );
};

// ── Grid card variant ─────────────────────────────────────────────────────────
export const CategoryCard = ({ label, onClick }) => {
  const Icon = iconMap[label] || StorefrontRoundedIcon;
  const color = colorMap[label] || '#5EB929';

  return (
    <motion.button
      whileTap={{ scale: 0.93 }}
      onClick={onClick}
      className="flex flex-col items-center gap-2 bg-surface rounded-2xl p-3 shadow-card cursor-pointer min-w-0"
    >
      <div
        className="w-12 h-12 rounded-xl flex items-center justify-center"
        style={{ backgroundColor: `${color}18` }}
      >
        <Icon sx={{ fontSize: 24, color }} />
      </div>
      <span className="text-xs font-medium text-text-primary">{label}</span>
    </motion.button>
  );
};

export default CategoryChip;
