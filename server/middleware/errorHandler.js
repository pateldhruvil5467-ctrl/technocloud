const AppError = require("../utils/AppError");
const config = require("../config/env");

// Global error-handling pipeline, mounted last in app.js.
//
// IMPORTANT: this does NOT replace the try/catch blocks already inside
// authController/trackController/userController/artistController — those
// already respond directly (res.status(...).json(...)) and never call
// next(error), so their existing response shapes for existing, tested
// scenarios are completely unaffected by this file. This handler only
// ever runs for:
//   - routes that intentionally call next(error) (new v1 routes, new
//     validation middleware, requireTrackOwnership's malformed-id path
//     once validateObjectId is inserted ahead of it)
//   - genuinely unexpected/uncaught exceptions anywhere in the app
//     (Express 5 automatically forwards thrown/rejected errors from
//     async route handlers to next(error) — a safety net that didn't
//     exist before at all)
//
// Response shape for everything that reaches this handler:
//   { "error": { "code": "...", "message": "..." } }
function errorHandler(err, req, res, next) {
    // An AppError with a 4xx status is an expected outcome (bad input,
    // not-found, etc.) — worth a one-line log entry, not a full stack
    // dump. Anything else reaching here (a genuinely unexpected
    // exception, or a Mongoose error the app didn't anticipate) gets the
    // full detail, since that's the case someone actually has to debug.
    const isExpected4xx = err instanceof AppError && err.statusCode < 500;

    console.error(
        JSON.stringify({
            ts: new Date().toISOString(),
            level: isExpected4xx ? "warn" : "error",
            method: req.method,
            path: req.originalUrl,
            message: err.message,
        })
    );

    // Full stack is always logged server-side for anything unexpected —
    // never included in the response body, especially in production.
    if (!isExpected4xx && !config.isProduction) {
        console.error(err.stack);
    }

    if (err instanceof AppError) {
        return res.status(err.statusCode).json({
            error: { code: err.code, message: err.message },
        });
    }

    // Malformed ObjectId reaching Mongoose directly (validateObjectId
    // should catch this earlier on routes it's wired into — this is a
    // defense-in-depth fallback for any path it isn't).
    if (err.name === "CastError") {
        return res.status(400).json({
            error: { code: "INVALID_ID", message: "The provided id is not valid." },
        });
    }

    // Mongoose schema validation (e.g. an enum violation, a required
    // field left empty on .save()).
    if (err.name === "ValidationError") {
        const firstMessage = Object.values(err.errors || {})[0]?.message;
        return res.status(400).json({
            error: {
                code: "VALIDATION_ERROR",
                message: firstMessage || "Validation failed.",
            },
        });
    }

    // Duplicate key (unique index violation).
    if (err.code === 11000) {
        return res.status(409).json({
            error: { code: "DUPLICATE_RESOURCE", message: "This resource already exists." },
        });
    }

    if (err.name === "JsonWebTokenError" || err.name === "TokenExpiredError") {
        return res.status(401).json({
            error: { code: "INVALID_TOKEN", message: "Invalid or expired token." },
        });
    }

    // Unexpected — never leak err.message/stack to the client.
    return res.status(500).json({
        error: { code: "INTERNAL_ERROR", message: "Something went wrong." },
    });
}

module.exports = errorHandler;
