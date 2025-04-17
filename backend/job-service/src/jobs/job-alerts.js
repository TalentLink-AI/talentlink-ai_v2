// Create new file: src/jobs/job-alerts.js
const cron = require("node-cron");
const SavedSearch = require("../models/saved-search.model");
const Job = require("../models/job.model");
const axios = require("axios");
const logger = require("../utils/logger");
const getAuth0AccessToken = require("../utils/auth0client");

// Function to process alerts for a specific frequency
async function processAlerts(frequency) {
  try {
    logger.info(`Processing ${frequency} job alerts`);

    // Find all enabled alerts for this frequency
    const alertsToProcess = await SavedSearch.find({
      alertEnabled: true,
      alertFrequency: frequency,
    });

    logger.info(
      `Found ${alertsToProcess.length} ${frequency} alerts to process`
    );

    // Process each alert
    for (const alert of alertsToProcess) {
      try {
        // Build filter based on saved search
        const filter = { status: "published" };
        const { filters } = alert;

        // Add all the filter conditions...
        if (filters.search) {
          filter.$or = [
            { title: { $regex: filters.search, $options: "i" } },
            { description: { $regex: filters.search, $options: "i" } },
          ];
        }

        // Add other filters similar to runSavedSearch method

        // Only include jobs since last alert
        if (alert.lastAlertSent) {
          filter.createdAt = { $gt: alert.lastAlertSent };
        }

        // Find matching jobs
        const newJobs = await Job.find(filter)
          .sort({ createdAt: -1 })
          .limit(10);

        if (newJobs.length > 0) {
          logger.info(
            `Found ${newJobs.length} new jobs for alert ${alert._id}`
          );

          // Send notification (this would connect to a notification service)
          await sendJobAlertNotification(alert.userId, {
            alertName: alert.name,
            jobCount: newJobs.length,
            jobs: newJobs.map((job) => ({
              id: job._id,
              title: job.title,
              budget: job.budget,
              createdAt: job.createdAt,
            })),
          });

          // Update the last alert sent timestamp
          alert.lastAlertSent = new Date();
          alert.lastResults = {
            count: newJobs.length,
            lastJobId: newJobs[0]._id,
          };
          await alert.save();
        }
      } catch (alertError) {
        logger.error(
          `Error processing alert ${alert._id}: ${alertError.message}`
        );
        // Continue with next alert
      }
    }
  } catch (error) {
    logger.error(`Error in job alerts processor: ${error.message}`);
  }
}

// Mock function to send notifications
// In a real implementation, this would connect to a notification service
async function sendJobAlertNotification(userId, alertData) {
  try {
    // Get authentication token
    const token = await getAuth0AccessToken();

    // This would be replaced with your actual notification service endpoint
    const notificationServiceUrl =
      process.env.NOTIFICATION_SERVICE_URL ||
      "http://notification-service:3005";

    await axios.post(
      `${notificationServiceUrl}/api/notifications`,
      {
        userId,
        type: "job_alert",
        data: alertData,
      },
      {
        headers: {
          Authorization: `Bearer ${token}`,
          "x-internal-api-key": process.env.INTERNAL_API_KEY || "no-key-set",
        },
      }
    );

    logger.info(`Notification sent to user ${userId} for job alert`);
  } catch (error) {
    logger.error(`Error sending job alert notification: ${error.message}`);
    throw error;
  }
}

// Schedule the alert processors
function scheduleAlertProcessors() {
  // Run immediately alerts every 30 minutes
  cron.schedule("*/30 * * * *", () => {
    processAlerts("immediately");
  });

  // Run daily alerts at 9 AM every day
  cron.schedule("0 9 * * *", () => {
    processAlerts("daily");
  });

  // Run weekly alerts at 9 AM every Monday
  cron.schedule("0 9 * * 1", () => {
    processAlerts("weekly");
  });

  logger.info("Job alert processors scheduled");
}

module.exports = { scheduleAlertProcessors };
