// backend/job-service/src/controllers/application.controller.js
const Application = require("../models/application.model");
const Job = require("../models/job.model");
const logger = require("../utils/logger");

/**
 * Get all applications (admin only)
 */
exports.getAllApplications = async (req, res) => {
  try {
    // Check for admin role
    const roles = req.auth.payload["https://talentlink.com/roles"] || [];

    if (!roles.includes("admin")) {
      return res.status(403).json({
        success: false,
        message: "Admin access required",
      });
    }

    const { status, page = 1, limit = 10 } = req.query;

    // Build filter query
    const filter = {};

    if (status) {
      filter.status = status;
    }

    // Calculate pagination
    const skip = (parseInt(page) - 1) * parseInt(limit);

    // Get total count for pagination
    const total = await Application.countDocuments(filter);

    // Execute query with sorting and pagination
    const applications = await Application.find(filter)
      .sort({ createdAt: -1 })
      .skip(skip)
      .limit(parseInt(limit));

    res.json({
      success: true,
      data: {
        applications,
        pagination: {
          total,
          page: parseInt(page),
          limit: parseInt(limit),
          pages: Math.ceil(total / parseInt(limit)),
        },
      },
    });
  } catch (error) {
    logger.error(`Error getting applications: ${error.message}`, {
      stack: error.stack,
    });
    res.status(500).json({ success: false, message: error.message });
  }
};

/**
 * Get my applications (as a talent)
 */
exports.getMyApplications = async (req, res) => {
  try {
    const talentId = req.auth.payload.sub;

    const applications = await Application.find({ talentId }).sort({
      createdAt: -1,
    });

    // Get job details for each application
    const applicationData = await Promise.all(
      applications.map(async (app) => {
        const job = await Job.findById(app.jobId);
        return {
          ...app.toObject(),
          job: job
            ? {
                _id: job._id,
                title: job.title,
                budget: job.budget,
                status: job.status,
                clientId: job.clientId,
              }
            : null,
        };
      })
    );

    res.json({
      success: true,
      data: applicationData,
    });
  } catch (error) {
    logger.error(`Error getting talent applications: ${error.message}`, {
      stack: error.stack,
    });
    res.status(500).json({ success: false, message: error.message });
  }
};

/**
 * Get applications for a specific job
 */
exports.getApplicationsForJob = async (req, res) => {
  try {
    const { jobId } = req.params;

    // Check if user is the job owner
    const job = await Job.findById(jobId);

    if (!job) {
      return res.status(404).json({ success: false, message: "Job not found" });
    }

    const userId = req.auth.payload.sub;

    // Only the job owner can view applications
    if (job.clientId !== userId) {
      const roles = req.auth.payload["https://talentlink.com/roles"] || [];

      // Allow admin access
      if (!roles.includes("admin")) {
        return res.status(403).json({
          success: false,
          message: "You don't have permission to view these applications",
        });
      }
    }

    const applications = await Application.find({ jobId }).sort({
      createdAt: -1,
    });

    res.json({
      success: true,
      data: applications,
    });
  } catch (error) {
    logger.error(`Error getting job applications: ${error.message}`, {
      stack: error.stack,
    });
    res.status(500).json({ success: false, message: error.message });
  }
};

/**
 * Get applications by talent ID
 */
exports.getApplicationsByTalent = async (req, res) => {
  try {
    const { talentId } = req.params;

    // Check for admin role or self access
    const userId = req.auth.payload.sub;
    const roles = req.auth.payload["https://talentlink.com/roles"] || [];

    if (talentId !== userId && !roles.includes("admin")) {
      return res.status(403).json({
        success: false,
        message: "You don't have permission to view these applications",
      });
    }

    const applications = await Application.find({ talentId }).sort({
      createdAt: -1,
    });

    res.json({
      success: true,
      data: applications,
    });
  } catch (error) {
    logger.error(`Error getting talent applications: ${error.message}`, {
      stack: error.stack,
    });
    res.status(500).json({ success: false, message: error.message });
  }
};

