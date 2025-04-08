// backend/job-service/src/controllers/admin-milestone.controller.js

const Job = require("../models/job.model");
const logger = require("../utils/logger");
const axios = require("axios");
const stripe = require("stripe")(process.env.STRIPE_SECRET_KEY);
const getAuth0AccessToken = require("../utils/auth0client");

/**
 * Get all milestones across all jobs (admin only)
 */
exports.getAllMilestones = async (req, res) => {
  try {
    // Check for admin role
    console.log("Admin milestones endpoint called with query:", req.query);
    const roles = req.auth.payload["https://talentlink.com/roles"] || [];

    if (!roles.includes("admin")) {
      return res.status(403).json({
        success: false,
        message: "Admin access required",
      });
    }

    const { status, page = 1, limit = 10 } = req.query;

    // Get jobs with pagination
    const skip = (parseInt(page) - 1) * parseInt(limit);

    // Create the initial query
    const jobQuery = {};

    // Get all jobs that have milestones
    const jobs = await Job.find(jobQuery)
      .sort({ updatedAt: -1 })
      .skip(skip)
      .limit(parseInt(limit));

    // Extract all milestones from these jobs
    let allMilestones = [];

    jobs.forEach((job) => {
      if (job.milestones && job.milestones.length > 0) {
        job.milestones.forEach((milestone) => {
          // If status filter is applied, only include matching milestones
          if (!status || milestone.status === status) {
            allMilestones.push({
              ...milestone.toObject(),
              jobId: job._id,
              jobTitle: job.title,
              clientId: job.clientId,
              talentId: job.assignedTo,
            });
          }
        });
      }
    });

    // Sort milestones by creation date (most recent first)
    allMilestones.sort((a, b) => {
      return new Date(b.createdAt || 0) - new Date(a.createdAt || 0);
    });

    // Calculate pagination values for the response
    const total = allMilestones.length;
    const pages = Math.ceil(total / parseInt(limit));

    // Apply pagination to the milestones
    const paginatedMilestones = allMilestones.slice(
      (parseInt(page) - 1) * parseInt(limit),
      parseInt(page) * parseInt(limit)
    );

    logger.info(`Admin ${req.auth.payload.sub} fetched all milestones`);

    res.json({
      success: true,
      data: {
        milestones: paginatedMilestones,
        pagination: {
          total,
          page: parseInt(page),
          limit: parseInt(limit),
          pages,
        },
      },
    });
  } catch (error) {
    logger.error(`Error fetching all milestones: ${error.message}`, {
      stack: error.stack,
    });
    res.status(500).json({ success: false, message: error.message });
  }
};

/**
 * Get milestone by ID (admin only)
 */
exports.getMilestoneById = async (req, res) => {
  try {
    // Check for admin role
    const roles = req.auth.payload["https://talentlink.com/roles"] || [];

    if (!roles.includes("admin")) {
      return res.status(403).json({
        success: false,
        message: "Admin access required",
      });
    }

    const { milestoneId } = req.params;

    // Find the job that contains this milestone
    const job = await Job.findOne({ "milestones._id": milestoneId });

    if (!job) {
      return res.status(404).json({
        success: false,
        message: "Milestone not found",
      });
    }

    // Find the milestone in the job
    const milestone = job.milestones.find(
      (m) => m._id.toString() === milestoneId
    );

    if (!milestone) {
      return res.status(404).json({
        success: false,
        message: "Milestone not found",
      });
    }

    logger.info(
      `Admin ${req.auth.payload.sub} fetched milestone ${milestoneId}`
    );

    res.json({
      success: true,
      data: {
        milestone,
        job: {
          _id: job._id,
          title: job.title,
          description: job.description,
          clientId: job.clientId,
          assignedTo: job.assignedTo,
          status: job.status,
        },
      },
    });
  } catch (error) {
    logger.error(`Error fetching milestone: ${error.message}`, {
      stack: error.stack,
    });
    res.status(500).json({ success: false, message: error.message });
  }
};

