const express = require("express");
const router = express.Router();

const upload = require("../config/multer");

//import both controller functions correctly
const { uploadTrack, getTracks } = require("../controllers/trackController");

// UPLOAD TRACK route
router.post("/upload", upload.single("audio"), uploadTrack);

// GET ALL TRACKS route
router.get("/", getTracks);

module.exports = router;

