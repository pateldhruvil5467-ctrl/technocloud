const path = require("path");
const fs = require("fs");
const os = require("os");
const request = require("supertest");
const bcrypt = require("bcryptjs");

const app = require("../../app");
const User = require("../../models/User");
const Track = require("../../models/Track");
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

async function createUserAndLogin(role) {
    const hashedPassword = await bcrypt.hash(TEST_PASSWORD, 10);
    const email = `${role.toLowerCase()}@example.com`;

    await User.create({
        username: `${role.toLowerCase()}_user`,
        email,
        password: hashedPassword,
        role,
    });

    const loginRes = await request(app)
        .post("/api/auth/login")
        .send({ email, password: TEST_PASSWORD });

    return loginRes.body.token;
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

    it("rejects a USER role", async () => {
        const token = await createUserAndLogin("USER");

        const res = await request(app)
            .post("/api/tracks/upload")
            .set("Authorization", token);

        expect(res.status).toBe(403);
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
