// backend/job-service/src/controllers/job.controller.js
const Job = require("../models/job.model");
const Application = require("../models/application.model");
const axios = require("axios");
const logger = require("../utils/logger");
const getAuth0AccessToken = require("../utils/auth0client");

// Helper function to call the payment service
const callPaymentService = async (endpoint, data) => {
  try {
    const response = await axios.post(
      `${
        process.env.PAYMENT_SERVICE_URL || "http://payment-service:3002"
      }/api/payment/${endpoint}`,
      data
    );
    return response.data;
  } catch (error) {
    logger.error(`Error calling payment service: ${error.message}`, {
      stack: error.stack,
    });
    throw new Error(
      `Payment service error: ${error.response?.data?.message || error.message}`
    );
  }
};

/**
 * Get all jobs with filtering
 */
// exports.getJobs = async (req, res) => {
//   try {
//     const {
//       status,
//       category,
//       minBudget,
//       maxBudget,
//       search,
//       sort = "createdAt",
//       order = "desc",
//       page = 1,
//       limit = 10,
//     } = req.query;

//     // Get the user role from the request (set by middleware)
//     const userRole = req.userRole || "guest";
//     const userId = req.auth.payload.sub;

//     // Build filter query
//     const filter = {};

//     // If user is a talent, only show published jobs they can apply to
//     if (userRole === "talent") {
//       filter.status = "published";
//     }
//     // If user is a client, show their own jobs
//     else if (userRole === "client") {
//       filter.clientId = userId;
//     }
//     // If specific status requested and user is allowed to filter by it
//     else if (
//       status &&
//       (userRole === "admin" ||
//         (userRole === "client" && userId === filter.clientId))
//     ) {
//       filter.status = status;
//     }

//     if (category) {
//       filter.category = category;
//     }

//     if (minBudget) {
//       filter.budget = { ...filter.budget, $gte: parseFloat(minBudget) };
//     }

//     if (maxBudget) {
//       filter.budget = { ...filter.budget, $lte: parseFloat(maxBudget) };
//     }

//     if (search) {
//       filter.$or = [
//         { title: { $regex: search, $options: "i" } },
//         { description: { $regex: search, $options: "i" } },
//       ];
//     }

//     // Calculate pagination
//     const skip = (parseInt(page) - 1) * parseInt(limit);

//     // Get total count for pagination
//     const total = await Job.countDocuments(filter);

//     // Execute query with sorting and pagination
//     const jobs = await Job.find(filter)
//       .sort({ [sort]: order === "desc" ? -1 : 1 })
//       .skip(skip)
//       .limit(parseInt(limit));

