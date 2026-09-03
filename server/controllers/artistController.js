const ArtistProfile = require("../models/ArtistProfile");
const Track = require("../models/Track");

exports.getArtistById = async (req, res) => {

    try {

        const artistProfile = await ArtistProfile.findById(req.params.id);

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
