const { interpretSearchIntent } = require("../../services/aiProvider");
const { normalizeIntent, createFallbackIntent } = require("../../services/searchIntent");
const AppError = require("../../utils/AppError");

/**
 * POST /api/v1/discovery/interpret
 *
 * This controller never builds a Mongo query and never imports
 * trackService — track/artist retrieval stays entirely
 * GET /api/v1/tracks's job. This endpoint only ever produces the same
 * small, allowlisted intent shape a caller could hand to that endpoint
 * afterward.
 *
 * Trust flow (see server/README.md's "AI search intent" section):
 *
 *   req.discoveryQuery (already validated by validateDiscoveryBody)
 *     -> aiProvider.interpretSearchIntent()   [UNTRUSTED output]
 *     -> searchIntent.normalizeIntent()       [the actual boundary]
 *     -> res.json({ intent, unsupported, source })
 *
 * Both the "ai" and "fallback" paths converge through the SAME
 * normalizeIntent() call below — there is no second, special-cased
 * response-construction path for either outcome.
 */
async function interpret(req, res, next) {
    const query = req.discoveryQuery;

    try {
        let rawIntent;
        let source;

        try {
            rawIntent = await interpretSearchIntent(query);
            source = "ai";
        } catch (error) {
            // AI_PROVIDER_UNAVAILABLE is the one expected, already-known
            // outcome (unconfigured provider, timeout, a non-2xx
            // response, malformed output — aiProvider.js collapses all
            // of these into this single AppError code). It degrades to
            // plain-text search rather than failing the request: AI is
            // an enhancement to Discovery, never a dependency of it.
            //
            // Anything else is NOT treated as "AI unavailable" — it is a
            // genuinely unexpected failure and must not be silently
            // hidden behind a fallback response. It falls through to the
            // outer catch below, which hands it to next(error) exactly
            // like any other unexpected error in this codebase.
            if (error instanceof AppError && error.code === "AI_PROVIDER_UNAVAILABLE") {
                rawIntent = createFallbackIntent(query);
                source = "fallback";
            } else {
                throw error;
            }
        }

        // rawIntent is UNTRUSTED regardless of source — normalizeIntent()
        // is what actually decides what is safe to return. This is true
        // even for the fallback path: createFallbackIntent() only ever
        // produces a { search } shape today, but routing it through the
        // exact same validation as real AI output means a future change
        // to createFallbackIntent() can never accidentally bypass the
        // boundary.
        const { intent, unsupported } = normalizeIntent(rawIntent);

        res.json({ intent, unsupported, source });
    } catch (error) {
        next(error);
    }
}

module.exports = { interpret };
