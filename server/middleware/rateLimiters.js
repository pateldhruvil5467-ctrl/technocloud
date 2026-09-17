const rateLimit = require("express-rate-limit");
const config = require("../config/env");

// Defaults chosen for a student/MVP deployment: generous enough not to
// interfere with normal manual dev testing, tight enough to blunt a
// scripted brute-force (login) or account-spam (register) attempt.
// Overridable via env for deployment tuning or test speed — see
// server/.env.example and tests/setup/globalSetup.js. Now sourced from
// central config (config/env.js) instead of reading process.env here
// directly.
const WINDOW_MS = config.authRateLimitWindowMs;
const MAX_ATTEMPTS = config.authRateLimitMax;

function rateLimitHandler(req, res) {
    res.status(429).json({
        message: "Too many requests. Please try again later.",
    });
}

const loginLimiter = rateLimit({
    windowMs: WINDOW_MS,
    max: MAX_ATTEMPTS,
    standardHeaders: true,
    legacyHeaders: false,
    handler: rateLimitHandler,
});

const registerLimiter = rateLimit({
    windowMs: WINDOW_MS,
    max: MAX_ATTEMPTS,
    standardHeaders: true,
    legacyHeaders: false,
    handler: rateLimitHandler,
});

// V3.3 — public-read limiter for the discovery/search listing endpoints
// (GET /api/v1/tracks, GET /api/v1/artists). Shared by both routes (one
// instance, one counter per IP) — deliberately generous compared to the
// auth limiters above, since this gates browsing/search traffic, not a
// login form. See config/env.js for the PUBLIC_READ_RATE_LIMIT_* env
// vars and their defaults.
const publicReadLimiter = rateLimit({
    windowMs: config.publicReadRateLimitWindowMs,
    max: config.publicReadRateLimitMax,
    standardHeaders: true,
    legacyHeaders: false,
    handler: rateLimitHandler,
});

// Dedicated limiter for POST /api/v1/discovery/interpret. Deliberately
// its own instance — never the login/register limiters, never
// publicReadLimiter — since an accepted request here can trigger a real,
// billed external AI call, a materially different cost profile than a
// plain DB read or a login attempt. See config/env.js for the
// AI_INTERPRET_RATE_LIMIT_* env vars and their defaults.
const aiInterpretLimiter = rateLimit({
    windowMs: config.aiInterpretRateLimitWindowMs,
    max: config.aiInterpretRateLimitMax,
    standardHeaders: true,
    legacyHeaders: false,
    handler: rateLimitHandler,
});

// V5.2-B2 — dedicated limiter for POST /api/v1/media/upload-intent. Its
// own instance, never reused from publicReadLimiter or the auth
// limiters: this endpoint mints real, usable signed S3 upload
// authority on every accepted request, a materially different (and
// higher) cost/risk profile than a plain DB read — it should not
// inherit publicReadLimiter's generous, browsing-oriented ceiling. Same
// 15-minute window as every other limiter for consistency; a
// conservative default max, similar order of magnitude to
// aiInterpretLimiter's, since both gate an action with a real
// per-request cost beyond a simple read.
const mediaUploadIntentLimiter = rateLimit({
    windowMs: config.mediaUploadIntentRateLimitWindowMs,
    max: config.mediaUploadIntentRateLimitMax,
    standardHeaders: true,
    legacyHeaders: false,
    handler: rateLimitHandler,
});

module.exports = {
    loginLimiter,
    registerLimiter,
    publicReadLimiter,
    aiInterpretLimiter,
    mediaUploadIntentLimiter,
};
