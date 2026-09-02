const express = require("express");
const cors = require("cors");

const authRoutes = require("./routes/authRoutes");
const trackRoutes = require("./routes/trackRoutes");

const app = express();

// MIDDLEWARE

app.use(cors());

app.use(express.json());

// STATIC FILES

app.use("/uploads", express.static("uploads"));

// ROUTES

app.use("/api/auth", authRoutes);

app.use("/api/tracks", trackRoutes);

// TEST ROUTE

app.get("/", (req, res) => {
    res.send("TechnoCloud API is running 🚀");
});

module.exports = app;
