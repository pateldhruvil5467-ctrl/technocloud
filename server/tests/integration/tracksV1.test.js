const request = require("supertest");
const bcrypt = require("bcryptjs");

const app = require("../../app");
const User = require("../../models/User");
const Track = require("../../models/Track");
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

// Creates `count` public tracks with deterministic, distinct titles and
// createdAt timestamps spaced far enough apart that "newest"/"oldest"
// ordering is unambiguous even on a slow CI clock.
async function seedTracks(count, overrides = {}) {
    const tracks = [];
    const base = Date.now();

    for (let i = 0; i < count; i++) {
        tracks.push(
            await Track.create({
                title: `Track ${String(i).padStart(3, "0")}`,
                artist: "Seed Artist",
                audio: `seed-${i}.mp3`,
                visibility: "public",
                createdAt: new Date(base + i * 1000),
                ...overrides,
            })
        );
    }

    return tracks;
}

describe("GET /api/v1/health", () => {
    it("reports ok with database connected, and exposes no secrets", async () => {
        const res = await request(app).get("/api/v1/health");

        expect(res.status).toBe(200);
        expect(res.body.status).toBe("ok");
        expect(res.body.database).toBe("connected");
        expect(JSON.stringify(res.body)).not.toMatch(/mongodb|mongo_uri|jwt|secret/i);
    });
});

describe("GET /api/v1/tracks — pagination", () => {
    it("defaults to page 1, limit 20", async () => {
        await seedTracks(3);

        const res = await request(app).get("/api/v1/tracks");

        expect(res.status).toBe(200);
        expect(res.body.pagination).toMatchObject({ page: 1, limit: 20, total: 3, totalPages: 1 });
        expect(res.body.data).toHaveLength(3);
    });

    it("respects explicit page/limit", async () => {
        await seedTracks(5);

        const res = await request(app).get("/api/v1/tracks?page=2&limit=2");

        expect(res.status).toBe(200);
        expect(res.body.data).toHaveLength(2);
        expect(res.body.pagination).toMatchObject({
            page: 2,
            limit: 2,
            total: 5,
            totalPages: 3,
            hasNextPage: true,
            hasPreviousPage: true,
        });
    });

    it("returns an empty data array for an out-of-range page, with accurate pagination metadata", async () => {
        await seedTracks(2);

        const res = await request(app).get("/api/v1/tracks?page=99&limit=10");

        expect(res.status).toBe(200);
        expect(res.body.data).toHaveLength(0);
        expect(res.body.pagination).toMatchObject({ page: 99, total: 2, totalPages: 1, hasNextPage: false });
    });

    it("rejects limit above the maximum", async () => {
        const res = await request(app).get("/api/v1/tracks?limit=101");
        expect(res.status).toBe(400);
        expect(res.body.error.code).toBe("VALIDATION_ERROR");
    });

    it("rejects a zero/negative page", async () => {
        const res = await request(app).get("/api/v1/tracks?page=0");
        expect(res.status).toBe(400);
    });

    it("rejects a non-numeric page", async () => {
        const res = await request(app).get("/api/v1/tracks?page=abc");
        expect(res.status).toBe(400);
    });

    it("orders deterministically (newest first, tiebroken by _id) with no gaps or duplicates across pages", async () => {
        await seedTracks(7);

        const page1 = await request(app).get("/api/v1/tracks?page=1&limit=3");
        const page2 = await request(app).get("/api/v1/tracks?page=2&limit=3");
        const page3 = await request(app).get("/api/v1/tracks?page=3&limit=3");

        const allIds = [...page1.body.data, ...page2.body.data, ...page3.body.data].map((t) => t._id);
        expect(new Set(allIds).size).toBe(7);

        // "newest" — most recently created (highest seed index) first.
        expect(page1.body.data[0].title).toBe("Track 006");
    });
});

