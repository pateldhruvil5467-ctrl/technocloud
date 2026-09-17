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
 *   - createUploadTarget(...): ...                      [V5.2-B2]
 *   - verifyUpload(...): ...                             [V5.2-B2 / B4]
 *   - deleteObject(key): ...                             [future, if/when needed]
 *
 * B1 implements only the first two. The rest are deliberately NOT
 * stubbed out here — B1's own instructions are explicit that direct-to-S3
 * upload, presigned URLs, and upload finalization are later phases, and
 * a stub function nothing calls yet is exactly the kind of speculative,
 * unverified code this phase avoids. Their shape is documented above so
 * V5.2-B2 has a clear contract to implement against, without this file
 * having guessed at (and possibly gotten wrong) their real signatures
 * ahead of time.
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

module.exports = { getProvider, getPlaybackUrl };
