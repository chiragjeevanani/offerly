import bcrypt from "bcryptjs";
import mongoose from "mongoose";

const userSchema = new mongoose.Schema(
  {
    name: {
      type: String,
      trim: true,
      default: "",
    },
    phone: {
      type: String,
      required: true,
      unique: true,
      index: true,
    },
    email: {
      type: String,
      trim: true,
      lowercase: true,
      default: "",
    },
    password: {
      type: String,
      default: null,
    },
    role: {
      type: String,
      enum: ["customer"],
      default: "customer",
      index: true,
    },
    status: {
      type: String,
      enum: ["active", "blocked"],
      default: "active",
    },
    avatar: {
      type: String,
      default: "",
    },
    profilePhoto: {
      type: String,
      default: "",
    },
    age: {
      type: Number,
      default: null,
    },
    address: {
      type: String,
      default: "",
    },
    city: {
      type: String,
      default: "",
    },
    // References a zone subdocument _id nested under City.zones (City model).
    zone: {
      type: String,
      default: "",
    },
    gender: {
      type: String,
      enum: [
        "",
        "male",
        "female",
        "other",
        "Male",
        "Female",
        "Other",
        "Prefer not to say",
      ],
      default: "",
    },
    dob: {
      type: Date,
      default: null,
    },
    credits: {
      type: Number,
      default: 0,
    },
    lifetimeSavings: {
      type: Number,
      default: 0,
    },
    referralCode: {
      type: String,
      unique: true,
      sparse: true,
      trim: true,
    },
    referredBy: {
      type: mongoose.Schema.Types.ObjectId,
      ref: "User",
      default: null,
    },
    savedOffers: [
      {
        type: mongoose.Schema.Types.ObjectId,
        ref: "Offer",
      },
    ],
    isProfileComplete: {
      type: Boolean,
      default: false,
    },
  },
  { timestamps: true },
);

userSchema.pre("save", async function savePassword() {
  if (!this.isModified("password") || !this.password) {
    return;
  }

  this.password = await bcrypt.hash(this.password, 10);
});

userSchema.methods.comparePassword = async function comparePassword(candidatePassword) {
  if (!this.password) {
    return false;
  }

  return bcrypt.compare(candidatePassword, this.password);
};

export default mongoose.models.User || mongoose.model("User", userSchema);