/**
 * Get a specific application
 */
exports.getApplicationById = async (req, res) => {
  try {
    const { id } = req.params;

    const application = await Application.findById(id);

    if (!application) {
      return res
        .status(404)
        .json({ success: false, message: "Application not found" });
    }

    // Check for permission to view
    const userId = req.auth.payload.sub;
    const roles = req.auth.payload["https://talentlink.com/roles"] || [];

    // Get job to check if user is job owner
    const job = await Job.findById(application.jobId);

    if (!job) {
      return res
        .status(404)
        .json({ success: false, message: "Associated job not found" });
    }

    // Allow access if user is the talent, job owner, or admin
    if (
      application.talentId !== userId &&
      job.clientId !== userId &&
      !roles.includes("admin")
    ) {
      return res.status(403).json({
        success: false,
        message: "You don't have permission to view this application",
      });
    }

    res.json({
      success: true,
      data: {
        application,
        job: {
          _id: job._id,
          title: job.title,
          budget: job.budget,
          status: job.status,
          clientId: job.clientId,
        },
      },
    });
  } catch (error) {
    logger.error(`Error getting application: ${error.message}`, {
      stack: error.stack,
    });
    res.status(500).json({ success: false, message: error.message });
  }
};

/**
 * Create a job application
 */
exports.createApplication = async (req, res) => {
  try {
    const talentId = req.auth.payload.sub;
    const { jobId, coverLetter } = req.body;

    // Check if job exists and is published
    const job = await Job.findById(jobId);

    if (!job) {
      return res.status(404).json({ success: false, message: "Job not found" });
    }

    if (job.status !== "published") {
      return res.status(400).json({
        success: false,
        message: `Cannot apply to a job with status '${job.status}'`,
      });
    }

    // Check if user has already applied
    const existingApplication = await Application.findOne({ jobId, talentId });

    if (existingApplication) {
      return res.status(400).json({
        success: false,
        message: "You have already applied for this job",
      });
    }

    // Create application
    const application = new Application({
      ...req.body,
      talentId,
      status: "pending",
    });

    await application.save();

    // Update job with application info
    job.applications.push(application._id.toString());
    await job.save();

    logger.info(
      `New application created: ${application._id} by talent ${talentId} for job ${jobId}`
    );

    res.status(201).json({
      success: true,
      data: application,
    });
  } catch (error) {
    logger.error(`Error creating application: ${error.message}`, {
      stack: error.stack,
    });
    res.status(500).json({ success: false, message: error.message });
  }
};

/**
 * Update application status
 */
exports.updateApplicationStatus = async (req, res) => {
  try {
    const { id } = req.params;
    const { status, clientNotes } = req.body;
    const userId = req.auth.payload.sub;

    const application = await Application.findById(id);

    if (!application) {
      return res
        .status(404)
        .json({ success: false, message: "Application not found" });
    }

    // Check if user is the job owner
    const job = await Job.findById(application.jobId);

    if (!job) {
      return res
        .status(404)
        .json({ success: false, message: "Associated job not found" });
    }

    if (job.clientId !== userId) {
      return res.status(403).json({
        success: false,
        message: "You don't have permission to update this application",
      });
    }

    // Special handling for accepting an application
    if (status === "accepted" && application.status !== "accepted") {
      // Check if job is already assigned
      if (job.status === "assigned") {
        return res.status(400).json({
          success: false,
          message: "This job is already assigned to a talent",
        });
      }

      // Update job status to assigned
      job.status = "assigned";
      job.assignedTo = application.talentId;
      await job.save();

      // Reject all other applications
      await Application.updateMany(
        { jobId: application.jobId, _id: { $ne: application._id } },
        { status: "rejected" }
      );

      logger.info(
        `Job ${job._id} assigned to talent ${application.talentId} by client ${userId}`
      );
    }

    // Update application status
    application.status = status;

    if (clientNotes) {
      application.clientNotes = clientNotes;
    }

    await application.save();

    logger.info(
      `Application ${application._id} status updated to ${status} by client ${userId}`
    );

    res.json({
      success: true,
      data: application,
    });
  } catch (error) {
    logger.error(`Error updating application status: ${error.message}`, {
      stack: error.stack,
    });
    res.status(500).json({ success: false, message: error.message });
  }
};

