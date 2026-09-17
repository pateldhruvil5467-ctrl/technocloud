const mongoose = require("mongoose");
const { toAudioObject, isValidAudioValue } = require("../utils/audioMedia");

const trackSchema = new mongoose.Schema({

    title: {
        type: String,
        required: true,
    },

    artist: {
        type: String,
        required: true,
    },

    // V5.2-B1 — transitional representation. Target shape:
    //   { provider: "local" | "s3", key, mimeType?, sizeBytes?, durationSec? }
    // but every pre-V5.2-B production Track still stores this as a bare
    // local filename string (e.g. "1778888845516.mp3").
    //
    // Deliberately Mongoose.Schema.Types.Mixed, NOT a nested Schema/
    // subdocument type — empirically verified (not assumed) that a
    // nested-schema path SILENTLY DROPS a legacy string value when
    // hydrating an existing document from the database (it casts to
    // `undefined`, no error raised), which would have made every
    // pre-migration Track's audio field silently vanish the moment this
    // schema change deployed. Mixed has no such cast step, so a legacy
    // document's raw string survives a read completely unchanged. A
    // custom Mongoose SchemaType was also considered and rejected: it
    // requires additional non-trivial internal registration this
    // Mongoose version doesn't support the way older versions' docs
    // describe, which is exactly the kind of subtle, hard-to-verify
    // behavior this field's backward-compatibility guarantee cannot
    // afford to get wrong.
    //
    // `set` transparently upgrades a plain string being ASSIGNED (not
    // read) into the new object shape — this is what lets the existing,
    // unmodified uploadTrack controller (still writing
    // `audio: req.file.filename`, a string) keep working with zero
    // controller change in this phase, while every new write already
    // lands in the new shape. `validate` accepts EITHER shape (see
    // utils/audioMedia.js's isValidAudioValue) so re-saving an untouched
    // legacy document (e.g. via PUT /api/tracks/:id, which never
    // touches `audio`) never spuriously fails just because that
    // document hasn't been migrated yet.
    //
    // The one-time migration to the new shape is
    // scripts/migrateLegacyAudio.js — not run automatically, and not run
    // against production as part of this phase. Once every real document
    // is confirmed migrated, a later phase can safely tighten this back
    // down to a strict, non-Mixed type.
    audio: {
        type: mongoose.Schema.Types.Mixed,
        required: true,
        set: toAudioObject,
        validate: {
            validator: isValidAudioValue,
            message:
                "Track.audio must be a non-empty legacy filename string, or " +
                "{ provider: 'local'|'s3', key: String, mimeType?, sizeBytes?, durationSec? }.",
        },
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