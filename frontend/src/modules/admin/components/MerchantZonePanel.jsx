import { useMemo, useState } from 'react';
import { useQuery, useQueryClient } from '@tanstack/react-query';
import PlaceRoundedIcon from '@mui/icons-material/PlaceRounded';
import LockRoundedIcon from '@mui/icons-material/LockRounded';
import toast from 'react-hot-toast';
import { adminAPI } from '../../../api/admin.api';

const SOURCE_TEXT = {
  admin: 'Set by an admin - stays fixed until an admin changes it',
  auto: 'Detected from the store\'s map location',
  manual: 'Picked by the merchant at registration',
  '': 'Picked by the merchant at registration',
};

// Admin-only control for which zone a store belongs to. Merchants pick a zone
// once at registration and can't change it afterwards; this is the only way to move them.
const MerchantZonePanel = ({ merchant, onChanged }) => {
  const queryClient = useQueryClient();
  const merchantId = merchant?._id || merchant?.id;
  const [selected, setSelected] = useState(null);
  const [saving, setSaving] = useState(false);

  const { data: cities = [], isLoading } = useQuery({
    queryKey: ['adminCities'],
    queryFn: async () => {
      const res = await adminAPI.getCities();
      return res.data || res.cities || [];
    },
    staleTime: 60 * 1000,
  });

  const city = useMemo(
    () => cities.find((c) => c.name?.trim().toLowerCase() === (merchant?.city || '').trim().toLowerCase()),
    [cities, merchant?.city]
  );
  const zones = city?.zones || [];
  const currentZone = zones.find((z) => String(z._id || z.id) === String(merchant?.zone || ''));
  const value = selected ?? String(merchant?.zone || '');
  const changed = selected !== null && selected !== (merchant?.zone || '');

  const save = async () => {
    setSaving(true);
    try {
      const res = await adminAPI.updateMerchantZone(merchantId, selected);
      const next = res.data || {};
      toast.success('Zone updated');
      queryClient.invalidateQueries({ queryKey: ['adminMerchants'] });
      queryClient.invalidateQueries({ queryKey: ['adminCities'] });
      onChanged?.({ zone: next.zone ?? selected, zoneSource: next.zoneSource ?? 'admin' });
      setSelected(null);
    } catch (err) {
      toast.error(err?.error || err?.message || 'Could not update the zone');
    } finally {
      setSaving(false);
    }
  };

  return (
    <div className="bg-white rounded-2xl border border-gray-100 shadow-sm overflow-hidden">
      <div className="px-5 py-4 bg-gray-50/50 border-b border-gray-100 flex items-center justify-between gap-2">
        <h4 className="text-[14px] font-semibold text-gray-800 flex items-center gap-1.5">
          <PlaceRoundedIcon sx={{ fontSize: 18 }} className="text-[#5EB929]" /> Zone
        </h4>
        <span className="text-[10px] font-semibold text-gray-400 flex items-center gap-1">
          <LockRoundedIcon sx={{ fontSize: 12 }} /> Only admins can change this
        </span>
      </div>
      <div className="p-5 space-y-3">
        {isLoading ? (
          <p className="text-[13px] text-gray-400">Loading zones...</p>
        ) : !city ? (
          <p className="text-[13px] text-gray-500">
            {merchant?.city ? `"${merchant.city}" has no zones set up yet.` : 'This store has no city yet.'} Add zones under Cities & Zones.
          </p>
        ) : (
          <>
            <div>
              <p className="text-[15px] font-semibold text-gray-900">
                {currentZone ? currentZone.name : 'No zone'}
                {currentZone && (
                  <span className="ml-2 text-[11px] font-medium text-gray-400">
                    {((currentZone.radiusMeters || 800) / 1000).toFixed(2)} km radius
                  </span>
                )}
              </p>
              <p className="text-[12px] text-gray-500 mt-0.5">{SOURCE_TEXT[merchant?.zoneSource || '']}</p>
            </div>
            <div className="flex flex-col sm:flex-row gap-2">
              <select
                value={value}
                onChange={(e) => setSelected(e.target.value)}
                className="flex-1 h-11 px-3 bg-white border border-gray-200 rounded-xl text-[13px] font-medium outline-none focus:border-[#5EB929]"
              >
                <option value="auto">Automatic - from the store's map location</option>
                {zones.map((z) => (
                  <option key={z._id || z.id} value={String(z._id || z.id)}>
                    {z.name} ({((z.radiusMeters || 800) / 1000).toFixed(2)} km){z.status === 'inactive' ? ' - off' : ''}
                  </option>
                ))}
                <option value="">No zone</option>
              </select>
              <button
                type="button"
                onClick={save}
                disabled={!changed || saving}
                className="h-11 px-5 rounded-xl bg-[#5EB929] text-white text-[13px] font-semibold disabled:opacity-40 disabled:cursor-not-allowed"
              >
                {saving ? 'Saving...' : 'Save zone'}
              </button>
            </div>
            <p className="text-[11px] text-gray-400">
              A zone you pick here stays fixed - redrawing zones on the map won't move this store.
            </p>
          </>
        )}
      </div>
    </div>
  );
};

export default MerchantZonePanel;