/**
 * Accept an application
 */
exports.acceptApplication = async (req, res) => {
  try {
    const { id } = req.params;
    const userId = req.auth.payload.sub;

    const application = await Application.findById(id);

    if (!application) {
      return res
        .status(404)
        .json({ success: false, message: "Application not found" });
    }

    // Check if user is the job owner
    const job = await Job.findById(application.jobId);

    if (!job) {
      return res
        .status(404)
        .json({ success: false, message: "Associated job not found" });
    }

    if (job.clientId !== userId) {
      return res.status(403).json({
        success: false,
        message: "You don't have permission to accept this application",
      });
    }

    // Check if job is already assigned
    if (job.status === "assigned") {
      return res.status(400).json({
        success: false,
        message: "This job is already assigned to a talent",
      });
    }

    // Update job status to assigned
    job.status = "assigned";
    job.assignedTo = application.talentId;
    await job.save();

    // Update application status
    application.status = "accepted";
    await application.save();

    // Reject all other applications
    await Application.updateMany(
      { jobId: application.jobId, _id: { $ne: application._id } },
      { status: "rejected" }
    );

    logger.info(
      `Application ${application._id} accepted and job ${job._id} assigned to talent ${application.talentId} by client ${userId}`
    );

    res.json({
      success: true,
      data: {
        application,
        job,
      },
    });
  } catch (error) {
    logger.error(`Error accepting application: ${error.message}`, {
      stack: error.stack,
    });
    res.status(500).json({ success: false, message: error.message });
  }
};

/**
 * Reject an application
 */
exports.rejectApplication = async (req, res) => {
  try {
    const { id } = req.params;
    const userId = req.auth.payload.sub;

    const application = await Application.findById(id);

    if (!application) {
      return res
        .status(404)
        .json({ success: false, message: "Application not found" });
    }

    // Check if user is the job owner
    const job = await Job.findById(application.jobId);

    if (!job) {
      return res
        .status(404)
        .json({ success: false, message: "Associated job not found" });
    }

    if (job.clientId !== userId) {
      return res.status(403).json({
        success: false,
        message: "You don't have permission to reject this application",
      });
    }

    // Update application status
    application.status = "rejected";
    await application.save();

    logger.info(`Application ${application._id} rejected by client ${userId}`);

    res.json({
      success: true,
      data: application,
    });
  } catch (error) {
    logger.error(`Error rejecting application: ${error.message}`, {
      stack: error.stack,
    });
    res.status(500).json({ success: false, message: error.message });
  }
};

/**
 * Withdraw an application
 */
exports.withdrawApplication = async (req, res) => {
  try {
    const { id } = req.params;
    const talentId = req.auth.payload.sub;

    const application = await Application.findById(id);

    if (!application) {
      return res
        .status(404)
        .json({ success: false, message: "Application not found" });
    }

    // Check if user is the talent who applied
    if (application.talentId !== talentId) {
      return res.status(403).json({
        success: false,
        message: "You don't have permission to withdraw this application",
      });
    }

    // Check if application is already accepted
    if (application.status === "accepted") {
      return res.status(400).json({
        success: false,
        message: "Cannot withdraw an accepted application",
      });
    }

    // Delete the application
    await application.deleteOne();

    // Update job applications array
    await Job.updateOne(
      { _id: application.jobId },
      { $pull: { applications: application._id.toString() } }
    );

    logger.info(
      `Application ${application._id} withdrawn by talent ${talentId}`
    );

    res.json({
      success: true,
      message: "Application withdrawn successfully",
    });
  } catch (error) {
    logger.error(`Error withdrawing application: ${error.message}`, {
      stack: error.stack,
    });
    res.status(500).json({ success: false, message: error.message });
  }
};
