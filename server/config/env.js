require("dotenv").config();

// Centralized, validated environment configuration. Every other module
// should read config values from here rather than `process.env.*`
// directly — see server.js/app.js/rateLimiters.js/trackRoutes.js for the
// call sites this replaces.
//
// MONGO_URI and JWT_SECRET are the only two values without a safe
// default: the app cannot run correctly without a real database or a
// real signing secret, so startup fails loudly and immediately if either
// is missing, in any environment (this mirrors server.js's pre-existing
// JWT_SECRET check, just centralized and extended to MONGO_URI too).
// Everything else has a sane local-development default so `npm test` /
// local `node server.js` keep working with a minimal .env.
const REQUIRED_VARS = ["MONGO_URI", "JWT_SECRET"];

const missing = REQUIRED_VARS.filter((key) => !process.env[key]);

if (missing.length > 0) {
    // Never log process.env wholesale — only the names of what's
    // missing, never any value (a value could itself be a secret typo'd
    // into the wrong variable).
    console.error(
        `Missing required environment variable(s): ${missing.join(", ")}`
    );
    process.exit(1);
}

const config = Object.freeze({
    nodeEnv: process.env.NODE_ENV || "development",
    isProduction: process.env.NODE_ENV === "production",

    port: Number(process.env.PORT) || 5000,

    mongoUri: process.env.MONGO_URI,

    jwtSecret: process.env.JWT_SECRET,
    // Previously hardcoded as "7d" directly in authController.js.
    jwtExpiresIn: process.env.JWT_EXPIRES_IN || "7d",

    clientOrigin: process.env.CLIENT_ORIGIN || "http://localhost:3000",

    // Previously hardcoded as 20 * 1024 * 1024 directly in trackRoutes.js.
    uploadMaxBytes: Number(process.env.UPLOAD_MAX_BYTES) || 20 * 1024 * 1024,

    authRateLimitWindowMs:
        Number(process.env.AUTH_RATE_LIMIT_WINDOW_MS) || 15 * 60 * 1000,
    authRateLimitMax: Number(process.env.AUTH_RATE_LIMIT_MAX) || 10,

    // V3.3: throttles the public discovery/search listing endpoints
    // (GET /api/v1/tracks, GET /api/v1/artists) — the most request-heavy
    // public read path in the app (see services/trackService.js /
    // artistService.js's escaped-regex search). Same 15-minute window as
    // the auth limiter for consistency, but a much higher default ceiling
    // — this gates scripted abuse, not normal browsing/searching, which
    // can easily fire a few dozen requests in a single session.
    publicReadRateLimitWindowMs:
        Number(process.env.PUBLIC_READ_RATE_LIMIT_WINDOW_MS) || 15 * 60 * 1000,
    publicReadRateLimitMax: Number(process.env.PUBLIC_READ_RATE_LIMIT_MAX) || 300,

    // AI search-intent provider (services/aiProvider.js). Entirely
    // optional — deliberately NOT in REQUIRED_VARS above, so a missing
    // key never prevents the app from starting; interpretSearchIntent()
    // just returns 503 AI_PROVIDER_UNAVAILABLE until one is configured
    // (see services/ai/gemini.js's isConfigured()).
    //
    // aiProvider selects which services/ai/<name>.js implementation
    // aiProvider.js dispatches to — "gemini" is the only one that exists
    // today, but the app layer never hardcodes that name itself.
    aiProvider: process.env.AI_PROVIDER || "gemini",

    // Google AI Studio (https://aistudio.google.com/apikey) issues a free
    // API key with no credit card required — the free tier is generous
    // enough for development/portfolio use. geminiModel is
    // env-configurable on purpose: Google renames/deprecates free-tier
    // model ids over time, and this lets that be a config change, not a
    // code change.
    geminiApiKey: process.env.GEMINI_API_KEY || null,
    geminiModel: process.env.GEMINI_MODEL || "gemini-2.0-flash",

    // Bounds how long services/ai/gemini.js waits for a response before
    // aborting — keeps a slow/hanging provider from ever hanging a
    // request indefinitely.
    aiRequestTimeoutMs: Number(process.env.AI_REQUEST_TIMEOUT_MS) || 8000,

    // Dedicated rate limiter for POST /api/v1/discovery/interpret — kept
    // separate from both the auth limiters and publicReadLimiter (never
    // reused) because this route has a real cost profile the others
    // don't: every accepted request can trigger a billed external AI
    // call, unlike a login attempt or a plain DB read. Same 15-minute
    // window as the other limiters for consistency, but a ceiling well
    // below publicReadLimiter's (300) — conservative on purpose, tune up
    // via env if real usage warrants it.
    aiInterpretRateLimitWindowMs:
        Number(process.env.AI_INTERPRET_RATE_LIMIT_WINDOW_MS) || 15 * 60 * 1000,
    aiInterpretRateLimitMax: Number(process.env.AI_INTERPRET_RATE_LIMIT_MAX) || 20,

    // V5.2-B1 — media storage foundation. "local" (the default) keeps
    // every current upload/playback behavior exactly as-is (multer to
    // uploads/, served by app.js's express.static) — this phase adds no
    // new required configuration and does not change what provider is
    // actually used anywhere. "s3" is recognized by
    // services/mediaProvider.js but nothing in the app selects or
    // depends on it yet; see services/media/s3.js's isConfigured() for
    // the gate real S3 usage will be built behind in a later phase.
    mediaStorageProvider: process.env.MEDIA_STORAGE_PROVIDER || "local",

    // S3/CloudFront — all optional while mediaStorageProvider is "local".
    // Deliberately no S3 credential fields here yet (e.g. an access key/
    // secret, or IAM-role configuration): no code in this phase makes an
    // authenticated AWS call, so there is nothing yet for a credential
    // value to configure, and adding one unused would be exactly the
    // kind of speculative field this phase is meant to avoid. See the
    // V5.2-B architecture audit's "Environment Variables" section for
    // the full list a future phase will need, and for the open question
    // of whether Render supports an attached IAM role (preferred) or
    // requires long-lived access-key env vars instead.
    s3Bucket: process.env.S3_BUCKET || null,
    s3Region: process.env.S3_REGION || null,
    cloudfrontDomain: process.env.CLOUDFRONT_DOMAIN || null,

    // How long a presigned upload URL (and its matching MediaUploadIntent
    // record — see models/MediaUploadIntent.js) remains valid for.
    mediaPresignedUrlExpirySeconds:
        Number(process.env.MEDIA_PRESIGNED_URL_EXPIRY_SECONDS) || 300,

    // V5.2-B2 — dedicated rate limiter for POST /api/v1/media/upload-intent
    // (middleware/rateLimiters.js). Same 15-minute window as the other
    // limiters; a conservative default ceiling since every accepted
    // request mints real, usable signed upload authority — not a
    // browsing-style read.
    mediaUploadIntentRateLimitWindowMs:
        Number(process.env.MEDIA_UPLOAD_INTENT_RATE_LIMIT_WINDOW_MS) || 15 * 60 * 1000,
    mediaUploadIntentRateLimitMax:
        Number(process.env.MEDIA_UPLOAD_INTENT_RATE_LIMIT_MAX) || 20,
});

module.exports = config;
