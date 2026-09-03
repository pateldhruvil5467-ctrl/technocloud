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

module.exports = mongoose.model("Track", trackSchema);