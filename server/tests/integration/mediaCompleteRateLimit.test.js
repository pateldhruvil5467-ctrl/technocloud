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

// V5.2-B4 — mediaCompleteLimiter (middleware/rateLimiters.js) runs BEFORE
// auth on this route (see routes/v1/mediaRoutes.js), the same "limiter
// first" positioning every other dedicated limiter in this app uses —
// this endpoint triggers a real S3 HeadObject call and a Track write on
// every accepted request, so the attempt rate must be bounded before
// authentication is even checked. That ordering is what lets this test
// trigger a real 429 with no login/token/intent setup at all: every
// unauthenticated request still counts against the limiter.
//
// MEDIA_COMPLETE_RATE_LIMIT_MAX is 40 for tests (see
// tests/setup/globalSetup.js — same value and reasoning as
// MEDIA_UPLOAD_INTENT_RATE_LIMIT_MAX), in this file's own separate,
// isolated app/limiter instance.
describe("POST /api/v1/media/complete — rate limiting", () => {
    it("a normal request is not rate-limited", async () => {
        const res = await request(app).post("/api/v1/media/complete").send({});
        expect(res.status).not.toBe(429);
    });

    it("allows requests up to the configured threshold, then returns 429 beyond it, without leaking internals", async () => {
        // This file's limiter instance has already served 1 request (the
        // "normal request" test above). 39 more requests here bring the
        // running total to exactly 40; the 40th request in this batch
        // (running total 41) is the first to exceed the threshold.
        const responses = [];
        for (let i = 0; i < 40; i++) {
            responses.push(await request(app).post("/api/v1/media/complete").send({}));
        }

        const statuses = responses.map((res) => res.status);
        expect(statuses.slice(0, 39).every((status) => status === 401)).toBe(true);
        expect(statuses[39]).toBe(429);

        const limited = responses[39];
        expect(limited.body.message).toBe("Too many requests. Please try again later.");
        expect(JSON.stringify(limited.body)).not.toMatch(/express-rate-limit|stack|RateLimit-/i);
    });
});
