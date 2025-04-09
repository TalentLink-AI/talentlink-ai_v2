// backend/job-service/src/controllers/job.controller.js
const Job = require("../models/job.model");
const Application = require("../models/application.model");
const logger = require("../utils/logger");

/**
 * Get all jobs with filtering
 */
exports.getJobs = async (req, res) => {
  try {
    const {
      status,
      category,
      minBudget,
      maxBudget,
      search,
      sort = "createdAt",
      order = "desc",
      page = 1,
      limit = 10,
    } = req.query;

    // Get the user role from the request (set by middleware)
    const userRole = req.userRole || "guest";
    const userId = req.auth.payload.sub;

    // Build filter query
    const filter = {};

    // If user is a talent, only show published jobs they can apply to
    if (userRole === "talent") {
      filter.status = "published";
    }
    // If user is a client, show their own jobs
    else if (userRole === "client") {
      filter.clientId = userId;
    }
    // If specific status requested and user is allowed to filter by it
    else if (
      status &&
      (userRole === "admin" ||
        (userRole === "client" && userId === filter.clientId))
    ) {
      filter.status = status;
    }

    if (category) {
      filter.category = category;
    }

    if (minBudget) {
      filter.budget = { ...filter.budget, $gte: parseFloat(minBudget) };
    }

    if (maxBudget) {
      filter.budget = { ...filter.budget, $lte: parseFloat(maxBudget) };
    }

    if (search) {
      filter.$or = [
        { title: { $regex: search, $options: "i" } },
        { description: { $regex: search, $options: "i" } },
      ];
    }

    // Calculate pagination
    const skip = (parseInt(page) - 1) * parseInt(limit);

    // Get total count for pagination
    const total = await Job.countDocuments(filter);

    // Execute query with sorting and pagination
    const jobs = await Job.find(filter)
      .sort({ [sort]: order === "desc" ? -1 : 1 })
      .skip(skip)
      .limit(parseInt(limit));

    res.json({
      success: true,
      userRole: userRole, // Include user role in response
      data: {
        jobs,
        pagination: {
          total,
          page: parseInt(page),
          limit: parseInt(limit),
          pages: Math.ceil(total / parseInt(limit)),
        },
      },
    });
  } catch (error) {
    logger.error(`Error getting jobs: ${error.message}`, {
      stack: error.stack,
    });
    res.status(500).json({ success: false, message: error.message });
  }
};

/**
 * Get jobs posted by the current client
 */
exports.getMyJobs = async (req, res) => {
  try {
    const clientId = req.auth.payload.sub;

    const jobs = await Job.find({ clientId }).sort({ createdAt: -1 });

    res.json({
      success: true,
      data: jobs,
    });
  } catch (error) {
    logger.error(`Error getting client jobs: ${error.message}`, {
      stack: error.stack,
    });
    res.status(500).json({ success: false, message: error.message });
  }
};

/**
 * Get jobs by client ID
 */
exports.getJobsByClient = async (req, res) => {
  try {
    const { clientId } = req.params;

    const jobs = await Job.find({ clientId, status: { $ne: "draft" } }).sort({
      createdAt: -1,
    });

    res.json({
      success: true,
      data: jobs,
    });
  } catch (error) {
    logger.error(`Error getting client jobs: ${error.message}`, {
      stack: error.stack,
    });
    res.status(500).json({ success: false, message: error.message });
  }
};

/**
 * Get available jobs for talents
 */
exports.getAvailableJobs = async (req, res) => {
  try {
    const {
      category,
      search,
      sort = "createdAt",
      order = "desc",
      page = 1,
      limit = 10,
    } = req.query;

    // Build filter query for published jobs
    const filter = { status: "published" };

    if (category) {
      filter.category = category;
    }

    if (search) {
      filter.$or = [
        { title: { $regex: search, $options: "i" } },
        { description: { $regex: search, $options: "i" } },
      ];
    }

    // Calculate pagination
    const skip = (parseInt(page) - 1) * parseInt(limit);

    // Get total count for pagination
    const total = await Job.countDocuments(filter);

    // Execute query with sorting and pagination
    const jobs = await Job.find(filter)
      .sort({ [sort]: order === "desc" ? -1 : 1 })
      .skip(skip)
      .limit(parseInt(limit));

    res.json({
      success: true,
      data: {
        jobs,
        pagination: {
          total,
          page: parseInt(page),
          limit: parseInt(limit),
          pages: Math.ceil(total / parseInt(limit)),
        },
      },
    });
  } catch (error) {
    logger.error(`Error getting available jobs: ${error.message}`, {
      stack: error.stack,
    });
    res.status(500).json({ success: false, message: error.message });
  }
};

