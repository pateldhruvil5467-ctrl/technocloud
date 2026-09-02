const express = require("express");
const router = express.Router();

const multer = require("multer");

const trackController = require("../controllers/trackController");

const auth = require("../middleware/authMiddleware");
const requireRole = require("../middleware/requireRole");

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

// MVP upload limit: real sample tracks in this project are ~2-4MB
// (server/uploads/, assets/). 20MB comfortably covers full-length MP3s
// even at high bitrate, with headroom, while bounding worst-case abuse.
const MAX_UPLOAD_BYTES = 20 * 1024 * 1024; // 20 MB

// MP3 is the only audio format used anywhere in this project (every
// sample track and test fixture is .mp3) — treated as the currently
// supported type. Checked via the upload's reported MIME type, not the
// filename extension.
const ACCEPTED_AUDIO_MIME_TYPES = ["audio/mpeg", "audio/mp3"];

const fileFilter = (req, file, cb) => {

    if (!ACCEPTED_AUDIO_MIME_TYPES.includes(file.mimetype)) {

        return cb(
            Object.assign(new Error("Unsupported audio file type"), {
                code: "UNSUPPORTED_FILE_TYPE",
            })
        );
    }

    cb(null, true);
};

const upload = multer({
    storage,
    limits: { fileSize: MAX_UPLOAD_BYTES },
    fileFilter,
});

// Wraps multer so its errors (oversized file, unsupported type, or any
// other multer failure) become clean 4xx JSON responses instead of an
// unhandled 500 / raw error propagating to Express's default handler.
function handleAudioUpload(req, res, next) {

    upload.single("audio")(req, res, (err) => {

        if (!err) {
            return next();
        }

        if (err instanceof multer.MulterError && err.code === "LIMIT_FILE_SIZE") {
            return res.status(400).json({
                message: "Audio file exceeds the maximum allowed size",
            });
        }

        if (err.code === "UNSUPPORTED_FILE_TYPE") {
            return res.status(400).json({
                message: "Unsupported audio file type",
            });
        }

        return res.status(400).json({
            message: "File upload failed",
        });
    });
}

// Exposed so tests can assert against the real configured limit rather
// than duplicating it as a magic number.
router.MAX_UPLOAD_BYTES = MAX_UPLOAD_BYTES;

router.post(
    "/upload",
    auth,
    requireRole(["ARTIST", "ADMIN"]),
    handleAudioUpload,
    trackController.uploadTrack
);

router.get(
    "/",
    trackController.getTracks
);

module.exports = router;