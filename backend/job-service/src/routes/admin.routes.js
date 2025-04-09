const express = require("express");
const router = express.Router();
const adminMilestoneController = require("../controllers/admin-milestone.controller");

// Admin routes for milestone management
router.get("/milestones", adminMilestoneController.getAllMilestones);
router.get(
  "/milestones/:milestoneId",
  adminMilestoneController.getMilestoneById
);
router.post(
  "/jobs/:jobId/milestones/:milestoneId/release-funds",
  adminMilestoneController.releaseMilestoneFunds
);

// Admin routes for milestone release requests
router.get(
  "/milestone-release-requests",
  adminMilestoneController.getReleaseRequests
);
router.post(
  "/milestone-release-requests/:requestId/approve",
  adminMilestoneController.approveReleaseRequest
);
router.post(
  "/milestone-release-requests/:requestId/deny",
  adminMilestoneController.denyReleaseRequest
);

module.exports = router;
