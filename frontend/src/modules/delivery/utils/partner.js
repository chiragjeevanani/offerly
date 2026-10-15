import TwoWheelerRoundedIcon from '@mui/icons-material/TwoWheelerRounded';
import ElectricScooterRoundedIcon from '@mui/icons-material/ElectricScooterRounded';
import PedalBikeRoundedIcon from '@mui/icons-material/PedalBikeRounded';
import DirectionsCarRoundedIcon from '@mui/icons-material/DirectionsCarRounded';
import { uploadAPI } from '../../../api/upload.api';

export const VEHICLES = [
  { key: 'bike', label: 'Motorbike', icon: TwoWheelerRoundedIcon },
  { key: 'scooter', label: 'Scooter', icon: ElectricScooterRoundedIcon },
  { key: 'bicycle', label: 'Bicycle', icon: PedalBikeRoundedIcon },
  { key: 'other', label: 'Other', icon: DirectionsCarRoundedIcon },
];

export const STAGE_LABEL = {
  preparing: { label: 'Store packing', cls: 'bg-amber-50 text-amber-700' },
  ready: { label: 'Ready for pickup', cls: 'bg-[#5EB929]/10 text-[#3F7F17]' },
  picked_up: { label: 'Out for delivery', cls: 'bg-sky-50 text-sky-700' },
  delivered: { label: 'Delivered', cls: 'bg-green-50 text-green-700' },
  cancelled: { label: 'Cancelled', cls: 'bg-gray-100 text-gray-500' },
};

export const rupees = (n) => `₹${Math.round(n || 0).toLocaleString('en-IN')}`;

// Google Maps directions to a pin, or a search for the address text.
export const mapsLink = ({ lat, lng, query }) =>
  lat != null && lng != null
    ? `https://www.google.com/maps/dir/?api=1&destination=${lat},${lng}`
    : `https://www.google.com/maps/search/?api=1&query=${encodeURIComponent(query || '')}`;

// Uploads a picked file and returns its URL; '' for no file. A string (an
// already-uploaded URL) passes straight through.
export const uploadDocument = async (file) => {
  if (!file) return '';
  if (typeof file === 'string') return file;
  const res = await uploadAPI.uploadImage(file);
  if (!res?.url) throw new Error(res?.message || 'Upload failed');
  return res.url;
};
