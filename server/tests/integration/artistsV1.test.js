const request = require("supertest");
const mongoose = require("mongoose");

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

// Creates `count` ArtistProfile documents with deterministic, distinct
// displayNames and createdAt timestamps spaced far enough apart that
// "newest"/"oldest"/name ordering is unambiguous even on a slow CI clock.
// userId is a fresh ObjectId with no backing User document — Mongoose's
// `ref` is not a foreign-key constraint, and no test here needs a real
// User, matching the same pattern tracksV1.test.js already uses for
// artistId (see its "filters by artistId" test).
async function seedArtists(count, overrides = {}) {
    const artists = [];
    const base = Date.now();

    for (let i = 0; i < count; i++) {
        artists.push(
            await ArtistProfile.create({
                userId: new mongoose.Types.ObjectId(),
                displayName: `Artist ${String(i).padStart(3, "0")}`,
                createdAt: new Date(base + i * 1000),
                ...overrides,
            })
        );
    }

    return artists;
}

describe("GET /api/v1/artists — basic response", () => {
    it("returns 200", async () => {
        const res = await request(app).get("/api/v1/artists");
        expect(res.status).toBe(200);
    });

    it("returns a correct pagination envelope for an empty collection", async () => {
        const res = await request(app).get("/api/v1/artists");

        expect(res.status).toBe(200);
        expect(res.body.data).toEqual([]);
        expect(res.body.pagination).toEqual({ page: 1, limit: 20, total: 0, pages: 0 });
    });

    it("response documents only ever contain the public-safe field set", async () => {
        await ArtistProfile.create({
            userId: new mongoose.Types.ObjectId(),
            displayName: "Field Test Artist",
            bio: "A short bio",
            avatarKey: "avatar.png",
            genres: ["Techno"],
            artistTypes: ["dj"],
            links: { soundcloud: "", instagram: "", bandcamp: "", website: "" },
            verified: true,
        });

        const res = await request(app).get("/api/v1/artists");

        expect(res.status).toBe(200);
        expect(res.body.data).toHaveLength(1);

        const artist = res.body.data[0];
        const allowedKeys = [
            "_id",
            "displayName",
            "bio",
            "avatarKey",
            "genres",
            "artistTypes",
            "links",
            "verified",
            "createdAt",
        ];
        expect(Object.keys(artist).sort()).toEqual([...allowedKeys].sort());
    });

    it("response never contains userId", async () => {
        await ArtistProfile.create({
            userId: new mongoose.Types.ObjectId(),
            displayName: "No Leak Artist",
        });

        const res = await request(app).get("/api/v1/artists");

        expect(res.status).toBe(200);
        expect(res.body.data[0].userId).toBeUndefined();
        expect(JSON.stringify(res.body)).not.toMatch(/userId/i);
    });
});

describe("GET /api/v1/artists — pagination", () => {
    it("defaults to page 1, limit 20", async () => {
        await seedArtists(3);

        const res = await request(app).get("/api/v1/artists");

        expect(res.status).toBe(200);
        expect(res.body.pagination).toMatchObject({ page: 1, limit: 20, total: 3, pages: 1 });
        expect(res.body.data).toHaveLength(3);
    });

    it("respects explicit page/limit", async () => {
        await seedArtists(5);

        const res = await request(app).get("/api/v1/artists?page=2&limit=2");

        expect(res.status).toBe(200);
        expect(res.body.data).toHaveLength(2);
        expect(res.body.pagination).toMatchObject({ page: 2, limit: 2, total: 5, pages: 3 });
    });

    it("returns an empty data array for an out-of-range page, with accurate pagination metadata", async () => {
        await seedArtists(2);

        const res = await request(app).get("/api/v1/artists?page=99&limit=10");

        expect(res.status).toBe(200);
        expect(res.body.data).toHaveLength(0);
        expect(res.body.pagination).toMatchObject({ page: 99, total: 2, pages: 1 });
    });

    it("rejects limit above the maximum", async () => {
        const res = await request(app).get("/api/v1/artists?limit=101");
        expect(res.status).toBe(400);
        expect(res.body.error.code).toBe("VALIDATION_ERROR");
    });

    it("rejects a zero/negative page", async () => {
        const res = await request(app).get("/api/v1/artists?page=0");
        expect(res.status).toBe(400);
        expect(res.body.error.code).toBe("VALIDATION_ERROR");
    });

    it("rejects a non-numeric page", async () => {
        const res = await request(app).get("/api/v1/artists?page=abc");
        expect(res.status).toBe(400);
    });

    it("rejects a non-numeric limit", async () => {
        const res = await request(app).get("/api/v1/artists?limit=abc");
        expect(res.status).toBe(400);
    });
});

