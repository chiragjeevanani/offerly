import { useQuery } from '@tanstack/react-query';
import { supportAPI } from '../api/support.api';

const EMPTY = { email: '', phone: '', whatsapp: '', hours: '' };

/**
 * The support contacts an admin set for `audience` ('customer' | 'merchant').
 * Fields an admin left blank come back as '' - callers should hide them.
 */
export const useSupportContacts = (audience) => {
  const { data, isLoading } = useQuery({
    queryKey: ['supportContacts'],
    queryFn: async () => (await supportAPI.getContacts())?.data || {},
    staleTime: 5 * 60 * 1000,
  });
  return { contacts: { ...EMPTY, ...(data?.[audience] || {}) }, isLoading };
};

export const telHref = (phone) => `tel:${String(phone || '').replace(/[^\d+]/g, '')}`;
export const mailHref = (email) => `mailto:${email}`;
// wa.me needs the full international number with no "+"; assume India for 10-digit numbers.
export const whatsappHref = (number) => {
  const digits = String(number || '').replace(/\D/g, '');
  return `https://wa.me/${digits.length === 10 ? `91${digits}` : digits}`;
};
