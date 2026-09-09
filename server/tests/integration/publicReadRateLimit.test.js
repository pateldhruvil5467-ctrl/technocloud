const request = require("supertest");

const app = require("../../app");
const { connect, clearDatabase, closeDatabase } = require("../helpers/db");

beforeAll(async () => {
    await connect();
});

afterEach(async () => {
    await clearDatabase();
});

afterAll(async () => {
    await closeDatabase();
});

// V3.3 — GET /api/v1/tracks and GET /api/v1/artists share one
// publicReadLimiter instance (see middleware/rateLimiters.js), separate
// from the auth limiters. PUBLIC_READ_RATE_LIMIT_MAX is set to 40 for
// tests (see tests/setup/globalSetup.js) — high enough that
// tracksV1.test.js's/artistsV1.test.js's own real request volume (each in
// its own isolated app/limiter instance, same per-file isolation the auth
// limiter tests already rely on) never risks hitting it, while still
// letting this file trigger a real 429 with a fast, bounded burst.
describe("Public-read rate limiting", () => {
    it("a normal request to GET /api/v1/tracks succeeds", async () => {
        const res = await request(app).get("/api/v1/tracks");
        expect(res.status).toBe(200);
    });

    it("a normal request to GET /api/v1/artists succeeds", async () => {
        const res = await request(app).get("/api/v1/artists");
        expect(res.status).toBe(200);
    });

    it("does not affect GET /api/v1/health", async () => {
        for (let i = 0; i < 10; i++) {
            const res = await request(app).get("/api/v1/health");
            expect(res.status).not.toBe(429);
        }
    });

    it("does not affect GET /api/v1/me/tracks (still 401 unauthenticated, never 429)", async () => {
        for (let i = 0; i < 10; i++) {
            const res = await request(app).get("/api/v1/me/tracks");
            expect(res.status).toBe(401);
        }
    });

    it("does not affect legacy GET /api/tracks", async () => {
        for (let i = 0; i < 10; i++) {
            const res = await request(app).get("/api/tracks");
            expect(res.status).not.toBe(429);
        }
    });

    it("does not affect legacy GET /api/artists/:id", async () => {
        for (let i = 0; i < 10; i++) {
            const res = await request(app).get("/api/artists/000000000000000000000000");
            expect(res.status).not.toBe(429);
        }
    });

    it("allows requests up to the configured threshold, then returns 429 beyond it — shared across both v1 endpoints, without leaking internals", async () => {
        // This file's limiter instance has already served 2 requests (the
        // "normal request succeeds" tests above): 1 to GET /api/v1/tracks,
        // 1 to GET /api/v1/artists. PUBLIC_READ_RATE_LIMIT_MAX is 40 in
        // tests, so 38 more requests here should still succeed (bringing
        // the running total to exactly 40), and the 39th request in this
        // burst (running total 41) should be the first 429 — alternating
        // routes on every iteration proves the counter is shared across
        // both endpoints, not tracked per-route.
        const responses = [];
        for (let i = 0; i < 39; i++) {
            const route = i % 2 === 0 ? "/api/v1/tracks" : "/api/v1/artists";
            responses.push(await request(app).get(route));
        }

        const statuses = responses.map((res) => res.status);
        expect(statuses.slice(0, 38).every((status) => status === 200)).toBe(true);
        expect(statuses[38]).toBe(429);

        const limited = responses[38];
        expect(limited.body.message).toBe("Too many requests. Please try again later.");

        // No internal implementation details leaked to the client — same
        // assertion already made for the auth limiters in security.test.js.
        expect(JSON.stringify(limited.body)).not.toMatch(/express-rate-limit|stack|RateLimit-/i);
    });
});
