import RestaurantRoundedIcon from '@mui/icons-material/RestaurantRounded';
import LocalCafeRoundedIcon from '@mui/icons-material/LocalCafeRounded';
import BakeryDiningRoundedIcon from '@mui/icons-material/BakeryDiningRounded';
import CakeRoundedIcon from '@mui/icons-material/CakeRounded';
import LocalBarRoundedIcon from '@mui/icons-material/LocalBarRounded';
import ContentCutRoundedIcon from '@mui/icons-material/ContentCutRounded';
import FaceRetouchingNaturalRoundedIcon from '@mui/icons-material/FaceRetouchingNaturalRounded';
import SpaRoundedIcon from '@mui/icons-material/SpaRounded';
import ShoppingCartRoundedIcon from '@mui/icons-material/ShoppingCartRounded';
import LocalGroceryStoreRoundedIcon from '@mui/icons-material/LocalGroceryStoreRounded';
import LocalMallRoundedIcon from '@mui/icons-material/LocalMallRounded';
import StorefrontRoundedIcon from '@mui/icons-material/StorefrontRounded';
import CheckroomRoundedIcon from '@mui/icons-material/CheckroomRounded';
import DiamondRoundedIcon from '@mui/icons-material/DiamondRounded';
import PhoneIphoneRoundedIcon from '@mui/icons-material/PhoneIphoneRounded';
import FitnessCenterRoundedIcon from '@mui/icons-material/FitnessCenterRounded';
import SportsEsportsRoundedIcon from '@mui/icons-material/SportsEsportsRounded';
import HealthAndSafetyRoundedIcon from '@mui/icons-material/HealthAndSafetyRounded';
import MedicalServicesRoundedIcon from '@mui/icons-material/MedicalServicesRounded';
import LocalPharmacyRoundedIcon from '@mui/icons-material/LocalPharmacyRounded';
import BuildRoundedIcon from '@mui/icons-material/BuildRounded';
import HomeRepairServiceRoundedIcon from '@mui/icons-material/HomeRepairServiceRounded';
import ElectricalServicesRoundedIcon from '@mui/icons-material/ElectricalServicesRounded';
import LocalLaundryServiceRoundedIcon from '@mui/icons-material/LocalLaundryServiceRounded';
import DirectionsCarRoundedIcon from '@mui/icons-material/DirectionsCarRounded';
import TwoWheelerRoundedIcon from '@mui/icons-material/TwoWheelerRounded';
import SchoolRoundedIcon from '@mui/icons-material/SchoolRounded';
import PetsRoundedIcon from '@mui/icons-material/PetsRounded';
import LocalFloristRoundedIcon from '@mui/icons-material/LocalFloristRounded';
import HotelRoundedIcon from '@mui/icons-material/HotelRounded';
import CelebrationRoundedIcon from '@mui/icons-material/CelebrationRounded';
import CategoryRoundedIcon from '@mui/icons-material/CategoryRounded';

