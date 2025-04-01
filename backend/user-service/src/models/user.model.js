const mongoose = require("mongoose");

const userSchema = new mongoose.Schema(
  {
    auth0Id: {
      // Adding auth0Id explicitly
      type: String,
      required: true,
      unique: true,
      trim: true,
    },
    email: {
      type: String,
      required: true,
      unique: true,
      lowercase: true,
      trim: true,
    },
    profile: {
      name: String,
      picture: String,
    },
    metadata: {
      lastLogin: { type: Date, default: Date.now },
    },
    roles: [String], // Include roles for your app
    projects: [String], // Include projects for your freelance platform
  },
  { timestamps: true }
);

module.exports = mongoose.model("User", userSchema);
