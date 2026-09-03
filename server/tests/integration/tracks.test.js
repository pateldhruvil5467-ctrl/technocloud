const path = require("path");
const fs = require("fs");
const os = require("os");
const request = require("supertest");
const bcrypt = require("bcryptjs");

const app = require("../../app");
const User = require("../../models/User");
const Track = require("../../models/Track");
const ArtistProfile = require("../../models/ArtistProfile");
const { connect, clearDatabase, closeDatabase } = require("../helpers/db");

const trackRoutes = require("../../routes/trackRoutes");

const FIXTURE_AUDIO = path.join(__dirname, "..", "fixtures", "test-audio.mp3");
const FIXTURE_NON_AUDIO = path.join(__dirname, "..", "fixtures", "not-audio.txt");
const TEST_PASSWORD = "TestPass123!";

let originalCwd;
let tempDir;

beforeAll(async () => {
    await connect();

    // Multer's destination in trackRoutes.js is the relative path
    // "uploads/", resolved against process.cwd() at request time. Running
    // this test file's requests from a throwaway temp directory keeps
    // uploaded test files out of the real server/uploads/ directory
    // without touching any production code.
    originalCwd = process.cwd();
    tempDir = fs.mkdtempSync(path.join(os.tmpdir(), "technocloud-test-uploads-"));
    fs.mkdirSync(path.join(tempDir, "uploads"));
    process.chdir(tempDir);
});

afterEach(async () => {
    await clearDatabase();
});

afterAll(async () => {
    process.chdir(originalCwd);
    fs.rmSync(tempDir, { recursive: true, force: true });
    await closeDatabase();
});

// Several tests below need a token for the same role. Caching one
// identity per role (instead of logging in fresh every call) keeps this
// file's real login-request count low and predictable regardless of how
// many tests use a given role — important now that /api/auth/login is
// rate-limited (see tests/setup/globalSetup.js). An optional `suffix`
// gives a second, genuinely distinct identity for the same role (e.g.
// two different artists), still counted as its own cache entry.
//
// A cached JWT stays cryptographically valid even after afterEach()'s
// clearDatabase() wipes the underlying User document — but Phase A.1's
// uploadTrack now resolves the uploader via User.findById(req.user.id),
// so the User document itself must keep existing for a cached token to
// keep working. Re-inserting it (with the same _id, so the token's `id`
// claim still resolves) avoids that without ever triggering a second
// real login against the rate-limited endpoint.
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
        // Fail loudly and specifically here, instead of letting an
        // undefined token reach `.set("Authorization", token)` later —
        // that throws deep inside supertest/superagent after it has
        // already opened a listening server for the request, which can
        // leak that server and hang the whole test run instead of
        // failing this one test.
        throw new Error(
            `Test setup failed: login for role "${role}" did not return a ` +
                `token (status ${loginRes.status}, body: ` +
                `${JSON.stringify(loginRes.body)}). If the status is 429, ` +
                "the auth rate limiter rejected this test-setup login — " +
                "see AUTH_RATE_LIMIT_MAX in tests/setup/globalSetup.js."
        );
    }

    identityCache[cacheKey] = {
        token: loginRes.body.token,
        userId: user._id,
        username,
    };

    return loginRes.body.token;
}

// Uploads a real track as the given token and returns the created track.
async function uploadTrackAs(token, { title = "Track", artist = "Artist" } = {}) {
    const res = await request(app)
        .post("/api/tracks/upload")
        .set("Authorization", token)
        .field("title", title)
        .field("artist", artist)
        .attach("audio", FIXTURE_AUDIO);

    if (res.status !== 201) {
        throw new Error(
            `Test setup failed: upload did not succeed (status ${res.status}, ` +
                `body: ${JSON.stringify(res.body)}).`
        );
    }

    return res.body.track;
}

