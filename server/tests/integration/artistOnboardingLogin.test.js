const request = require("supertest");
const jwt = require("jsonwebtoken");

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

// V5.2-A — login must reflect the role persisted at registration.
// 2 register calls + 2 login calls in this file — registerLimiter and
// loginLimiter are separate instances (see middleware/rateLimiters.js),
// each with their own AUTH_RATE_LIMIT_MAX=5 test-env budget, so these
// counts are independent of each other and of the sibling onboarding
// test files.
describe("Login reflects the persisted role after V5.2-A onboarding", () => {
    it("an ARTIST account logs in with role ARTIST, in both the response body and the JWT", async () => {
        await request(app).post("/api/auth/register").send({
            username: "login_artist",
            email: "login_artist@example.com",
            password: "TestPass123!",
            accountType: "ARTIST",
        });

        const res = await request(app).post("/api/auth/login").send({
            email: "login_artist@example.com",
            password: "TestPass123!",
        });

        expect(res.status).toBe(200);
        expect(res.body.user.role).toBe("ARTIST");

        const decoded = jwt.decode(res.body.token);
        expect(decoded.role).toBe("ARTIST");
    });

    it("a USER account still logs in with role USER", async () => {
        await request(app).post("/api/auth/register").send({
            username: "login_user",
            email: "login_user@example.com",
            password: "TestPass123!",
            accountType: "USER",
        });

        const res = await request(app).post("/api/auth/login").send({
            email: "login_user@example.com",
            password: "TestPass123!",
        });

        expect(res.status).toBe(200);
        expect(res.body.user.role).toBe("USER");

        const decoded = jwt.decode(res.body.token);
        expect(decoded.role).toBe("USER");
    });
});
