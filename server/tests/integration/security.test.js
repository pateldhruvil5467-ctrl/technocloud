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

describe("Helmet security headers", () => {
    it("includes baseline security headers on API responses", async () => {
        const res = await request(app).get("/api/tracks");

        expect(res.status).toBe(200);
        expect(res.headers["x-content-type-options"]).toBe("nosniff");
        expect(res.headers["x-dns-prefetch-control"]).toBeDefined();

        // Explicitly relaxed from helmet's "same-origin" default so the
        // frontend (a different origin) can still load /uploads/<file>.
        expect(res.headers["cross-origin-resource-policy"]).toBe("cross-origin");
    });
});

describe("CORS", () => {
    it("reflects the allowed frontend origin", async () => {
        const res = await request(app)
            .get("/api/tracks")
            .set("Origin", "http://localhost:3000");

        expect(res.headers["access-control-allow-origin"]).toBe("http://localhost:3000");
    });

    it("does not reflect a disallowed origin", async () => {
        const res = await request(app)
            .get("/api/tracks")
            .set("Origin", "http://evil.example.com");

        expect(res.headers["access-control-allow-origin"]).not.toBe("http://evil.example.com");
    });
});

describe("Normal API behavior remains functional", () => {
    it("GET /api/tracks still returns the current array response shape", async () => {
        const res = await request(app).get("/api/tracks");

        expect(res.status).toBe(200);
        expect(Array.isArray(res.body)).toBe(true);
    });

    it("a single login attempt still succeeds before any limiter is exhausted", async () => {
        const bcrypt = require("bcryptjs");
        const User = require("../../models/User");

        const hashedPassword = await bcrypt.hash("TestPass123!", 10);
        await User.create({
            username: "ratelimit_normal_user",
            email: "ratelimit_normal_user@example.com",
            password: hashedPassword,
            role: "USER",
        });

        const res = await request(app).post("/api/auth/login").send({
            email: "ratelimit_normal_user@example.com",
            password: "TestPass123!",
        });

        expect(res.status).toBe(200);
        expect(res.body.token).toBeDefined();
    });
});

describe("Auth rate limiting", () => {
    // AUTH_RATE_LIMIT_MAX is lowered to 5 for tests (see globalSetup.js),
    // so 6 requests is enough to guarantee a 429 without waiting or
    // looping hundreds of times.
    const ATTEMPTS_TO_EXCEED_LIMIT = 6;

    it("returns 429 after exceeding the login rate limit", async () => {
        const responses = [];

        for (let i = 0; i < ATTEMPTS_TO_EXCEED_LIMIT; i++) {
            responses.push(
                await request(app).post("/api/auth/login").send({
                    email: "nonexistent@example.com",
                    password: "WrongPassword",
                })
            );
        }

        const statuses = responses.map((res) => res.status);
        expect(statuses).toContain(429);

        const limited = responses.find((res) => res.status === 429);
        expect(limited.body.message).toBe("Too many requests. Please try again later.");

        // No internal implementation details leaked to the client.
        expect(JSON.stringify(limited.body)).not.toMatch(/express-rate-limit|stack|RateLimit-/i);
    });

    it("returns 429 after exceeding the registration rate limit", async () => {
        const responses = [];

        for (let i = 0; i < ATTEMPTS_TO_EXCEED_LIMIT; i++) {
            responses.push(
                await request(app)
                    .post("/api/auth/register")
                    .send({
                        username: `ratelimituser${i}`,
                        email: `ratelimituser${i}@example.com`,
                        password: "TestPass123!",
                    })
            );
        }

        const statuses = responses.map((res) => res.status);
        expect(statuses).toContain(429);

        const limited = responses.find((res) => res.status === 429);
        expect(limited.body.message).toBe("Too many requests. Please try again later.");
    });
});
