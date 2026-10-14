import { useState } from 'react';
import { createPortal } from 'react-dom';
import { useQuery, useQueryClient } from '@tanstack/react-query';
import ViewCarouselRoundedIcon from '@mui/icons-material/ViewCarouselRounded';
import AddRoundedIcon from '@mui/icons-material/AddRounded';
import EditRoundedIcon from '@mui/icons-material/EditRounded';
import DeleteOutlineRoundedIcon from '@mui/icons-material/DeleteOutlineRounded';
import ArrowUpwardRoundedIcon from '@mui/icons-material/ArrowUpwardRounded';
import ArrowDownwardRoundedIcon from '@mui/icons-material/ArrowDownwardRounded';
import CloseRoundedIcon from '@mui/icons-material/CloseRounded';
import CloudUploadRoundedIcon from '@mui/icons-material/CloudUploadRounded';
import LinkRoundedIcon from '@mui/icons-material/LinkRounded';
import TouchAppRoundedIcon from '@mui/icons-material/TouchAppRounded';
import toast from 'react-hot-toast';
import { adminAPI } from '../../../api/admin.api';
import { uploadAPI } from '../../../api/upload.api';
import { useCities } from '../../../hooks/useReferenceData';

const EMPTY_FORM = { image: '', title: '', link: '', cities: [], isActive: true, startDate: '', endDate: '' };

// Local calendar date (toISOString would shift IST midnight back to the previous day).
const toDateInput = (value) => {
  if (!value) return '';
  const d = new Date(value);
  return `${d.getFullYear()}-${String(d.getMonth() + 1).padStart(2, '0')}-${String(d.getDate()).padStart(2, '0')}`;
};
const formatDate = (value) =>
  new Date(value).toLocaleDateString('en-IN', { day: 'numeric', month: 'short', year: 'numeric' });

// What the customer app is doing with this banner right now.
const bannerStatus = (b) => {
  const now = Date.now();
  if (!b.isActive) return { label: 'Paused', cls: 'bg-gray-100 text-gray-600' };
  if (b.startDate && new Date(b.startDate).getTime() > now) return { label: 'Scheduled', cls: 'bg-amber-50 text-amber-700' };
  if (b.endDate && new Date(b.endDate).getTime() < now) return { label: 'Ended', cls: 'bg-red-50 text-red-600' };
  return { label: 'Live', cls: 'bg-[#5EB929]/10 text-[#3f8a17]' };
};

const errorText = (err, fallback) => err?.response?.data?.error || err?.response?.data?.message || fallback;