/**
 * Create a new job
 */
exports.createJob = async (req, res) => {
  try {
    const clientId = req.auth.payload.sub;

    const job = new Job({
      ...req.body,
      clientId,
      status: req.body.status || "published",
    });

    await job.save();

    logger.info(`New job created: ${job._id} by client ${clientId}`);

    res.status(201).json({
      success: true,
      data: job,
    });
  } catch (error) {
    logger.error(`Error creating job: ${error.message}`, {
      stack: error.stack,
    });
    res.status(500).json({ success: false, message: error.message });
  }
};

/**
 * Get a specific job by ID
 */
exports.getJobById = async (req, res) => {
  try {
    const { id } = req.params;

    const job = await Job.findById(id);

    if (!job) {
      return res.status(404).json({ success: false, message: "Job not found" });
    }

    // Fetch application count
    const applicationCount = await Application.countDocuments({ jobId: id });

    res.json({
      success: true,
      data: {
        ...job.toObject(),
        applicationCount,
      },
    });
  } catch (error) {
    logger.error(`Error getting job: ${error.message}`, { stack: error.stack });
    res.status(500).json({ success: false, message: error.message });
  }
};

/**
 * Update a job
 */
exports.updateJob = async (req, res) => {
  try {
    const { id } = req.params;
    const clientId = req.auth.payload.sub;

    const job = await Job.findOne({ _id: id, clientId });

    if (!job) {
      return res.status(404).json({
        success: false,
        message: "Job not found or you do not have permission to update it",
      });
    }

    // Don't allow changing assigned jobs
    if (
      job.status === "assigned" &&
      req.body.status !== "assigned" &&
      req.body.status !== "completed"
    ) {
      return res.status(400).json({
        success: false,
        message:
          "Cannot change status of an assigned job. Use the complete endpoint to mark as completed.",
      });
    }

    // Update job fields
    Object.keys(req.body).forEach((key) => {
      job[key] = req.body[key];
    });

    job.updatedAt = new Date();
    await job.save();

    logger.info(`Job updated: ${job._id} by client ${clientId}`);

    res.json({
      success: true,
      data: job,
    });
  } catch (error) {
    logger.error(`Error updating job: ${error.message}`, {
      stack: error.stack,
    });
    res.status(500).json({ success: false, message: error.message });
  }
};

/**
 * Update job status
 */
exports.updateJobStatus = async (req, res) => {
  try {
    const { id } = req.params;
    const { status, assignedTo } = req.body;
    const clientId = req.auth.payload.sub;

    const job = await Job.findOne({ _id: id, clientId });

    if (!job) {
      return res.status(404).json({
        success: false,
        message: "Job not found or you do not have permission to update it",
      });
    }

    // Special handling for assigned status
    if (status === "assigned") {
      if (!assignedTo) {
        return res.status(400).json({
          success: false,
          message: "assignedTo is required when setting status to assigned",
        });
      }

      // Check if the talent has applied for this job
      const application = await Application.findOne({
        jobId: id,
        talentId: assignedTo,
      });

      if (!application) {
        return res.status(400).json({
          success: false,
          message: "Cannot assign job to a talent who has not applied for it",
        });
      }

      // Update application status to accepted
      application.status = "accepted";
      await application.save();

      // Reject all other applications
      await Application.updateMany(
        { jobId: id, talentId: { $ne: assignedTo } },
        { status: "rejected" }
      );
    }

    // Update job status
    job.status = status;

    if (assignedTo) {
      job.assignedTo = assignedTo;
    }

    job.updatedAt = new Date();
    await job.save();

    logger.info(
      `Job status updated: ${job._id} to ${status} by client ${clientId}`
    );

    res.json({
      success: true,
      data: job,
    });
  } catch (error) {
    logger.error(`Error updating job status: ${error.message}`, {
      stack: error.stack,
    });
    res.status(500).json({ success: false, message: error.message });
  }
};

