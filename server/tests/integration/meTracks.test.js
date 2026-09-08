const request = require("supertest");
const bcrypt = require("bcryptjs");

const app = require("../../app");
const User = require("../../models/User");
const Track = require("../../models/Track");
const ArtistProfile = require("../../models/ArtistProfile");
const { connect, clearDatabase, closeDatabase } = require("../helpers/db");

const TEST_PASSWORD = "TestPass123!";

beforeAll(async () => {
    await connect();
});

afterEach(async () => {
    await clearDatabase();
});

afterAll(async () => {
    await closeDatabase();
});

// Identical caching pattern to tests/integration/tracks.test.js's
// createUserAndLogin: a real login is rate-limited (see
// tests/setup/globalSetup.js, AUTH_RATE_LIMIT_MAX=5 for this
// per-file-isolated app instance), and this file needs several distinct
// identities across ~20 test cases — caching one real login per
// identity (4 total: ARTIST, ARTISTother, USER, ARTISTnoprofile) keeps
// this file comfortably under that limit regardless of how many `it()`
// blocks reuse a given identity's token. A cached token stays
// cryptographically valid even after afterEach's clearDatabase() wipes
// the underlying User document, but this endpoint resolves ownership by
// re-querying ArtistProfile/User on every request, so the User document
// itself must keep existing — re-inserted with the same _id (so the
// cached token's `id` claim still resolves) rather than logging in
// again.
const identityCache = {};

async function createUserAndLogin(role, suffix = "") {
    const cacheKey = `${role}${suffix}`;

    if (identityCache[cacheKey]) {
        const cached = identityCache[cacheKey];
        const stillExists = await User.exists({ _id: cached.userId });

        if (!stillExists) {
            await User.create({
                _id: cached.userId,
                username: cached.username,
                email: `${cacheKey.toLowerCase()}@example.com`,
                password: await bcrypt.hash(TEST_PASSWORD, 10),
                role,
            });
        }

        return cached.token;
    }

    const username = `${cacheKey.toLowerCase()}_user`;
    const email = `${cacheKey.toLowerCase()}@example.com`;
    const hashedPassword = await bcrypt.hash(TEST_PASSWORD, 10);

    const user = await User.create({ username, email, password: hashedPassword, role });

    const loginRes = await request(app)
        .post("/api/auth/login")
        .send({ email, password: TEST_PASSWORD });

    if (!loginRes.body.token) {
        throw new Error(
            `Test setup failed: login for role "${role}${suffix}" did not return a token ` +
                `(status ${loginRes.status}, body: ${JSON.stringify(loginRes.body)}).`
        );
    }

    identityCache[cacheKey] = { token: loginRes.body.token, userId: user._id, username };

    return loginRes.body.token;
}

describe("GET /api/v1/me/tracks — authentication and authorization", () => {
    it("returns 401 without any authentication", async () => {
        const res = await request(app).get("/api/v1/me/tracks");
        expect(res.status).toBe(401);
    });

    it("returns 403 for an authenticated USER (not ARTIST/ADMIN)", async () => {
        const token = await createUserAndLogin("USER");

        const res = await request(app).get("/api/v1/me/tracks").set("Authorization", token);

        expect(res.status).toBe(403);
    });

    it("returns 404 when the authenticated ARTIST has no ArtistProfile yet (never silently creates one)", async () => {
        const token = await createUserAndLogin("ARTIST", "noprofile");

        const res = await request(app).get("/api/v1/me/tracks").set("Authorization", token);

        expect(res.status).toBe(404);
        expect(res.body.error.code).toBe("ARTIST_PROFILE_NOT_FOUND");

        const profile = await ArtistProfile.findOne({ userId: identityCache.ARTISTnoprofile.userId });
        expect(profile).toBeNull();
    });

    it("returns 200 with an ADMIN who has their own ArtistProfile (matches the existing ARTIST/ADMIN convention)", async () => {
        const token = await createUserAndLogin("ADMIN");
        const profile = await ArtistProfile.create({ userId: identityCache.ADMIN.userId, displayName: "Admin Artist" });
        await Track.create({ title: "Admin Track", artist: "Admin", audio: "a.mp3", artistId: profile._id });

        const res = await request(app).get("/api/v1/me/tracks").set("Authorization", token);

        expect(res.status).toBe(200);
        expect(res.body.data).toHaveLength(1);
    });
});

