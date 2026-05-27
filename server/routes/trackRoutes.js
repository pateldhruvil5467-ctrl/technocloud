const express = require("express");
const router = express.Router();

const multer = require("multer");

const trackController = require("../controllers/trackController");

const auth = require("../middleware/authMiddleware");

const storage = multer.diskStorage({

    destination: (req, file, cb) => {

        cb(null, "uploads/");
    },

    filename: (req, file, cb) => {

        cb(
            null,
            Date.now() + "-" + file.originalname
        );
    },
});

const upload = multer({ storage });

router.post(
    "/upload",
    auth,
    upload.single("audio"),
    trackController.uploadTrack
);

router.get(
    "/",
    trackController.getTracks
);

module.exports = router;