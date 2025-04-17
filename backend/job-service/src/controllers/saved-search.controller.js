// Create new file: src/controllers/saved-search.controller.js
const SavedSearch = require("../models/saved-search.model");
const Job = require("../models/job.model");
const logger = require("../utils/logger");

// Get all saved searches for a user
exports.getSavedSearches = async (req, res) => {
  try {
    const userId = req.auth.payload.sub;

    const savedSearches = await SavedSearch.find({ userId }).sort({
      createdAt: -1,
    });

    res.json({
      success: true,
      data: savedSearches,
    });
  } catch (error) {
    logger.error(`Error getting saved searches: ${error.message}`, {
      stack: error.stack,
    });
    res.status(500).json({ success: false, message: error.message });
  }
};

// Create a new saved search
exports.createSavedSearch = async (req, res) => {
  try {
    const userId = req.auth.payload.sub;
    const { name, filters, alertEnabled, alertFrequency } = req.body;

    // Validate the request
    if (!name) {
      return res.status(400).json({
        success: false,
        message: "Search name is required",
      });
    }

    // Check if there's already a saved search with this name
    const existingSearch = await SavedSearch.findOne({ userId, name });
    if (existingSearch) {
      return res.status(400).json({
        success: false,
        message: "A saved search with this name already exists",
      });
    }

    // Create the saved search
    const savedSearch = new SavedSearch({
      userId,
      name,
      filters: filters || {},
      alertEnabled: alertEnabled || false,
      alertFrequency: alertFrequency || "daily",
    });

    await savedSearch.save();

    res.status(201).json({
      success: true,
      data: savedSearch,
    });
  } catch (error) {
    logger.error(`Error creating saved search: ${error.message}`, {
      stack: error.stack,
    });
    res.status(500).json({ success: false, message: error.message });
  }
};

// Update a saved search
exports.updateSavedSearch = async (req, res) => {
  try {
    const { id } = req.params;
    const userId = req.auth.payload.sub;
    const { name, filters, alertEnabled, alertFrequency } = req.body;

    // Find the saved search
    const savedSearch = await SavedSearch.findOne({ _id: id, userId });

    if (!savedSearch) {
      return res.status(404).json({
        success: false,
        message: "Saved search not found",
      });
    }

    // Update fields
    if (name) savedSearch.name = name;
    if (filters) savedSearch.filters = filters;
    if (alertEnabled !== undefined) savedSearch.alertEnabled = alertEnabled;
    if (alertFrequency) savedSearch.alertFrequency = alertFrequency;

    await savedSearch.save();

    res.json({
      success: true,
      data: savedSearch,
    });
  } catch (error) {
    logger.error(`Error updating saved search: ${error.message}`, {
      stack: error.stack,
    });
    res.status(500).json({ success: false, message: error.message });
  }
};

// Delete a saved search
exports.deleteSavedSearch = async (req, res) => {
  try {
    const { id } = req.params;
    const userId = req.auth.payload.sub;

    const result = await SavedSearch.deleteOne({ _id: id, userId });

    if (result.deletedCount === 0) {
      return res.status(404).json({
        success: false,
        message: "Saved search not found",
      });
    }

    res.json({
      success: true,
      message: "Saved search deleted successfully",
    });
  } catch (error) {
    logger.error(`Error deleting saved search: ${error.message}`, {
      stack: error.stack,
    });
    res.status(500).json({ success: false, message: error.message });
  }
};

// Run a saved search
exports.runSavedSearch = async (req, res) => {
  try {
    const { id } = req.params;
    const userId = req.auth.payload.sub;

    const savedSearch = await SavedSearch.findOne({ _id: id, userId });

    if (!savedSearch) {
      return res.status(404).json({
        success: false,
        message: "Saved search not found",
      });
    }

    // Build filter query from saved search
    const filter = { status: "published" };
    const { filters } = savedSearch;

    if (filters.search) {
      filter.$or = [
        { title: { $regex: filters.search, $options: "i" } },
        { description: { $regex: filters.search, $options: "i" } },
      ];
    }

    if (filters.category) {
      filter.category = filters.category;
    }

    if (filters.skills && filters.skills.length > 0) {
      filter.skills = { $in: filters.skills };
    }

    if (filters.minBudget) {
      filter.budget = { ...filter.budget, $gte: filters.minBudget };
    }

    if (filters.maxBudget) {
      filter.budget = { ...filter.budget, $lte: filters.maxBudget };
    }

    if (filters.location) {
      filter.location = filters.location;
    }

    if (filters.timeline) {
      filter.timeline = filters.timeline;
    }

    // Get new jobs if this is for an alert
    if (savedSearch.lastResults && savedSearch.lastResults.lastJobId) {
      const lastJobDate = await Job.findById(
        savedSearch.lastResults.lastJobId
      ).then((job) => job?.createdAt || new Date(0));

      filter.createdAt = { $gt: lastJobDate };
    }

    // Execute search
    const jobs = await Job.find(filter).sort({ createdAt: -1 }).limit(20);

    // Update the saved search with latest results
    if (jobs.length > 0) {
      savedSearch.lastResults = {
        count: jobs.length,
        lastJobId: jobs[0]._id,
      };
      await savedSearch.save();
    }

    res.json({
      success: true,
      data: {
        savedSearch,
        jobs,
      },
    });
  } catch (error) {
    logger.error(`Error running saved search: ${error.message}`, {
      stack: error.stack,
    });
    res.status(500).json({ success: false, message: error.message });
  }
};
