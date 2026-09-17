const crypto = require("crypto");

// V5.2-B1 — object-key generation for a FUTURE S3 upload flow (not
// connected to the existing upload route in this phase — see
// routes/trackRoutes.js, unchanged). Target shape:
//   audio/{artistProfileId}/{uuid}.mp3
//
// MP3 is the only supported audio type anywhere in this project today
// (see ACCEPTED_AUDIO_MIME_TYPES in routes/trackRoutes.js) — the
// extension is hardcoded for the same reason trackRoutes.js's own
// multer filename callback hardcodes it: MIME validation, not a
// filename/extension, is the real authority for what was uploaded.
const ALLOWED_AUDIO_EXTENSION = ".mp3";

// artistProfileId must come from server-resolved, authenticated identity
// in whichever future phase actually calls this (see
// middleware/resolveOwnArtistProfile.js) — never from client input. This
// function does not itself authenticate anything; it only builds a key
// from whatever id string it's given, so callers remain responsible for
// passing a trusted value. A light shape check (no path separators, no
// "..") is still applied here as defense in depth, even though a real
// ArtistProfile id is always a 24-character hex ObjectId string that
// could never contain either.
//
// originalFilename is accepted only so a future caller can pass through
// whatever the client sent (e.g. for logging/reference) — it is NEVER
// read, parsed, or used to build any part of the returned key. This is
// the same lesson already applied to the existing local upload path
// (routes/trackRoutes.js's multer filename callback, hardened after the
// V5.2 production-readiness audit) applied ahead of time to the future
// S3 key space: a crafted filename (path traversal, an unexpected
// extension, anything) can never influence where an object is written.
function generateAudioObjectKey(artistProfileId, originalFilename) {
    if (typeof artistProfileId !== "string" || artistProfileId.trim().length === 0) {
        throw new Error("generateAudioObjectKey requires a non-empty artistProfileId.");
    }

    if (/[\\/]|\.\./.test(artistProfileId)) {
        throw new Error("generateAudioObjectKey: artistProfileId must not contain path separators.");
    }

    return `audio/${artistProfileId}/${crypto.randomUUID()}${ALLOWED_AUDIO_EXTENSION}`;
}

module.exports = { generateAudioObjectKey, ALLOWED_AUDIO_EXTENSION };
