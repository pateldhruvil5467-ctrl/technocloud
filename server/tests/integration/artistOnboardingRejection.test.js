const request = require("supertest");

const app = require("../../app");
const User = require("../../models/User");
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

// V5.2-A — accountType allowlist rejection. 4 register calls in this
// file, within the test env's AUTH_RATE_LIMIT_MAX=5 — see
// artistOnboarding.test.js's header comment for why this is split out.
describe("POST /api/auth/register — accountType allowlist rejection", () => {
    it("rejects accountType=ADMIN and creates no account", async () => {
        const res = await request(app).post("/api/auth/register").send({
            username: "admin_attempt",
            email: "admin_attempt@example.com",
            password: "TestPass123!",
            accountType: "ADMIN",
        });

        expect(res.status).toBe(400);
        expect(res.body.message).toBe("accountType must be one of: USER, ARTIST.");

        const stored = await User.findOne({ email: "admin_attempt@example.com" });
        expect(stored).toBeNull();
    });

    it("rejects accountType=SUPERADMIN", async () => {
        const res = await request(app).post("/api/auth/register").send({
            username: "superadmin_attempt",
            email: "superadmin_attempt@example.com",
            password: "TestPass123!",
            accountType: "SUPERADMIN",
        });

        expect(res.status).toBe(400);
        expect(res.body.message).toBe("accountType must be one of: USER, ARTIST.");
    });

    it("rejects an arbitrary accountType string", async () => {
        const res = await request(app).post("/api/auth/register").send({
            username: "arbitrary_attempt",
            email: "arbitrary_attempt@example.com",
            password: "TestPass123!",
            accountType: "MODERATOR",
        });

        expect(res.status).toBe(400);
        expect(res.body.message).toBe("accountType must be one of: USER, ARTIST.");
    });

    it("rejects a non-string, Mongo-operator-shaped accountType without ever reaching a query", async () => {
        const res = await request(app).post("/api/auth/register").send({
            username: "operator_attempt",
            email: "operator_attempt@example.com",
            password: "TestPass123!",
            accountType: { $ne: null },
        });

        expect(res.status).toBe(400);
        expect(res.body.message).toBe("accountType must be one of: USER, ARTIST.");

        const stored = await User.findOne({ email: "operator_attempt@example.com" });
        expect(stored).toBeNull();
    });
});
