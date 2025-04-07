const mongoose = require("mongoose");

const milestoneSchema = new mongoose.Schema({
  jobId: { type: mongoose.Schema.Types.ObjectId, ref: "Job", required: true },
  description: { type: String, required: true },
  amount: { type: Number, required: true },
  status: {
    type: String,
    enum: ["pending", "escrowed", "released", "cancelled"],
    default: "pending",
  },
  paymentIntentId: { type: String },
  createdAt: { type: Date, default: Date.now },
  completedAt: { type: Date },
});

module.exports = mongoose.model("Milestone", milestoneSchema);
