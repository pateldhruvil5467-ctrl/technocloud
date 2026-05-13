require("dotenv").config();

const express = require("express");
const cors = require("cors");

const connectDB = require("./config/db");

const authRoutes = require("./routes/authRoutes");
const trackRoutes = require("./routes/trackRoutes");

// CONNECT DATABASE

connectDB();

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

// SERVER

const PORT = process.env.PORT || 5000;

app.listen(PORT, () => {
    console.log(`Server is running on port ${PORT}`);
});