const express = require("express");
const router = express.Router();

const artistController = require("../../controllers/v1/artistController");
const validateArtistQuery = require("../../middleware/validateArtistQuery");

// GET /api/v1/artists — the public artist directory/search listing. No
// auth, same as GET /api/v1/tracks and the existing legacy
// GET /api/artists/:id — an artist's public profile has never required
// authentication to view.
router.get("/", validateArtistQuery, artistController.listArtists);

module.exports = router;
