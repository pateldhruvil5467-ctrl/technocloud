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

// V5.2-A — secure artist onboarding. accountType is the only account-type
// signal the register endpoint trusts, mapped internally to `role`.
//
// Kept to 3 register calls (well under this test env's
// AUTH_RATE_LIMIT_MAX=5 — see tests/setup/globalSetup.js and this
// project's existing per-file register-call budgeting convention, e.g.
// auth.test.js) — the allowlist-rejection, role-field, login, duplicate,
// and rollback-consistency scenarios each live in their own sibling file
// for the same reason.
describe("POST /api/auth/register — accountType -> role mapping", () => {
    it("defaults to USER when accountType is omitted, and creates no ArtistProfile", async () => {
        const res = await request(app).post("/api/auth/register").send({
            username: "no_account_type",
            email: "no_account_type@example.com",
            password: "TestPass123!",
        });

        expect(res.status).toBe(201);
        expect(res.body.role).toBe("USER");

        const profile = await ArtistProfile.findOne({ userId: res.body.id });
        expect(profile).toBeNull();
    });

    it("creates a USER when accountType=USER, and creates no ArtistProfile", async () => {
        const res = await request(app).post("/api/auth/register").send({
            username: "explicit_user",
            email: "explicit_user@example.com",
            password: "TestPass123!",
            accountType: "USER",
        });

        expect(res.status).toBe(201);
        expect(res.body.role).toBe("USER");

        const stored = await User.findById(res.body.id);
        expect(stored.role).toBe("USER");

        const profile = await ArtistProfile.findOne({ userId: res.body.id });
        expect(profile).toBeNull();
    });

    it("creates an ARTIST with exactly one linked ArtistProfile when accountType=ARTIST", async () => {
        const res = await request(app).post("/api/auth/register").send({
            username: "new_artist",
            email: "new_artist@example.com",
            password: "TestPass123!",
            accountType: "ARTIST",
        });

        expect(res.status).toBe(201);
        expect(res.body.role).toBe("ARTIST");

        const stored = await User.findById(res.body.id);
        expect(stored.role).toBe("ARTIST");

        const profiles = await ArtistProfile.find({ userId: res.body.id });
        expect(profiles).toHaveLength(1);
        expect(profiles[0].displayName).toBe("new_artist");
    });
});
