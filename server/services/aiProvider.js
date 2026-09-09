const AppError = require("../utils/AppError");
const config = require("../config/env");
const gemini = require("./ai/gemini");

/**
 * Provider-independent AI interface.
 *
 * This module deliberately contains no Express, MongoDB, or controller
 * concerns. The only responsibility is converting a user's natural-language
 * discovery query into a structured intent candidate.
 *
 * The returned object is UNTRUSTED and must always pass through
 * searchIntent.normalizeIntent() before it is used by the application.
 *
 * Callers (and tests) only ever depend on this file. Nothing outside
 * services/ai/ knows which provider is selected, what its SDK/response
 * shape looks like, or how its auth works — see services/ai/gemini.js.
 * Adding a second provider later means adding a second file in
 * services/ai/ and one more entry in PROVIDERS below; it never requires
 * touching a controller, route, or test that calls
 * interpretSearchIntent().
 */
const PROVIDERS = {
    gemini,
};

async function interpretSearchIntent(query) {
    if (typeof query !== "string" || query.trim().length === 0) {
        throw new AppError(
            400,
            "VALIDATION_ERROR",
            "query must be a non-empty string."
        );
    }

    const provider = PROVIDERS[config.aiProvider];

    // Not configured (no API key) or an unknown/misconfigured
    // AI_PROVIDER value both resolve to the same graceful outcome: the
    // feature is simply unavailable, never a crash or a 500. This is
    // what lets the app start and run fully without any AI key at all.
    if (!provider || !provider.isConfigured()) {
        throw new AppError(
            503,
            "AI_PROVIDER_UNAVAILABLE",
            "AI search interpretation is currently unavailable."
        );
    }

    try {
        return await provider.interpret(query);
    } catch (error) {
        // Every failure from the provider layer — network error, timeout,
        // a non-2xx response, an unparsable response — collapses to the
        // same safe, generic error here. The provider's own thrown
        // message (safe: never contains the API key, the raw response
        // body, or the user's full query) is the only place this detail
        // is observable, and only server-side.
        console.error(
            JSON.stringify({
                ts: new Date().toISOString(),
                level: "error",
                event: "ai_provider_error",
                provider: config.aiProvider,
                message: error instanceof Error ? error.message : "Unknown AI provider error.",
            })
        );

        throw new AppError(
            503,
            "AI_PROVIDER_UNAVAILABLE",
            "AI search interpretation is currently unavailable."
        );
    }
}

module.exports = {
    interpretSearchIntent,
};