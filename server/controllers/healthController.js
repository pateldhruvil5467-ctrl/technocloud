const mongoose = require("mongoose");

// No secrets, connection strings, or infrastructure details are ever
// included in this response — only a coarse status.
function getHealth(req, res) {
    const databaseConnected = mongoose.connection.readyState === 1;

    res.status(databaseConnected ? 200 : 503).json({
        status: databaseConnected ? "ok" : "degraded",
        uptime: process.uptime(),
        database: databaseConnected ? "connected" : "disconnected",
    });
}

module.exports = { getHealth };