describe("GET /api/tracks", () => {
    it("succeeds for an unauthenticated request", async () => {
        const res = await request(app).get("/api/tracks");
        expect(res.status).toBe(200);
    });

    it("preserves the current array response shape", async () => {
        const res = await request(app).get("/api/tracks");
        expect(Array.isArray(res.body)).toBe(true);
    });
});

describe("POST /api/tracks/upload", () => {
    // These two cases are rejected by auth/requireRole before multer ever
    // runs, so no file is attached here — attaching one would leave the
    // request body streaming into a connection the server has already
    // closed (auth/requireRole respond synchronously), which surfaces as
    // a flaky ECONNRESET rather than testing anything about the rejection
    // itself.
    it("rejects an unauthenticated request", async () => {
        const res = await request(app).post("/api/tracks/upload");

        expect(res.status).toBe(401);
    });

    it("rejects a USER role and never creates an ArtistProfile for them", async () => {
        const token = await createUserAndLogin("USER");

        const res = await request(app)
            .post("/api/tracks/upload")
            .set("Authorization", token);

        expect(res.status).toBe(403);

        const profile = await ArtistProfile.findOne({
            userId: identityCache.USER.userId,
        });
        expect(profile).toBeNull();
    });

    it("allows an ARTIST role to upload with title/artist/audio fields", async () => {
        const token = await createUserAndLogin("ARTIST");

        const res = await request(app)
            .post("/api/tracks/upload")
            .set("Authorization", token)
            .field("title", "Test Track")
            .field("artist", "Test Artist")
            .attach("audio", FIXTURE_AUDIO);

        expect(res.status).toBe(201);
        expect(res.body.track).toMatchObject({
            title: "Test Track",
            artist: "Test Artist",
        });
        expect(res.body.track.audio).toBeDefined();

        const stored = await Track.findById(res.body.track._id);
        expect(stored).not.toBeNull();
    });

    it("allows an ADMIN role to upload", async () => {
        const token = await createUserAndLogin("ADMIN");

        const res = await request(app)
            .post("/api/tracks/upload")
            .set("Authorization", token)
            .field("title", "Admin Track")
            .field("artist", "Admin Artist")
            .attach("audio", FIXTURE_AUDIO);

        expect(res.status).toBe(201);
    });

    it("rejects an ARTIST upload with no audio file attached", async () => {
        const token = await createUserAndLogin("ARTIST");

        const res = await request(app)
            .post("/api/tracks/upload")
            .set("Authorization", token)
            .field("title", "No Audio Track")
            .field("artist", "Test Artist");

        expect(res.status).toBeGreaterThanOrEqual(400);
        expect(res.status).toBeLessThan(500);
        expect(res.body.message).toBe("Audio file is required");
    });

    it("rejects an ADMIN upload with no audio file attached", async () => {
        const token = await createUserAndLogin("ADMIN");

        const res = await request(app)
            .post("/api/tracks/upload")
            .set("Authorization", token)
            .field("title", "No Audio Track")
            .field("artist", "Admin Artist");

        expect(res.status).toBeGreaterThanOrEqual(400);
        expect(res.status).toBeLessThan(500);
        expect(res.body.message).toBe("Audio file is required");
    });

    it("rejects an unsupported (non-audio) file type", async () => {
        const token = await createUserAndLogin("ARTIST");

        const res = await request(app)
            .post("/api/tracks/upload")
            .set("Authorization", token)
            .field("title", "Bad Type Track")
            .field("artist", "Test Artist")
            .attach("audio", FIXTURE_NON_AUDIO);

        expect(res.status).toBeGreaterThanOrEqual(400);
        expect(res.status).toBeLessThan(500);
        expect(res.body.message).toBe("Unsupported audio file type");
    });

    it("rejects an audio file over the configured size limit", async () => {
        const token = await createUserAndLogin("ARTIST");

        const oversized = Buffer.alloc(trackRoutes.MAX_UPLOAD_BYTES + 1024, 1);

        const res = await request(app)
            .post("/api/tracks/upload")
            .set("Authorization", token)
            .field("title", "Too Big Track")
            .field("artist", "Test Artist")
            .attach("audio", oversized, {
                filename: "oversized.mp3",
                contentType: "audio/mpeg",
            });

        expect(res.status).toBeGreaterThanOrEqual(400);
        expect(res.status).toBeLessThan(500);
        expect(res.body.message).toBe("Audio file exceeds the maximum allowed size");
    });
});

