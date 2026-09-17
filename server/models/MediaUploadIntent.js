const mongoose = require("mongoose");
const { AUDIO_PROVIDERS } = require("../utils/audioMedia");

// V5.2-B2 — a short-lived record of a single presigned-upload
// authorization. Created by POST /api/v1/media/upload-intent
// (controllers/v1/mediaController.js). Nothing reads it back yet in this
// phase — a later phase ("track finalization," V5.2-B4) is what will
// consult this to confirm an upload actually happened before creating a
// Track from it.
//
// Deliberately minimal:
//   - No `status` field. Nothing anywhere in this phase ever transitions
//     a record to "completed" or "failed" (that's B4's job) — a status
//     enum with exactly one reachable value ("pending") would be the
//     kind of speculative lifecycle state this phase is meant to avoid.
//     `expiresAt` alone is the complete, sufficient source of truth for
//     whether an intent is still active (compare against the current
//     time), and remains meaningful once a later phase adds a real
//     second state.
//   - No `userId` field. `artistProfileId` is this app's one established
//     ownership key for exactly this purpose — Track.artistId does the
//     same thing, never storing userId redundantly alongside it (see
//     models/Track.js); a userId is one lookup away via ArtistProfile if
//     it's ever genuinely needed.
const mediaUploadIntentSchema = new mongoose.Schema(
    {
        // The server-resolved owner (see
        // middleware/resolveOrCreateOwnArtistProfile.js) — never a
        // client-supplied value.
        artistProfileId: {
            type: mongoose.Schema.Types.ObjectId,
            ref: "ArtistProfile",
            required: true,
        },

        // Which media provider issued this intent. Reuses
        // utils/audioMedia.js's AUDIO_PROVIDERS enum rather than a
        // second, possibly-drifting copy — "local" is a valid enum value
        // there but is never actually reachable here in practice: the
        // local provider has no createUploadTarget implementation (see
        // services/media/local.js / services/mediaProvider.js), so no
        // code path ever creates a MediaUploadIntent with provider:
        // "local".
        provider: {
            type: String,
            enum: AUDIO_PROVIDERS,
            required: true,
        },

        // The server-generated object key (see utils/mediaKey.js) —
        // never a client-supplied value.
        key: {
            type: String,
            required: true,
        },

        mimeType: {
            type: String,
            required: true,
        },

        sizeBytes: {
            type: Number,
            required: true,
        },

        // Reference/display only, exactly what the client declared in
        // its request — NEVER used to build `key` (see
        // utils/mediaKey.js's own comment on this same point). Optional:
        // a client is not required to send one for this field to be
        // meaningful to persist.
        originalFilename: {
            type: String,
        },

        expiresAt: {
            type: Date,
            required: true,
        },
    },
    { timestamps: true }
);

// Supports a future completion endpoint's "find this artist's own
// pending intents" access pattern (B4) — scoped by owner, newest first,
// the same shape as every other owner-scoped index in this app (see
// models/Track.js's artistId-based index).
mediaUploadIntentSchema.index({ artistProfileId: 1, createdAt: -1 });

module.exports = mongoose.model("MediaUploadIntent", mediaUploadIntentSchema);
