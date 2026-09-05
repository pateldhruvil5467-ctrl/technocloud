// A trusted, deliberately-thrown error. `errorHandler.js` renders these
// directly using their own statusCode/code/message — everything else
// (Mongoose errors, unexpected exceptions) is treated as untrusted and
// reduced to a generic message before reaching the client.
class AppError extends Error {
    constructor(statusCode, code, message) {
        super(message);
        this.name = "AppError";
        this.statusCode = statusCode;
        this.code = code;
    }
}

module.exports = AppError;
