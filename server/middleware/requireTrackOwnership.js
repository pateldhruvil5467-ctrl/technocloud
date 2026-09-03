const Track = require("../models/Track");
const ArtistProfile = require("../models/ArtistProfile");

// Ownership, not role, gates edit/delete of a specific track.
// ADMIN keeps its existing, unconditional upload/manage privileges.
// ARTIST may only act on a track whose artistId matches their own
// ArtistProfile — a track with no artistId (legacy, or admin-uploaded
// with no artist identity) is never editable by an ARTIST, only ADMIN.
const requireTrackOwnership = async (req, res, next) => {
    try {
        const track = await Track.findById(req.params.id);

        if (!track) {
            return res.status(404).json({ message: "Track not found" });
        }

        if (req.user.role === "ADMIN") {
            req.track = track;
            return next();
        }

        const artistProfile = await ArtistProfile.findOne({ userId: req.user.id });

        const owns =
            artistProfile &&
            track.artistId &&
            track.artistId.equals(artistProfile._id);

        if (!owns) {
            return res.status(403).json({
                message: "Forbidden: you do not own this track",
            });
        }

        req.track = track;
        next();
    } catch (error) {
        res.status(500).json({ message: "Failed to verify track ownership" });
    }
};

module.exports = requireTrackOwnership;
