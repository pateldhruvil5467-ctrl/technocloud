const ArtistProfile = require("../models/ArtistProfile");
const AppError = require("../utils/AppError");

// Resolves the AUTHENTICATED caller's own ArtistProfile from their JWT
// identity (req.user.id, set by authMiddleware) — the only source of
// truth for "which artist am I" on any /me/* route. Never reads a
// client-supplied artistId/userId/ownerId for this purpose; nothing in
// the request body or query string can influence which profile gets
// attached here.
//
// A read endpoint like GET /api/v1/me/tracks should never have the side
// effect of creating a profile just because someone looked — lazy
// creation is specifically the upload flow's behavior
// (trackController.uploadTrack, triggered by an actual write), not a
// GET's. If the authenticated ARTIST/ADMIN has no ArtistProfile yet,
// this fails explicitly with 404 rather than silently creating one.
async function resolveOwnArtistProfile(req, res, next) {
    try {
        const artistProfile = await ArtistProfile.findOne({ userId: req.user.id });

        if (!artistProfile) {
            return next(
                new AppError(404, "ARTIST_PROFILE_NOT_FOUND", "No artist profile exists for this account yet.")
            );
        }

        req.artistProfile = artistProfile;
        next();
    } catch (error) {
        next(error);
    }
}

module.exports = resolveOwnArtistProfile;
