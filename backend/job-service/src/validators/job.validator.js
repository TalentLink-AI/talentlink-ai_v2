// backend/job-service/src/validators/job.validator.js
const Joi = require("joi");

// Job validation schema
exports.jobSchema = Joi.object({
  title: Joi.string().required().min(5).max(100),
  description: Joi.string().required().min(20),
  budget: Joi.number().required().min(1),
  status: Joi.string().valid(
    "draft",
    "published",
    "assigned",
    "completed",
    "cancelled"
  ),
  clientId: Joi.string().required(),
  assignedTo: Joi.string(),
  category: Joi.string(),
  skills: Joi.array().items(Joi.string()),
  timeline: Joi.string().valid(
    "less_than_1_week",
    "1_to_2_weeks",
    "2_to_4_weeks",
    "1_to_3_months",
    "3_to_6_months",
    "more_than_6_months"
  ),
  location: Joi.string().valid("remote", "on_site", "hybrid"),
  visibility: Joi.string().valid("public", "private", "invite_only"),
  attachments: Joi.array().items(
    Joi.object({
      name: Joi.string().required(),
      url: Joi.string().required(),
      type: Joi.string(),
      size: Joi.number(),
    })
  ),
  metadata: Joi.object(),
});

// Application validation schema
exports.applicationSchema = Joi.object({
  jobId: Joi.string().required(),
  talentId: Joi.string().required(),
  coverLetter: Joi.string(),
  expectedRate: Joi.number().min(0),
  availability: Joi.object({
    startDate: Joi.date(),
    hoursPerWeek: Joi.number(),
  }),
  attachments: Joi.array().items(
    Joi.object({
      name: Joi.string().required(),
      url: Joi.string().required(),
      type: Joi.string(),
      size: Joi.number(),
    })
  ),
  notes: Joi.string(),
  metadata: Joi.object(),
});

// Job status update schema
exports.jobStatusSchema = Joi.object({
  status: Joi.string()
    .valid("draft", "published", "assigned", "completed", "cancelled")
    .required(),
  assignedTo: Joi.string().when("status", {
    is: "assigned",
    then: Joi.required(),
    otherwise: Joi.optional(),
  }),
});

// Application status update schema
exports.applicationStatusSchema = Joi.object({
  status: Joi.string().valid("pending", "accepted", "rejected").required(),
  clientNotes: Joi.string(),
});

// Milestone schema
exports.milestoneSchema = Joi.object({
  description: Joi.string().required(),
  amount: Joi.number().required().min(1),
  status: Joi.string().valid("pending", "escrowed", "released", "cancelled"),
  paymentIntentId: Joi.string(),
});
