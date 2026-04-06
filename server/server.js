require("dotenv").config();

const express = require("express");
const cors = require("cors");

const connectDB = require("./config/db");
// Connect to MongoDB
connectDB();

const app = express();

// Middleware (after DB connection and before routes)
app.use(cors());
app.use(express.json());

// Serve uploaded files statically  
app.use("/uploads", express.static("uploads"));

// Routes after app creation 
const authRoutes = require("./routes/authRoutes");
const trackRoutes = require("./routes/trackRoutes");

app.use("/api/auth", authRoutes);
app.use("/api/tracks", trackRoutes);



//test route
app.get("/", (req, res) => {
    res.send("TechnoCloud API is running 🚀");

});

//start the server
const PORT = process.env.PORT || 5000;

app.listen(PORT, () => {
    console.log(`Server is running on port ${PORT}`);
});
