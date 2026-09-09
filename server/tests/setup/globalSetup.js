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

    // Same reasoning, for the V3.3 public-read limiter (GET /api/v1/tracks,
    // GET /api/v1/artists — one shared instance/counter per test file,
    // same per-file isolation as above). Unlike the auth limiter, this one
    // can't be as small as 5: tracksV1.test.js alone makes ~24 real
    // requests to GET /api/v1/tracks across its full suite, and
    // artistsV1.test.js makes ~29 to GET /api/v1/artists — both would
    // start getting spuriously 429'd well before their own last test with
    // a tiny threshold. 40 stays comfortably above both real counts (with
    // headroom for tracksV1.test.js's V3.3 visibility-rewrite additions)
    // while still letting publicReadRateLimit.test.js trigger a real 429
    // with a fast, bounded burst instead of the production default (300).
    process.env.PUBLIC_READ_RATE_LIMIT_MAX = "40";

    // Same reasoning, for the dedicated POST /api/v1/discovery/interpret
    // limiter (its own instance, separate from publicReadLimiter — see
    // middleware/rateLimiters.js). discoveryV1.test.js makes ~20 real
    // requests to this route across its full suite (in its own isolated
    // app/limiter instance); 30 stays comfortably above that while still
    // letting discoveryRateLimit.test.js (a separate file, its own
    // isolated instance) trigger a real 429 with a fast, bounded burst
    // instead of the production default (20).
    process.env.AI_INTERPRET_RATE_LIMIT_MAX = "30";
};
