const AppError = require("../utils/AppError");

// Validates and normalizes GET /api/v1/artists query parameters into
// req.artistQuery, for services/artistService.js to consume directly —
// the service never reads req.query itself, so it's structurally
// impossible for it to spread an unvalidated value into a Mongo filter.
//
// Mirrors middleware/validateTrackQuery.js's whitelist/type-check
// philosophy exactly: the same `typeof raw.X !== "string"` guard rejects
// a repeated query key (parsed as an array by Express 5's default "simple"
// parser) before any enum/format check even runs, and the same
// AppError/VALIDATION_ERROR shape is used throughout. Kept as an
// independent file rather than importing from validateTrackQuery.js so
// this endpoint's validation can evolve without touching the track query
// contract — the two are siblings by convention, not by shared code.

const SORT_VALUES = ["newest", "oldest", "name_asc", "name_desc"];

// Same values as validateTrackQuery.js's DEFAULT_LIMIT/MAX_LIMIT — kept
// as independent constants for the reason above, not because the numbers
// are meant to diverge.
const DEFAULT_LIMIT = 20;
const MAX_LIMIT = 100;
const MAX_STRING_FILTER_LENGTH = 100;
const MAX_SEARCH_LENGTH = 100;

function isPositiveIntegerString(value) {
    return typeof value === "string" && /^\d+$/.test(value);
}

function validateArtistQuery(req, res, next) {
    const raw = req.query;

    let page = 1;
    if (raw.page !== undefined) {
        if (!isPositiveIntegerString(raw.page) || Number(raw.page) < 1) {
            return next(new AppError(400, "VALIDATION_ERROR", "page must be a positive integer."));
        }
        page = Number(raw.page);
    }

    let limit = DEFAULT_LIMIT;
    if (raw.limit !== undefined) {
        if (!isPositiveIntegerString(raw.limit)) {
            return next(new AppError(400, "VALIDATION_ERROR", "limit must be a positive integer."));
        }
        limit = Number(raw.limit);
        if (limit < 1 || limit > MAX_LIMIT) {
            return next(
                new AppError(400, "VALIDATION_ERROR", `limit must be between 1 and ${MAX_LIMIT}.`)
            );
        }
    }

    let sort = "newest";
    if (raw.sort !== undefined) {
        if (typeof raw.sort !== "string" || !SORT_VALUES.includes(raw.sort)) {
            return next(
                new AppError(400, "VALIDATION_ERROR", `sort must be one of: ${SORT_VALUES.join(", ")}.`)
            );
        }
        sort = raw.sort;
    }

    const filter = {};

    if (raw.genre !== undefined) {
        if (
            typeof raw.genre !== "string" ||
            raw.genre.length === 0 ||
            raw.genre.length > MAX_STRING_FILTER_LENGTH
        ) {
            return next(new AppError(400, "VALIDATION_ERROR", "genre must be a non-empty string."));
        }
        filter.genre = raw.genre;
    }

    let search;
    if (raw.search !== undefined) {
        if (
            typeof raw.search !== "string" ||
            raw.search.length === 0 ||
            raw.search.length > MAX_SEARCH_LENGTH
        ) {
            return next(
                new AppError(
                    400,
                    "VALIDATION_ERROR",
                    `search must be a non-empty string of ${MAX_SEARCH_LENGTH} characters or fewer.`
                )
            );
        }
        search = raw.search;
    }

    req.artistQuery = { page, limit, sort, filter, search };
    next();
}

module.exports = validateArtistQuery;
