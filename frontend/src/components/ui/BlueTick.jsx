import VerifiedRoundedIcon from '@mui/icons-material/VerifiedRounded';

export const BLUE_TICK_COLOR = '#1D9BF0';

// "Offerly verified seller" badge, shown next to a store's name when the store
// meets the admin's Blue Tick rules (Merchant.verified, set by blueTickService).
const BlueTick = ({ size = 14, className = '' }) => (
  <VerifiedRoundedIcon
    titleAccess="Offerly verified seller"
    aria-label="Offerly verified seller"
    sx={{ fontSize: size, color: BLUE_TICK_COLOR }}
    className={`flex-shrink-0 ${className}`}
  />
);

export default BlueTick;
