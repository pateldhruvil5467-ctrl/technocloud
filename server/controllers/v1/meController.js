const trackService = require("../../services/trackService");

// GET /api/v1/me/tracks — reuses the exact same trackService.listTracks
// pagination/sort/filter engine GET /api/v1/tracks uses (see
// services/trackService.js — untouched, no duplicated query logic).
//
// The one line that matters for security: req.trackQuery.filter.artistId
// is unconditionally overwritten with the server-resolved
// req.artistProfile._id (attached by middleware/resolveOwnArtistProfile.js,
// which itself only ever reads req.user.id from the verified JWT).
// validateTrackQuery may already have set filter.artistId from a
// client-supplied ?artistId=... — that value is discarded here, not
// merged, not trusted, not used for anything. There is no code path
// through this controller where a client-controlled value can end up as
// the ownership filter.
async function listMyTracks(req, res, next) {
    try {
        req.trackQuery.filter.artistId = req.artistProfile._id;

        const result = await trackService.listTracks(req.trackQuery);
        res.json(result);
    } catch (error) {
        next(error);
    }
}

module.exports = { listMyTracks };
