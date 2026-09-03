const express = require("express");
const cors = require("cors");
const helmet = require("helmet");

const authRoutes = require("./routes/authRoutes");
const trackRoutes = require("./routes/trackRoutes");
const userRoutes = require("./routes/userRoutes");
const artistRoutes = require("./routes/artistRoutes");

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
const CLIENT_ORIGIN = process.env.CLIENT_ORIGIN || "http://localhost:3000";

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

// STATIC FILES

app.use("/uploads", express.static("uploads"));

// ROUTES

app.use("/api/auth", authRoutes);

app.use("/api/tracks", trackRoutes);

app.use("/api/users", userRoutes);

app.use("/api/artists", artistRoutes);

// TEST ROUTE

app.get("/", (req, res) => {
    res.send("TechnoCloud API is running 🚀");
});

module.exports = app;
