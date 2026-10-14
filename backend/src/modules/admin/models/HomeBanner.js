import mongoose from 'mongoose';

// Advertisement posters shown in the carousel above "Select Services" on the
// customer home screen. Managed by admins under Home Banners.
const homeBannerSchema = new mongoose.Schema(
  {
    image: { type: String, required: true, trim: true },
    // Internal name for the admin list; also used as the image alt text.
    title: { type: String, trim: true, default: '', maxlength: 80 },
    // Where a tap goes: an in-app path ("/store/<id>") or a full https:// URL. Empty = not tappable.
    link: { type: String, trim: true, default: '', maxlength: 500 },
    // City names the banner shows in. Empty = every city.
    cities: { type: [String], default: [] },
    isActive: { type: Boolean, default: true },
    // Optional run window; outside it the banner is hidden automatically.
    startDate: { type: Date, default: null },
    endDate: { type: Date, default: null },
    sortOrder: { type: Number, default: 0 },
    clicks: { type: Number, default: 0 },
  },
  { timestamps: true }
);

homeBannerSchema.index({ isActive: 1, sortOrder: 1 });

export default mongoose.model('HomeBanner', homeBannerSchema);