// Icon keys are Material icon names (snake_case), matching what
// backend/src/seeders/categorySeeder.js stores in Category.icon.
export const CATEGORY_ICONS = {
  restaurant: { label: 'Food', Icon: RestaurantRoundedIcon },
  local_cafe: { label: 'Cafe', Icon: LocalCafeRoundedIcon },
  bakery_dining: { label: 'Bakery', Icon: BakeryDiningRoundedIcon },
  cake: { label: 'Cakes', Icon: CakeRoundedIcon },
  local_bar: { label: 'Bar', Icon: LocalBarRoundedIcon },
  content_cut: { label: 'Salon', Icon: ContentCutRoundedIcon },
  face_retouching_natural: { label: 'Beauty', Icon: FaceRetouchingNaturalRoundedIcon },
  spa: { label: 'Spa', Icon: SpaRoundedIcon },
  shopping_cart: { label: 'Shops', Icon: ShoppingCartRoundedIcon },
  local_grocery_store: { label: 'Grocery', Icon: LocalGroceryStoreRoundedIcon },
  local_mall: { label: 'Mall', Icon: LocalMallRoundedIcon },
  storefront: { label: 'Store', Icon: StorefrontRoundedIcon },
  checkroom: { label: 'Fashion', Icon: CheckroomRoundedIcon },
  diamond: { label: 'Jewellery', Icon: DiamondRoundedIcon },
  phone_iphone: { label: 'Mobiles', Icon: PhoneIphoneRoundedIcon },
  fitness_center: { label: 'Gym', Icon: FitnessCenterRoundedIcon },
  sports_esports: { label: 'Gaming', Icon: SportsEsportsRoundedIcon },
  health_and_safety: { label: 'Health', Icon: HealthAndSafetyRoundedIcon },
  medical_services: { label: 'Clinic', Icon: MedicalServicesRoundedIcon },
  local_pharmacy: { label: 'Pharmacy', Icon: LocalPharmacyRoundedIcon },
  build: { label: 'Services', Icon: BuildRoundedIcon },
  home_repair_service: { label: 'Repairs', Icon: HomeRepairServiceRoundedIcon },
  electrical_services: { label: 'Electrical', Icon: ElectricalServicesRoundedIcon },
  local_laundry_service: { label: 'Laundry', Icon: LocalLaundryServiceRoundedIcon },
  directions_car: { label: 'Car', Icon: DirectionsCarRoundedIcon },
  two_wheeler: { label: 'Bike', Icon: TwoWheelerRoundedIcon },
  school: { label: 'Education', Icon: SchoolRoundedIcon },
  pets: { label: 'Pets', Icon: PetsRoundedIcon },
  local_florist: { label: 'Florist', Icon: LocalFloristRoundedIcon },
  hotel: { label: 'Hotel', Icon: HotelRoundedIcon },
  celebration: { label: 'Events', Icon: CelebrationRoundedIcon },
  category: { label: 'Generic', Icon: CategoryRoundedIcon },
};

export const CATEGORY_COLORS = [
  '#F97316', '#A855F7', '#3B82F6', '#EF4444', '#F59E0B', '#14B8A6',
  '#EC4899', '#5EB929', '#6366F1', '#795548', '#0EA5E9', '#64748B',
];

// Categories created before icons/colours were admin-editable carry the schema
// defaults ('category' / '#3D7A4F'); fall back to the old name-based look so the
// home row doesn't suddenly turn uniform.
const LEGACY_BY_NAME = {
  food: ['restaurant', '#F97316'],
  saloon: ['content_cut', '#A855F7'],
  salon: ['content_cut', '#A855F7'],
  shops: ['shopping_cart', '#3B82F6'],
  gym: ['fitness_center', '#EF4444'],
  services: ['build', '#F59E0B'],
  cafe: ['local_cafe', '#B45309'],
  health: ['medical_services', '#14B8A6'],
};
const LEGACY_DEFAULT_COLOR = '#3D7A4F';
const FALLBACK_COLOR = '#5EB929';

export const getCategoryVisual = (cat = {}) => {
  const legacy = LEGACY_BY_NAME[String(cat.name || '').trim().toLowerCase()];
  const iconKey = CATEGORY_ICONS[cat.icon] && cat.icon !== 'category'
    ? cat.icon
    : legacy?.[0] || cat.icon;
  const Icon = CATEGORY_ICONS[iconKey]?.Icon || StorefrontRoundedIcon;

  const hasCustomColor = /^#[0-9A-F]{6}$/i.test(cat.color || '') && cat.color.toUpperCase() !== LEGACY_DEFAULT_COLOR;
  const color = hasCustomColor ? cat.color : legacy?.[1] || FALLBACK_COLOR;

  return { Icon, iconKey: CATEGORY_ICONS[iconKey] ? iconKey : 'storefront', color, image: cat.image || '' };
};
