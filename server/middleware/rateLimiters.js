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

module.exports = { loginLimiter, registerLimiter };
