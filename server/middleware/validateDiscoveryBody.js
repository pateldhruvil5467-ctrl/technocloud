const AppError = require("../utils/AppError");
const { MAX_SEARCH_LENGTH } = require("../services/searchIntent");

// Validates POST /api/v1/discovery/interpret's request body BEFORE the
// (potentially billed) AI provider is ever called — same "validate
// first, expensive work second" ordering every other v1 route already
// uses (validateTrackQuery.js, validateArtistQuery.js,
// validateTrackBody.js).
//
// Reuses searchIntent.js's own MAX_SEARCH_LENGTH rather than a second,
// possibly-drifting magic number: this is exactly the same length
// constraint normalizeIntent() will itself enforce on the "search"
// field downstream, so validating against anything else here would
// just be a second, inconsistent copy of the same rule.
function isValidQuery(value, maxLength) {
    if (typeof value !== "string") {
        return false;
    }

    const trimmed = value.trim();
    return trimmed.length > 0 && trimmed.length <= maxLength;
}

function validateDiscoveryBody(req, res, next) {
    const body = req.body;

    if (body === null || typeof body !== "object" || Array.isArray(body)) {
        return next(new AppError(400, "VALIDATION_ERROR", "Request body must be an object."));
    }

    const { query } = body;

    if (!isValidQuery(query, MAX_SEARCH_LENGTH)) {
        return next(
            new AppError(
                400,
                "VALIDATION_ERROR",
                `query is required and must be a non-empty string of ${MAX_SEARCH_LENGTH} characters or fewer.`
            )
        );
    }

    req.discoveryQuery = query.trim();
    next();
}

module.exports = validateDiscoveryBody;