const BannerForm = ({ initial, onClose, onSaved }) => {
  const { data: cities = [] } = useCities();
  const [form, setForm] = useState(initial);
  const [uploading, setUploading] = useState(false);
  const [saving, setSaving] = useState(false);
  const set = (patch) => setForm((f) => ({ ...f, ...patch }));

  const handleUpload = async (e) => {
    const file = e.target.files?.[0];
    e.target.value = '';
    if (!file) return;
    setUploading(true);
    try {
      const res = await uploadAPI.uploadImage(file);
      set({ image: res?.url || '' });
    } catch (err) {
      toast.error(errorText(err, 'Image upload failed'));
    } finally {
      setUploading(false);
    }
  };

  const toggleCity = (name) =>
    set({ cities: form.cities.includes(name) ? form.cities.filter((c) => c !== name) : [...form.cities, name] });

  const handleSubmit = async (e) => {
    e.preventDefault();
    if (!form.image) return toast.error('Upload a banner image');
    setSaving(true);
    try {
      const payload = {
        ...form,
        // End date counts the whole day.
        startDate: form.startDate ? new Date(`${form.startDate}T00:00:00`).toISOString() : null,
        endDate: form.endDate ? new Date(`${form.endDate}T23:59:59`).toISOString() : null,
      };
      if (initial._id) await adminAPI.updateHomeBanner(initial._id, payload);
      else await adminAPI.createHomeBanner(payload);
      toast.success(initial._id ? 'Banner updated' : 'Banner added');
      onSaved();
    } catch (err) {
      toast.error(errorText(err, 'Failed to save banner'));
    } finally {
      setSaving(false);
    }
  };

  return createPortal(
    <div className="fixed inset-0 z-[100] bg-black/40 flex items-end sm:items-center justify-center" onClick={onClose}>
      <form
        onSubmit={handleSubmit}
        onClick={(e) => e.stopPropagation()}
        className="bg-white w-full sm:max-w-lg max-h-[92vh] overflow-y-auto rounded-t-2xl sm:rounded-2xl shadow-xl"
      >
        <div className="sticky top-0 bg-white px-5 py-4 border-b border-gray-100 flex items-center justify-between z-10">
          <h3 className="text-[15px] font-semibold text-gray-800">{initial._id ? 'Edit banner' : 'Add banner'}</h3>
          <button type="button" onClick={onClose} className="p-1.5 rounded-lg hover:bg-gray-100 text-gray-500">
            <CloseRoundedIcon sx={{ fontSize: 20 }} />
          </button>
        </div>

        <div className="p-5 space-y-5">
          <div>
            <label className="block text-[13px] font-medium text-gray-700 mb-1.5">Banner image</label>
            <label className="block cursor-pointer">
              <input type="file" accept="image/*" className="hidden" onChange={handleUpload} disabled={uploading} />
              <div className="relative aspect-[16/9] rounded-2xl overflow-hidden border-2 border-dashed border-gray-200 bg-gray-50 hover:border-[#5EB929]/60 transition-colors">
                {form.image ? (
                  <img src={form.image} alt="" className="w-full h-full object-cover" />
                ) : (
                  <div className="absolute inset-0 flex flex-col items-center justify-center text-gray-400 gap-1">
                    <CloudUploadRoundedIcon sx={{ fontSize: 32 }} />
                    <span className="text-[13px] font-medium">Tap to upload</span>
                  </div>
                )}
                {uploading && (
                  <div className="absolute inset-0 bg-white/70 flex items-center justify-center text-[13px] font-medium text-gray-600">
                    Uploading...
                  </div>
                )}
                {form.image && !uploading && (
                  <span className="absolute bottom-2 right-2 bg-black/60 text-white text-[11px] font-medium px-2 py-1 rounded-lg">
                    Change image
                  </span>
                )}
              </div>
            </label>
            <p className="text-[11px] text-gray-500 mt-1.5">
              Use a 16:9 poster, e.g. 1600 × 900 px. Keep text away from the top and bottom edges, because on wide
              screens the banner is cropped to 3:1.
            </p>
          </div>

          <div>
            <label className="block text-[13px] font-medium text-gray-700 mb-1.5">Name (optional)</label>
            <input
              value={form.title}
              onChange={(e) => set({ title: e.target.value })}
              maxLength={80}
              placeholder="e.g. Diwali sale - Sharma Sweets"
              className="w-full border border-gray-200 rounded-xl px-3.5 py-2.5 text-sm focus:outline-none focus:ring-2 focus:ring-[#5EB929]/20 focus:border-[#5EB929]"
            />
            <p className="text-[11px] text-gray-500 mt-1">Only for your list - it isn't printed on the banner.</p>
          </div>

          <div>
            <label className="block text-[13px] font-medium text-gray-700 mb-1.5">Link when tapped (optional)</label>
            <input
              value={form.link}
              onChange={(e) => set({ link: e.target.value })}
              placeholder="https://getofferly.in/store/... or any https:// link"
              className="w-full border border-gray-200 rounded-xl px-3.5 py-2.5 text-sm focus:outline-none focus:ring-2 focus:ring-[#5EB929]/20 focus:border-[#5EB929]"
            />
            <p className="text-[11px] text-gray-500 mt-1">
              Offerly links (a store or offer page) open inside the app; other websites open in the browser. Leave
              empty for a banner that can't be tapped.
            </p>
          </div>

          <div>
            <label className="block text-[13px] font-medium text-gray-700 mb-1.5">Show in</label>
            <div className="flex flex-wrap gap-2">
              <button
                type="button"
                onClick={() => set({ cities: [] })}
                className={`px-3 py-1.5 rounded-lg text-[12px] font-medium border transition-colors ${
                  form.cities.length === 0 ? 'bg-[#5EB929] text-white border-[#5EB929]' : 'border-gray-200 text-gray-600'
                }`}
              >
                All cities
              </button>
              {cities.map((c) => (
                <button
                  type="button"
                  key={c._id || c.name}
                  onClick={() => toggleCity(c.name)}
                  className={`px-3 py-1.5 rounded-lg text-[12px] font-medium border transition-colors ${
                    form.cities.includes(c.name) ? 'bg-[#5EB929] text-white border-[#5EB929]' : 'border-gray-200 text-gray-600'
                  }`}
                >
                  {c.name}
                </button>
              ))}
            </div>
          </div>

          <div className="grid grid-cols-2 gap-3">
            <div>
              <label className="block text-[13px] font-medium text-gray-700 mb-1.5">Start date (optional)</label>
              <input
                type="date"
                value={form.startDate}
                onChange={(e) => set({ startDate: e.target.value })}
                className="w-full border border-gray-200 rounded-xl px-3 py-2.5 text-sm focus:outline-none focus:border-[#5EB929]"
              />
            </div>
            <div>
              <label className="block text-[13px] font-medium text-gray-700 mb-1.5">End date (optional)</label>
              <input
                type="date"
                value={form.endDate}
                min={form.startDate || undefined}
                onChange={(e) => set({ endDate: e.target.value })}
                className="w-full border border-gray-200 rounded-xl px-3 py-2.5 text-sm focus:outline-none focus:border-[#5EB929]"
              />
            </div>
          </div>

          <label className="flex items-center justify-between gap-3 bg-gray-50 rounded-xl px-4 py-3 cursor-pointer">
            <div>
              <p className="text-[13px] font-medium text-gray-800">Show this banner</p>
              <p className="text-[11px] text-gray-500">Turn off to pause it without deleting.</p>
            </div>
            <input
              type="checkbox"
              checked={form.isActive}
              onChange={(e) => set({ isActive: e.target.checked })}
              className="w-5 h-5 accent-[#5EB929]"
            />
          </label>
        </div>

        <div className="sticky bottom-0 bg-white px-5 py-4 border-t border-gray-100 flex gap-3">
          <button type="button" onClick={onClose} className="flex-1 py-2.5 rounded-xl border border-gray-200 text-sm font-medium text-gray-700">
            Cancel
          </button>
          <button
            type="submit"
            disabled={saving || uploading}
            className="flex-1 py-2.5 rounded-xl bg-[#5EB929] text-white text-sm font-semibold disabled:opacity-60"
          >
            {saving ? 'Saving...' : initial._id ? 'Save changes' : 'Add banner'}
          </button>
        </div>
      </form>
    </div>,
    document.body
  );
};

