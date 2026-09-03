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

    // Lowers the auth rate limiter's threshold (production default: 10)
    // so tests can trigger a 429 with a handful of requests instead of
    // waiting minutes or looping hundreds of times. CLIENT_ORIGIN is
    // deliberately left unset so tests exercise the real production
    // fallback (http://localhost:3000), not a test-only override.
    //
    // 5 is verified against every test file's real /login and /register
    // call volume (each test file gets its own app/limiter instance —
    // Jest isolates modules per file):
    //   - auth.test.js: 4 login calls, all must succeed -> needs MAX >= 4
    //   - tracks.test.js: 3 login calls (one per role, cached in
    //     createUserAndLogin), all must succeed -> needs MAX >= 3
    //   - security.test.js: 1 prior login + an unpadded 6-request loop
    //     for the login limiter (>= 1 of the resulting 7 cumulative
    //     requests must be rejected -> MAX <= 6), and a separate,
    //     unpadded 6-request loop for the register limiter (>= 1 of
    //     those exact 6 requests must be rejected -> MAX <= 5, the
    //     tighter bound)
    // 5 is the only value satisfying all of the above, with headroom to
    // spare for auth.test.js and tracks.test.js.
    process.env.AUTH_RATE_LIMIT_MAX = "5";
};
