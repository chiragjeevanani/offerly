import React from 'react';
import LocalOfferRoundedIcon from '@mui/icons-material/LocalOfferRounded';
import GridViewRoundedIcon from '@mui/icons-material/GridViewRounded';
import VisibilityRoundedIcon from '@mui/icons-material/VisibilityRounded';
import CampaignRoundedIcon from '@mui/icons-material/CampaignRounded';
import StarRoundedIcon from '@mui/icons-material/StarRounded';
import LocationOnRoundedIcon from '@mui/icons-material/LocationOnRounded';
import BarChartRoundedIcon from '@mui/icons-material/BarChartRounded';
import SupportAgentRoundedIcon from '@mui/icons-material/SupportAgentRounded';
import WorkspacePremiumRoundedIcon from '@mui/icons-material/WorkspacePremiumRounded';
import GroupRoundedIcon from '@mui/icons-material/GroupRounded';
import CheckCircleRoundedIcon from '@mui/icons-material/CheckCircleRounded';
import RocketLaunchRoundedIcon from '@mui/icons-material/RocketLaunchRounded';
import BoltRoundedIcon from '@mui/icons-material/BoltRounded';
import StorefrontRoundedIcon from '@mui/icons-material/StorefrontRounded';
import NotificationsActiveRoundedIcon from '@mui/icons-material/NotificationsActiveRounded';

export const ICON_OPTIONS = [
  { id: 'tag', label: 'Offers / Tag' },
  { id: 'grid', label: 'Grid / Card View' },
  { id: 'eye', label: 'Eye / Store Profile' },
  { id: 'no_ads', label: 'No Ads' },
  { id: 'star', label: 'Star / Featured' },
  { id: 'map_pin', label: 'Map Pin / Location' },
  { id: 'megaphone', label: 'Megaphone / Banner Promo' },
  { id: 'chart', label: 'Bar Chart / Insights' },
  { id: 'support', label: 'Headphones / Support' },
  { id: 'crown', label: 'Crown / Premium' },
  { id: 'manager', label: 'Users / Account Manager' },
  { id: 'store', label: 'Storefront' },
  { id: 'rocket', label: 'Rocket / Growth' },
  { id: 'bolt', label: 'Lightning / Fast' },
  { id: 'bell', label: 'Bell / Notifications' },
  { id: 'check', label: 'Checkmark' },
];

export const renderPlanIcon = (iconName, { size = 18, className = '' } = {}) => {
  const normalized = (iconName || '').toLowerCase().trim().replace(/[-_ ]/g, '');
  const sx = { fontSize: size };

  if (normalized.includes('tag') || normalized.includes('offer')) {
    return <LocalOfferRoundedIcon sx={sx} className={className} />;
  }
  if (normalized.includes('grid') || normalized.includes('cardview') || normalized.includes('layout')) {
    return <GridViewRoundedIcon sx={sx} className={className} />;
  }
  if (normalized.includes('eye') || normalized.includes('view') || normalized.includes('profile')) {
    return <VisibilityRoundedIcon sx={sx} className={className} />;
  }
  if (normalized.includes('noad') || normalized.includes('adblock') || normalized.includes('ban')) {
    return (
      <div className="relative inline-flex items-center justify-center">
        <CampaignRoundedIcon sx={sx} className={className} />
        <span className="absolute w-full h-[2px] bg-red-500 rotate-45 pointer-events-none rounded" />
      </div>
    );
  }
  if (normalized.includes('star') || normalized.includes('featured')) {
    return <StarRoundedIcon sx={sx} className={className} />;
  }
  if (normalized.includes('map') || normalized.includes('pin') || normalized.includes('location')) {
    return <LocationOnRoundedIcon sx={sx} className={className} />;
  }
  if (normalized.includes('megaphone') || normalized.includes('promo') || normalized.includes('banner')) {
    return <CampaignRoundedIcon sx={sx} className={className} />;
  }
  if (normalized.includes('chart') || normalized.includes('insight') || normalized.includes('analytics')) {
    return <BarChartRoundedIcon sx={sx} className={className} />;
  }
  if (normalized.includes('support') || normalized.includes('headphone') || normalized.includes('help')) {
    return <SupportAgentRoundedIcon sx={sx} className={className} />;
  }
  if (normalized.includes('crown') || normalized.includes('vip') || normalized.includes('premium')) {
    return <WorkspacePremiumRoundedIcon sx={sx} className={className} />;
  }
  if (normalized.includes('manager') || normalized.includes('user') || normalized.includes('team') || normalized.includes('account')) {
    return <GroupRoundedIcon sx={sx} className={className} />;
  }
  if (normalized.includes('store') || normalized.includes('shop')) {
    return <StorefrontRoundedIcon sx={sx} className={className} />;
  }
  if (normalized.includes('rocket') || normalized.includes('growth')) {
    return <RocketLaunchRoundedIcon sx={sx} className={className} />;
  }
  if (normalized.includes('bolt') || normalized.includes('speed')) {
    return <BoltRoundedIcon sx={sx} className={className} />;
  }
  if (normalized.includes('bell') || normalized.includes('alert')) {
    return <NotificationsActiveRoundedIcon sx={sx} className={className} />;
  }

  return <CheckCircleRoundedIcon sx={sx} className={className} />;
};