describe("GET /api/v1/artists — injection safety", () => {
    // Same reasoning as tracksV1.test.js's own "injection safety" block:
    // verified against this app's actual query parser (Express 5's
    // default "simple" parser) — a repeated key becomes an array, and
    // every check in validateArtistQuery rejects that the moment it isn't
    // a plain string, before any enum/format check runs.
    it("rejects a repeated sort key (parsed as an array) instead of honoring either value", async () => {
        const res = await request(app).get("/api/v1/artists?sort=newest&sort=oldest");
        expect(res.status).toBe(400);
        expect(res.body.error.code).toBe("VALIDATION_ERROR");
    });

    it("rejects a repeated limit key (parsed as an array)", async () => {
        const res = await request(app).get("/api/v1/artists?limit=10&limit=20");
        expect(res.status).toBe(400);
    });

    it("rejects a repeated search key (parsed as an array)", async () => {
        const res = await request(app).get("/api/v1/artists?search=a&search=b");
        expect(res.status).toBe(400);
    });

    it("does not treat regex special characters in search as a pattern", async () => {
        await ArtistProfile.create({
            userId: new mongoose.Types.ObjectId(),
            displayName: "Artist (Remix Crew)",
        });

        // If unescaped, "(Remix" is an invalid/expensive regex fragment;
        // escaped, it must still literally match the displayName above.
        const res = await request(app).get(
            "/api/v1/artists?search=" + encodeURIComponent("(Remix")
        );

        expect(res.status).toBe(200);
        expect(res.body.data).toHaveLength(1);
        expect(res.body.data[0].displayName).toBe("Artist (Remix Crew)");
    });
});

describe("GET /api/v1/artists — search", () => {
    it("matches displayName case-insensitively", async () => {
        await ArtistProfile.create({ userId: new mongoose.Types.ObjectId(), displayName: "Warehouse Collective" });
        await ArtistProfile.create({ userId: new mongoose.Types.ObjectId(), displayName: "Quiet Studios" });

        const res = await request(app).get("/api/v1/artists?search=WAREHOUSE");

        expect(res.status).toBe(200);
        expect(res.body.data).toHaveLength(1);
        expect(res.body.data[0].displayName).toBe("Warehouse Collective");
    });

    it("matches a literal substring anywhere in displayName", async () => {
        await ArtistProfile.create({ userId: new mongoose.Types.ObjectId(), displayName: "The Warehouse Crew" });
        await ArtistProfile.create({ userId: new mongoose.Types.ObjectId(), displayName: "Nothing Related" });

        const res = await request(app).get("/api/v1/artists?search=house");

        expect(res.status).toBe(200);
        expect(res.body.data).toHaveLength(1);
    });

    it("rejects an oversized search string", async () => {
        const res = await request(app).get("/api/v1/artists?search=" + "a".repeat(101));
        expect(res.status).toBe(400);
    });

    it("rejects an empty search string", async () => {
        const res = await request(app).get("/api/v1/artists?search=");
        expect(res.status).toBe(400);
    });
});

describe("GET /api/v1/artists — genre filtering", () => {
    it("filters artists whose genres array contains the requested genre", async () => {
        await ArtistProfile.create({
            userId: new mongoose.Types.ObjectId(),
            displayName: "Techno Artist",
            genres: ["Techno", "Acid"],
        });
        await ArtistProfile.create({
            userId: new mongoose.Types.ObjectId(),
            displayName: "House Artist",
            genres: ["House"],
        });

        const res = await request(app).get("/api/v1/artists?genre=Techno");

        expect(res.status).toBe(200);
        expect(res.body.data).toHaveLength(1);
        expect(res.body.data[0].displayName).toBe("Techno Artist");
    });

    it("excludes an artist whose genres array does not contain the requested genre", async () => {
        await ArtistProfile.create({
            userId: new mongoose.Types.ObjectId(),
            displayName: "House Only Artist",
            genres: ["House"],
        });

        const res = await request(app).get("/api/v1/artists?genre=Techno");

        expect(res.status).toBe(200);
        expect(res.body.data).toHaveLength(0);
    });

    it("rejects an empty genre value", async () => {
        const res = await request(app).get("/api/v1/artists?genre=");
        expect(res.status).toBe(400);
    });
});

