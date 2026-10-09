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

// States and union territories of India, for the store's state.
const INDIAN_STATES = [
  'Andaman and Nicobar Islands', 'Andhra Pradesh', 'Arunachal Pradesh', 'Assam', 'Bihar', 'Chandigarh', 'Chhattisgarh',
  'Dadra and Nagar Haveli and Daman and Diu', 'Delhi', 'Goa', 'Gujarat', 'Haryana', 'Himachal Pradesh', 'Jammu and Kashmir',
  'Jharkhand', 'Karnataka', 'Kerala', 'Ladakh', 'Lakshadweep', 'Madhya Pradesh', 'Maharashtra', 'Manipur', 'Meghalaya',
  'Mizoram', 'Nagaland', 'Odisha', 'Puducherry', 'Punjab', 'Rajasthan', 'Sikkim', 'Tamil Nadu', 'Telangana', 'Tripura',
  'Uttar Pradesh', 'Uttarakhand', 'West Bengal',
];

const sameName = (a, b) => (a || '').trim().toLowerCase() === (b || '').trim().toLowerCase();
const kmLabel = (z) => `${((z.radiusMeters || 800) / 1000).toFixed(2)} km`;

// Admin-only control for a store's city and zone. Merchants pick both once at
// registration and can't change them afterwards; this is how a wrong pick gets fixed.
const MerchantZonePanel = ({ merchant, onChanged }) => {
  const queryClient = useQueryClient();
  const merchantId = merchant?._id || merchant?.id;
  const [cityName, setCityName] = useState(null); // null = unchanged
  const [zoneValue, setZoneValue] = useState(null); // null = unchanged
  const [stateValue, setStateValue] = useState(null); // null = unchanged
  const [saving, setSaving] = useState(false);

  const { data: cities = [], isLoading } = useQuery({
    queryKey: ['adminCities'],
    queryFn: async () => {
      const res = await adminAPI.getCities();
      return res.data || res.cities || [];
    },
    staleTime: 60 * 1000,
  });

  const currentCity = useMemo(() => cities.find((c) => sameName(c.name, merchant?.city)), [cities, merchant?.city]);
  const currentZone = (currentCity?.zones || []).find((z) => String(z._id || z.id) === String(merchant?.zone || ''));

  const pickedCityName = cityName ?? currentCity?.name ?? merchant?.city ?? '';
  const pickedCity = cities.find((c) => sameName(c.name, pickedCityName));
  const cityChanged = !sameName(pickedCityName, merchant?.city);
  // A new city starts on automatic placement; otherwise show the current zone.
  const pickedZone = zoneValue ?? (cityChanged ? 'auto' : String(merchant?.zone || ''));
  const zoneChanged = zoneValue !== null && zoneValue !== String(merchant?.zone || '');
  const savedState = merchant?.state || '';
  // Match the saved state to the list case-insensitively; keep odd legacy values selectable.
  const savedStateOption = INDIAN_STATES.find((s) => sameName(s, savedState)) || savedState;
  const pickedState = stateValue ?? savedStateOption;
  const stateChanged = stateValue !== null && !sameName(stateValue, savedState);
  const changed = cityChanged || zoneChanged || stateChanged;

  const save = async () => {
    setSaving(true);
    try {
      const res = await adminAPI.updateMerchantZone(
        merchantId,
        pickedZone,
        cityChanged ? pickedCityName : undefined,
        stateChanged ? pickedState : undefined
      );
      const next = res.data || {};
      toast.success(cityChanged ? `Store moved to ${next.city || pickedCityName}` : 'Location updated');
      queryClient.invalidateQueries({ queryKey: ['adminMerchants'] });
      queryClient.invalidateQueries({ queryKey: ['adminCities'] });
      onChanged?.({ city: next.city ?? merchant?.city, state: next.state ?? merchant?.state, zone: next.zone ?? '', zoneSource: next.zoneSource ?? '' });
      setCityName(null);
      setZoneValue(null);
      setStateValue(null);
    } catch (err) {
      toast.error(err?.error || err?.message || 'Could not save');
    } finally {
      setSaving(false);
    }
  };

  return (
    <div className="bg-white rounded-2xl border border-gray-100 shadow-sm overflow-hidden">
      <div className="px-5 py-4 bg-gray-50/50 border-b border-gray-100 flex items-center justify-between gap-2">
        <h4 className="text-[14px] font-semibold text-gray-800 flex items-center gap-1.5">
          <PlaceRoundedIcon sx={{ fontSize: 18 }} className="text-[#5EB929]" /> City, State & Zone
        </h4>
        <span className="text-[10px] font-semibold text-gray-400 flex items-center gap-1">
          <LockRoundedIcon sx={{ fontSize: 12 }} /> Only admins can change these
        </span>
      </div>
      <div className="p-5 space-y-4">
        {isLoading ? (
          <p className="text-[13px] text-gray-400">Loading cities...</p>
        ) : (
          <>
            <div>
              <p className="text-[15px] font-semibold text-gray-900">
                {merchant?.city || 'No city'}{merchant?.state ? `, ${merchant.state}` : ''}
                <span className="text-gray-300 mx-1.5">·</span>
                {currentZone ? currentZone.name : 'No zone'}
                {currentZone && <span className="ml-2 text-[11px] font-medium text-gray-400">{kmLabel(currentZone)} radius</span>}
              </p>
              <p className="text-[12px] text-gray-500 mt-0.5">Zone: {SOURCE_TEXT[merchant?.zoneSource || '']}</p>
              {merchant?.city && !currentCity && (
                <p className="text-[12px] text-amber-600 mt-1">"{merchant.city}" isn't in Cities & Zones - pick the right city below.</p>
              )}
            </div>

            <label className="block">
              <span className="text-[11px] font-semibold text-gray-500 uppercase tracking-wide">City</span>
              <select
                value={pickedCity?.name ?? ''}
                onChange={(e) => {
                  setCityName(e.target.value);
                  setZoneValue(null);
                }}
                className="mt-1.5 w-full h-11 px-3 bg-white border border-gray-200 rounded-xl text-[13px] font-medium outline-none focus:border-[#5EB929]"
              >
                {!pickedCity && <option value="">Select a city</option>}
                {cities.map((c) => (
                  <option key={c._id || c.id} value={c.name}>
                    {c.name}{c.status === 'inactive' ? ' (inactive)' : ''}
                  </option>
                ))}
              </select>
            </label>

            <label className="block">
              <span className="text-[11px] font-semibold text-gray-500 uppercase tracking-wide">State</span>
              <select
                value={pickedState}
                onChange={(e) => setStateValue(e.target.value)}
                className="mt-1.5 w-full h-11 px-3 bg-white border border-gray-200 rounded-xl text-[13px] font-medium outline-none focus:border-[#5EB929]"
              >
                {!pickedState && <option value="">Select a state</option>}
                {pickedState && !INDIAN_STATES.includes(pickedState) && <option value={pickedState}>{pickedState}</option>}
                {INDIAN_STATES.map((s) => (
                  <option key={s} value={s}>{s}</option>
                ))}
              </select>
            </label>

            <label className="block">
              <span className="text-[11px] font-semibold text-gray-500 uppercase tracking-wide">Zone</span>
              <select
                value={pickedZone}
                onChange={(e) => setZoneValue(e.target.value)}
                disabled={!pickedCity}
                className="mt-1.5 w-full h-11 px-3 bg-white border border-gray-200 rounded-xl text-[13px] font-medium outline-none focus:border-[#5EB929] disabled:bg-gray-50"
              >
                <option value="auto">Automatic - from the store's map location</option>
                {(pickedCity?.zones || []).map((z) => (
                  <option key={z._id || z.id} value={String(z._id || z.id)}>
                    {z.name} ({kmLabel(z)}){z.status === 'inactive' ? ' - off' : ''}
                  </option>
                ))}
                <option value="">No zone</option>
              </select>
            </label>

            {cityChanged && (
              <p className="text-[12px] text-indigo-600 bg-indigo-50 rounded-lg px-3 py-2">
                This moves the store from {merchant?.city || 'no city'} to {pickedCityName}. Its offers will show to customers in {pickedCityName}, and the merchant is notified.
              </p>
            )}

            <button
              type="button"
              onClick={save}
              disabled={!changed || saving || !pickedCity}
              className="w-full h-11 rounded-xl bg-[#5EB929] text-white text-[13px] font-semibold disabled:opacity-40 disabled:cursor-not-allowed"
            >
              {saving ? 'Saving...' : cityChanged ? 'Move store' : 'Save'}
            </button>
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
