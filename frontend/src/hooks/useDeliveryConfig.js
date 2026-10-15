import { useQuery } from '@tanstack/react-query';
import { deliveryAPI } from '../api/delivery.api';

const OFF = {
  enabled: false,
  deliveryFee: 0,
  freeDeliveryMinOrder: 0,
  allowCod: true,
  allowOnline: true,
  maxDistanceKm: 0,
  freeGift: { enabled: false, minOrderValue: 0, title: '', description: '', appliesTo: 'delivery' },
};

// Admin's delivery switch + pricing, shared by cart and checkout. While it
// loads (or fails) delivery counts as off, so the app never offers a method
// the server will refuse.
export const useDeliveryConfig = () => {
  const { data, isLoading } = useQuery({
    queryKey: ['deliveryConfig'],
    queryFn: async () => (await deliveryAPI.getConfig())?.data || OFF,
    staleTime: 60_000,
  });
  return { config: data || OFF, isLoading };
};

// The delivery charge and free-gift status for an items total. Mirrors
// deliveryFeeFor / giftFor on the server.
export const priceDelivery = (config, subtotal, method) => {
  const isDelivery = method === 'delivery';
  const freeMin = config.freeDeliveryMinOrder || 0;
  const freeDelivery = freeMin > 0 && subtotal >= freeMin;
  const fee = isDelivery && !freeDelivery ? Math.round(config.deliveryFee || 0) : 0;
  const toFreeDelivery = isDelivery && freeMin > 0 && !freeDelivery ? Math.ceil(freeMin - subtotal) : 0;

  const gift = config.freeGift || {};
  const giftOn = gift.enabled && (gift.appliesTo === 'all' || isDelivery);
  const giftUnlocked = giftOn && subtotal >= (gift.minOrderValue || 0);
  const toGift = giftOn && !giftUnlocked ? Math.ceil(gift.minOrderValue - subtotal) : 0;

  return { fee, freeDelivery: isDelivery && (freeDelivery || !config.deliveryFee), toFreeDelivery, giftOn, giftUnlocked, toGift, gift };
};

export default useDeliveryConfig;
