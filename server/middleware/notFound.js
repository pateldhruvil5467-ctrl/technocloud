const AppError = require("../utils/AppError");

// Mounted after every real route in app.js. Anything that reaches this
// point matched no route at all — previously fell through to Express's
// default plain-text 404, now a clean, consistent JSON error instead.
function notFound(req, res, next) {
    next(new AppError(404, "NOT_FOUND", `No route matches ${req.method} ${req.originalUrl}`));
}

module.exports = notFound;
