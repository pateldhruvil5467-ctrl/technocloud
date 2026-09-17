const AppError = require("../../utils/AppError");
const config = require("../../config/env");
const mediaProvider = require("../../services/mediaProvider");
const MediaUploadIntent = require("../../models/MediaUploadIntent");
const { generateAudioObjectKey } = require("../../utils/mediaKey");

/**
 * POST /api/v1/media/upload-intent (V5.2-B2)
 *
 * Trust flow, entirely server-resolved:
 *   req.user (authMiddleware) -> req.artistProfile
 *     (resolveOrCreateOwnArtistProfile) -> generateAudioObjectKey(...)
 *     -> mediaProvider.createUploadTarget(...) -> MediaUploadIntent
 *
 * At no point is a bucket, key, artistProfileId, userId, owner, or
 * provider read from the request body — req.mediaUploadIntent (set by
 * validateMediaUploadIntentBody) only ever contains
 * {filename, mimeType, sizeBytes}.
 */
async function createUploadIntent(req, res, next) {
    try {
        const { filename, mimeType, sizeBytes } = req.mediaUploadIntent;
        const artistProfile = req.artistProfile;

        const key = generateAudioObjectKey(artistProfile._id.toString(), filename);

        let target;
        try {
            target = await mediaProvider.createUploadTarget({ key, mimeType, sizeBytes });
        } catch (error) {
            // Every failure from the provider layer — unconfigured,
            // presigner failure, an unsupported provider — collapses to
            // the same safe, generic outcome, mirroring
            // services/aiProvider.js's own error-collapsing pattern.
            // The provider's own thrown message (never a credential,
            // never a raw AWS exception body) is only ever logged
            // server-side, never returned to the client.
            console.error(
                JSON.stringify({
                    ts: new Date().toISOString(),
                    level: "error",
                    event: "media_upload_intent_provider_error",
                    provider: config.mediaStorageProvider,
                    message: error instanceof Error ? error.message : "Unknown media provider error.",
                })
            );
            return next(
                new AppError(503, "MEDIA_PROVIDER_UNAVAILABLE", "Upload authorization is currently unavailable.")
            );
        }

        // Coherent by construction: both the persisted expiry and the
        // presigned URL's own expiry derive from the exact same
        // expiresIn value, computed via epoch-millisecond arithmetic
        // (Date.now(), never a locale/timezone-sensitive string), so
        // there is no way for the two to drift apart.
        const expiresAt = new Date(Date.now() + target.expiresIn * 1000);

        const intent = await MediaUploadIntent.create({
            artistProfileId: artistProfile._id,
            provider: config.mediaStorageProvider,
            key,
            mimeType,
            sizeBytes,
            originalFilename: filename,
            expiresAt,
        });

        res.status(201).json({
            data: {
                uploadId: intent._id,
                key,
                uploadUrl: target.uploadUrl,
                expiresAt: expiresAt.toISOString(),
            },
        });
    } catch (error) {
        next(error);
    }
}

module.exports = { createUploadIntent };
