const AppError = require("../utils/AppError");

// Request-body validation for the track upload/update endpoints. Runs
// BEFORE the controller, so bad input never reaches a Mongoose
// `.save()`/`new Track(...)` call — closing a real, pre-existing gap:
// today, a missing title/artist on upload, an empty title/artist on
// update, or an invalid `visibility` value on update all throw a
// Mongoose ValidationError that the controller's generic catch turns
// into a misleading 500.
//
// This does NOT expand what the controllers persist. trackController.js
// still only ever reads its own fixed allowlist off req.body — this
// middleware only rejects bad values for fields the controller was
// already going to read; it never adds ownership/lifecycle fields
// (artistId, uploadedBy, role, uploadStatus, etc.) to anything a client
// can influence.

const MAX_SHORT_STRING = 200; // title / artist
const MAX_LONG_STRING = 100; // genre / subgenre
const MAX_TAG_LENGTH = 50;
const MAX_TAGS = 20;
const VISIBILITY_VALUES = ["draft", "public", "unlisted", "takedown"];

function isNonEmptyString(value, maxLength) {
    return typeof value === "string" && value.trim().length > 0 && value.length <= maxLength;
}

// Upload only ever accepts title/artist in the body (see
// trackController.uploadTrack) — both required, matching the Track
// model's own `required: true`.
function validateTrackUploadBody(req, res, next) {
    const { title, artist } = req.body;

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

    next();
}

// Update's allowlist is exactly title/artist/genre/subgenre/tags/isMix/
// visibility (see trackController.updateTrack) — each only validated
// when present in the body, matching the controller's own
// only-if-defined assignment semantics. genre/subgenre may legitimately
// be sent as "" (clearing the field, per the Studio edit form), so
// those two are the one case where an empty string is allowed.
function validateTrackUpdateBody(req, res, next) {
    const { title, artist, genre, subgenre, tags, isMix, visibility } = req.body;

    if (title !== undefined && !isNonEmptyString(title, MAX_SHORT_STRING)) {
        return next(
            new AppError(400, "VALIDATION_ERROR", `Title must be a non-empty string of ${MAX_SHORT_STRING} characters or fewer.`)
        );
    }

    if (artist !== undefined && !isNonEmptyString(artist, MAX_SHORT_STRING)) {
        return next(
            new AppError(400, "VALIDATION_ERROR", `Artist must be a non-empty string of ${MAX_SHORT_STRING} characters or fewer.`)
        );
    }

    if (genre !== undefined && (typeof genre !== "string" || genre.length > MAX_LONG_STRING)) {
        return next(
            new AppError(400, "VALIDATION_ERROR", `Genre must be a string of ${MAX_LONG_STRING} characters or fewer.`)
        );
    }

    if (subgenre !== undefined && (typeof subgenre !== "string" || subgenre.length > MAX_LONG_STRING)) {
        return next(
            new AppError(400, "VALIDATION_ERROR", `Subgenre must be a string of ${MAX_LONG_STRING} characters or fewer.`)
        );
    }

    if (tags !== undefined) {
        const validTags =
            Array.isArray(tags) &&
            tags.length <= MAX_TAGS &&
            tags.every((tag) => typeof tag === "string" && tag.length > 0 && tag.length <= MAX_TAG_LENGTH);

        if (!validTags) {
            return next(
                new AppError(
                    400,
                    "VALIDATION_ERROR",
                    `Tags must be an array of up to ${MAX_TAGS} non-empty strings, each ${MAX_TAG_LENGTH} characters or fewer.`
                )
            );
        }
    }

    if (isMix !== undefined && typeof isMix !== "boolean") {
        return next(new AppError(400, "VALIDATION_ERROR", "isMix must be a boolean."));
    }

    if (visibility !== undefined && !VISIBILITY_VALUES.includes(visibility)) {
        return next(
            new AppError(400, "VALIDATION_ERROR", `Visibility must be one of: ${VISIBILITY_VALUES.join(", ")}.`)
        );
    }

    next();
}

module.exports = { validateTrackUploadBody, validateTrackUpdateBody };