/**
 * Delete a job
 */
exports.deleteJob = async (req, res) => {
  try {
    const { id } = req.params;
    const clientId = req.auth.payload.sub;

    const job = await Job.findOne({ _id: id, clientId });

    if (!job) {
      return res.status(404).json({
        success: false,
        message: "Job not found or you do not have permission to delete it",
      });
    }

    // Only allow deleting draft or cancelled jobs
    if (job.status !== "draft" && job.status !== "cancelled") {
      return res.status(400).json({
        success: false,
        message:
          "Only draft or cancelled jobs can be deleted. Change the job status to cancelled first.",
      });
    }

    await job.deleteOne();

    // Delete all applications for this job
    await Application.deleteMany({ jobId: id });

    logger.info(`Job deleted: ${job._id} by client ${clientId}`);

    res.json({
      success: true,
      message: "Job deleted successfully",
    });
  } catch (error) {
    logger.error(`Error deleting job: ${error.message}`, {
      stack: error.stack,
    });
    res.status(500).json({ success: false, message: error.message });
  }
};

/**
 * Add a milestone to a job
 */
exports.addMilestone = async (req, res) => {
  try {
    const { id } = req.params;
    const clientId = req.auth.payload.sub;

    const job = await Job.findOne({ _id: id, clientId });

    if (!job) {
      return res.status(404).json({
        success: false,
        message: "Job not found or you do not have permission to update it",
      });
    }

    // Check if job is assigned
    if (job.status !== "assigned") {
      return res.status(400).json({
        success: false,
        message: "Milestones can only be added to assigned jobs",
      });
    }

    const milestone = {
      ...req.body,
      depositPaid: false,
      status: "pending",
      talentStatus: "not_started",
      createdAt: new Date(),
    };
    if (!milestone.depositAmount && milestone.amount) {
      milestone.depositAmount = Math.round(milestone.amount * 0.1 * 100) / 100;
    }

    job.milestones.push(milestone);
    await job.save();

    logger.info(`Milestone added to job ${job._id} by client ${clientId}`);

    res.json({
      success: true,
      data: {
        job,
        milestone: job.milestones[job.milestones.length - 1],
      },
    });
  } catch (error) {
    logger.error(`Error adding milestone: ${error.message}`, {
      stack: error.stack,
    });
    res.status(500).json({ success: false, message: error.message });
  }
};

/**
 * Update a milestone
 */
exports.updateMilestone = async (req, res) => {
  try {
    const { id, milestoneId } = req.params;
    const clientId = req.auth.payload.sub;

    const job = await Job.findOne({ _id: id, clientId });

    if (!job) {
      return res.status(404).json({
        success: false,
        message: "Job not found or you do not have permission to update it",
      });
    }

    // Find the milestone
    const milestoneIndex = job.milestones.findIndex(
      (m) => m._id.toString() === milestoneId
    );

    if (milestoneIndex === -1) {
      return res
        .status(404)
        .json({ success: false, message: "Milestone not found" });
    }

    // Don't allow updating released or escrowed milestones
    if (
      ["released", "escrowed"].includes(job.milestones[milestoneIndex].status)
    ) {
      return res.status(400).json({
        success: false,
        message:
          "Cannot update milestones that are already escrowed or released",
      });
    }

    // Update milestone fields
    Object.keys(req.body).forEach((key) => {
      job.milestones[milestoneIndex][key] = req.body[key];
    });

    await job.save();

    logger.info(
      `Milestone ${milestoneId} updated for job ${job._id} by client ${clientId}`
    );

    res.json({
      success: true,
      data: {
        job,
        milestone: job.milestones[milestoneIndex],
      },
    });
  } catch (error) {
    logger.error(`Error updating milestone: ${error.message}`, {
      stack: error.stack,
    });
    res.status(500).json({ success: false, message: error.message });
  }
};

