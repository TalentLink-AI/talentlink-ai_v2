// backend/job-service/src/routes/job.routes.js
const express = require("express");
const router = express.Router();
const Job = require("../models/job.model");
const jobController = require("../controllers/job.controller");
const {
  validateRequest,
  isJobOwner,
  isClient,
  isTalent,
  isAdmin,
  addClientIdToBody,
  addTalentIdToBody,
  setUserRole,
} = require("../middlewares/validation.middleware");
const {
  jobSchema,
  jobStatusSchema,
  milestoneSchema,
} = require("../validators/job.validator");

// Get all jobs (with filtering) - allow both clients and talents
router.get("/", setUserRole(), jobController.getJobs);

// Get jobs posted by the current client - require client role
router.get("/my-jobs", isClient(), jobController.getMyJobs);

// Get jobs by client ID - allow both roles
router.get("/client/:clientId", setUserRole(), jobController.getJobsByClient);

// Get available jobs for talents - allow both roles
router.get("/available", setUserRole(), jobController.getAvailableJobs);

// Create a new job - require client role
router.post(
  "/",
  isClient(),
  addClientIdToBody,
  validateRequest(jobSchema),
  jobController.createJob
);

// Get a specific job - allow both roles
router.get("/:id", setUserRole(), jobController.getJobById);

// Update a job - require client role
router.put(
  "/:id",
  isClient(),
  addClientIdToBody,
  isJobOwner(Job),
  validateRequest(jobSchema),
  jobController.updateJob
);

// Update job status - require client role
router.patch(
  "/:id/status",
  isClient(),
  isJobOwner(Job),
  validateRequest(jobStatusSchema),
  jobController.updateJobStatus
);

// Delete a job - require client role
router.delete("/:id", isClient(), isJobOwner(Job), jobController.deleteJob);

// Add a milestone to a job - require client role
router.post(
  "/:id/milestones",
  isClient(),
  isJobOwner(Job),
  validateRequest(milestoneSchema),
  jobController.addMilestone
);

// Update a milestone - require client role
router.put(
  "/:id/milestones/:milestoneId",
  isClient(),
  isJobOwner(Job),
  validateRequest(milestoneSchema),
  jobController.updateMilestone
);

// Mark job as completed - require client role
router.post(
  "/:id/complete",
  isClient(),
  isJobOwner(Job),
  jobController.completeJob
);

// Get milestone details
router.get(
  "/:id/milestones/:milestoneId",
  setUserRole(),
  jobController.getMilestoneDetails
);

// Talent routes for milestone management
// Start work on milestone
router.post(
  "/:id/milestones/:milestoneId/start",
  isTalent(),
  jobController.startMilestoneWork
);

// Complete work on milestone
router.post(
  "/:id/milestones/:milestoneId/complete",
  isTalent(),
  jobController.completeMilestoneWork
);

module.exports = router;