const HomeBanners = () => {
  const queryClient = useQueryClient();
  const [editing, setEditing] = useState(null);
  const [busyId, setBusyId] = useState(null);

  const { data: banners = [], isLoading } = useQuery({
    queryKey: ['adminHomeBanners'],
    queryFn: async () => (await adminAPI.getHomeBanners())?.data || [],
  });

  const refresh = () => {
    queryClient.invalidateQueries({ queryKey: ['adminHomeBanners'] });
    queryClient.invalidateQueries({ queryKey: ['homeBanners'] });
  };

  const openEditor = (banner) =>
    setEditing(
      banner
        ? {
            _id: banner._id,
            image: banner.image,
            title: banner.title || '',
            link: banner.link || '',
            cities: banner.cities || [],
            isActive: banner.isActive !== false,
            startDate: toDateInput(banner.startDate),
            endDate: toDateInput(banner.endDate),
          }
        : { ...EMPTY_FORM }
    );

  const toggleActive = async (banner) => {
    setBusyId(banner._id);
    try {
      await adminAPI.updateHomeBanner(banner._id, { isActive: !banner.isActive });
      refresh();
    } catch (err) {
      toast.error(errorText(err, 'Failed to update banner'));
    } finally {
      setBusyId(null);
    }
  };

  const move = async (from, to) => {
    if (to < 0 || to >= banners.length) return;
    const ids = banners.map((b) => b._id);
    [ids[from], ids[to]] = [ids[to], ids[from]];
    queryClient.setQueryData(['adminHomeBanners'], ids.map((id) => banners.find((b) => b._id === id)));
    try {
      await adminAPI.reorderHomeBanners(ids);
    } catch (err) {
      toast.error(errorText(err, 'Failed to save order'));
    }
    refresh();
  };

  const remove = async (banner) => {
    if (!window.confirm('Delete this banner? It disappears from the app straight away.')) return;
    setBusyId(banner._id);
    try {
      await adminAPI.deleteHomeBanner(banner._id);
      toast.success('Banner deleted');
      refresh();
    } catch (err) {
      toast.error(errorText(err, 'Failed to delete banner'));
    } finally {
      setBusyId(null);
    }
  };

  return (
    <div className="p-4 lg:p-8 max-w-5xl mx-auto space-y-5">
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3">
        <div className="flex items-center gap-3">
          <div className="w-10 h-10 rounded-xl bg-[#5EB929]/10 text-[#5EB929] flex items-center justify-center">
            <ViewCarouselRoundedIcon sx={{ fontSize: 22 }} />
          </div>
          <div>
            <h1 className="text-lg font-semibold text-gray-900">Home Banners</h1>
            <p className="text-[12px] text-gray-500">
              Ad posters in the carousel above "Select Services" in the customer app, shown in this order.
            </p>
          </div>
        </div>
        <button
          onClick={() => openEditor(null)}
          className="flex items-center justify-center gap-1.5 bg-[#5EB929] text-white text-sm font-semibold px-4 py-2.5 rounded-xl shadow-sm hover:bg-[#53a524]"
        >
          <AddRoundedIcon sx={{ fontSize: 18 }} /> Add banner
        </button>
      </div>

      {isLoading ? (
        <div className="grid sm:grid-cols-2 gap-4">
          {[1, 2].map((i) => <div key={i} className="h-64 bg-gray-100 rounded-2xl animate-pulse" />)}
        </div>
      ) : banners.length === 0 ? (
        <div className="bg-white border border-gray-100 rounded-2xl p-10 text-center shadow-sm">
          <ViewCarouselRoundedIcon sx={{ fontSize: 40 }} className="text-gray-300" />
          <p className="text-sm font-semibold text-gray-800 mt-2">No banners yet</p>
          <p className="text-[12px] text-gray-500 mt-1">The carousel stays hidden in the app until you add one.</p>
        </div>
      ) : (
        <div className="grid sm:grid-cols-2 gap-4">
          {banners.map((banner, i) => {
            const status = bannerStatus(banner);
            return (
              <div key={banner._id} className="bg-white border border-gray-100 rounded-2xl shadow-sm overflow-hidden">
                <div className="relative aspect-[16/9] bg-gray-100">
                  <img src={banner.image} alt={banner.title} className="w-full h-full object-cover" />
                  <span className="absolute top-2 left-2 bg-black/60 text-white text-[11px] font-semibold px-2 py-0.5 rounded-md">
                    #{i + 1}
                  </span>
                  <span className={`absolute top-2 right-2 text-[11px] font-semibold px-2 py-0.5 rounded-md ${status.cls}`}>
                    {status.label}
                  </span>
                </div>
                <div className="p-4 space-y-2">
                  <p className="text-sm font-semibold text-gray-900 truncate">{banner.title || 'Untitled banner'}</p>
                  <div className="text-[12px] text-gray-500 space-y-1">
                    <p>{banner.cities?.length ? banner.cities.join(', ') : 'All cities'}</p>
                    {(banner.startDate || banner.endDate) && (
                      <p>
                        {banner.startDate ? formatDate(banner.startDate) : 'Now'} - {banner.endDate ? formatDate(banner.endDate) : 'no end date'}
                      </p>
                    )}
                    <p className="flex items-center gap-1 truncate">
                      <LinkRoundedIcon sx={{ fontSize: 14 }} /> {banner.link || 'Not tappable'}
                    </p>
                    <p className="flex items-center gap-1">
                      <TouchAppRoundedIcon sx={{ fontSize: 14 }} /> {banner.clicks || 0} taps
                    </p>
                  </div>
                  <div className="flex items-center gap-1.5 pt-2 border-t border-gray-100">
                    <button
                      onClick={() => move(i, i - 1)}
                      disabled={i === 0}
                      title="Move earlier"
                      className="p-2 rounded-lg text-gray-500 hover:bg-gray-100 disabled:opacity-30"
                    >
                      <ArrowUpwardRoundedIcon sx={{ fontSize: 18 }} />
                    </button>
                    <button
                      onClick={() => move(i, i + 1)}
                      disabled={i === banners.length - 1}
                      title="Move later"
                      className="p-2 rounded-lg text-gray-500 hover:bg-gray-100 disabled:opacity-30"
                    >
                      <ArrowDownwardRoundedIcon sx={{ fontSize: 18 }} />
                    </button>
                    <button
                      onClick={() => toggleActive(banner)}
                      disabled={busyId === banner._id}
                      className="ml-auto text-[12px] font-medium px-3 py-1.5 rounded-lg border border-gray-200 text-gray-700 hover:bg-gray-50 disabled:opacity-50"
                    >
                      {banner.isActive ? 'Pause' : 'Resume'}
                    </button>
                    <button onClick={() => openEditor(banner)} title="Edit" className="p-2 rounded-lg text-gray-600 hover:bg-gray-100">
                      <EditRoundedIcon sx={{ fontSize: 18 }} />
                    </button>
                    <button
                      onClick={() => remove(banner)}
                      disabled={busyId === banner._id}
                      title="Delete"
                      className="p-2 rounded-lg text-red-500 hover:bg-red-50 disabled:opacity-50"
                    >
                      <DeleteOutlineRoundedIcon sx={{ fontSize: 18 }} />
                    </button>
                  </div>
                </div>
              </div>
            );
          })}
        </div>
      )}

      {editing && (
        <BannerForm
          initial={editing}
          onClose={() => setEditing(null)}
          onSaved={() => {
            setEditing(null);
            refresh();
          }}
        />
      )}
    </div>
  );
};

export default HomeBanners;
