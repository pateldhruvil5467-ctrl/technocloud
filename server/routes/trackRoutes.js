const express = require("express");
const router = express.Router();

const upload = require("../config/multer");

const {
    uploadTrack,
    getTracks,
} = require("../controllers/trackController");

const { protect } = require("../middleware/authMiddleware");

router.post(
    "/upload",
    protect,
    upload.single("audio"),
    uploadTrack
);

router.get("/", getTracks);

module.exports = router;