const express = require("express");
const router = express.Router();

const upload = require("../config/multer");

const {
    uploadTrack,
    getTracks,
    deleteTrack,
} = require("../controllers/trackController");

// GET ALL TRACKS
router.get("/", getTracks);

// UPLOAD TRACK
router.post(
    "/upload",
    upload.single("file"),
    uploadTrack
);

// DELETE TRACK
router.delete("/:id", deleteTrack);

module.exports = router;