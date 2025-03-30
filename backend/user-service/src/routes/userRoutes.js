const express = require("express");
const router = express.Router();
const userController = require("../controllers/userController");
const checkJwt = require("../middlewares/auth0");

router.get("/me", checkJwt, userController.getCurrentUser);
router.post("/profile", checkJwt, userController.upsertUser);
router.put("/profile", checkJwt, userController.updateProfile);
router.get("/all", checkJwt, userController.getAllUsers); // Admin only

module.exports = router;