describe("GET /api/v1/tracks — filtering", () => {
    it("filters by genre", async () => {
        await seedTracks(2, { genre: "techno" });
        await seedTracks(2, { genre: "house" });

        const res = await request(app).get("/api/v1/tracks?genre=techno");

        expect(res.status).toBe(200);
        expect(res.body.data).toHaveLength(2);
        expect(res.body.data.every((t) => t.genre === "techno")).toBe(true);
    });

    it("filters by subgenre", async () => {
        await seedTracks(1, { subgenre: "acid" });
        await seedTracks(1, { subgenre: "dub" });

        const res = await request(app).get("/api/v1/tracks?subgenre=acid");

        expect(res.status).toBe(200);
        expect(res.body.data).toHaveLength(1);
    });

    it("filters by artistId", async () => {
        const artistId = new (require("mongoose").Types.ObjectId)();
        await seedTracks(1, { artistId });
        await seedTracks(2);

        const res = await request(app).get(`/api/v1/tracks?artistId=${artistId}`);

        expect(res.status).toBe(200);
        expect(res.body.data).toHaveLength(1);
    });

    it("rejects a malformed artistId", async () => {
        const res = await request(app).get("/api/v1/tracks?artistId=not-an-id");
        expect(res.status).toBe(400);
    });

    it("filters by isMix", async () => {
        await seedTracks(1, { isMix: true });
        await seedTracks(2, { isMix: false });

        const res = await request(app).get("/api/v1/tracks?isMix=true");

        expect(res.status).toBe(200);
        expect(res.body.data).toHaveLength(1);
    });

    it("rejects an invalid isMix value", async () => {
        const res = await request(app).get("/api/v1/tracks?isMix=maybe");
        expect(res.status).toBe(400);
    });

    it("defaults to public-only when visibility isn't specified", async () => {
        await seedTracks(1, { visibility: "public" });
        await seedTracks(1, { visibility: "draft" });

        const res = await request(app).get("/api/v1/tracks");

        expect(res.body.data).toHaveLength(1);
        expect(res.body.data[0].visibility).toBe("public");
    });

    it("honors an explicit visibility filter", async () => {
        await seedTracks(1, { visibility: "public" });
        await seedTracks(1, { visibility: "draft" });

        const res = await request(app).get("/api/v1/tracks?visibility=draft");

        expect(res.body.data).toHaveLength(1);
        expect(res.body.data[0].visibility).toBe("draft");
    });

    it("rejects an invalid visibility value", async () => {
        const res = await request(app).get("/api/v1/tracks?visibility=nonsense");
        expect(res.status).toBe(400);
    });

    it("matches title/artist substrings via search", async () => {
        await Track.create({ title: "Warehouse Anthem", artist: "DJ One", audio: "a.mp3", visibility: "public" });
        await Track.create({ title: "Quiet Interlude", artist: "DJ Two", audio: "b.mp3", visibility: "public" });

        const res = await request(app).get("/api/v1/tracks?search=warehouse");

        expect(res.status).toBe(200);
        expect(res.body.data).toHaveLength(1);
        expect(res.body.data[0].title).toBe("Warehouse Anthem");
    });
});

describe("GET /api/v1/tracks — sorting", () => {
    it("sorts by title ascending/descending", async () => {
        await Track.create({ title: "Banana", artist: "A", audio: "a.mp3", visibility: "public" });
        await Track.create({ title: "Apple", artist: "A", audio: "b.mp3", visibility: "public" });

        const asc = await request(app).get("/api/v1/tracks?sort=title_asc");
        expect(asc.body.data.map((t) => t.title)).toEqual(["Apple", "Banana"]);

        const desc = await request(app).get("/api/v1/tracks?sort=title_desc");
        expect(desc.body.data.map((t) => t.title)).toEqual(["Banana", "Apple"]);
    });

    it("rejects an unknown sort value", async () => {
        const res = await request(app).get("/api/v1/tracks?sort=trending");
        expect(res.status).toBe(400);
    });
});

