const mongoose = require("mongoose");
const AppError = require("../utils/AppError");

// Rejects a malformed :id route param with a clean 400 BEFORE it ever
// reaches a Mongoose query — closing a real, pre-existing gap: today,
// GET /api/artists/:id and PUT/DELETE /api/tracks/:id (via
// requireTrackOwnership's Track.findById) let a malformed id fall
// through to Mongoose's cast layer, which throws a CastError that each
// call site's generic catch block turns into a misleading 500 with an
// internal Mongoose error string in the body.
//
// A well-formed but non-existent id (e.g. a real 24-hex-char ObjectId
// with no matching document) is NOT rejected here — that's a legitimate
// request that should still reach the controller's own 404 handling
// unchanged.
function validateObjectId(paramName) {
    return function (req, res, next) {
        const value = req.params[paramName];

        if (!mongoose.Types.ObjectId.isValid(value)) {
            return next(
                new AppError(400, "INVALID_ID", `"${value}" is not a valid id.`)
            );
        }

        next();
    };
}

module.exports = validateObjectId;
