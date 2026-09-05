const express = require("express");
const cors = require("cors");
const helmet = require("helmet");

const config = require("./config/env");
const requestLogger = require("./middleware/requestLogger");
const notFound = require("./middleware/notFound");
const errorHandler = require("./middleware/errorHandler");

const authRoutes = require("./routes/authRoutes");
const trackRoutes = require("./routes/trackRoutes");
const userRoutes = require("./routes/userRoutes");
const artistRoutes = require("./routes/artistRoutes");

const v1TrackRoutes = require("./routes/v1/trackRoutes");
const v1HealthRoutes = require("./routes/v1/healthRoutes");

const app = express();

// SECURITY HEADERS
//
// crossOriginResourcePolicy is explicitly relaxed from helmet's
// "same-origin" default to "cross-origin" because this app's frontend
// and backend intentionally run on different origins (see CORS below),
// and the frontend's <audio> player loads files directly from this
// server's /uploads static route — the default would block that.
app.use(
    helmet({
        crossOriginResourcePolicy: { policy: "cross-origin" },
    })
);

// CORS
//
// Restricts cross-origin requests to a single configured frontend
// origin instead of reflecting/allowing every origin. Falls back to
// the local dev frontend (http://localhost:3000) when CLIENT_ORIGIN is
// unset, rather than silently allowing all origins.
const CLIENT_ORIGIN = config.clientOrigin;

app.use(
    cors({
        origin: (origin, callback) => {
            // No Origin header means this isn't a browser cross-origin
            // request (curl, server-to-server, some test tooling) —
            // leave those unrestricted here.
            if (!origin || origin === CLIENT_ORIGIN) {
                return callback(null, true);
            }

            callback(null, false);
        },
    })
);

app.use(express.json());

// REQUEST LOGGING
//
// One structured JSON line per completed response (method/path/status/
// duration only — never headers or body, so Authorization/passwords/
// JWTs can never end up in a log line). Mounted before routes so every
// request is covered, including ones that error out early.
app.use(requestLogger);

// STATIC FILES

app.use("/uploads", express.static("uploads"));

// ROUTES

app.use("/api/auth", authRoutes);

app.use("/api/tracks", trackRoutes);

app.use("/api/users", userRoutes);

app.use("/api/artists", artistRoutes);

// V1 API
//
// /api/v1/* is the canonical API going forward. It does not yet
// duplicate every legacy resource — only what actually needed new
// capability this phase (paginated/filterable track listing, health).
// See server/README.md's versioning-strategy section for the full
// reasoning. The legacy /api/* routes above are unchanged and remain
// the compatibility layer the existing frontend still uses.
app.use("/api/v1/tracks", v1TrackRoutes);
app.use("/api/v1/health", v1HealthRoutes);

// TEST ROUTE

app.get("/", (req, res) => {
    res.send("TechnoCloud API is running 🚀");
});

// UNMATCHED ROUTES + GLOBAL ERROR HANDLER
//
// Must be mounted last, in this order: notFound turns anything nobody
// else handled into a clean 404 (previously Express's default plain-text
// 404), and errorHandler is the single place every next(error) call in
// the app — from here on, or from any existing controller's own
// try/catch that still calls next(error) — resolves to a consistent
// JSON error response. See middleware/errorHandler.js for exactly which
// existing behavior this does and doesn't touch.
app.use(notFound);
app.use(errorHandler);

module.exports = app;
