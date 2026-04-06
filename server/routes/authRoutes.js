const express = require("express");
const router = express.Router();

// import controller functions
const { register, login } = require("../controllers/authController");

// REGISTER route
router.post("/register", register);

// LOGIN route
router.post("/login", login);

module.exports = router;