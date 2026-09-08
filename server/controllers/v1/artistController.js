const artistService = require("../../services/artistService");

async function listArtists(req, res, next) {
    try {
        const result = await artistService.listArtists(req.artistQuery);
        res.json(result);
    } catch (error) {
        next(error);
    }
}

module.exports = { listArtists };
