const mongoose = require("mongoose");

const UserSchema = new mongoose.Schema(
  {
    auth0Id: {
      type: String,
      required: true,
      unique: true,
    },
    email: {
      type: String,
      required: true,
      unique: true,
      trim: true,
      lowercase: true,
    },
    firstName: {
      type: String,
      trim: true,
    },
    lastName: {
      type: String,
      trim: true,
    },
    role: {
      type: String,
      enum: ["client", "talent", "admin"],
      required: true,
    },
    isActive: {
      type: Boolean,
      default: true,
    },
    profileComplete: {
      type: Boolean,
      default: false,
    },
    profilePicture: {
      type: String,
    },
    stripeCustomerId: {
      type: String,
    },
    stripeConnectedAccountId: {
      type: String,
    },
    metadata: {
      type: mongoose.Schema.Types.Mixed,
      default: {},
    },
    lastLogin: {
      type: Date,
      default: Date.now,
    },
  },
  {
    timestamps: true,
  }
);

// Index to optimize queries
UserSchema.index({ auth0Id: 1 });
UserSchema.index({ email: 1 });
UserSchema.index({ role: 1 });

// Virtual for full name
UserSchema.virtual("fullName").get(function () {
  return `${this.firstName || ""} ${this.lastName || ""}`.trim();
});

module.exports = mongoose.model("User", UserSchema);
