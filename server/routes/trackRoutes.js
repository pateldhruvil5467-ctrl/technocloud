const express = require("express");

const router = express.Router();

const multer = require("../config/multer");

const {
    uploadTrack,
    getTracks,
} = require("../controllers/trackController");

router.post(
    "/upload",
    multer.single("audio"),
    uploadTrack
);

router.get("/", getTracks);

module.exports = router;