describe("GET /api/v1/me/tracks — ownership scoping", () => {
    it("returns 200 with empty data and valid pagination for an artist with zero tracks", async () => {
        const token = await createUserAndLogin("ARTIST");
        await ArtistProfile.create({ userId: identityCache.ARTIST.userId, displayName: "Artist A" });

        const res = await request(app).get("/api/v1/me/tracks").set("Authorization", token);

        expect(res.status).toBe(200);
        expect(res.body.data).toEqual([]);
        expect(res.body.pagination).toMatchObject({ page: 1, limit: 20, total: 0, totalPages: 0 });
    });

    it("returns only the authenticated artist's own tracks, excluding another artist's", async () => {
        const tokenA = await createUserAndLogin("ARTIST");
        const profileA = await ArtistProfile.create({ userId: identityCache.ARTIST.userId, displayName: "Artist A" });
        await Track.create({ title: "A1", artist: "Artist A", audio: "a1.mp3", artistId: profileA._id });
        await Track.create({ title: "A2", artist: "Artist A", audio: "a2.mp3", artistId: profileA._id });

        await createUserAndLogin("ARTIST", "other");
        const profileB = await ArtistProfile.create({ userId: identityCache.ARTISTother.userId, displayName: "Artist B" });
        await Track.create({ title: "B1", artist: "Artist B", audio: "b1.mp3", artistId: profileB._id });

        const res = await request(app).get("/api/v1/me/tracks").set("Authorization", tokenA);

        expect(res.status).toBe(200);
        expect(res.body.data).toHaveLength(2);
        expect(res.body.data.map((t) => t.title).sort()).toEqual(["A1", "A2"]);
    });

    it("also excludes a legacy track with no artistId at all", async () => {
        const token = await createUserAndLogin("ARTIST");
        const profile = await ArtistProfile.create({ userId: identityCache.ARTIST.userId, displayName: "Artist A" });
        await Track.create({ title: "Owned", artist: "Artist A", audio: "a.mp3", artistId: profile._id });
        await Track.create({ title: "Legacy Unowned", artist: "Nobody", audio: "legacy.mp3" });

        const res = await request(app).get("/api/v1/me/tracks").set("Authorization", token);

        expect(res.body.data).toHaveLength(1);
        expect(res.body.data[0].title).toBe("Owned");
    });

    it("includes draft, unlisted, and takedown tracks by default — not just public", async () => {
        const token = await createUserAndLogin("ARTIST");
        const profile = await ArtistProfile.create({ userId: identityCache.ARTIST.userId, displayName: "Artist A" });
        await Track.create({ title: "Pub", artist: "A", audio: "p.mp3", artistId: profile._id, visibility: "public" });
        await Track.create({ title: "Draft", artist: "A", audio: "d.mp3", artistId: profile._id, visibility: "draft" });
        await Track.create({ title: "Unlisted", artist: "A", audio: "u.mp3", artistId: profile._id, visibility: "unlisted" });
        await Track.create({ title: "Taken", artist: "A", audio: "t.mp3", artistId: profile._id, visibility: "takedown" });

        const res = await request(app).get("/api/v1/me/tracks").set("Authorization", token);

        expect(res.status).toBe(200);
        expect(res.body.data).toHaveLength(4);
        expect(res.body.data.map((t) => t.title)).toEqual(
            expect.arrayContaining(["Pub", "Draft", "Unlisted", "Taken"])
        );
    });

    it("supports an explicit visibility filter narrowed to the owner's own tracks", async () => {
        const token = await createUserAndLogin("ARTIST");
        const profile = await ArtistProfile.create({ userId: identityCache.ARTIST.userId, displayName: "Artist A" });
        await Track.create({ title: "Pub", artist: "A", audio: "p.mp3", artistId: profile._id, visibility: "public" });
        await Track.create({ title: "Draft", artist: "A", audio: "d.mp3", artistId: profile._id, visibility: "draft" });

        const res = await request(app).get("/api/v1/me/tracks?visibility=draft").set("Authorization", token);

        expect(res.status).toBe(200);
        expect(res.body.data).toHaveLength(1);
        expect(res.body.data[0].title).toBe("Draft");
    });

    it("rejects an invalid visibility value the same way the public endpoint does", async () => {
        const token = await createUserAndLogin("ARTIST");
        await ArtistProfile.create({ userId: identityCache.ARTIST.userId, displayName: "Artist A" });

        const res = await request(app).get("/api/v1/me/tracks?visibility=nonsense").set("Authorization", token);

        expect(res.status).toBe(400);
    });
});

