const express = require("express");
const router = express.Router();

const auth = require("../../middleware/authMiddleware");
const requireRole = require("../../middleware/requireRole");
const resolveOwnArtistProfile = require("../../middleware/resolveOwnArtistProfile");
const validateTrackQuery = require("../../middleware/validateTrackQuery");
const meController = require("../../controllers/v1/meController");

// GET /api/v1/me/tracks — the Artist Studio's own-catalog listing.
//
// Ownership is resolved entirely server-side, in this exact order:
//   auth                  -> verifies the JWT, sets req.user
//   requireRole            -> ARTIST or ADMIN only (matches the existing
//                             convention for every other track-management
//                             route — see routes/trackRoutes.js)
//   resolveOwnArtistProfile -> looks up ArtistProfile by req.user.id,
//                             404s if none exists (never creates one)
//   validateTrackQuery      -> the same whitelist/type-checked query
//                             parser GET /api/v1/tracks uses, called
//                             with defaultVisibility: null so an owner
//                             browsing their own catalog sees every
//                             visibility by default, not just "public"
//   meController.listMyTracks -> overwrites filter.artistId with the
//                             resolved profile's id before ever calling
//                             the shared trackService — see that file's
//                             comment for why this is the actual
//                             security boundary, not requireRole alone.
//
// requireRole runs before resolveOwnArtistProfile deliberately: no
// point querying the database for a profile if the caller's role
// already disqualifies them.
router.get(
    "/tracks",
    auth,
    requireRole(["ARTIST", "ADMIN"]),
    resolveOwnArtistProfile,
    validateTrackQuery({ defaultVisibility: null }),
    meController.listMyTracks
);

module.exports = router;
