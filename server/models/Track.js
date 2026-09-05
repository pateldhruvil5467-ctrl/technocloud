const mongoose = require("mongoose");

const trackSchema = new mongoose.Schema({

    title: {
        type: String,
        required: true,
    },

    artist: {
        type: String,
        required: true,
    },

    audio: {
        type: String,
        required: true,
    },

    cover: {
        type: String,
        default: "",
    },

    uploadedBy: {
        type: String,
        default: "Unknown Artist",
    },

    // --- Phase A.1 additive fields ---
    // artistId is the real ownership reference going forward (resolved
    // from the authenticated uploader's ArtistProfile — never from the
    // free-text `artist` field above). Optional so every existing track
    // remains a valid document without a migration; `artist` and
    // `uploadedBy` keep working exactly as before during this phase.
    artistId: {
        type: mongoose.Schema.Types.ObjectId,
        ref: "ArtistProfile",
    },

    genre: {
        type: String,
    },

    subgenre: {
        type: String,
    },

    tags: {
        type: [String],
        default: [],
    },

    isMix: {
        type: Boolean,
        default: false,
    },

    visibility: {
        type: String,
        enum: ["draft", "public", "unlisted", "takedown"],
        default: "public",
    },

    uploadStatus: {
        type: String,
        enum: ["uploaded", "processing", "ready", "failed"],
        default: "ready",
    },

}, {
    timestamps: true,
});

// --- V.1 backend hardening: indexes ---
//
// Both are compound indexes chosen from actual query patterns already
// in this codebase (artistController.getArtistById, the new
// services/trackService.js listing), not speculative additions — see
// server/README.md's "Database indexes" section for the full
// query/rationale/tradeoff writeup for each. Deliberately not adding a
// standalone genre/subgenre index yet: current data volume and
// selectivity don't justify the extra write/storage cost (documented
// as a known limitation, easy to add later once genre filtering is
// actually load-bearing).

// Supports GET /api/v1/tracks with no artistId filter — the common
// "browse everything, optionally by visibility, newest first" query.
// The trailing _id keeps pagination boundaries stable when multiple
// tracks share a createdAt timestamp.
trackSchema.index({ visibility: 1, createdAt: -1, _id: -1 });

// Supports GET /api/artists/:id (Track.find({ artistId, visibility })
// .sort({ createdAt: -1 })) and GET /api/v1/tracks?artistId=... — an
// artist's own catalog, filtered by visibility, newest first.
trackSchema.index({ artistId: 1, visibility: 1, createdAt: -1 });

module.exports = mongoose.model("Track", trackSchema);