describe("GET /api/v1/me/tracks — pagination and ordering", () => {
    it("supports page/limit", async () => {
        const token = await createUserAndLogin("ARTIST");
        const profile = await ArtistProfile.create({ userId: identityCache.ARTIST.userId, displayName: "Artist A" });
        const base = Date.now();
        for (let i = 0; i < 5; i++) {
            await Track.create({
                title: `T${i}`,
                artist: "A",
                audio: `t${i}.mp3`,
                artistId: profile._id,
                createdAt: new Date(base + i * 1000),
            });
        }

        const res = await request(app).get("/api/v1/me/tracks?page=2&limit=2").set("Authorization", token);

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

    it("rejects an invalid page", async () => {
        const token = await createUserAndLogin("ARTIST");
        await ArtistProfile.create({ userId: identityCache.ARTIST.userId, displayName: "Artist A" });

        const res = await request(app).get("/api/v1/me/tracks?page=0").set("Authorization", token);
        expect(res.status).toBe(400);
    });

    it("rejects a limit above the V.1 maximum (100)", async () => {
        const token = await createUserAndLogin("ARTIST");
        await ArtistProfile.create({ userId: identityCache.ARTIST.userId, displayName: "Artist A" });

        const res = await request(app).get("/api/v1/me/tracks?limit=101").set("Authorization", token);
        expect(res.status).toBe(400);
    });

    it("orders deterministically — newest first, tiebroken by _id", async () => {
        const token = await createUserAndLogin("ARTIST");
        const profile = await ArtistProfile.create({ userId: identityCache.ARTIST.userId, displayName: "Artist A" });
        const base = Date.now();
        for (let i = 0; i < 4; i++) {
            await Track.create({
                title: `T${String(i).padStart(2, "0")}`,
                artist: "A",
                audio: `t${i}.mp3`,
                artistId: profile._id,
                createdAt: new Date(base + i * 1000),
            });
        }

        const res = await request(app).get("/api/v1/me/tracks").set("Authorization", token);

        expect(res.body.data.map((t) => t.title)).toEqual(["T03", "T02", "T01", "T00"]);
    });
});

describe("GET /api/v1/me/tracks — filtering", () => {
    it("filters by genre", async () => {
        const token = await createUserAndLogin("ARTIST");
        const profile = await ArtistProfile.create({ userId: identityCache.ARTIST.userId, displayName: "Artist A" });
        await Track.create({ title: "Techno1", artist: "A", audio: "a.mp3", artistId: profile._id, genre: "techno" });
        await Track.create({ title: "House1", artist: "A", audio: "b.mp3", artistId: profile._id, genre: "house" });

        const res = await request(app).get("/api/v1/me/tracks?genre=techno").set("Authorization", token);

        expect(res.body.data).toHaveLength(1);
        expect(res.body.data[0].title).toBe("Techno1");
    });

    it("filters by subgenre", async () => {
        const token = await createUserAndLogin("ARTIST");
        const profile = await ArtistProfile.create({ userId: identityCache.ARTIST.userId, displayName: "Artist A" });
        await Track.create({ title: "Acid1", artist: "A", audio: "a.mp3", artistId: profile._id, subgenre: "acid" });
        await Track.create({ title: "Dub1", artist: "A", audio: "b.mp3", artistId: profile._id, subgenre: "dub" });

        const res = await request(app).get("/api/v1/me/tracks?subgenre=acid").set("Authorization", token);

        expect(res.body.data).toHaveLength(1);
        expect(res.body.data[0].title).toBe("Acid1");
    });

    it("filters by isMix", async () => {
        const token = await createUserAndLogin("ARTIST");
        const profile = await ArtistProfile.create({ userId: identityCache.ARTIST.userId, displayName: "Artist A" });
        await Track.create({ title: "Mix1", artist: "A", audio: "a.mp3", artistId: profile._id, isMix: true });
        await Track.create({ title: "Solo1", artist: "A", audio: "b.mp3", artistId: profile._id, isMix: false });

        const res = await request(app).get("/api/v1/me/tracks?isMix=true").set("Authorization", token);

        expect(res.body.data).toHaveLength(1);
        expect(res.body.data[0].title).toBe("Mix1");
    });
});

describe("GET /api/v1/me/tracks — ownership cannot be overridden by client input", () => {
    it("ignores a client-supplied ?artistId= attempting to target another artist's catalog", async () => {
        const tokenA = await createUserAndLogin("ARTIST");
        const profileA = await ArtistProfile.create({ userId: identityCache.ARTIST.userId, displayName: "Artist A" });
        await Track.create({ title: "A1", artist: "A", audio: "a.mp3", artistId: profileA._id });

        await createUserAndLogin("ARTIST", "other");
        const profileB = await ArtistProfile.create({ userId: identityCache.ARTISTother.userId, displayName: "Artist B" });
        await Track.create({ title: "B1", artist: "B", audio: "b.mp3", artistId: profileB._id });
        await Track.create({ title: "B2 (draft)", artist: "B", audio: "b2.mp3", artistId: profileB._id, visibility: "draft" });

        const res = await request(app)
            .get(`/api/v1/me/tracks?artistId=${profileB._id}`)
            .set("Authorization", tokenA);

        expect(res.status).toBe(200);
        expect(res.body.data).toHaveLength(1);
        expect(res.body.data[0].title).toBe("A1");
    });

    it("ignores arbitrary ownership-looking query parameters (owner, userId, uploadedBy)", async () => {
        const token = await createUserAndLogin("ARTIST");
        const profile = await ArtistProfile.create({ userId: identityCache.ARTIST.userId, displayName: "Artist A" });
        await Track.create({ title: "A1", artist: "A", audio: "a.mp3", artistId: profile._id });

        const res = await request(app)
            .get(
                "/api/v1/me/tracks?owner=000000000000000000000000" +
                    "&userId=000000000000000000000000&uploadedBy=SomeoneElse"
            )
            .set("Authorization", token);

        expect(res.status).toBe(200);
        expect(res.body.data).toHaveLength(1);
        expect(res.body.data[0].title).toBe("A1");
    });

    it("rejects a malformed ?artistId= the same way the public endpoint does, still scoped correctly if it somehow passed", async () => {
        const token = await createUserAndLogin("ARTIST");
        await ArtistProfile.create({ userId: identityCache.ARTIST.userId, displayName: "Artist A" });

        const res = await request(app)
            .get("/api/v1/me/tracks?artistId=not-a-valid-id")
            .set("Authorization", token);

        expect(res.status).toBe(400);
    });

    it("response never contains another artist's data even across multiple pages", async () => {
        const tokenA = await createUserAndLogin("ARTIST");
        const profileA = await ArtistProfile.create({ userId: identityCache.ARTIST.userId, displayName: "Artist A" });
        for (let i = 0; i < 3; i++) {
            await Track.create({ title: `A${i}`, artist: "A", audio: `a${i}.mp3`, artistId: profileA._id });
        }

        await createUserAndLogin("ARTIST", "other");
        const profileB = await ArtistProfile.create({ userId: identityCache.ARTISTother.userId, displayName: "Artist B" });
        for (let i = 0; i < 3; i++) {
            await Track.create({ title: `B${i}`, artist: "B", audio: `b${i}.mp3`, artistId: profileB._id });
        }

        const page1 = await request(app).get("/api/v1/me/tracks?limit=2&page=1").set("Authorization", tokenA);
        const page2 = await request(app).get("/api/v1/me/tracks?limit=2&page=2").set("Authorization", tokenA);

        const allTitles = [...page1.body.data, ...page2.body.data].map((t) => t.title);
        expect(allTitles.every((title) => title.startsWith("A"))).toBe(true);
        expect(allTitles).not.toEqual(expect.arrayContaining(["B0", "B1", "B2"]));
    });
});
