// backend/job-service/src/routes/application.routes.js
const express = require("express");
const router = express.Router();
const Application = require("../models/application.model");
const Job = require("../models/job.model");
const applicationController = require("../controllers/application.controller");
const {
  validateRequest,
  isJobOwner,
  isClient,
  isTalent,
} = require("../middlewares/validation.middleware");
const {
  applicationSchema,
  applicationStatusSchema,
} = require("../validators/job.validator");

// Get all applications (admin only)
router.get("/", applicationController.getAllApplications);

// Get my applications (as a talent)
router.get(
  "/my-applications",
  isTalent(),
  applicationController.getMyApplications
);

// Get applications for a specific job
router.get("/job/:jobId", applicationController.getApplicationsForJob);

// Get applications by talent ID
router.get("/talent/:talentId", applicationController.getApplicationsByTalent);

// Get a specific application
router.get("/:id", applicationController.getApplicationById);

// Create a job application
router.post(
  "/",
  isTalent(),
  validateRequest(applicationSchema),
  applicationController.createApplication
);

// Update application status (accept/reject)
router.patch(
  "/:id/status",
  isClient(),
  validateRequest(applicationStatusSchema),
  applicationController.updateApplicationStatus
);

// Accept an application
router.post("/:id/accept", isClient(), applicationController.acceptApplication);

// Reject an application
router.post("/:id/reject", isClient(), applicationController.rejectApplication);

// Withdraw an application (talent only)
router.post(
  "/:id/withdraw",
  isTalent(),
  applicationController.withdrawApplication
);

module.exports = router;
