// config/env.js loads and validates required environment variables
// (MONGO_URI, JWT_SECRET) — requiring it first means a missing one
// fails startup immediately and clearly, before anything else runs.
const config = require("./config/env");

const connectDB = require("./config/db");

const app = require("./app");

// CONNECT DATABASE

connectDB();

// SERVER

app.listen(config.port, () => {
    console.log(`Server is running on port ${config.port}`);
});
