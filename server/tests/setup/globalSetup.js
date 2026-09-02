const { MongoMemoryServer } = require("mongodb-memory-server");

module.exports = async function globalSetup() {
    const mongod = await MongoMemoryServer.create();

    // Stored on `global` so globalTeardown (which Jest runs in the same
    // process as globalSetup) can stop the same instance.
    global.__MONGOD__ = mongod;

    // These are picked up by app.js / models via process.env — never
    // read from or written to server/.env. Test workers inherit this
    // process.env snapshot because Jest spawns them after globalSetup runs.
    process.env.MONGO_URI = mongod.getUri();
    process.env.JWT_SECRET = "test-jwt-secret-not-for-production-use";
};