describe("Artist attribution (Phase A.1)", () => {
    it("enforces a unique ArtistProfile per userId", async () => {
        const userId = new (require("mongoose").Types.ObjectId)();

        await ArtistProfile.create({ userId, displayName: "First Profile" });

        await expect(
            ArtistProfile.create({ userId, displayName: "Duplicate Profile" })
        ).rejects.toThrow();
    });

    it("stores the correct artistId on a new ARTIST upload", async () => {
        const token = await createUserAndLogin("ARTIST");

        const track = await uploadTrackAs(token, { title: "Attribution Track" });

        expect(track.artistId).toBeDefined();

        const profile = await ArtistProfile.findById(track.artistId);
        expect(profile).not.toBeNull();
        expect(profile.userId.toString()).toBe(identityCache.ARTIST.userId.toString());
    });

    it("reuses the same ArtistProfile across multiple uploads by the same artist", async () => {
        const token = await createUserAndLogin("ARTIST");

        const first = await uploadTrackAs(token, { title: "First" });
        const second = await uploadTrackAs(token, { title: "Second" });

        expect(first.artistId).toBe(second.artistId);

        const profiles = await ArtistProfile.find({ userId: identityCache.ARTIST.userId });
        expect(profiles).toHaveLength(1);
    });

    it("leaves artistId unset for an ADMIN upload when the admin has no ArtistProfile", async () => {
        const token = await createUserAndLogin("ADMIN");

        const track = await uploadTrackAs(token, { title: "Admin Upload" });

        expect(track.artistId).toBeUndefined();
    });

    it("keeps a legacy track without artistId valid and listed", async () => {
        await Track.create({
            title: "Legacy Track",
            artist: "Legacy Artist",
            audio: "1700000000000-legacy.mp3",
        });

        const res = await request(app).get("/api/tracks");

        expect(res.status).toBe(200);
        const legacy = res.body.find((t) => t.title === "Legacy Track");
        expect(legacy).toBeDefined();
        expect(legacy.audio).toBe("1700000000000-legacy.mp3");
        expect(legacy.artistId).toBeUndefined();
    });
});

describe("GET /api/users/me and GET /api/artists/:id (Phase A.1)", () => {
    it("/api/users/me includes the ArtistProfile once one exists", async () => {
        const token = await createUserAndLogin("ARTIST");
        await uploadTrackAs(token, { title: "Profile Trigger" });

        const res = await request(app).get("/api/users/me").set("Authorization", token);

        expect(res.status).toBe(200);
        expect(res.body.role).toBe("ARTIST");
        expect(res.body.artistProfile).toBeDefined();
        expect(res.body.artistProfile.userId).toBe(identityCache.ARTIST.userId.toString());
    });

    it("/api/artists/:id returns the profile with only its public tracks", async () => {
        const token = await createUserAndLogin("ARTIST");
        const track = await uploadTrackAs(token, { title: "Public Facing" });

        const profile = await ArtistProfile.findOne({
            userId: identityCache.ARTIST.userId,
        });

        await Track.findByIdAndUpdate(track._id, { visibility: "draft" });
        await uploadTrackAs(token, { title: "Second Public Track" });

        const res = await request(app).get(`/api/artists/${profile._id}`);

        expect(res.status).toBe(200);
        expect(res.body.artistProfile._id).toBe(profile._id.toString());

        const titles = res.body.tracks.map((t) => t.title);
        expect(titles).toContain("Second Public Track");
        expect(titles).not.toContain("Public Facing");
    });

    it("returns 404 for an unknown artist id", async () => {
        const res = await request(app).get("/api/artists/000000000000000000000000");
        expect(res.status).toBe(404);
    });
});

