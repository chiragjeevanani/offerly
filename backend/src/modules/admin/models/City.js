import mongoose from 'mongoose';

const pointSchema = new mongoose.Schema(
  {
    lat: { type: Number, required: true },
    lng: { type: Number, required: true },
  },
  { _id: false }
);

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
    status: {
      type: String,
      enum: ['active', 'inactive'],
      default: 'active',
    },
    // Hexagonal zone geometry — center + radius define the hexagon,
    // `path` is the precomputed set of 6 vertices so the map can render
    // it without recomputing geodesic points on every load.
    center: {
      type: pointSchema,
      default: undefined,
    },
    radiusMeters: {
      type: Number,
      default: 800,
    },
    path: {
      type: [pointSchema],
      default: undefined,
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
