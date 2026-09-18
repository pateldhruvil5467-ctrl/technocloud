const mongoose = require("mongoose");
const config = require("../config/env");

// No secrets, connection strings, or infrastructure details are ever
// included in this response — only a coarse status.
//
// V5.2-B3: mediaProvider added so the frontend can decide, BEFORE ever
// calling POST /api/v1/media/upload-intent, whether this environment
// even has S3 configured — see client/src/services/mediaApi.js /
// UploadTrackForm.js. It's config.mediaStorageProvider verbatim
// ("local" or "s3") — not a secret (server/.env.example already
// documents it as such), and the one existing, already-public,
// unauthenticated endpoint this value naturally belongs on, rather than
// a second new route.
function getHealth(req, res) {
    const databaseConnected = mongoose.connection.readyState === 1;

    res.status(databaseConnected ? 200 : 503).json({
        status: databaseConnected ? "ok" : "degraded",
        uptime: process.uptime(),
        database: databaseConnected ? "connected" : "disconnected",
        mediaProvider: config.mediaStorageProvider,
    });
}

module.exports = { getHealth };
