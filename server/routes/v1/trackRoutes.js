const express = require("express");
const router = express.Router();

const trackController = require("../../controllers/v1/trackController");
const validateTrackQuery = require("../../middleware/validateTrackQuery");
const { publicReadLimiter } = require("../../middleware/rateLimiters");

// GET /api/v1/tracks — the canonical, paginated/filterable/sortable
// track listing. Public, same as the legacy GET /api/tracks. Does not
// (yet) duplicate upload/update/delete — see server/README.md's
// versioning-strategy section for why.
//
// publicReadLimiter runs first (V3.3) so an abusive burst is rejected
// before any validation or database work happens — see
// middleware/rateLimiters.js. Shared with GET /api/v1/artists, not
// applied to /api/v1/health or /api/v1/me/tracks.
//
// validateTrackQuery is a factory (see middleware/validateTrackQuery.js).
// `restrictToPublic: true` (V3.3) is the actual security boundary here:
// it rejects an explicit non-"public" `?visibility=` outright, so this
// endpoint can never return a draft/unlisted/takedown track to anyone,
// regardless of what is requested — see middleware/validateTrackQuery.js
// for the full reasoning. GET /api/v1/me/tracks (routes/v1/meRoutes.js)
// does not pass this option and is completely unaffected.
router.get(
    "/",
    publicReadLimiter,
    validateTrackQuery({ restrictToPublic: true }),
    trackController.listTracks
);

module.exports = router;
