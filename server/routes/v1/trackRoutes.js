const express = require("express");
const router = express.Router();

const trackController = require("../../controllers/v1/trackController");
const validateTrackQuery = require("../../middleware/validateTrackQuery");

// GET /api/v1/tracks — the canonical, paginated/filterable/sortable
// track listing. Public, same as the legacy GET /api/tracks. Does not
// (yet) duplicate upload/update/delete — see server/README.md's
// versioning-strategy section for why.
//
// validateTrackQuery is a factory (see middleware/validateTrackQuery.js)
// — called here with no arguments, which keeps its original default
// (public-only when visibility isn't specified) exactly as before.
router.get("/", validateTrackQuery(), trackController.listTracks);

module.exports = router;
