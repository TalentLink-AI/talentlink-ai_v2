// backend/payment-service/src/models/contract.model.js
const mongoose = require("mongoose");

const contractSchema = new mongoose.Schema(
  {
    title: {
      type: String,
      required: true,
      trim: true,
    },
    description: {
      type: String,
      required: true,
    },
    clientId: {
      type: mongoose.Schema.Types.ObjectId,
      ref: "User",
      required: true,
    },
    talentId: {
      type: mongoose.Schema.Types.ObjectId,
      ref: "User",
      required: true,
    },
    jobId: {
      type: mongoose.Schema.Types.ObjectId,
      ref: "Job",
    },
    status: {
      type: String,
      enum: [
        "draft",
        "pending",
        "active",
        "paused",
        "completed",
        "canceled",
        "disputed",
      ],
      default: "draft",
    },
    paymentTerms: {
      paymentModel: {
        type: String,
        enum: ["milestone", "hourly", "weekly"],
        required: true,
      },
      totalAmount: {
        type: Number,
        min: 0,
      },
      escrowId: {
        type: mongoose.Schema.Types.ObjectId,
        ref: "EscrowAccount",
      },
      hourlyRate: {
        type: Number,
        min: 0,
      },
      weeklyRate: {
        type: Number,
        min: 0,
      },
      paymentFrequency: {
        type: String,
        enum: ["weekly", "biweekly", "monthly"],
      },
      // For automatic payments in hourly/weekly models
      maxHoursPerWeek: {
        type: Number,
        min: 0,
      },
      autoApprovalDays: {
        type: Number,
        min: 0,
        default: 7, // Auto-approve after 7 days by default
      },
    },
    terms: {
      startDate: {
        type: Date,
        required: true,
      },
      endDate: {
        type: Date,
      },
      deliverables: {
        type: String,
      },
      // Any additional contract terms
      additionalTerms: {
        type: String,
      },
    },
    signatures: {
      clientSigned: {
        type: Boolean,
        default: false,
      },
      clientSignedDate: {
        type: Date,
      },
      talentSigned: {
        type: Boolean,
        default: false,
      },
      talentSignedDate: {
        type: Date,
      },
    },
    feedback: {
      clientToTalent: {
        rating: {
          type: Number,
          min: 1,
          max: 5,
        },
        comment: String,
        submittedDate: Date,
      },
      talentToClient: {
        rating: {
          type: Number,
          min: 1,
          max: 5,
        },
        comment: String,
        submittedDate: Date,
      },
    },
    attachments: [
      {
        filename: String,
        url: String,
        mimeType: String,
        uploadDate: Date,
        uploadedBy: {
          type: mongoose.Schema.Types.ObjectId,
          ref: "User",
        },
      },
    ],
    // Track contract revisions
    revisions: [
      {
        version: Number,
        changedBy: {
          type: mongoose.Schema.Types.ObjectId,
          ref: "User",
        },
        changeDate: Date,
        changes: Object,
      },
    ],
  },
  { timestamps: true }
);

// Create indexes for better query performance
contractSchema.index({ clientId: 1, status: 1 });
contractSchema.index({ talentId: 1, status: 1 });
contractSchema.index({ jobId: 1 });
contractSchema.index({ "paymentTerms.paymentModel": 1 });

module.exports = mongoose.model("Contract", contractSchema);
