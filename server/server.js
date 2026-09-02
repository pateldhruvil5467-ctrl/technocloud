require("dotenv").config();

const mongoose = require("mongoose");
const connectDB = require("./config/db");
const path = require("path");

const app = require("./app");

// REQUIRED ENV VARS

if (!process.env.JWT_SECRET) {
    console.error("Missing required environment variable: JWT_SECRET");
    process.exit(1);
}

// CONNECT DATABASE

connectDB();

// SERVER

const PORT = process.env.PORT || 5000;

app.listen(PORT, () => {
    console.log(`Server is running on port ${PORT}`);
});