const config = require("../config/env");
const { toAudioObject } = require("../utils/audioMedia");
const local = require("./media/local");
const s3 = require("./media/s3");

/**
 * Media storage provider dispatch (V5.2-B1 foundation) — mirrors
 * services/aiProvider.js's own dispatch-by-config-value pattern exactly.
 * Nothing outside this module and services/media/*.js knows which
 * provider is selected or how its URLs/keys are shaped.
 *
 * Full intended provider interface (every module under services/media/
 * is expected to eventually implement all of these):
 *   - isConfigured(): boolean                          [implemented — B1]
 *   - getPlaybackUrl(key, options?): string             [implemented — B1]
 *   - createUploadTarget({key, mimeType, sizeBytes})    [implemented — B2, s3 only]
 *   - verifyUpload(...): ...                             [V5.2-B4]
 *   - deleteObject(key): ...                             [future, if/when needed]
 *
 * B2 adds createUploadTarget — implemented only by services/media/s3.js;
 * services/media/local.js deliberately does NOT implement it (the
 * existing local upload path is the unchanged multer endpoint in
 * routes/trackRoutes.js, which never goes through this abstraction at
 * all — a "local createUploadTarget" would have nothing real to do).
 * getProvider(...)/createUploadTarget(...) below handle that absence
 * with a clear error rather than assuming every provider implements
 * every operation.
 *
 * verifyUpload/deleteObject remain deliberately NOT stubbed out — B2's
 * own instructions are explicit that upload completion/finalization and
 * deletion are later phases, and a stub function nothing calls yet is
 * exactly the kind of speculative, unverified code this phase avoids.
 */
const PROVIDERS = { local, s3 };

function getProvider(name = config.mediaStorageProvider) {
    const provider = PROVIDERS[name];

    if (!provider) {
        throw new Error(
            `Unsupported media storage provider: "${name}". Expected one of: ${Object.keys(PROVIDERS).join(", ")}.`
        );
    }

    return provider;
}

// Resolves a playback URL for a Track.audio value — handles both the new
// { provider, key, ... } shape and a legacy bare-filename string (always
// "local"; see utils/audioMedia.js's toAudioObject, the same
// legacy-string normalization the Track schema itself uses, reused here
// rather than re-implemented, per V5.2-B1's "no duplicated provider
// logic" requirement).
function getPlaybackUrl(audio) {
    const normalized = toAudioObject(audio);

    if (!normalized || typeof normalized !== "object" || typeof normalized.key !== "string") {
        throw new Error("Cannot resolve a playback URL: audio value is missing or malformed.");
    }

    const provider = getProvider(normalized.provider);

    if (!provider.isConfigured()) {
        throw new Error(`Media storage provider "${normalized.provider}" is not configured.`);
    }

    return provider.getPlaybackUrl(normalized.key);
}

// V5.2-B2 — requests a presigned upload target from whichever provider
// is CONFIGURED (config.mediaStorageProvider), never a hardcoded "s3".
// With the default provider ("local"), this always fails clearly and
// safely — local uploads go through the existing, unchanged multer
// route instead; there is no presigned-upload concept for it.
async function createUploadTarget({ key, mimeType, sizeBytes }) {
    const providerName = config.mediaStorageProvider;
    const provider = getProvider(providerName);

    if (typeof provider.createUploadTarget !== "function") {
        throw new Error(
            `Media storage provider "${providerName}" does not support creating an upload target.`
        );
    }

    if (!provider.isConfigured()) {
        throw new Error(`Media storage provider "${providerName}" is not configured.`);
    }

    return provider.createUploadTarget({ key, mimeType, sizeBytes });
}

module.exports = { getProvider, getPlaybackUrl, createUploadTarget };
