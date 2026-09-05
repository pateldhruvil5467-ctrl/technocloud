const mongoose = require("mongoose");
const AppError = require("../utils/AppError");

// Validates and normalizes GET /api/v1/tracks query parameters into
// req.trackQuery, for services/trackService.js to consume directly —
// the service never reads req.query itself, so it's structurally
// impossible for it to spread an unvalidated value into a Mongo filter.
//
// The `typeof raw.X !== "string"` checks below are the actual injection
// guard, verified against this app's real query parser (Express 5's
// default "simple" parser, confirmed NOT to build nested objects from
// bracket notation the way Express 4 + qs did — `?visibility[$ne]=x`
// arrives as a literal key `"visibility[$ne]"`, not a nested
// `req.query.visibility`). What the simple parser DOES still produce is
// an array when a key repeats — `?visibility=a&visibility=b` becomes
// `req.query.visibility = ["a", "b"]` — and every check below rejects
// that the moment it isn't a plain string, before any enum/format check
// even runs, so an array (or, if the query-parser setting is ever
// changed to "extended", an object) can never reach the Mongo filter.

const SORT_VALUES = ["newest", "oldest", "title_asc", "title_desc"];
const VISIBILITY_VALUES = ["draft", "public", "unlisted", "takedown"];
const DEFAULT_LIMIT = 20;
const MAX_LIMIT = 100;
const MAX_STRING_FILTER_LENGTH = 100;
const MAX_SEARCH_LENGTH = 100;

function isPositiveIntegerString(value) {
    return typeof value === "string" && /^\d+$/.test(value);
}

function validateTrackQuery(req, res, next) {
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
        if (typeof raw.genre !== "string" || raw.genre.length === 0 || raw.genre.length > MAX_STRING_FILTER_LENGTH) {
            return next(new AppError(400, "VALIDATION_ERROR", "genre must be a non-empty string."));
        }
        filter.genre = raw.genre;
    }

    if (raw.subgenre !== undefined) {
        if (
            typeof raw.subgenre !== "string" ||
            raw.subgenre.length === 0 ||
            raw.subgenre.length > MAX_STRING_FILTER_LENGTH
        ) {
            return next(new AppError(400, "VALIDATION_ERROR", "subgenre must be a non-empty string."));
        }
        filter.subgenre = raw.subgenre;
    }

    if (raw.artistId !== undefined) {
        if (typeof raw.artistId !== "string" || !mongoose.Types.ObjectId.isValid(raw.artistId)) {
            return next(new AppError(400, "VALIDATION_ERROR", "artistId must be a valid id."));
        }
        filter.artistId = raw.artistId;
    }

    if (raw.isMix !== undefined) {
        if (typeof raw.isMix !== "string" || !["true", "false"].includes(raw.isMix.toLowerCase())) {
            return next(new AppError(400, "VALIDATION_ERROR", 'isMix must be "true" or "false".'));
        }
        filter.isMix = raw.isMix.toLowerCase() === "true";
    }

    if (raw.visibility !== undefined) {
        if (typeof raw.visibility !== "string" || !VISIBILITY_VALUES.includes(raw.visibility)) {
            return next(
                new AppError(400, "VALIDATION_ERROR", `visibility must be one of: ${VISIBILITY_VALUES.join(", ")}.`)
            );
        }
        filter.visibility = raw.visibility;
    } else {
        // Default to public-only when no explicit visibility is
        // requested — deliberately safer than the legacy /api/tracks
        // endpoint, which returns every visibility unfiltered (a
        // pre-existing quirk this new endpoint does not inherit). An
        // explicit ?visibility=draft/unlisted/takedown still works for a
        // future owner-scoped use case; there is no additional
        // authentication/ownership check on that yet — see the README's
        // known-limitations note.
        filter.visibility = "public";
    }

    let search;
    if (raw.search !== undefined) {
        if (typeof raw.search !== "string" || raw.search.length === 0 || raw.search.length > MAX_SEARCH_LENGTH) {
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

    req.trackQuery = { page, limit, sort, filter, search };
    next();
}

module.exports = validateTrackQuery;
