const mongoose = require("mongoose");

// The public-facing identity for an ARTIST-role User. Kept separate from
// User (auth-only) so profile/presentation data never mixes with
// credentials, and so a track's ownership (Track.artistId) points at a
// stable public identity rather than an internal account.
//
// Creation: there is no public promotion/onboarding endpoint yet. An
// ArtistProfile is created lazily the first time an ARTIST-role user
// successfully uploads a track (see trackController.uploadTrack). A real
// "become an artist" / admin-promotion flow is deferred to a later
// milestone — see the Phase A.1 implementation notes.
const artistProfileSchema = new mongoose.Schema(
    {
        userId: {
            type: mongoose.Schema.Types.ObjectId,
            ref: "User",
            required: true,
            unique: true,
        },

        displayName: {
            type: String,
            required: true,
        },

        bio: {
            type: String,
            default: "",
        },

        avatarKey: {
            type: String,
            default: "",
        },

        genres: {
            type: [String],
            default: [],
        },

        // Descriptive profile attributes only (e.g. "dj", "producer",
        // "live") — never used for authorization. Role-based access
        // control continues to rely solely on User.role.
        artistTypes: {
            type: [String],
            default: [],
        },

        links: {
            soundcloud: { type: String, default: "" },
            instagram: { type: String, default: "" },
            bandcamp: { type: String, default: "" },
            website: { type: String, default: "" },
        },

        verified: {
            type: Boolean,
            default: false,
        },
    },
    { timestamps: true }
);

module.exports = mongoose.model("ArtistProfile", artistProfileSchema);
