// Add these routes to the backend/job-service/src/routes/admin.routes.js file

// Import controllers
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
