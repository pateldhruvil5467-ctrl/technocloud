const AppError = require("../utils/AppError");

/**
 * Provider-independent AI interface.
 *
 * This module deliberately contains no Express, MongoDB, or controller
 * concerns. The only responsibility is converting a user's natural-language
 * discovery query into a structured intent candidate.
 *
 * The returned object is UNTRUSTED and must always pass through
 * searchIntent.normalizeIntent() before it is used by the application.
 */

async function interpretSearchIntent(query) {
    if (typeof query !== "string" || query.trim().length === 0) {
        throw new AppError(
            400,
            "VALIDATION_ERROR",
            "query must be a non-empty string."
        );
    }

    /*
     * V4.1.2 intentionally does not call a real AI provider yet.
     *
     * This boundary is being established first so the controller can
     * depend on a stable application-owned interface rather than on
     * provider-specific SDK behavior.
     *
     * The real provider implementation will replace this section.
     */
    throw new AppError(
        503,
        "AI_PROVIDER_UNAVAILABLE",
        "AI search interpretation is currently unavailable."
    );
}

module.exports = {
    interpretSearchIntent,
};