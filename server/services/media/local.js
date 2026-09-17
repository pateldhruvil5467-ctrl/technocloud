// V5.2-B1 — the "local" media provider: represents the EXISTING /uploads
// mechanism (multer.diskStorage in routes/trackRoutes.js, served by
// app.js's `app.use("/uploads", express.static("uploads"))`) as a
// provider under the new storage abstraction. Nothing about how local
// media is actually stored or served changes in this phase — this
// module only teaches the abstraction how to describe what already
// exists, so services/mediaProvider.js has one consistent interface
// regardless of which provider a given Track.audio value points at.

// Always configured — local disk storage has no external dependency
// (no credentials, no network) that could be missing.
function isConfigured() {
    return true;
}

// Mirrors PlayerContext.js's own `${API_BASE_URL}/uploads/${key}` URL
// construction (client/src/context/PlayerContext.js) exactly — same
// relative-path convention, not a new one. Returns a path relative to
// the API origin; this module doesn't know (and doesn't need to know)
// the app's own public base URL, matching how the frontend already
// supplies that part itself.
function getPlaybackUrl(key) {
    if (typeof key !== "string" || key.length === 0) {
        throw new Error("local media provider: getPlaybackUrl requires a non-empty key.");
    }
    return `/uploads/${key}`;
}

module.exports = { isConfigured, getPlaybackUrl };