describe("GET /api/v1/tracks — injection safety", () => {
    // Verified against this app's actual query parser (Express 5's
    // default "simple" parser): bracket notation like
    // `?visibility[$ne]=public` is NOT parsed into a nested object here
    // — it arrives as a literal key `"visibility[$ne]"`, so
    // req.query.visibility is simply undefined and the request falls
    // through to the safe default. What this parser DOES still produce
    // is an array when a query key repeats, which is the real applicable
    // vector these two tests exercise instead.
    it("rejects a repeated query key (parsed as an array) instead of honoring either value", async () => {
        await seedTracks(1, { visibility: "draft" });
        await seedTracks(1, { visibility: "public" });

        const res = await request(app).get("/api/v1/tracks?visibility=public&visibility=draft");

        expect(res.status).toBe(400);
        expect(res.body.error.code).toBe("VALIDATION_ERROR");
    });

    it("rejects a repeated limit key (parsed as an array)", async () => {
        const res = await request(app).get("/api/v1/tracks?limit=10&limit=20");
        expect(res.status).toBe(400);
    });

    it("does not treat regex special characters in search as a pattern", async () => {
        await Track.create({ title: "Track (Remix)", artist: "A", audio: "a.mp3", visibility: "public" });

        // If unescaped, "(Remix" is an invalid/expensive regex fragment;
        // escaped, it must still literally match the title above.
        const res = await request(app).get("/api/v1/tracks?search=" + encodeURIComponent("(Remix)"));

        expect(res.status).toBe(200);
        expect(res.body.data).toHaveLength(1);
    });
});

describe("Legacy GET /api/tracks — unchanged", () => {
    it("still returns a bare array (not {data, pagination})", async () => {
        await seedTracks(3);

        const res = await request(app).get("/api/tracks");

        expect(res.status).toBe(200);
        expect(Array.isArray(res.body)).toBe(true);
        expect(res.body).toHaveLength(3);
    });

    it("still returns every visibility, unfiltered (pre-existing behavior, unchanged)", async () => {
        await seedTracks(1, { visibility: "draft" });
        await seedTracks(1, { visibility: "public" });

        const res = await request(app).get("/api/tracks");

        expect(res.body).toHaveLength(2);
    });
});

describe("Malformed ObjectId handling (previously a raw 500)", () => {
    it("GET /api/artists/:id returns 400 for a malformed id", async () => {
        const res = await request(app).get("/api/artists/not-a-valid-id");
        expect(res.status).toBe(400);
        expect(res.body.error.code).toBe("INVALID_ID");
    });

    it("GET /api/artists/:id still returns 404 for a well-formed but nonexistent id", async () => {
        const res = await request(app).get("/api/artists/000000000000000000000000");
        expect(res.status).toBe(404);
    });

    it("PUT /api/tracks/:id returns 400 for a malformed id", async () => {
        const hashedPassword = await bcrypt.hash("TestPass123!", 10);
        await User.create({
            username: "objectid_artist",
            email: "objectid_artist@example.com",
            password: hashedPassword,
            role: "ARTIST",
        });

        const loginRes = await request(app)
            .post("/api/auth/login")
            .send({ email: "objectid_artist@example.com", password: "TestPass123!" });

        const res = await request(app)
            .put("/api/tracks/not-a-valid-id")
            .set("Authorization", loginRes.body.token)
            .send({ title: "New Title" });

        expect(res.status).toBe(400);
        expect(res.body.error.code).toBe("INVALID_ID");
    });

    it("DELETE /api/tracks/:id returns 400 for a malformed id", async () => {
        const hashedPassword = await bcrypt.hash("TestPass123!", 10);
        await User.create({
            username: "objectid_artist2",
            email: "objectid_artist2@example.com",
            password: hashedPassword,
            role: "ARTIST",
        });

        const loginRes = await request(app)
            .post("/api/auth/login")
            .send({ email: "objectid_artist2@example.com", password: "TestPass123!" });

        const res = await request(app)
            .delete("/api/tracks/not-a-valid-id")
            .set("Authorization", loginRes.body.token);

        expect(res.status).toBe(400);
        expect(res.body.error.code).toBe("INVALID_ID");
    });
});

