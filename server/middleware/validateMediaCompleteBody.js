const mongoose = require("mongoose");
const AppError = require("../utils/AppError");

// V5.2-B4 — validates POST /api/v1/media/complete's request body.
// Deliberately reads ONLY uploadId/title/artist off req.body — nothing
// else the client sends is ever read here or anywhere downstream. In
// particular: provider, key, bucket, artistProfileId, userId, owner,
// mimeType, and sizeBytes are never accepted from the client at all —
// every one of them is resolved server-side, from the persisted
// MediaUploadIntent (looked up by uploadId) or from S3's own verified
// HeadObject response (see controllers/v1/mediaController.js). Simply
// never destructuring these fields off req.body is the actual
// enforcement here, not a denylist — there is no code path anywhere
// downstream that could accidentally pick them up.
//
// title/artist reuse the exact same rule (non-empty string,
// MAX_SHORT_STRING characters or fewer) middleware/validateTrackBody.js's
// validateTrackUploadBody already enforces for the existing local upload
// endpoint — same constant, not a second, possibly-drifting copy.
const MAX_SHORT_STRING = 200; // mirrors validateTrackBody.js's MAX_SHORT_STRING

function isNonEmptyString(value, maxLength) {
    return typeof value === "string" && value.trim().length > 0 && value.length <= maxLength;
}

function validateMediaCompleteBody(req, res, next) {
    const body = req.body;

    if (body === null || typeof body !== "object" || Array.isArray(body)) {
        return next(new AppError(400, "VALIDATION_ERROR", "Request body must be an object."));
    }

    const { uploadId, title, artist } = body;

    if (typeof uploadId !== "string" || !mongoose.Types.ObjectId.isValid(uploadId)) {
        return next(new AppError(400, "VALIDATION_ERROR", "uploadId must be a valid id."));
    }

    if (!isNonEmptyString(title, MAX_SHORT_STRING)) {
        return next(
            new AppError(400, "VALIDATION_ERROR", `Title is required and must be ${MAX_SHORT_STRING} characters or fewer.`)
        );
    }

    if (!isNonEmptyString(artist, MAX_SHORT_STRING)) {
        return next(
            new AppError(400, "VALIDATION_ERROR", `Artist is required and must be ${MAX_SHORT_STRING} characters or fewer.`)
        );
    }

    // Not trimmed — matches validateTrackUploadBody's own convention
    // exactly (it validates non-empty/max-length only, and never mutates
    // the value trackController.uploadTrack ultimately stores).
    req.mediaComplete = { uploadId, title, artist };
    next();
}

module.exports = validateMediaCompleteBody;
