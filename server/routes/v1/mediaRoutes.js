const express = require("express");
const router = express.Router();

const auth = require("../../middleware/authMiddleware");
const requireRole = require("../../middleware/requireRole");
const resolveOrCreateOwnArtistProfile = require("../../middleware/resolveOrCreateOwnArtistProfile");
const validateMediaUploadIntentBody = require("../../middleware/validateMediaUploadIntentBody");
const { mediaUploadIntentLimiter } = require("../../middleware/rateLimiters");
const mediaController = require("../../controllers/v1/mediaController");

// POST /api/v1/media/upload-intent — V5.2-B2. Issues a short-lived
// presigned S3 PUT URL an authenticated ARTIST/ADMIN can upload directly
// to, scoped under their own server-resolved ArtistProfile identity.
//
// Order:
//   mediaUploadIntentLimiter -> bounds the request rate before any real
//     work happens, same "limiter first" positioning as
//     loginLimiter/registerLimiter (routes/authRoutes.js) — this
//     endpoint mints real signed upload authority, so it must not
//     process more attempts than the limiter allows regardless of
//     whether they turn out to be authenticated.
//   auth -> verifies the JWT, sets req.user.
//   requireRole -> ARTIST or ADMIN only, matching the existing
//     convention for every other track-management route (see
//     routes/trackRoutes.js, routes/v1/meRoutes.js).
//   resolveOrCreateOwnArtistProfile -> resolves (lazily creating for
//     ARTIST, matching trackController.uploadTrack's own policy) the
//     caller's own ArtistProfile — never a client-supplied id.
//   validateMediaUploadIntentBody -> filename/mimeType/sizeBytes only.
//   mediaController.createUploadIntent -> generates the server-owned
//     key, requests the presigned URL, persists the pending-upload
//     record.
router.post(
    "/upload-intent",
    mediaUploadIntentLimiter,
    auth,
    requireRole(["ARTIST", "ADMIN"]),
    resolveOrCreateOwnArtistProfile,
    validateMediaUploadIntentBody,
    mediaController.createUploadIntent
);

module.exports = router;
