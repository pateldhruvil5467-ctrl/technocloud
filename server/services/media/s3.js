const { S3Client, PutObjectCommand } = require("@aws-sdk/client-s3");
const { getSignedUrl } = require("@aws-sdk/s3-request-presigner");

const config = require("../../config/env");

// V5.2-B1/B2 — the S3/CloudFront provider.
//
// isConfigured() is deliberately narrower than it was in B1: B1 required
// S3_BUCKET, S3_REGION, AND CLOUDFRONT_DOMAIN together, because
// getPlaybackUrl() was the only operation this module had. B2 adds
// createUploadTarget() (presigning), which needs only a bucket + region
// — CloudFront is a playback-only concern (V5.2-B2's own instructions
// are explicit: "CloudFront is NOT needed to generate the PUT URL...
// Do not make CLOUDFRONT_DOMAIN mandatory for B2"). getPlaybackUrl()
// below now checks for CLOUDFRONT_DOMAIN itself, independently.
function isConfigured() {
    return Boolean(config.s3Bucket && config.s3Region);
}

// Lazily constructed, cached client — never instantiated at module
// require-time (so requiring this file never attempts anything
// credential- or network-related), and never passed explicit
// credentials: the SDK's own default credential provider chain
// (environment variables, a shared AWS config/credentials file, or an
// IAM role attached to the runtime) supplies them. No credential value
// is ever read, held, or logged by this file's own code.
let cachedClient = null;
function getClient() {
    if (!cachedClient) {
        cachedClient = new S3Client({ region: config.s3Region });
    }
    return cachedClient;
}

// Unsigned CloudFront URL, for public/unlisted playback — pure string
// construction, no AWS SDK and no network call required for this case.
// Independently gated on CLOUDFRONT_DOMAIN (not isConfigured()) — see
// this file's top comment for why the two configuration requirements
// are no longer the same check as of B2.
function getPlaybackUrl(key) {
    if (!config.cloudfrontDomain) {
        throw new Error(
            "s3 media provider is not configured for playback (CLOUDFRONT_DOMAIN is not set)."
        );
    }
    if (typeof key !== "string" || key.length === 0) {
        throw new Error("s3 media provider: getPlaybackUrl requires a non-empty key.");
    }
    return `https://${config.cloudfrontDomain}/${key}`;
}

// V5.2-B2 — generates a short-lived presigned PutObject URL for `key`.
// `key` is always server-generated (see utils/mediaKey.js) — this
// function has no awareness of, and applies no logic to, how the key
// was chosen; it only ever signs whatever key it's given.
//
// Deliberately does NOT put ContentLength on the signed command — only
// ContentType is part of the signature, matching this phase's explicit
// requirement ("expected Content-Type"). Baking a size constraint into
// the signature itself would make the actual browser PUT (V5.2-B3, not
// this phase) fail on any Content-Length header mismatch, a common,
// easy-to-hit footgun this phase has no reason to introduce. `sizeBytes`
// is still validated against the configured upload limit and persisted
// on the pending-upload record (see controllers/v1/mediaController.js /
// models/MediaUploadIntent.js) for a later phase's own verification —
// accepted here only so this provider's interface documents that it's
// part of an upload target's full description, unused by this minimal
// PUT-based implementation.
async function createUploadTarget({ key, mimeType, sizeBytes }) {
    if (!isConfigured()) {
        throw new Error("s3 media provider is not configured (S3_BUCKET / S3_REGION).");
    }

    const command = new PutObjectCommand({
        Bucket: config.s3Bucket,
        Key: key,
        ContentType: mimeType,
    });

    const expiresIn = config.mediaPresignedUrlExpirySeconds;
    const uploadUrl = await getSignedUrl(getClient(), command, { expiresIn });

    return { uploadUrl, expiresIn };
}

module.exports = { isConfigured, getPlaybackUrl, createUploadTarget };
