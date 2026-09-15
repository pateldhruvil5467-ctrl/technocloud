const request = require("supertest");

const app = require("../../app");
const User = require("../../models/User");
const ArtistProfile = require("../../models/ArtistProfile");
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

// V5.2-A — a client-supplied `role` field must never influence the
// created account, in either direction. 3 register calls in this file —
// see artistOnboarding.test.js's header comment for the per-file budget.
describe("POST /api/auth/register — role field is never trusted", () => {
    it("ignores a client-supplied role=ADMIN and still creates a USER", async () => {
        const res = await request(app).post("/api/auth/register").send({
            username: "role_escalator",
            email: "role_escalator@example.com",
            password: "TestPass123!",
            role: "ADMIN",
        });

        expect(res.status).toBe(201);
        expect(res.body.role).toBe("USER");

        const stored = await User.findOne({ email: "role_escalator@example.com" });
        expect(stored.role).toBe("USER");
    });

    it("does not let role=ARTIST substitute for accountType=ARTIST", async () => {
        const res = await request(app).post("/api/auth/register").send({
            username: "role_only_artist",
            email: "role_only_artist@example.com",
            password: "TestPass123!",
            role: "ARTIST",
        });

        expect(res.status).toBe(201);
        expect(res.body.role).toBe("USER");

        const profile = await ArtistProfile.findOne({});
        expect(profile).toBeNull();
    });

    it("does not let a conflicting role field override an explicit accountType", async () => {
        const res = await request(app).post("/api/auth/register").send({
            username: "conflicting_fields",
            email: "conflicting_fields@example.com",
            password: "TestPass123!",
            accountType: "ARTIST",
            role: "USER",
        });

        expect(res.status).toBe(201);
        // accountType is authoritative — role is never consulted, in
        // either direction.
        expect(res.body.role).toBe("ARTIST");
    });
});