describe("Track ownership — update/delete (Phase A.1)", () => {
    it("USER receives 403 attempting to update a track", async () => {
        const artistToken = await createUserAndLogin("ARTIST");
        const track = await uploadTrackAs(artistToken, { title: "Owned Track" });

        const userToken = await createUserAndLogin("USER");
        const res = await request(app)
            .put(`/api/tracks/${track._id}`)
            .set("Authorization", userToken)
            .send({ title: "Hacked" });

        expect(res.status).toBe(403);
    });

    it("USER receives 403 attempting to delete a track", async () => {
        const artistToken = await createUserAndLogin("ARTIST");
        const track = await uploadTrackAs(artistToken, { title: "Owned Track" });

        const userToken = await createUserAndLogin("USER");
        const res = await request(app)
            .delete(`/api/tracks/${track._id}`)
            .set("Authorization", userToken);

        expect(res.status).toBe(403);
    });

    it("ARTIST can update their own track", async () => {
        const token = await createUserAndLogin("ARTIST");
        const track = await uploadTrackAs(token, { title: "Original Title" });

        const res = await request(app)
            .put(`/api/tracks/${track._id}`)
            .set("Authorization", token)
            .send({ title: "Updated Title", genre: "techno" });

        expect(res.status).toBe(200);
        expect(res.body.track.title).toBe("Updated Title");
        expect(res.body.track.genre).toBe("techno");
    });

    it("ARTIST can delete their own track", async () => {
        const token = await createUserAndLogin("ARTIST");
        const track = await uploadTrackAs(token, { title: "To Delete" });

        const res = await request(app)
            .delete(`/api/tracks/${track._id}`)
            .set("Authorization", token);

        expect(res.status).toBe(200);

        const stillThere = await Track.findById(track._id);
        expect(stillThere).toBeNull();
    });

    it("ARTIST cannot update another artist's track", async () => {
        const ownerToken = await createUserAndLogin("ARTIST");
        const track = await uploadTrackAs(ownerToken, { title: "Owner's Track" });

        const otherToken = await createUserAndLogin("ARTIST", "other");
        const res = await request(app)
            .put(`/api/tracks/${track._id}`)
            .set("Authorization", otherToken)
            .send({ title: "Stolen" });

        expect(res.status).toBe(403);
    });

    it("ARTIST cannot delete another artist's track", async () => {
        const ownerToken = await createUserAndLogin("ARTIST");
        const track = await uploadTrackAs(ownerToken, { title: "Owner's Track" });

        const otherToken = await createUserAndLogin("ARTIST", "other");
        const res = await request(app)
            .delete(`/api/tracks/${track._id}`)
            .set("Authorization", otherToken);

        expect(res.status).toBe(403);

        const stillThere = await Track.findById(track._id);
        expect(stillThere).not.toBeNull();
    });

    it("ADMIN can update any track", async () => {
        const artistToken = await createUserAndLogin("ARTIST");
        const track = await uploadTrackAs(artistToken, { title: "Artist Owned" });

        const adminToken = await createUserAndLogin("ADMIN");
        const res = await request(app)
            .put(`/api/tracks/${track._id}`)
            .set("Authorization", adminToken)
            .send({ visibility: "takedown" });

        expect(res.status).toBe(200);
        expect(res.body.track.visibility).toBe("takedown");
    });

    it("ADMIN can delete any track", async () => {
        const artistToken = await createUserAndLogin("ARTIST");
        const track = await uploadTrackAs(artistToken, { title: "Artist Owned" });

        const adminToken = await createUserAndLogin("ADMIN");
        const res = await request(app)
            .delete(`/api/tracks/${track._id}`)
            .set("Authorization", adminToken);

        expect(res.status).toBe(200);
    });
});
