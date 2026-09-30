const AppError = require("../../utils/AppError");
const config = require("../../config/env");
const mediaProvider = require("../../services/mediaProvider");
const MediaUploadIntent = require("../../models/MediaUploadIntent");
const Track = require("../../models/Track");
const User = require("../../models/User");
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

/**
 * POST /api/v1/media/complete (V5.2-B4)
 *
 * Trust flow, entirely server-resolved:
 *   req.user (authMiddleware) -> req.artistProfile (resolveOwnArtistProfile)
 *     -> MediaUploadIntent (looked up by uploadId, scoped to
 *        req.artistProfile._id, unexpired) -> mediaProvider.verifyUpload
 *        (real S3 HeadObject) -> MediaUploadIntent.findOneAndDelete
 *        (atomic consumption) -> Track.create
 *
 * req.mediaComplete (set by validateMediaCompleteBody) only ever contains
 * {uploadId, title, artist} — provider/key/bucket/artistProfileId/
 * userId/owner/mimeType/sizeBytes are never read from the request body
 * anywhere in this function; every one of them comes from the persisted
 * MediaUploadIntent or from S3's own verified HeadObject response.
 */
async function completeUpload(req, res, next) {
    try {
        const { uploadId, title, artist } = req.mediaComplete;
        const artistProfile = req.artistProfile;

        // Ownership + expiry folded into ONE query, exactly as locked in
        // the audit: a mismatch on either axis (wrong id, foreign
        // artistProfileId, or expired) is indistinguishable from this
        // query's point of view — see the expiry-only recheck below for
        // the one case that's still safe to report distinctly.
        const intent = await MediaUploadIntent.findOne({
            _id: uploadId,
            artistProfileId: artistProfile._id,
            expiresAt: { $gt: new Date() },
        });

        if (!intent) {
            // Re-queries WITHOUT the expiry filter, but still scoped to
            // this exact uploadId AND this artist's own artistProfileId.
            // This can only ever match a document that genuinely belongs
            // to the caller and genuinely exists — the one case left
            // unmatched by the query above is "expired," which is safe
            // to report distinctly. It can never match a foreign or
            // never-existed uploadId (both still excluded by the
            // artistProfileId filter), so this never leaks whether some
            // OTHER artist's intent exists.
            const expiredOwnIntent = await MediaUploadIntent.findOne({
                _id: uploadId,
                artistProfileId: artistProfile._id,
            });

            if (expiredOwnIntent) {
                return next(
                    new AppError(410, "UPLOAD_INTENT_EXPIRED", "This upload has expired. Please upload again.")
                );
            }

            return next(new AppError(404, "UPLOAD_INTENT_NOT_FOUND", "No matching upload was found."));
        }

        // S3 verification — deliberately BEFORE consuming the intent, so
        // any verification failure below leaves it fully intact and
        // retryable (the artist can call this endpoint again with the
        // same uploadId, right up until expiresAt).
        let verified;
        try {
            verified = await mediaProvider.verifyUpload({ key: intent.key });
        } catch (error) {
            // Mirrors createUploadIntent's own error-collapsing pattern
            // above: the raw provider error (e.g. AccessDenied) is only
            // ever logged server-side, never returned to the client.
            console.error(
                JSON.stringify({
                    ts: new Date().toISOString(),
                    level: "error",
                    event: "media_complete_verification_error",
                    provider: config.mediaStorageProvider,
                    message: error instanceof Error ? error.message : "Unknown media verification error.",
                })
            );
            return next(
                new AppError(503, "MEDIA_VERIFICATION_FAILED", "Upload verification is currently unavailable.")
            );
        }

        if (!verified.exists) {
            return next(
                new AppError(404, "UPLOAD_OBJECT_NOT_FOUND", "The uploaded file could not be found. Please try again.")
            );
        }

        // Maximum size — checked against the LIVE server config, not
        // merely relative to whatever was declared at intent time. This
        // is the actual security boundary B2 deliberately deferred here
        // (its presigned PUT never signs Content-Length).
        if (verified.contentLength > config.uploadMaxBytes) {
            return next(
                new AppError(400, "UPLOAD_TOO_LARGE", "The uploaded file exceeds the maximum allowed size.")
            );
        }

        // Exact declared-size match — an integrity check, not the
        // primary security boundary (that's the check above): catches a
        // swapped/truncated/different object even when it's still under
        // the size cap.
        if (verified.contentLength !== intent.sizeBytes) {
            return next(
                new AppError(400, "UPLOAD_SIZE_MISMATCH", "The uploaded file's size does not match the declared size.")
            );
        }

        // Exact MIME match — verified against S3's own HeadObject
        // response, never the client's original declaration alone.
        if (verified.contentType !== intent.mimeType) {
            return next(
                new AppError(400, "UPLOAD_MIME_MISMATCH", "The uploaded file's type does not match the declared type.")
            );
        }

        // Atomic consumption — the ONLY concurrency/idempotency
        // mechanism (no status field, no transaction). Re-applies the
        // exact same ownership + expiry filter as the initial lookup, so
        // two concurrent completion requests for the same uploadId can
        // only ever have ONE of them actually find-and-delete the
        // document; the other gets null here and falls through to the
        // same safe 404 a repeated (non-concurrent) completion attempt
        // gets too.
        const consumedIntent = await MediaUploadIntent.findOneAndDelete({
            _id: uploadId,
            artistProfileId: artistProfile._id,
            expiresAt: { $gt: new Date() },
        });

        if (!consumedIntent) {
            return next(new AppError(404, "UPLOAD_INTENT_NOT_FOUND", "No matching upload was found."));
        }

        // req.user.id (never username) is the ownership key — looked up
        // fresh rather than trusting req.user.username, mirroring
        // trackController.uploadTrack's own existing reasoning exactly.
        const user = await User.findById(req.user.id);

        // KNOWN NARROW ORPHAN WINDOW (documented, not solved this
        // phase — no transaction/compensation logic introduced, per
        // this phase's explicit scope): if Track.create below throws
        // (e.g. an unexpected Mongoose validation failure), the intent
        // above has already been irreversibly consumed. The S3 object
        // itself is untouched and still exists; there is simply no
        // longer any MediaUploadIntent or Track referencing it. Recovery
        // requires the artist to re-upload from scratch. This is an
        // accepted trade-off (see the V5.2-B4 audit's Transaction
        // Analysis) — the failure window is narrow (a genuine Track
        // validation/DB error occurring in the instant right after a
        // successful, verified consumption) and the consequence is
        // recoverable, not data-corrupting: no duplicate Tracks are ever
        // possible regardless, since the atomic delete above already
        // guarantees at most one caller reaches this point per uploadId.
        const track = await Track.create({
            title,
            artist,
            artistId: artistProfile._id,
            uploadedBy: user.username,
            audio: {
                provider: "s3",
                key: consumedIntent.key,
                mimeType: verified.contentType,
                sizeBytes: verified.contentLength,
            },
        });

        res.status(201).json({
            data: { track },
        });
    } catch (error) {
        next(error);
    }
}

module.exports = { createUploadIntent, completeUpload };
