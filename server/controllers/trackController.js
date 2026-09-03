const Track = require("../models/Track");
const User = require("../models/User");
const ArtistProfile = require("../models/ArtistProfile");

exports.uploadTrack = async (req, res) => {

    try {

        if (!req.file) {
            return res.status(400).json({
                message: "Audio file is required",
            });
        }

        // req.user.id (never username) is the ownership key. Look the
        // user up fresh rather than trusting req.user.username, so
        // attribution is correct even for a still-valid token issued
        // before the JWT started carrying a username claim.
        const user = await User.findById(req.user.id);

        // Resolve the uploader's ArtistProfile. ARTIST accounts get one
        // lazily created on first upload if they don't already have one
        // — there is no separate promotion/onboarding endpoint yet (see
        // ArtistProfile.js and the Phase A.1 implementation notes).
        // ADMIN uploads reuse an existing ArtistProfile if the admin
        // also happens to have one, but never get one auto-created:
        // ADMIN is a platform-authority role, not a musical identity,
        // and forcing a profile onto every admin account would
        // misrepresent the artist catalog. Such a track's artistId
        // simply stays unset, exactly like a legacy track today.
        let artistProfile = await ArtistProfile.findOne({ userId: req.user.id });

        if (!artistProfile && req.user.role === "ARTIST") {
            artistProfile = await ArtistProfile.create({
                userId: req.user.id,
                displayName: user.username,
            });
        }

        const newTrack = new Track({

            title: req.body.title,

            artist: req.body.artist,

            uploadedBy: user.username,

            artistId: artistProfile ? artistProfile._id : undefined,

            audio: req.file.filename,
        });

        await newTrack.save();

        res.status(201).json({
            message: "Track uploaded successfully",
            track: newTrack,
        });

    } catch (error) {

        res.status(500).json({
            error: error.message,
        });
    }
};

exports.getTracks = async (req, res) => {

    try {

        const tracks = await Track.find()
            .sort({ createdAt: -1 });

        res.json(tracks);

    } catch (error) {

        res.status(500).json({
            error: error.message,
        });
    }
};

// req.track is loaded and ownership-checked by requireTrackOwnership.
exports.updateTrack = async (req, res) => {

    try {

        const track = req.track;
        const { title, artist, genre, subgenre, tags, isMix, visibility } = req.body;

        if (title !== undefined) track.title = title;
        if (artist !== undefined) track.artist = artist;
        if (genre !== undefined) track.genre = genre;
        if (subgenre !== undefined) track.subgenre = subgenre;
        if (tags !== undefined) track.tags = tags;
        if (isMix !== undefined) track.isMix = isMix;
        if (visibility !== undefined) track.visibility = visibility;

        await track.save();

        res.json({
            message: "Track updated successfully",
            track,
        });

    } catch (error) {

        res.status(500).json({
            message: error.message,
        });
    }
};

exports.deleteTrack = async (req, res) => {

    try {

        await Track.findByIdAndDelete(req.track._id);

        res.json({ message: "Track deleted successfully" });

    } catch (error) {

        res.status(500).json({
            message: error.message,
        });
    }
};