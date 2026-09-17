// V5.2-B1 — shared logic for Track.audio's transitional representation.
//
// Every pre-V5.2-B Track document stores `audio` as a bare local
// filename string (e.g. "1778888845516.mp3" — see the V5.2-B production
// architecture audit). The target representation is an object:
//   { provider: "local" | "s3", key, mimeType?, sizeBytes?, durationSec? }
//
// This module is the ONE place that knows how to move between those two
// shapes, so models/Track.js (schema-level normalize/validate) and
// services/mediaProvider.js (playback-URL resolution) both depend on it
// instead of each re-implementing "is this a legacy string?" — see
// models/Track.js's own comment for why a real Mongoose subdocument
// schema is NOT used for this field.

const AUDIO_PROVIDERS = ["local", "s3"];
const DEFAULT_AUDIO_MIME_TYPE = "audio/mpeg";

// Normalizes a Track.audio value into the canonical object shape.
// A legacy bare-filename string always becomes a "local" reference —
// every string-shaped value in this codebase's data was written by the
// pre-V5.2-B upload path, which only ever wrote to the local /uploads
// mechanism. An already-object value is returned unchanged (never
// re-interpreted or defaulted over) so this is safe to apply
// unconditionally, including to a value that's already been migrated.
function toAudioObject(value) {
    if (typeof value === "string") {
        return { provider: "local", key: value, mimeType: DEFAULT_AUDIO_MIME_TYPE };
    }
    return value;
}

// Validates a Track.audio value in whichever shape it's currently in.
// Deliberately accepts BOTH the legacy string shape and the new object
// shape as valid — this is what lets an existing, unmigrated production
// document keep passing validation on every ordinary save() (e.g.
// PUT /api/tracks/:id, which never touches `audio` at all) without
// forcing a migration as a side effect of an unrelated edit. Rejects
// anything else: a malformed object, an empty string, a wrong-typed
// optional field, or an unrecognized provider.
function isValidAudioValue(value) {
    if (typeof value === "string") {
        return value.trim().length > 0;
    }

    if (value === null || typeof value !== "object" || Array.isArray(value)) {
        return false;
    }

    if (!AUDIO_PROVIDERS.includes(value.provider)) {
        return false;
    }

    if (typeof value.key !== "string" || value.key.trim().length === 0) {
        return false;
    }

    if (value.mimeType !== undefined && typeof value.mimeType !== "string") {
        return false;
    }

    if (value.sizeBytes !== undefined && !(typeof value.sizeBytes === "number" && value.sizeBytes >= 0)) {
        return false;
    }

    if (value.durationSec !== undefined && !(typeof value.durationSec === "number" && value.durationSec >= 0)) {
        return false;
    }

    return true;
}

module.exports = { AUDIO_PROVIDERS, DEFAULT_AUDIO_MIME_TYPE, toAudioObject, isValidAudioValue };
