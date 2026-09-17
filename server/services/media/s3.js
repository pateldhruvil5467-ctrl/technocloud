const config = require("../../config/env");

// V5.2-B1 — S3/CloudFront provider SKELETON. Establishes the shape a
// later phase implements against; deliberately does NOT:
//   - use the AWS SDK (no dependency added this phase — see this
//     module's own operations below: both are pure, local computation,
//     nothing an SDK would be needed for)
//   - make any network call, ever, including in tests
//   - generate presigned upload URLs (V5.2-B2's job)
//   - generate CloudFront SIGNED URLs for private/draft-visibility
//     playback (a later phase — see the V5.2-B architecture audit's
//     playback-architecture section). Nothing calls getPlaybackUrl()
//     below yet, so building signed-URL support now would be exactly
//     the kind of untested, speculative implementation this phase is
//     meant to avoid.
//
// isConfigured() is the safety gate every other operation on this
// provider must be built behind — mirrors services/ai/gemini.js's own
// isConfigured() pattern exactly.
function isConfigured() {
    return Boolean(config.s3Bucket && config.s3Region && config.cloudfrontDomain);
}

// Unsigned CloudFront URL, for public/unlisted playback — pure string
// construction, no AWS SDK and no network call required for this case.
function getPlaybackUrl(key) {
    if (!isConfigured()) {
        throw new Error(
            "s3 media provider is not configured (S3_BUCKET / S3_REGION / CLOUDFRONT_DOMAIN)."
        );
    }
    if (typeof key !== "string" || key.length === 0) {
        throw new Error("s3 media provider: getPlaybackUrl requires a non-empty key.");
    }
    return `https://${config.cloudfrontDomain}/${key}`;
}

module.exports = { isConfigured, getPlaybackUrl };
