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
    createdAt: {
      type: Date,
      default: Date.now,
    },
    updatedAt: {
      type: Date,
      default: Date.now,
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

// Update the updatedAt field on save
UserSchema.pre("save", function (next) {
  this.updatedAt = Date.now();
  next();
});

module.exports = mongoose.model("User", UserSchema);
