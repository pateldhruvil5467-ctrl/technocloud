const request = require("supertest");

const app = require("../../app");
const { connect, clearDatabase, closeDatabase } = require("../helpers/db");

const ENDPOINT = "/api/v1/discovery/interpret";

beforeAll(async () => {
    await connect();
});

afterEach(async () => {
    await clearDatabase();
});

afterAll(async () => {
    await closeDatabase();
});

// POST /api/v1/discovery/interpret has its own dedicated rate limiter
// (aiInterpretLimiter — see middleware/rateLimiters.js), never the
// login/register limiters or publicReadLimiter. AI_INTERPRET_RATE_LIMIT_MAX
// is set to 30 for tests (see tests/setup/globalSetup.js) — comfortably
// above discoveryV1.test.js's own ~20 real requests (a separate file,
// its own isolated app/limiter instance, same per-file isolation the
// other rate-limit test files already rely on).
//
// No AI provider mocking is needed here: aiInterpretLimiter runs before
// validation and before the controller, so even an unconfigured-AI
// (falls back to plain search) request is correctly counted and
// eventually blocked — the limiter doesn't care what happens downstream.
describe("Discovery interpret rate limiting", () => {
    test("a normal request succeeds", async () => {
        const res = await request(app).post(ENDPOINT).send({ query: "warehouse techno" });
        expect(res.status).toBe(200);
    });

    test("does not affect an unrelated public endpoint", async () => {
        for (let i = 0; i < 10; i++) {
            const res = await request(app).get("/api/v1/tracks");
            expect(res.status).not.toBe(429);
        }
    });

    test("allows requests up to the configured threshold, then returns 429 beyond it, without leaking internals", async () => {
        // 1 request already consumed above ("a normal request succeeds").
        // AI_INTERPRET_RATE_LIMIT_MAX is 30 in tests, so 29 more should
        // still succeed (running total 30), and the 30th request in this
        // burst (running total 31) should be the first 429.
        const responses = [];
        for (let i = 0; i < 30; i++) {
            responses.push(await request(app).post(ENDPOINT).send({ query: "warehouse techno" }));
        }

        const statuses = responses.map((res) => res.status);
        expect(statuses.slice(0, 29).every((status) => status === 200)).toBe(true);
        expect(statuses[29]).toBe(429);

        const limited = responses[29];
        expect(limited.body.message).toBe("Too many requests. Please try again later.");

        // No internal implementation details leaked to the client — same
        // assertion already made for every other limiter in this app.
        expect(JSON.stringify(limited.body)).not.toMatch(/express-rate-limit|stack|RateLimit-/i);
    });
});