describe("GET /api/v1/artists — sorting", () => {
    it("rejects an unknown sort value", async () => {
        const res = await request(app).get("/api/v1/artists?sort=popularity");
        expect(res.status).toBe(400);
        expect(res.body.error.code).toBe("VALIDATION_ERROR");
    });

    it("sorts newest first by default and with an explicit ?sort=newest", async () => {
        await seedArtists(4);

        const implicit = await request(app).get("/api/v1/artists");
        const explicit = await request(app).get("/api/v1/artists?sort=newest");

        expect(implicit.body.data.map((a) => a.displayName)).toEqual([
            "Artist 003",
            "Artist 002",
            "Artist 001",
            "Artist 000",
        ]);
        expect(explicit.body.data.map((a) => a.displayName)).toEqual(implicit.body.data.map((a) => a.displayName));
    });

    it("sorts oldest first", async () => {
        await seedArtists(4);

        const res = await request(app).get("/api/v1/artists?sort=oldest");

        expect(res.body.data.map((a) => a.displayName)).toEqual([
            "Artist 000",
            "Artist 001",
            "Artist 002",
            "Artist 003",
        ]);
    });

    it("sorts name_asc alphabetically ascending", async () => {
        await ArtistProfile.create({ userId: new mongoose.Types.ObjectId(), displayName: "Charlie" });
        await ArtistProfile.create({ userId: new mongoose.Types.ObjectId(), displayName: "Alpha" });
        await ArtistProfile.create({ userId: new mongoose.Types.ObjectId(), displayName: "Bravo" });

        const res = await request(app).get("/api/v1/artists?sort=name_asc");

        expect(res.body.data.map((a) => a.displayName)).toEqual(["Alpha", "Bravo", "Charlie"]);
    });

    it("sorts name_desc alphabetically descending", async () => {
        await ArtistProfile.create({ userId: new mongoose.Types.ObjectId(), displayName: "Charlie" });
        await ArtistProfile.create({ userId: new mongoose.Types.ObjectId(), displayName: "Alpha" });
        await ArtistProfile.create({ userId: new mongoose.Types.ObjectId(), displayName: "Bravo" });

        const res = await request(app).get("/api/v1/artists?sort=name_desc");

        expect(res.body.data.map((a) => a.displayName)).toEqual(["Charlie", "Bravo", "Alpha"]);
    });

    it("orders deterministically with no gaps or duplicates across pages when createdAt values collide", async () => {
        const sameInstant = new Date();
        for (let i = 0; i < 6; i++) {
            await ArtistProfile.create({
                userId: new mongoose.Types.ObjectId(),
                displayName: `Same Time ${i}`,
                createdAt: sameInstant,
            });
        }

        const page1 = await request(app).get("/api/v1/artists?page=1&limit=3&sort=newest");
        const page2 = await request(app).get("/api/v1/artists?page=2&limit=3&sort=newest");

        const allIds = [...page1.body.data, ...page2.body.data].map((a) => a._id);
        expect(new Set(allIds).size).toBe(6);
    });
});

describe("Existing endpoints remain unaffected", () => {
    it("GET /api/v1/tracks still returns the paginated {data, pagination} shape unchanged", async () => {
        const res = await request(app).get("/api/v1/tracks");

        expect(res.status).toBe(200);
        expect(res.body).toHaveProperty("data");
        expect(res.body).toHaveProperty("pagination");
        expect(res.body.pagination).toHaveProperty("totalPages");
    });

    it("GET /api/tracks still returns a bare array", async () => {
        const res = await request(app).get("/api/tracks");

        expect(res.status).toBe(200);
        expect(Array.isArray(res.body)).toBe(true);
    });

    it("GET /api/artists/:id (legacy) still works for a well-formed but nonexistent id", async () => {
        const res = await request(app).get("/api/artists/000000000000000000000000");
        expect(res.status).toBe(404);
    });
});
