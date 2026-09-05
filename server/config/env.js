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
});

module.exports = config;