/**
 * Release milestone funds to talent (admin only)
 */
exports.releaseMilestoneFunds = async (req, res) => {
  try {
    // Check for admin role
    const roles = req.auth.payload["https://talentlink.com/roles"] || [];

    if (!roles.includes("admin")) {
      return res.status(403).json({
        success: false,
        message: "Admin access required",
      });
    }

    const { jobId, milestoneId } = req.params;

    const job = await Job.findById(jobId);

    if (!job) {
      return res.status(404).json({ success: false, message: "Job not found" });
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
          `Admin ${req.auth.payload.sub} captured payment intent ${milestone.paymentIntentId} for milestone ${milestoneId}`
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
            `Admin ${req.auth.payload.sub} created transfer ${transferResult.id} to talent ${job.assignedTo}`
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

    logger.info(
      `Admin ${req.auth.payload.sub} released funds for milestone ${milestoneId}, job ${jobId}`
    );

    return res.status(200).json({
      success: true,
      milestone: job.milestones[milestoneIndex],
      transferResult: transferResult || null,
    });
  } catch (error) {
    logger.error(`Error releasing milestone funds: ${error.message}`, {
      stack: error.stack,
    });
    return res.status(500).json({ success: false, message: error.message });
  }
};

/**
 * Get milestone release requests (admin only)
 * This is a placeholder - in a real app, you would store release requests in a separate collection
 */
exports.getReleaseRequests = async (req, res) => {
  try {
    // Check for admin role
    const roles = req.auth.payload["https://talentlink.com/roles"] || [];

    if (!roles.includes("admin")) {
      return res.status(403).json({
        success: false,
        message: "Admin access required",
      });
    }

    // This is a placeholder - in a real app, you would query a release requests collection
    // For now, return an empty array to show the concept
    res.json({
      success: true,
      data: {
        requests: [],
        pagination: {
          total: 0,
          page: 1,
          limit: 10,
          pages: 0,
        },
      },
    });
  } catch (error) {
    logger.error(`Error fetching release requests: ${error.message}`, {
      stack: error.stack,
    });
    res.status(500).json({ success: false, message: error.message });
  }
};

/**
 * Approve a milestone release request (admin only)
 * This is a placeholder - in a real app, you would update a release request record
 */
exports.approveReleaseRequest = async (req, res) => {
  try {
    // Check for admin role
    const roles = req.auth.payload["https://talentlink.com/roles"] || [];

    if (!roles.includes("admin")) {
      return res.status(403).json({
        success: false,
        message: "Admin access required",
      });
    }

    // In a real app, you would:
    // 1. Find the release request record
    // 2. Extract the job and milestone IDs
    // 3. Call the releaseMilestoneFunds function
    // 4. Update the request status to "approved"

    res.json({
      success: true,
      message: "Release request approved",
    });
  } catch (error) {
    logger.error(`Error approving release request: ${error.message}`, {
      stack: error.stack,
    });
    res.status(500).json({ success: false, message: error.message });
  }
};

/**
 * Deny a milestone release request (admin only)
 * This is a placeholder - in a real app, you would update a release request record
 */
exports.denyReleaseRequest = async (req, res) => {
  try {
    // Check for admin role
    const roles = req.auth.payload["https://talentlink.com/roles"] || [];

    if (!roles.includes("admin")) {
      return res.status(403).json({
        success: false,
        message: "Admin access required",
      });
    }

    // In a real app, you would:
    // 1. Find the release request record
    // 2. Update its status to "denied"
    // 3. Record the reason
    // 4. Notify the client

    res.json({
      success: true,
      message: "Release request denied",
    });
  } catch (error) {
    logger.error(`Error denying release request: ${error.message}`, {
      stack: error.stack,
    });
    res.status(500).json({ success: false, message: error.message });
  }
};