//     res.json({
//       success: true,
//       userRole: userRole, // Include user role in response
//       data: {
//         jobs,
//         pagination: {
//           total,
//           page: parseInt(page),
//           limit: parseInt(limit),
//           pages: Math.ceil(total / parseInt(limit)),
//         },
//       },
//     });
//   } catch (error) {
//     logger.error(`Error getting jobs: ${error.message}`, {
//       stack: error.stack,
//     });
//     res.status(500).json({ success: false, message: error.message });
//   }
// };
exports.getJobs = async (req, res) => {
  try {
    const {
      status,
      category,
      minBudget,
      maxBudget,
      search,
      skills, // New: filter by skills (array)
      location, // New: filter by location
      timeline, // New: filter by timeline
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

    // Role-based filtering (keeping existing logic)
    if (userRole === "talent") {
      filter.status = "published";
    } else if (userRole === "client") {
      filter.clientId = userId;
    } else if (
      status &&
      (userRole === "admin" ||
        (userRole === "client" && userId === filter.clientId))
    ) {
      filter.status = status;
    }

    // Apply existing filters
    if (category) {
      filter.category = category;
    }

    if (minBudget) {
      filter.budget = { ...filter.budget, $gte: parseFloat(minBudget) };
    }

    if (maxBudget) {
      filter.budget = { ...filter.budget, $lte: parseFloat(maxBudget) };
    }

    // New filters
    if (skills && skills.length) {
      // Parse if it comes as a string
      const skillsArray =
        typeof skills === "string" ? skills.split(",") : skills;
      filter.skills = { $in: skillsArray };
    }

    if (location) {
      filter.location = location;
    }

    if (timeline) {
      filter.timeline = timeline;
    }

    // Text search across title and description
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
      userRole: userRole,
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

// Add to job.controller.js
exports.getRecommendedJobs = async (req, res) => {
  try {
    const talentId = req.auth.payload.sub;

    // 1. Get talent profile from user service
    const userServiceUrl =
      process.env.USER_SERVICE_URL || "http://user-service:3001";
    const token = await getAuth0AccessToken(); // Reuse existing function

    const { data: talentData } = await axios.get(
      `${userServiceUrl}/api/users/profile/talent/${talentId}`,
      {
        headers: {
          Authorization: `Bearer ${token}`,
          "x-internal-api-key": process.env.INTERNAL_API_KEY || "no-key-set",
        },
      }
    );

    if (!talentData || !talentData.skills || talentData.skills.length === 0) {
      return res.status(404).json({
        success: false,
        message: "Talent profile not found or has no skills defined",
      });
    }

    // 2. Find jobs matching talent skills with scoring system
    const talentSkills = talentData.skills;
    const allJobs = await Job.find({
      status: "published",
      // Exclude jobs the talent has already applied to
      _id: {
        $nin: await Application.distinct("jobId", { talentId }),
      },
    })
      .sort({ createdAt: -1 })
      .limit(100); // Get recent jobs

    // 3. Score and rank jobs
    const scoredJobs = allJobs.map((job) => {
      let score = 0;

      // Score based on skill match (most important)
      if (job.skills && job.skills.length) {
        const matchingSkills = job.skills.filter((skill) =>
          talentSkills.includes(skill)
        );
        score += (matchingSkills.length / job.skills.length) * 10;
      }

      // Score based on hourly rate match if applicable
      if (job.budget && talentData.hourlyRate) {
        // Higher score if budget is higher than talent's rate
        if (job.budget >= talentData.hourlyRate) {
          score += 3;
        } else if (job.budget >= talentData.hourlyRate * 0.8) {
          // Within 20% of talent's rate
          score += 1;
        }
      }

      // Location preference matching
      if (
        job.location === talentData.location?.remote &&
        talentData.location?.remote
      ) {
        score += 2;
      }

      // Recency bonus (newer jobs get higher scores)
      const daysSinceCreation = Math.floor(
        (Date.now() - job.createdAt) / (1000 * 60 * 60 * 24)
      );
      score += Math.max(0, 5 - daysSinceCreation / 7); // Bonus for jobs less than 5 weeks old

      return { job, score };
    });

    // Sort by score (highest first) and return top matches
    const recommendedJobs = scoredJobs
      .sort((a, b) => b.score - a.score)
      .slice(0, 10)
      .map((item) => ({
        ...item.job.toObject(),
        matchScore: Math.round(item.score * 10), // Round to nearest integer
      }));

    res.json({
      success: true,
      data: recommendedJobs,
    });
  } catch (error) {
    logger.error(`Error getting recommended jobs: ${error.message}`, {
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
 * Create a milestone payment in escrow
 */
exports.createMilestonePayment = async (req, res) => {
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

    const milestone = job.milestones[milestoneIndex];

    // Check if milestone is already paid
    if (milestone.status !== "pending") {
      return res.status(400).json({
        success: false,
        message: `This milestone is already in ${milestone.status} status`,
      });
    }

    // Call payment service to create milestone payment intent
    const paymentResponse = await callPaymentService("milestone/intent", {
      amount: milestone.amount * 100, // Convert to cents for Stripe
      currency: "usd",
      customerId: "cus_123456", // This would come from user profile in real app
      payerId: clientId,
      payeeId: job.assignedTo,
      projectId: job._id.toString(),
      milestoneId: milestone._id.toString(),
      description: `Milestone payment for job: ${job.title} - ${milestone.description}`,
    });

    // Update milestone with payment intent ID
    job.milestones[milestoneIndex].paymentIntentId = paymentResponse.data.id;
    job.milestones[milestoneIndex].status = "escrowed";

    await job.save();

    logger.info(
      `Milestone payment created for job ${job._id}, milestone ${milestoneId} by client ${clientId}`
    );

    res.json({
      success: true,
      data: {
        job,
        milestone: job.milestones[milestoneIndex],
        paymentIntent: paymentResponse.data,
      },
    });
  } catch (error) {
    logger.error(`Error creating milestone payment: ${error.message}`, {
      stack: error.stack,
    });
    res.status(500).json({ success: false, message: error.message });
  }
};

/**
 * Release a milestone payment
 */
exports.releaseMilestone = async (req, res) => {
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

    const milestone = job.milestones[milestoneIndex];

    // Check if milestone is in escrow
    if (milestone.status !== "escrowed") {
      return res.status(400).json({
        success: false,
        message: `This milestone is in ${milestone.status} status and cannot be released`,
      });
    }

    // Call payment service to release payment
    const paymentResponse = await callPaymentService("milestone/capture", {
      paymentIntentId: milestone.paymentIntentId,
    });

    // Update milestone status
    job.milestones[milestoneIndex].status = "released";

    await job.save();

    logger.info(
      `Milestone payment released for job ${job._id}, milestone ${milestoneId} by client ${clientId}`
    );

    res.json({
      success: true,
      data: {
        job,
        milestone: job.milestones[milestoneIndex],
        payment: paymentResponse.data,
      },
    });
  } catch (error) {
    logger.error(`Error releasing milestone payment: ${error.message}`, {
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

// Add these methods to your job.controller.js file

/**
 * Pay deposit for a milestone
 */
exports.payMilestoneDeposit = async (req, res) => {
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
      return res.status(404).json({
        success: false,
        message: "Milestone not found",
      });
    }

    const milestone = job.milestones[milestoneIndex];

    // Check if milestone is in correct status
    if (milestone.status !== "pending") {
      return res.status(400).json({
        success: false,
        message: `This milestone is in ${milestone.status} status and cannot be funded with deposit`,
      });
    }

    // If depositAmount is not specified, calculate default (10% of milestone amount)
    const depositAmount =
      milestone.depositAmount || Math.round(milestone.amount * 0.1 * 100) / 100;

    // Call payment service to create milestone deposit payment intent
    const paymentResponse = await callPaymentService("milestone/intent", {
      amount: depositAmount * 100, // Convert to cents for Stripe
      currency: "usd",
      customerId: "cus_123456", // This would come from user profile in real app
      payerId: clientId,
      payeeId: job.assignedTo,
      projectId: job._id.toString(),
      milestoneId: milestone._id.toString(),
      description: `Deposit for milestone: ${job.title} - ${milestone.description}`,
      isDeposit: true,
    });

    // Update milestone with deposit payment intent ID
    job.milestones[milestoneIndex].depositPaymentIntentId =
      paymentResponse.data.id;
    job.milestones[milestoneIndex].depositAmount = depositAmount;

    await job.save();

    logger.info(
      `Milestone deposit payment created for job ${job._id}, milestone ${milestoneId} by client ${clientId}`
    );

    res.json({
      success: true,
      data: {
        job,
        milestone: job.milestones[milestoneIndex],
        paymentIntent: paymentResponse.data,
      },
    });
  } catch (error) {
    logger.error(`Error creating milestone deposit payment: ${error.message}`, {
      stack: error.stack,
    });
    res.status(500).json({
      success: false,
      message: error.message,
    });
  }
};

/**
 * Confirm deposit payment for a milestone
 */
exports.confirmMilestoneDeposit = async (req, res) => {
  try {
    const { id, milestoneId } = req.params;
    const { paymentIntentId } = req.body;
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
      return res.status(404).json({
        success: false,
        message: "Milestone not found",
      });
    }

    const milestone = job.milestones[milestoneIndex];

    // Verify the payment intent ID matches what we have stored
    if (milestone.depositPaymentIntentId !== paymentIntentId) {
      return res.status(400).json({
        success: false,
        message: "Payment intent ID mismatch",
      });
    }

    // Call payment service to capture/confirm the payment
    const paymentResponse = await callPaymentService("milestone/capture", {
      paymentIntentId: paymentIntentId,
    });

    // Update milestone status
    job.milestones[milestoneIndex].status = "deposit_paid";
    job.milestones[milestoneIndex].depositPaid = true;

    await job.save();

    logger.info(
      `Milestone deposit payment confirmed for job ${job._id}, milestone ${milestoneId} by client ${clientId}`
    );

    res.json({
      success: true,
      data: {
        job,
        milestone: job.milestones[milestoneIndex],
        payment: paymentResponse.data,
      },
    });
  } catch (error) {
    logger.error(`Error confirming milestone deposit: ${error.message}`, {
      stack: error.stack,
    });
    res.status(500).json({
      success: false,
      message: error.message,
    });
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

/**
 * Client reviews and pays remaining milestone amount
 */
exports.reviewAndPayRemainingMilestone = async (req, res) => {
  try {
    const { id, milestoneId } = req.params;
    const { clientFeedback, approve } = req.body;
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
      return res.status(404).json({
        success: false,
        message: "Milestone not found",
      });
    }

    const milestone = job.milestones[milestoneIndex];

    // Check if milestone is in the correct state
    if (milestone.talentStatus !== "completed") {
      return res.status(400).json({
        success: false,
        message: "Talent has not marked this milestone as completed",
      });
    }

    if (!approve) {
      // Client is requesting changes
      job.milestones[milestoneIndex].clientFeedback =
        clientFeedback || "Please make the requested changes";
      job.milestones[milestoneIndex].talentStatus = "in_progress";

      await job.save();

      logger.info(
        `Client ${clientId} requested changes on milestone ${milestoneId} for job ${job._id}`
      );

      return res.json({
        success: true,
        data: {
          job,
          milestone: job.milestones[milestoneIndex],
          message: "Requested changes from talent",
        },
      });
    }

    // Calculate remaining amount to pay
    const totalAmount = milestone.amount;
    const depositAmount = milestone.depositAmount || totalAmount * 0.1;
    const remainingAmount = totalAmount - depositAmount;

    // Call payment service to create payment intent for remaining amount
    const paymentResponse = await callPaymentService("milestone/intent", {
      amount: remainingAmount * 100, // Convert to cents for Stripe
      currency: "usd",
      customerId: "cus_123456", // This would come from user profile in real app
      payerId: clientId,
      payeeId: job.assignedTo,
      projectId: job._id.toString(),
      milestoneId: milestone._id.toString(),
      description: `Remaining payment for milestone: ${job.title} - ${milestone.description}`,
    });

    // Update milestone with payment intent ID
    job.milestones[milestoneIndex].paymentIntentId = paymentResponse.data.id;
    job.milestones[milestoneIndex].status = "completed";
    job.milestones[milestoneIndex].clientReviewedAt = new Date();

    if (clientFeedback) {
      job.milestones[milestoneIndex].clientFeedback = clientFeedback;
    }

    await job.save();

    logger.info(
      `Client ${clientId} approved and prepared payment for milestone ${milestoneId} for job ${job._id}`
    );

    res.json({
      success: true,
      data: {
        job,
        milestone: job.milestones[milestoneIndex],
        paymentIntent: paymentResponse.data,
      },
    });
  } catch (error) {
    logger.error(`Error reviewing and paying for milestone: ${error.message}`, {
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

exports.payRemainingMilestone = async (req, res) => {
  try {
    const { id, milestoneId } = req.params;
    const paymentDetails = req.body;
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

    // Check the milestone is in a completed status (client approved)
    if (milestone.status !== "completed") {
      return res.status(400).json({
        success: false,
        message: "Milestone must be approved (completed) before payment",
      });
    }

    // Calculate remaining amount to charge
    const amountToCharge = milestone.amount - (milestone.depositAmount || 0);
    if (amountToCharge <= 0) {
      return res.status(400).json({
        success: false,
        message: "No remaining balance to pay",
      });
    }

    // Process payment using Stripe
    // Using your existing Stripe service
    const stripe = require("stripe")(process.env.STRIPE_SECRET_KEY);

    // If a payment method ID is provided
    let paymentIntent;

    if (paymentDetails.paymentMethodId) {
      // Create a payment intent with the payment method
      paymentIntent = await stripe.paymentIntents.create({
        amount: Math.round(amountToCharge * 100), // Convert to cents
        currency: "usd",
        payment_method: paymentDetails.paymentMethodId,
        confirm: true,
        return_url: "http://localhost:4200/payment-status",
        description: `Remaining payment for job ${job.title} - Milestone: ${milestone.description}`,
        metadata: {
          jobId: job._id.toString(),
          milestoneId: milestone._id.toString(),
          paymentType: "milestone_remaining",
        },
      });
    } else if (paymentDetails.clientSecret) {
      // If a client secret is provided, the payment intent was created on the frontend
      paymentIntent = await stripe.paymentIntents.retrieve(
        paymentDetails.clientSecret.split("_secret_")[0]
      );
    } else {
      // Create a payment intent without confirming
      paymentIntent = await stripe.paymentIntents.create({
        amount: Math.round(amountToCharge * 100), // Convert to cents
        currency: "usd",
        description: `Remaining payment for job ${job.title} - Milestone: ${milestone.description}`,
        metadata: {
          jobId: job._id.toString(),
          milestoneId: milestone._id.toString(),
          paymentType: "milestone_remaining",
        },
      });
    }

    // Check payment intent status
    if (
      paymentIntent.status === "succeeded" ||
      paymentIntent.status === "requires_capture"
    ) {
      // Update milestone status to escrowed
      job.milestones[milestoneIndex].status = "escrowed";
      job.milestones[milestoneIndex].amountPaid = milestone.amount;
      job.milestones[milestoneIndex].escrowedAt = new Date();
      job.milestones[milestoneIndex].paymentIntentId = paymentIntent.id;

      await job.save();

      return res.status(200).json({
        success: true,
        milestone: job.milestones[milestoneIndex],
        paymentIntent: {
          id: paymentIntent.id,
          client_secret: paymentIntent.client_secret,
          status: paymentIntent.status,
        },
      });
    } else {
      return res.status(200).json({
        success: true,
        requiresAction: true,
        paymentIntent: {
          id: paymentIntent.id,
          client_secret: paymentIntent.client_secret,
          status: paymentIntent.status,
        },
      });
    }
  } catch (error) {
    console.error("Error in payRemainingMilestone:", error);
    return res.status(500).json({ success: false, message: error.message });
  }
};

exports.releaseMilestoneFunds = async (req, res) => {
  try {
    const { id, milestoneId } = req.params;
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

    // Verify current status is escrowed
    if (milestone.status !== "escrowed") {
      return res.status(400).json({
        success: false,
        message: "Funds cannot be released at this stage",
      });
    }

    // Using Stripe to release funds - TWO STEP PROCESS:
    // 1. Capture the payment if needed (funds move from "authorized" to platform balance)
    // 2. Transfer the funds to talent's connected account
    const stripe = require("stripe")(process.env.STRIPE_SECRET_KEY);

    // Track the results
    let captureResult;
    let transferResult;

    // Step 1: Capture the payment if it's not already captured
    if (milestone.paymentIntentId) {
      const paymentIntent = await stripe.paymentIntents.retrieve(
        milestone.paymentIntentId
      );

      // If payment intent requires capture, capture it now
      if (paymentIntent.status === "requires_capture") {
        captureResult = await stripe.paymentIntents.capture(
          milestone.paymentIntentId
        );
        logger.info(
          `Captured payment intent ${milestone.paymentIntentId} for milestone ${milestoneId}`
        );
      } else if (paymentIntent.status === "succeeded") {
        captureResult = paymentIntent; // It's already captured
        logger.info(
          `Payment intent ${milestone.paymentIntentId} already captured`
        );
      } else {
        return res.status(400).json({
          success: false,
          message: `Payment is in ${paymentIntent.status} state and cannot be released`,
        });
      }

      // Step 2: Transfer funds to talent's connected account
      if (job.assignedTo) {
        try {
          // Get the talent's Stripe connected account ID
          const token = await getAuth0AccessToken();
          const userServiceUrl =
            process.env.USER_SERVICE_URL || "http://user-service:3001";
          const { data: userData } = await axios.get(
            `${userServiceUrl}/api/users/admin/users/${job.assignedTo}`,
            {
              headers: {
                Authorization: `Bearer ${token}`,
                "x-internal-api-key":
                  process.env.INTERNAL_API_KEY || "no-key-set",
              },
            }
          );

          const talentStripeAccountId = userData.stripeConnectedAccountId;

          if (!talentStripeAccountId) {
            logger.warn(
              `Talent ${job.assignedTo} does not have a connected Stripe account`
            );
            return res.status(400).json({
              success: false,
              message: "The talent does not have a payment account set up",
            });
          }

          // Create a transfer from platform to the connected account
          transferResult = await stripe.transfers.create({
            amount: Math.round(milestone.amount * 100), // Convert to cents
            currency: "usd",
            destination: talentStripeAccountId,
            transfer_group: `job_${job._id}_milestone_${milestone._id}`,
            description: `Payment for job ${job.title} - Milestone: ${milestone.description}`,
            metadata: {
              jobId: job._id.toString(),
              milestoneId: milestone._id.toString(),
              paymentType: "milestone_release",
              payeeId: job.assignedTo,
            },
          });

          logger.info(
            `Created transfer ${transferResult.id} to talent ${job.assignedTo}`
          );
        } catch (error) {
          logger.error(`Error transferring funds to talent: ${error.message}`, {
            stack: error.stack,
          });

          return res.status(500).json({
            success: false,
            message:
              "Failed to transfer funds to talent. Please try again or contact support.",
            error: error.message,
          });
        }
      }
    }

    // Update milestone status to released
    job.milestones[milestoneIndex].status = "released";
    job.milestones[milestoneIndex].releasedAt = new Date();

    if (transferResult && transferResult.id) {
      job.milestones[milestoneIndex].transferId = transferResult.id;
    }

    await job.save();

    return res.status(200).json({
      success: true,
      milestone: job.milestones[milestoneIndex],
      transferResult: transferResult || null,
    });
  } catch (error) {
    logger.error(`Error in releaseMilestoneFunds: ${error.message}`, {
      stack: error.stack,
    });
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