describe("Track update validation (previously a raw 500)", () => {
    it("rejects an invalid visibility value with a clean 400", async () => {
        const hashedPassword = await bcrypt.hash("TestPass123!", 10);
        const user = await User.create({
            username: "validation_artist",
            email: "validation_artist@example.com",
            password: hashedPassword,
            role: "ARTIST",
        });

        const loginRes = await request(app)
            .post("/api/auth/login")
            .send({ email: "validation_artist@example.com", password: "TestPass123!" });

        const profile = await ArtistProfile.create({ userId: user._id, displayName: "Validation Artist" });
        const track = await Track.create({
            title: "Owned",
            artist: "Owned Artist",
            audio: "owned.mp3",
            artistId: profile._id,
        });

        const res = await request(app)
            .put(`/api/tracks/${track._id}`)
            .set("Authorization", loginRes.body.token)
            .send({ visibility: "nonsense" });

        expect(res.status).toBe(400);
        expect(res.body.error.code).toBe("VALIDATION_ERROR");

        const stillOriginal = await Track.findById(track._id);
        expect(stillOriginal.visibility).toBe("public");
    });

    it("rejects an empty title with a clean 400", async () => {
        const hashedPassword = await bcrypt.hash("TestPass123!", 10);
        const user = await User.create({
            username: "validation_artist2",
            email: "validation_artist2@example.com",
            password: hashedPassword,
            role: "ARTIST",
        });

        const loginRes = await request(app)
            .post("/api/auth/login")
            .send({ email: "validation_artist2@example.com", password: "TestPass123!" });

        const profile = await ArtistProfile.create({ userId: user._id, displayName: "Validation Artist 2" });
        const track = await Track.create({
            title: "Owned",
            artist: "Owned Artist",
            audio: "owned.mp3",
            artistId: profile._id,
        });

        const res = await request(app)
            .put(`/api/tracks/${track._id}`)
            .set("Authorization", loginRes.body.token)
            .send({ title: "" });

        expect(res.status).toBe(400);
    });
});

describe("Registration/login validation (previously a raw 500 for missing fields)", () => {
    it("rejects registration with a missing username", async () => {
        const res = await request(app)
            .post("/api/auth/register")
            .send({ email: "noname@example.com", password: "TestPass123!" });

        expect(res.status).toBe(400);
        expect(res.body.message).toBeDefined();
    });

    it("rejects registration with a too-short password", async () => {
        const res = await request(app)
            .post("/api/auth/register")
            .send({ username: "shortpw", email: "shortpw@example.com", password: "short" });

        expect(res.status).toBe(400);
    });

    it("rejects registration with a malformed email", async () => {
        const res = await request(app)
            .post("/api/auth/register")
            .send({ username: "bademail", email: "not-an-email", password: "TestPass123!" });

        expect(res.status).toBe(400);
    });

    it("rejects login with a missing password for a valid email", async () => {
        const hashedPassword = await bcrypt.hash("TestPass123!", 10);
        await User.create({
            username: "nopw_user",
            email: "nopw_user@example.com",
            password: hashedPassword,
            role: "USER",
        });

        const res = await request(app).post("/api/auth/login").send({ email: "nopw_user@example.com" });

        expect(res.status).toBe(400);
        expect(res.body.message).toBe("Invalid password");
    });
});

describe("Unmatched routes", () => {
    it("returns a clean JSON 404 instead of Express's default page", async () => {
        const res = await request(app).get("/api/this-route-does-not-exist");

        expect(res.status).toBe(404);
        expect(res.body.error.code).toBe("NOT_FOUND");
    });
});
