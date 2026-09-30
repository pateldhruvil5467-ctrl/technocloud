const config = require("../config/env");
const mediaProvider = require("./mediaProvider");

// V5.2-B5.1 — the first, and only, caller of mediaProvider.getPlaybackUrl
// (services/mediaProvider.js — already existed, already tested, had zero
// callers before this). This module's ONE job is presenting a Track for
// an API response: add a top-level, client-consumable `playbackUrl`,
// without ever mutating or replacing `Track.audio` itself — `audio`
// remains storage/media metadata (provider/key/mimeType/sizeBytes, or a
// legacy bare-filename string); `playbackUrl` is a separately-derived
// field. See the V5.2-B5.0 audit for why this is a new top-level field
// rather than a transformation of `audio` in place.
//
// Works identically for a legacy string `audio` value and a canonical
// { provider, key, ... } object — both are already handled by
// mediaProvider.getPlaybackUrl (via utils/audioMedia.js's
// toAudioObject), so this module has no shape-specific logic of its own
// to get wrong.

// Converts a Track into a plain object before adding playbackUrl, so the
// ORIGINAL document (or plain object) passed in is never mutated in any
// case — this module returns a new object every time.
//
// Uses .toObject() when given a real Mongoose document (the exact same
// serialization Mongoose's own res.json()-via-toJSON() would have
// produced, so every existing field stays byte-for-byte identical to
// today's response — see server/README.md's existing endpoints, none of
// which are supposed to change shape here beyond the new field) and
// falls back to a shallow copy for an already-plain object, so this
// module works with either input, per this phase's own requirement.
function toPlainObject(track) {
    if (track && typeof track.toObject === "function") {
        return track.toObject();
    }
    return { ...track };
}

// Resolves a single Track's playbackUrl. Never throws: a single
// unresolvable track (unconfigured provider, malformed/legacy data under
// a provider that no longer matches it, ...) must never fail an entire
// list response it's part of — see this phase's own error-handling
// requirement. Mirrors controllers/v1/mediaController.js's own existing
// provider-error logging convention exactly (createUploadIntent /
// completeUpload — the same structured, JSON, server-side-only log
// line), rather than inventing a new logging approach.
function presentTrack(track) {
    const plain = toPlainObject(track);

    let playbackUrl = null;
    try {
        playbackUrl = mediaProvider.getPlaybackUrl(track.audio);
    } catch (error) {
        // The raw provider error (e.g. "not configured", or a real
        // AWS/SDK exception's own message) is only ever logged
        // server-side here — never returned to the client. `playbackUrl`
        // simply stays null; callers/UIs decide how to represent that.
        console.error(
            JSON.stringify({
                ts: new Date().toISOString(),
                level: "error",
                event: "track_playback_resolution_error",
                provider: config.mediaStorageProvider,
                trackId: track && track._id ? String(track._id) : undefined,
                message: error instanceof Error ? error.message : "Unknown playback resolution error.",
            })
        );
    }

    return { ...plain, playbackUrl };
}

// Applies presentTrack to a list — the shape every existing Track-listing
// endpoint already works with (an array of Track documents).
function presentTracks(tracks) {
    return tracks.map(presentTrack);
}

module.exports = { presentTrack, presentTracks };
