const ArtistProfile = require("../models/ArtistProfile");
const Track = require("../models/Track");

// Public-safe projection — mirrors services/artistService.js's
// PUBLIC_FIELDS list (kept as its own constant here rather than
// imported, since this legacy controller is deliberately not being
// rewritten into the v1 service architecture — see server/README.md's
// versioning-strategy section for why legacy endpoints stay as-is).
// userId (the internal reference to the owning User account) is
// deliberately excluded — this is a MongoDB-level projection, not
// post-fetch filtering, so it is never even fetched from the database.
const PUBLIC_ARTIST_FIELDS = "_id displayName bio avatarKey genres artistTypes links verified createdAt";

exports.getArtistById = async (req, res) => {

    try {

        const artistProfile = await ArtistProfile.findById(req.params.id).select(PUBLIC_ARTIST_FIELDS);

        if (!artistProfile) {
            return res.status(404).json({ message: "Artist not found" });
        }

        const tracks = await Track.find({
            artistId: artistProfile._id,
            visibility: "public",
        }).sort({ createdAt: -1 });

        res.json({ artistProfile, tracks });

    } catch (error) {

        res.status(500).json({ message: error.message });
    }
};
