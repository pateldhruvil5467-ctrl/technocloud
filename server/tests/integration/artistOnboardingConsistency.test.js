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
    jest.restoreAllMocks();
});

afterAll(async () => {
    await closeDatabase();
});

// V5.2-A consistency guarantee: "do not leave an ARTIST user without its
// required ArtistProfile if profile creation fails." Forces the
// profile-creation step to fail and asserts the just-created User does
// not survive it.
//
// This exercises the non-transactional compensation path in
// services/accountProvisioning.js, not the transactional one — this
// project's own test MongoDB (mongodb-memory-server's default
// MongoMemoryServer.create(), a standalone mongod, not a replica set) does
// not support multi-document transactions, so every ARTIST registration
// in this entire test suite already takes that fallback path today. See
// accountProvisioning.js's isTransactionsUnsupportedError() comment for
// why that's expected here and would differ against the project's actual
// MongoDB Atlas production target (always a replica set).
describe("Consistency — ARTIST registration never strands a profile-less User", () => {
    it("rolls back the created User if ArtistProfile creation fails", async () => {
        jest.spyOn(ArtistProfile, "create").mockRejectedValueOnce(new Error("simulated profile-creation failure"));

        const res = await request(app).post("/api/auth/register").send({
            username: "rollback_artist",
            email: "rollback_artist@example.com",
            password: "TestPass123!",
            accountType: "ARTIST",
        });

        expect(res.status).toBe(500);

        const stored = await User.findOne({ email: "rollback_artist@example.com" });
        expect(stored).toBeNull();

        const profile = await ArtistProfile.findOne({});
        expect(profile).toBeNull();
    });
});
