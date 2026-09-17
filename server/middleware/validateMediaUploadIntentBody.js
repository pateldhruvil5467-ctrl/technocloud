const AppError = require("../utils/AppError");
const config = require("../config/env");

// V5.2-B2 — validates POST /api/v1/media/upload-intent's request body.
// Deliberately reads ONLY filename/mimeType/sizeBytes off req.body —
// nothing else the client sends is ever read here or anywhere
// downstream. In particular: bucket, key, artistProfileId, userId,
// owner, and provider are never accepted from the client at all — the
// server determines every one of them (see
// middleware/resolveOrCreateOwnArtistProfile.js, utils/mediaKey.js,
// controllers/v1/mediaController.js). Simply never destructuring these
// fields off req.body is the actual enforcement here, not a denylist —
// there is no code path anywhere downstream that could accidentally
// pick them up.
//
// ACCEPTED_AUDIO_MIME_TYPES mirrors routes/trackRoutes.js's own
// identically-named constant exactly (MP3 is the only supported audio
// type anywhere in this project). Duplicated rather than imported: this
// phase does not modify the existing upload route at all (out of
// scope — see V5.2-B2's own instructions), and that constant isn't
// currently exported from it. A later phase that touches both paths
// together is a reasonable place to de-duplicate this.
const ACCEPTED_AUDIO_MIME_TYPES = ["audio/mpeg", "audio/mp3"];
const MAX_FILENAME_LENGTH = 255;

function isNonEmptyString(value, maxLength) {
    return typeof value === "string" && value.trim().length > 0 && value.length <= maxLength;
}

function validateMediaUploadIntentBody(req, res, next) {
    const body = req.body;

    if (body === null || typeof body !== "object" || Array.isArray(body)) {
        return next(new AppError(400, "VALIDATION_ERROR", "Request body must be an object."));
    }

    const { filename, mimeType, sizeBytes } = body;

    if (!isNonEmptyString(filename, MAX_FILENAME_LENGTH)) {
        return next(
            new AppError(
                400,
                "VALIDATION_ERROR",
                `filename is required and must be ${MAX_FILENAME_LENGTH} characters or fewer.`
            )
        );
    }

    // Not trusted as proof of content — see utils/mediaKey.js and
    // services/media/s3.js's own comments: `filename` is passed through
    // only for display/reference and is never used to build the S3 key
    // or to decide the upload's actual MIME type. `mimeType` (the
    // client's declared Content-Type, checked against the same
    // allowlist the existing multer upload route already enforces) is
    // the only signal this validator treats as meaningful — and even
    // that is only ever a client CLAIM: true content verification isn't
    // possible in a presigned-upload model, since the server never sees
    // the bytes (see the V5.2-B architecture audit's security-design
    // section for this accepted trade-off).
    if (typeof mimeType !== "string" || !ACCEPTED_AUDIO_MIME_TYPES.includes(mimeType)) {
        return next(
            new AppError(
                400,
                "VALIDATION_ERROR",
                `mimeType must be one of: ${ACCEPTED_AUDIO_MIME_TYPES.join(", ")}.`
            )
        );
    }

    if (
        typeof sizeBytes !== "number" ||
        !Number.isFinite(sizeBytes) ||
        !Number.isInteger(sizeBytes) ||
        sizeBytes <= 0
    ) {
        return next(new AppError(400, "VALIDATION_ERROR", "sizeBytes must be a positive integer."));
    }

    // Reuses the existing UPLOAD_MAX_BYTES-backed config value
    // (config.uploadMaxBytes) rather than a second, possibly-drifting
    // limit — same 20MB product/security constraint the existing
    // multer upload route already enforces (routes/trackRoutes.js).
    if (sizeBytes > config.uploadMaxBytes) {
        return next(
            new AppError(
                400,
                "VALIDATION_ERROR",
                `sizeBytes exceeds the maximum allowed size of ${config.uploadMaxBytes} bytes.`
            )
        );
    }

    req.mediaUploadIntent = { filename: filename.trim(), mimeType, sizeBytes };
    next();
}

module.exports = validateMediaUploadIntentBody;
