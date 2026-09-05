const express = require("express");
const router = express.Router();

const artistController = require("../controllers/artistController");
const validateObjectId = require("../middleware/validateObjectId");

// A malformed id previously reached ArtistProfile.findById unchecked,
// producing a raw 500 via an uncaught Mongoose CastError (see
// middleware/validateObjectId.js). A well-formed but non-existent id
// still reaches the controller unchanged and gets its existing 404.
router.get("/:id", validateObjectId("id"), artistController.getArtistById);

module.exports = router;