/**
 * Mark job as completed
 */
exports.completeJob = async (req, res) => {
  try {
    const { id } = req.params;
    const clientId = req.auth.payload.sub;

    const job = await Job.findOne({ _id: id, clientId });

    if (!job) {
      return res.status(404).json({
        success: false,
        message: "Job not found or you do not have permission to update it",
      });
    }

    // Check if job is assigned
    if (job.status !== "assigned") {
      return res.status(400).json({
        success: false,
        message: "Only assigned jobs can be marked as completed",
      });
    }

    // Check if there are any pending or escrowed milestones
    const pendingMilestones = job.milestones.filter(
      (m) => m.status !== "released" && m.status !== "cancelled"
    );

    if (pendingMilestones.length > 0) {
      return res.status(400).json({
        success: false,
        message:
          "All milestones must be released or cancelled before marking the job as completed",
      });
    }

    // Update job status
    job.status = "completed";
    job.updatedAt = new Date();

    await job.save();

    logger.info(`Job ${job._id} marked as completed by client ${clientId}`);

    res.json({
      success: true,
      data: job,
    });
  } catch (error) {
    logger.error(`Error completing job: ${error.message}`, {
      stack: error.stack,
    });
    res.status(500).json({ success: false, message: error.message });
  }
};

/**
 * Talent starts work on a milestone
 */
exports.startMilestoneWork = async (req, res) => {
  try {
    const { id, milestoneId } = req.params;
    const talentId = req.auth.payload.sub;

    const job = await Job.findOne({ _id: id, assignedTo: talentId });

    if (!job) {
      return res.status(404).json({
        success: false,
        message: "Job not found or you are not assigned to this job",
      });
    }

    // Find the milestone
    const milestoneIndex = job.milestones.findIndex(
      (m) => m._id.toString() === milestoneId
    );

    if (milestoneIndex === -1) {
      return res.status(404).json({
        success: false,
        message: "Milestone not found",
      });
    }

    const milestone = job.milestones[milestoneIndex];

    // Check if milestone is in correct status and deposit has been paid
    if (milestone.status !== "deposit_paid") {
      return res.status(400).json({
        success: false,
        message: `Cannot start work on milestone with status ${milestone.status}. Deposit must be paid first.`,
      });
    }

    // Update milestone status
    job.milestones[milestoneIndex].status = "in_progress";
    job.milestones[milestoneIndex].talentStatus = "in_progress";
    job.milestones[milestoneIndex].startedAt = new Date();

    await job.save();

    logger.info(
      `Talent ${talentId} started work on milestone ${milestoneId} for job ${job._id}`
    );

    res.json({
      success: true,
      data: {
        job,
        milestone: job.milestones[milestoneIndex],
      },
    });
  } catch (error) {
    logger.error(`Error starting milestone work: ${error.message}`, {
      stack: error.stack,
    });
    res.status(500).json({
      success: false,
      message: error.message,
    });
  }
};

/**
 * Talent marks milestone as completed
 */
exports.completeMilestoneWork = async (req, res) => {
  try {
    const { id, milestoneId } = req.params;
    const { submissionDetails } = req.body;
    const talentId = req.auth.payload.sub;

    const job = await Job.findOne({ _id: id, assignedTo: talentId });

    if (!job) {
      return res.status(404).json({
        success: false,
        message: "Job not found or you are not assigned to this job",
      });
    }

    // Find the milestone
    const milestoneIndex = job.milestones.findIndex(
      (m) => m._id.toString() === milestoneId
    );

    if (milestoneIndex === -1) {
      return res.status(404).json({
        success: false,
        message: "Milestone not found",
      });
    }

    const milestone = job.milestones[milestoneIndex];

    // Check if milestone is in correct status
    if (milestone.status !== "in_progress") {
      return res.status(400).json({
        success: false,
        message: `Cannot complete milestone with status ${milestone.status}. Work must be in progress.`,
      });
    }

    // Update milestone status
    job.milestones[milestoneIndex].talentStatus = "completed";
    job.milestones[milestoneIndex].completedAt = new Date();

    if (submissionDetails) {
      job.milestones[milestoneIndex].submissionDetails = submissionDetails;
    }

    await job.save();

    logger.info(
      `Talent ${talentId} completed work on milestone ${milestoneId} for job ${job._id}`
    );

    res.json({
      success: true,
      data: {
        job,
        milestone: job.milestones[milestoneIndex],
      },
    });
  } catch (error) {
    logger.error(`Error completing milestone work: ${error.message}`, {
      stack: error.stack,
    });
    res.status(500).json({
      success: false,
      message: error.message,
    });
  }
};

