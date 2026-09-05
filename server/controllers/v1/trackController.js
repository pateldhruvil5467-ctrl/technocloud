const trackService = require("../../services/trackService");

async function listTracks(req, res, next) {
    try {
        const result = await trackService.listTracks(req.trackQuery);
        res.json(result);
    } catch (error) {
        next(error);
    }
}

module.exports = { listTracks };
