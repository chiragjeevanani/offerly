import mongoose from 'mongoose';

const zoneSchema = new mongoose.Schema(
  {
    name: {
      type: String,
      required: true,
      trim: true,
    },
    merchantCount: {
      type: Number,
      default: 0,
    },
  },
  { _id: true }
);

const citySchema = new mongoose.Schema(
  {
    name: {
      type: String,
      required: true,
      unique: true,
      trim: true,
    },
    status: {
      type: String,
      enum: ['active', 'inactive'],
      default: 'active',
    },
    coordinates: {
      lat: Number,
      lng: Number,
    },
    zones: [zoneSchema],
  },
  {
    timestamps: true,
  }
);

// Indexes for performance optimization
citySchema.index({ status: 1, name: 1 });

export default mongoose.model('City', citySchema);
