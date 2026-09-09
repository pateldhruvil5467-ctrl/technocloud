const express = require("express");
const router = express.Router();

const artistController = require("../../controllers/v1/artistController");
const validateArtistQuery = require("../../middleware/validateArtistQuery");
const { publicReadLimiter } = require("../../middleware/rateLimiters");

// GET /api/v1/artists — the public artist directory/search listing. No
// auth, same as GET /api/v1/tracks and the existing legacy
// GET /api/artists/:id — an artist's public profile has never required
// authentication to view.
//
// publicReadLimiter (V3.3) runs first, same shared instance/counter as
// GET /api/v1/tracks — see middleware/rateLimiters.js.
router.get("/", publicReadLimiter, validateArtistQuery, artistController.listArtists);

module.exports = router;
