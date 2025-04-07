// backend/job-service/src/routes/job.routes.js
const express = require("express");
const router = express.Router();
const Job = require("../models/job.model");
const jobController = require("../controllers/job.controller");
const {
  validateRequest,
  isJobOwner,
  isClient,
} = require("../middlewares/validation.middleware");
const {
  jobSchema,
  jobStatusSchema,
  milestoneSchema,
} = require("../validators/job.validator");

// Get all jobs (with filtering)
router.get("/", jobController.getJobs);

// Get jobs posted by the current client
router.get("/my-jobs", isClient(), jobController.getMyJobs);

// Get jobs by client ID
router.get("/client/:clientId", jobController.getJobsByClient);

// Get available jobs for talents
router.get("/available", jobController.getAvailableJobs);

// Create a new job
router.post(
  "/",
  isClient(),
  validateRequest(jobSchema),
  jobController.createJob
);

// Get a specific job
router.get("/:id", jobController.getJobById);

// Update a job
router.put(
  "/:id",
  isClient(),
  isJobOwner(Job),
  validateRequest(jobSchema),
  jobController.updateJob
);

// Update job status
router.patch(
  "/:id/status",
  isClient(),
  isJobOwner(Job),
  validateRequest(jobStatusSchema),
  jobController.updateJobStatus
);

// Delete a job
router.delete("/:id", isClient(), isJobOwner(Job), jobController.deleteJob);

// Add a milestone to a job
router.post(
  "/:id/milestones",
  isClient(),
  isJobOwner(Job),
  validateRequest(milestoneSchema),
  jobController.addMilestone
);

// Update a milestone
router.put(
  "/:id/milestones/:milestoneId",
  isClient(),
  isJobOwner(Job),
  validateRequest(milestoneSchema),
  jobController.updateMilestone
);

// Release milestone payment
router.post(
  "/:id/milestones/:milestoneId/release",
  isClient(),
  isJobOwner(Job),
  jobController.releaseMilestone
);

// Mark job as completed
router.post(
  "/:id/complete",
  isClient(),
  isJobOwner(Job),
  jobController.completeJob
);

module.exports = router;
