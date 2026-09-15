const request = require("supertest");

const app = require("../../app");
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

// V5.2-A — a duplicate-email registration attempt is rejected before any
// account creation (existing behavior, unchanged), so it can never create
// a second ArtistProfile for the original account either. 2 register
// calls in this file — see artistOnboarding.test.js's header comment for
// the per-file budget.
describe("Duplicate registration does not create a duplicate ArtistProfile", () => {
    it("a duplicate-email ARTIST registration attempt is rejected and leaves exactly one ArtistProfile", async () => {
        const first = await request(app).post("/api/auth/register").send({
            username: "dup_artist",
            email: "dup_artist@example.com",
            password: "TestPass123!",
            accountType: "ARTIST",
        });
        expect(first.status).toBe(201);

        const second = await request(app).post("/api/auth/register").send({
            username: "dup_artist_again",
            email: "dup_artist@example.com",
            password: "TestPass123!",
            accountType: "ARTIST",
        });

        expect(second.status).toBe(400);
        expect(second.body.message).toBe("User already exists");

        const profiles = await ArtistProfile.find({ userId: first.body.id });
        expect(profiles).toHaveLength(1);
    });
});
