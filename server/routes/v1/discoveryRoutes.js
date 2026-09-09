const express = require("express");
const router = express.Router();

const discoveryController = require("../../controllers/v1/discoveryController");
const validateDiscoveryBody = require("../../middleware/validateDiscoveryBody");
const { aiInterpretLimiter } = require("../../middleware/rateLimiters");

// POST /api/v1/discovery/interpret — translates a natural-language query
// into the same small, allowlisted intent shape GET /api/v1/tracks
// already accepts (genre/subgenre/isMix/sort/search). Public, no auth —
// mirrors GET /api/v1/tracks / GET /api/v1/artists's own no-auth-required
// posture; this endpoint only ever interprets text, it never touches
// Track/ArtistProfile data itself.
//
// aiInterpretLimiter runs first — before validation or the AI call — so
// an abusive burst is rejected before any (potentially billed) provider
// call happens. Its own dedicated instance, never reused from the auth
// limiters or publicReadLimiter — see middleware/rateLimiters.js.
router.post(
    "/interpret",
    aiInterpretLimiter,
    validateDiscoveryBody,
    discoveryController.interpret
);

module.exports = router;
