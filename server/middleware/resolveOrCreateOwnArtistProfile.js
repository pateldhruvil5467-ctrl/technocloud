const User = require("../models/User");
const ArtistProfile = require("../models/ArtistProfile");
const AppError = require("../utils/AppError");

// V5.2-B2 — combines two already-established conventions, for write-path
// routes that need an artist identity to scope a resource under (this
// file's first caller: POST /api/v1/media/upload-intent, whose S3 key
// format is audio/{artistProfileId}/{uuid}.mp3 — see utils/mediaKey.js):
//
//   - lazy ArtistProfile creation for ARTIST role, exactly as
//     trackController.uploadTrack already does on a user's first upload
//     (never for ADMIN — an ADMIN account never gets one auto-created;
//     see that controller's own comment for why: ADMIN is a
//     platform-authority role, not a musical identity).
//   - a clear 404 ARTIST_PROFILE_NOT_FOUND when still missing after
//     that (only reachable for ADMIN), the same status/code
//     middleware/resolveOwnArtistProfile.js already uses for the
//     read-path equivalent (GET /api/v1/me/tracks).
//
// Neither existing file is modified or reused directly here:
// resolveOwnArtistProfile.js never creates a profile (correct for its
// own read-only callers — a GET must never have the side effect of
// creating one just because someone looked — but wrong for a route that
// IS itself the first step of an upload), and trackController.uploadTrack's
// version doesn't 404 — it just proceeds with artistProfile possibly
// undefined, which trackController's own local-filesystem key scheme
// never needed an artist identity for anyway. This is the first route
// that needs both behaviors together, so this is a new, narrow file
// rather than a change to either existing one.
async function resolveOrCreateOwnArtistProfile(req, res, next) {
    try {
        let artistProfile = await ArtistProfile.findOne({ userId: req.user.id });

        if (!artistProfile && req.user.role === "ARTIST") {
            const user = await User.findById(req.user.id);
            artistProfile = await ArtistProfile.create({
                userId: req.user.id,
                displayName: user.username,
            });
        }

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

module.exports = resolveOrCreateOwnArtistProfile;