exports.approveMilestoneReview = async (req, res) => {
  try {
    const { id, milestoneId } = req.params;
    const { feedback, approvalStatus } = req.body;
    const userId = req.auth.payload.sub;

    // Find the job
    const job = await Job.findById(id);
    if (!job) {
      return res.status(404).json({ success: false, message: "Job not found" });
    }

    // Check authorization
    if (job.clientId !== userId) {
      return res
        .status(403)
        .json({ success: false, message: "Not authorized" });
    }

    // Find the milestone
    const milestoneIndex = job.milestones.findIndex(
      (m) => m._id.toString() === milestoneId
    );

    if (milestoneIndex === -1) {
      return res
        .status(404)
        .json({ success: false, message: "Milestone not found" });
    }

    const milestone = job.milestones[milestoneIndex];

    // Check that the talent has marked work as completed
    if (milestone.talentStatus !== "completed") {
      return res.status(400).json({
        success: false,
        message: "The talent has not marked this milestone as completed",
      });
    }

    // Check current status allows review
    if (!["in_progress"].includes(milestone.status)) {
      return res.status(400).json({
        success: false,
        message: `Milestone in ${milestone.status} status cannot be reviewed`,
      });
    }

    // Record approval or request changes
    if (approvalStatus) {
      // Client approves the work
      job.milestones[milestoneIndex].clientApproved = true;
      job.milestones[milestoneIndex].approvedAt = new Date();
      job.milestones[milestoneIndex].status = "completed"; // Update status to completed
    } else {
      // Client requests changes
      job.milestones[milestoneIndex].talentStatus = "in_progress"; // Send back to talent for changes
      job.milestones[milestoneIndex].clientFeedback =
        feedback || "Please make the requested changes";
    }

    // Always save feedback if provided
    if (feedback) {
      job.milestones[milestoneIndex].clientFeedback = feedback;
    }

    // Save changes
    await job.save();

    return res.status(200).json({
      success: true,
      milestone: job.milestones[milestoneIndex],
    });
  } catch (error) {
    console.error("Error in approveMilestoneReview:", error);
    return res.status(500).json({ success: false, message: error.message });
  }
};

/**
 * Get milestone details
 */
exports.getMilestoneDetails = async (req, res) => {
  try {
    const { id, milestoneId } = req.params;
    const userId = req.auth.payload.sub;

    const job = await Job.findById(id);

    if (!job) {
      return res.status(404).json({
        success: false,
        message: "Job not found",
      });
    }

    // Check authorization (either client or assigned talent can view)
    if (job.clientId !== userId && job.assignedTo !== userId) {
      return res.status(403).json({
        success: false,
        message: "You don't have permission to view this milestone",
      });
    }

    // Find the milestone
    const milestone = job.milestones.find(
      (m) => m._id.toString() === milestoneId
    );

    if (!milestone) {
      return res.status(404).json({
        success: false,
        message: "Milestone not found",
      });
    }

    res.json({
      success: true,
      data: {
        job: {
          _id: job._id,
          title: job.title,
          clientId: job.clientId,
          assignedTo: job.assignedTo,
          status: job.status,
        },
        milestone,
        userRole: job.clientId === userId ? "client" : "talent",
      },
    });
  } catch (error) {
    logger.error(`Error getting milestone details: ${error.message}`, {
      stack: error.stack,
    });
    res.status(500).json({
      success: false,
      message: error.message,
    });
  }
};
