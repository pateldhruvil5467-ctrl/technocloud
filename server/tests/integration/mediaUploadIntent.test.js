jest.mock("../../services/mediaProvider");

const request = require("supertest");
const bcrypt = require("bcryptjs");

const app = require("../../app");
const User = require("../../models/User");
const ArtistProfile = require("../../models/ArtistProfile");
const MediaUploadIntent = require("../../models/MediaUploadIntent");
const mediaProvider = require("../../services/mediaProvider");
const config = require("../../config/env");
const { connect, clearDatabase, closeDatabase } = require("../helpers/db");

const TEST_PASSWORD = "TestPass123!";
const FAKE_UPLOAD_URL = "https://test-bucket.s3.amazonaws.com/audio/abc/def.mp3?X-Amz-Signature=mocked";
const KEY_PATTERN = /^audio\/[0-9a-f]{24}\/[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}\.mp3$/i;

beforeAll(async () => {
    await connect();
});

afterEach(async () => {
    await clearDatabase();
    jest.clearAllMocks();
});

afterAll(async () => {
    await closeDatabase();
});

// The full HTTP flow never reaches real AWS code: services/mediaProvider
// is mocked wholesale at the top of this file (see mediaProvider.test.js
// / the dedicated s3-provider unit tests for coverage of the real
// presigning logic in isolation). This mock stands in for the S3
// provider's real, working response shape.
function mockSuccessfulPresign(overrides = {}) {
    mediaProvider.createUploadTarget.mockResolvedValue({
        uploadUrl: FAKE_UPLOAD_URL,
        expiresIn: 300,
        ...overrides,
    });
}

// Same identity-caching convention as tests/integration/tracks.test.js /
// meTracks.test.js — a real login is rate-limited (AUTH_RATE_LIMIT_MAX=5
// for this file's isolated app/limiter instance), and clearDatabase()
// between tests wipes the User/ArtistProfile documents but not the
// cached JWT, which stays valid as long as a User with the same _id
// exists — re-inserted here rather than logging in again.
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

        return cached;
    }

    const username = `${cacheKey.toLowerCase()}_user`;
    const email = `${cacheKey.toLowerCase()}@example.com`;
    const hashedPassword = await bcrypt.hash(TEST_PASSWORD, 10);

    const user = await User.create({ username, email, password: hashedPassword, role });

    const loginRes = await request(app).post("/api/auth/login").send({ email, password: TEST_PASSWORD });

    if (!loginRes.body.token) {
        throw new Error(
            `Test setup failed: login for role "${cacheKey}" did not return a token ` +
                `(status ${loginRes.status}, body: ${JSON.stringify(loginRes.body)}).`
        );
    }

    identityCache[cacheKey] = { token: loginRes.body.token, userId: user._id, username };
    return identityCache[cacheKey];
}

function validBody(overrides = {}) {
    return {
        filename: "my-track.mp3",
        mimeType: "audio/mpeg",
        sizeBytes: 4 * 1024 * 1024,
        ...overrides,
    };
}

describe("POST /api/v1/media/upload-intent — authorization", () => {
    it("rejects an unauthenticated request", async () => {
        const res = await request(app).post("/api/v1/media/upload-intent").send(validBody());
        expect(res.status).toBe(401);
        expect(mediaProvider.createUploadTarget).not.toHaveBeenCalled();
    });

    it("rejects an authenticated USER role", async () => {
        const { token } = await createUserAndLogin("USER");

        const res = await request(app)
            .post("/api/v1/media/upload-intent")
            .set("Authorization", token)
            .send(validBody());

        expect(res.status).toBe(403);
        expect(mediaProvider.createUploadTarget).not.toHaveBeenCalled();
    });

    it("accepts an ARTIST role (lazily creating an ArtistProfile on first request, matching uploadTrack's own policy)", async () => {
        mockSuccessfulPresign();
        const { token, userId } = await createUserAndLogin("ARTIST");

        const res = await request(app)
            .post("/api/v1/media/upload-intent")
            .set("Authorization", token)
            .send(validBody());

        expect(res.status).toBe(201);

        const profile = await ArtistProfile.findOne({ userId });
        expect(profile).not.toBeNull();
    });

    it("accepts an ADMIN role who already has an ArtistProfile", async () => {
        mockSuccessfulPresign();
        const { token, userId } = await createUserAndLogin("ADMIN");
        await ArtistProfile.create({ userId, displayName: "Admin Artist" });

        const res = await request(app)
            .post("/api/v1/media/upload-intent")
            .set("Authorization", token)
            .send(validBody());

        expect(res.status).toBe(201);
    });

    it("an ADMIN with no ArtistProfile gets a clear, safe error — never auto-created (matches uploadTrack's own policy)", async () => {
        const { token, userId } = await createUserAndLogin("ADMIN", "noprofile");

        const res = await request(app)
            .post("/api/v1/media/upload-intent")
            .set("Authorization", token)
            .send(validBody());

        expect(res.status).toBe(404);
        expect(res.body.error.code).toBe("ARTIST_PROFILE_NOT_FOUND");

        const profile = await ArtistProfile.findOne({ userId });
        expect(profile).toBeNull();
        expect(mediaProvider.createUploadTarget).not.toHaveBeenCalled();
    });
});

describe("POST /api/v1/media/upload-intent — ownership", () => {
    it("the client cannot supply artistProfileId — it is silently ignored, never read", async () => {
        mockSuccessfulPresign();
        const { token, userId } = await createUserAndLogin("ARTIST");

        const res = await request(app)
            .post("/api/v1/media/upload-intent")
            .set("Authorization", token)
            .send(validBody({ artistProfileId: "000000000000000000000000" }));

        expect(res.status).toBe(201);

        const realProfile = await ArtistProfile.findOne({ userId });
        expect(res.body.data.key.startsWith(`audio/${realProfile._id}/`)).toBe(true);
    });

    it("the client cannot supply userId, owner, provider, key, or bucket — none influence the result", async () => {
        mockSuccessfulPresign();
        const { token, userId } = await createUserAndLogin("ARTIST");

        const res = await request(app)
            .post("/api/v1/media/upload-intent")
            .set("Authorization", token)
            .send(
                validBody({
                    userId: "000000000000000000000000",
                    owner: "attacker",
                    // Deliberately the OPPOSITE of this test environment's
                    // real config.mediaStorageProvider ("local") — if this
                    // value ever leaked through, the assertion below would
                    // catch a real mismatch, not just coincidentally match.
                    provider: "s3",
                    key: "audio/attacker-chosen/evil.mp3",
                    bucket: "attacker-bucket",
                })
            );

        expect(res.status).toBe(201);

        const realProfile = await ArtistProfile.findOne({ userId });
        expect(res.body.data.key.startsWith(`audio/${realProfile._id}/`)).toBe(true);
        expect(res.body.data.key).not.toContain("attacker");

        const intent = await MediaUploadIntent.findById(res.body.data.uploadId);
        expect(intent.artistProfileId.toString()).toBe(realProfile._id.toString());
        // The persisted provider is always the SERVER's own configured
        // value (config.mediaStorageProvider — "local" in this test
        // environment, since nothing overrides MEDIA_STORAGE_PROVIDER)
        // regardless of what the client sent ("local" was also sent
        // here deliberately, as an attempted no-op override — the real
        // proof this is never client-influenced is that it always
        // equals config's own value, never whatever the client claims).
        expect(intent.provider).toBe(config.mediaStorageProvider);
    });

    it("the generated key is scoped under the caller's own, server-resolved ArtistProfile id", async () => {
        mockSuccessfulPresign();
        const { token, userId } = await createUserAndLogin("ARTIST");

        const res = await request(app)
            .post("/api/v1/media/upload-intent")
            .set("Authorization", token)
            .send(validBody());

        const realProfile = await ArtistProfile.findOne({ userId });
        expect(res.body.data.key).toMatch(KEY_PATTERN);
        expect(res.body.data.key.split("/")[1]).toBe(realProfile._id.toString());
    });
});

describe("POST /api/v1/media/upload-intent — request validation", () => {
    it("rejects a missing filename", async () => {
        const { token } = await createUserAndLogin("ARTIST");
        await ArtistProfile.create({ userId: identityCache.ARTIST.userId, displayName: "Artist" });

        const res = await request(app)
            .post("/api/v1/media/upload-intent")
            .set("Authorization", token)
            .send({ mimeType: "audio/mpeg", sizeBytes: 1024 });

        expect(res.status).toBe(400);
        expect(res.body.error.code).toBe("VALIDATION_ERROR");
        expect(mediaProvider.createUploadTarget).not.toHaveBeenCalled();
    });

    it("rejects an unsupported mimeType", async () => {
        const { token } = await createUserAndLogin("ARTIST");
        await ArtistProfile.create({ userId: identityCache.ARTIST.userId, displayName: "Artist" });

        const res = await request(app)
            .post("/api/v1/media/upload-intent")
            .set("Authorization", token)
            .send(validBody({ mimeType: "video/mp4" }));

        expect(res.status).toBe(400);
    });

    it("rejects a non-MP3 audio mimeType (e.g. audio/wav)", async () => {
        const { token } = await createUserAndLogin("ARTIST");
        await ArtistProfile.create({ userId: identityCache.ARTIST.userId, displayName: "Artist" });

        const res = await request(app)
            .post("/api/v1/media/upload-intent")
            .set("Authorization", token)
            .send(validBody({ mimeType: "audio/wav" }));

        expect(res.status).toBe(400);
    });

    it("does not trust the filename as proof of MIME type — a .mp3 filename with a bad mimeType is still rejected", async () => {
        const { token } = await createUserAndLogin("ARTIST");
        await ArtistProfile.create({ userId: identityCache.ARTIST.userId, displayName: "Artist" });

        const res = await request(app)
            .post("/api/v1/media/upload-intent")
            .set("Authorization", token)
            .send(validBody({ filename: "totally-real-track.mp3", mimeType: "application/x-msdownload" }));

        expect(res.status).toBe(400);
    });

    it("rejects an oversized file (over the shared 20MB upload limit)", async () => {
        const { token } = await createUserAndLogin("ARTIST");
        await ArtistProfile.create({ userId: identityCache.ARTIST.userId, displayName: "Artist" });

        const res = await request(app)
            .post("/api/v1/media/upload-intent")
            .set("Authorization", token)
            .send(validBody({ sizeBytes: 21 * 1024 * 1024 }));

        expect(res.status).toBe(400);
    });

    it("rejects a zero sizeBytes", async () => {
        const { token } = await createUserAndLogin("ARTIST");
        await ArtistProfile.create({ userId: identityCache.ARTIST.userId, displayName: "Artist" });

        const res = await request(app)
            .post("/api/v1/media/upload-intent")
            .set("Authorization", token)
            .send(validBody({ sizeBytes: 0 }));

        expect(res.status).toBe(400);
    });

    it("rejects a negative sizeBytes", async () => {
        const { token } = await createUserAndLogin("ARTIST");
        await ArtistProfile.create({ userId: identityCache.ARTIST.userId, displayName: "Artist" });

        const res = await request(app)
            .post("/api/v1/media/upload-intent")
            .set("Authorization", token)
            .send(validBody({ sizeBytes: -1024 }));

        expect(res.status).toBe(400);
    });

    it("rejects a non-integer sizeBytes", async () => {
        const { token } = await createUserAndLogin("ARTIST");
        await ArtistProfile.create({ userId: identityCache.ARTIST.userId, displayName: "Artist" });

        const res = await request(app)
            .post("/api/v1/media/upload-intent")
            .set("Authorization", token)
            .send(validBody({ sizeBytes: 1024.5 }));

        expect(res.status).toBe(400);
    });

    it("rejects a malformed request body (an array instead of an object)", async () => {
        const { token } = await createUserAndLogin("ARTIST");
        await ArtistProfile.create({ userId: identityCache.ARTIST.userId, displayName: "Artist" });

        const res = await request(app)
            .post("/api/v1/media/upload-intent")
            .set("Authorization", token)
            .send([1, 2, 3]);

        expect(res.status).toBe(400);
    });

    it("rejects an empty filename", async () => {
        const { token } = await createUserAndLogin("ARTIST");
        await ArtistProfile.create({ userId: identityCache.ARTIST.userId, displayName: "Artist" });

        const res = await request(app)
            .post("/api/v1/media/upload-intent")
            .set("Authorization", token)
            .send(validBody({ filename: "" }));

        expect(res.status).toBe(400);
    });

    it("rejects a filename over the 255-character limit", async () => {
        const { token } = await createUserAndLogin("ARTIST");
        await ArtistProfile.create({ userId: identityCache.ARTIST.userId, displayName: "Artist" });

        const res = await request(app)
            .post("/api/v1/media/upload-intent")
            .set("Authorization", token)
            .send(validBody({ filename: `${"a".repeat(252)}.mp3` }));

        expect(res.status).toBe(400);
    });
});

describe("POST /api/v1/media/upload-intent — key security", () => {
    it("never uses the client-supplied filename as any part of the generated key", async () => {
        mockSuccessfulPresign();
        const { token } = await createUserAndLogin("ARTIST");

        const res = await request(app)
            .post("/api/v1/media/upload-intent")
            .set("Authorization", token)
            .send(validBody({ filename: "my totally original mix (final) v2.mp3" }));

        expect(res.status).toBe(201);
        expect(res.body.data.key).toMatch(KEY_PATTERN);
        expect(res.body.data.key).not.toMatch(/original/i);
        expect(res.body.data.key).not.toContain(" ");
    });

    it("a path-traversal filename cannot escape the audio/{artistProfileId}/ prefix", async () => {
        mockSuccessfulPresign();
        const { token, userId } = await createUserAndLogin("ARTIST");

        const res = await request(app)
            .post("/api/v1/media/upload-intent")
            .set("Authorization", token)
            .send(validBody({ filename: "../../../../evil.mp3" }));

        expect(res.status).toBe(201);

        const realProfile = await ArtistProfile.findOne({ userId });
        expect(res.body.data.key).toMatch(KEY_PATTERN);
        expect(res.body.data.key).not.toContain("..");
        expect(res.body.data.key.startsWith(`audio/${realProfile._id}/`)).toBe(true);
    });

    it("generates a distinct key (UUID) for two separate requests by the same artist", async () => {
        mockSuccessfulPresign();
        const { token } = await createUserAndLogin("ARTIST");

        const first = await request(app)
            .post("/api/v1/media/upload-intent")
            .set("Authorization", token)
            .send(validBody({ filename: "same-name.mp3" }));

        const second = await request(app)
            .post("/api/v1/media/upload-intent")
            .set("Authorization", token)
            .send(validBody({ filename: "same-name.mp3" }));

        expect(first.status).toBe(201);
        expect(second.status).toBe(201);
        expect(first.body.data.key).not.toBe(second.body.data.key);
    });
});

describe("POST /api/v1/media/upload-intent — presigned URL response", () => {
    it("returns the expected response shape, sourced from the (mocked) provider", async () => {
        mockSuccessfulPresign({ uploadUrl: FAKE_UPLOAD_URL, expiresIn: 300 });
        const { token } = await createUserAndLogin("ARTIST");

        const res = await request(app)
            .post("/api/v1/media/upload-intent")
            .set("Authorization", token)
            .send(validBody());

        expect(res.status).toBe(201);
        expect(res.body.data).toMatchObject({
            uploadId: expect.any(String),
            key: expect.stringMatching(KEY_PATTERN),
            uploadUrl: FAKE_UPLOAD_URL,
        });
        expect(res.body.data.expiresAt).toBeDefined();
        expect(new Date(res.body.data.expiresAt).toString()).not.toBe("Invalid Date");
    });

    it("calls the provider with the server-generated key and the validated mimeType/sizeBytes", async () => {
        mockSuccessfulPresign();
        const { token, userId } = await createUserAndLogin("ARTIST");

        await request(app)
            .post("/api/v1/media/upload-intent")
            .set("Authorization", token)
            .send(validBody({ mimeType: "audio/mpeg", sizeBytes: 777 }));

        const realProfile = await ArtistProfile.findOne({ userId });
        expect(mediaProvider.createUploadTarget).toHaveBeenCalledWith(
            expect.objectContaining({
                key: expect.stringMatching(new RegExp(`^audio/${realProfile._id}/`)),
                mimeType: "audio/mpeg",
                sizeBytes: 777,
            })
        );
    });

    it("never includes credentials or raw AWS details in the response", async () => {
        mockSuccessfulPresign();
        const { token } = await createUserAndLogin("ARTIST");

        const res = await request(app)
            .post("/api/v1/media/upload-intent")
            .set("Authorization", token)
            .send(validBody());

        expect(JSON.stringify(res.body)).not.toMatch(/AKIA|aws_secret|secretAccessKey|SessionToken/i);
    });
});

describe("POST /api/v1/media/upload-intent — persistence", () => {
    it("creates a MediaUploadIntent record with the correct ownership, key, mime, and size", async () => {
        mockSuccessfulPresign();
        const { token, userId } = await createUserAndLogin("ARTIST");

        const res = await request(app)
            .post("/api/v1/media/upload-intent")
            .set("Authorization", token)
            .send(validBody({ mimeType: "audio/mpeg", sizeBytes: 123456 }));

        const realProfile = await ArtistProfile.findOne({ userId });
        const intent = await MediaUploadIntent.findById(res.body.data.uploadId);

        expect(intent).not.toBeNull();
        expect(intent.artistProfileId.toString()).toBe(realProfile._id.toString());
        expect(intent.key).toBe(res.body.data.key);
        expect(intent.mimeType).toBe("audio/mpeg");
        expect(intent.sizeBytes).toBe(123456);
    });

    it("stores an expiresAt coherent with the presigned URL's own expiry, using plain epoch arithmetic (no timezone drift)", async () => {
        mockSuccessfulPresign({ uploadUrl: FAKE_UPLOAD_URL, expiresIn: 120 });
        const { token } = await createUserAndLogin("ARTIST");

        const before = Date.now();
        const res = await request(app)
            .post("/api/v1/media/upload-intent")
            .set("Authorization", token)
            .send(validBody());
        const after = Date.now();

        const intent = await MediaUploadIntent.findById(res.body.data.uploadId);
        const expiresAtMs = intent.expiresAt.getTime();

        expect(expiresAtMs).toBeGreaterThanOrEqual(before + 120 * 1000);
        expect(expiresAtMs).toBeLessThanOrEqual(after + 120 * 1000);
        expect(new Date(res.body.data.expiresAt).getTime()).toBe(expiresAtMs);
    });

    it("does not persist a record when the client-supplied ownership fields are present — they're simply never read", async () => {
        mockSuccessfulPresign();
        const { token, userId } = await createUserAndLogin("ARTIST");

        await request(app)
            .post("/api/v1/media/upload-intent")
            .set("Authorization", token)
            .send(validBody({ artistProfileId: "000000000000000000000000" }));

        const realProfile = await ArtistProfile.findOne({ userId });
        const intents = await MediaUploadIntent.find({});

        expect(intents).toHaveLength(1);
        expect(intents[0].artistProfileId.toString()).toBe(realProfile._id.toString());
        expect(intents[0].artistProfileId.toString()).not.toBe("000000000000000000000000");
    });
});

describe("POST /api/v1/media/upload-intent — error handling", () => {
    it("a provider/presigner failure becomes a safe 503, never a raw AWS error", async () => {
        mediaProvider.createUploadTarget.mockRejectedValue(
            new Error("AccessDenied: User arn:aws:iam::123456789012:user/real-account is not authorized")
        );
        const { token } = await createUserAndLogin("ARTIST");

        const res = await request(app)
            .post("/api/v1/media/upload-intent")
            .set("Authorization", token)
            .send(validBody());

        expect(res.status).toBe(503);
        expect(res.body.error.code).toBe("MEDIA_PROVIDER_UNAVAILABLE");
        expect(JSON.stringify(res.body)).not.toMatch(/arn:aws|AccessDenied|123456789012/);

        const intents = await MediaUploadIntent.find({});
        expect(intents).toHaveLength(0);
    });

    it("an unconfigured/unsupported provider also becomes the same safe 503", async () => {
        mediaProvider.createUploadTarget.mockRejectedValue(
            new Error('Media storage provider "s3" is not configured.')
        );
        const { token } = await createUserAndLogin("ARTIST");

        const res = await request(app)
            .post("/api/v1/media/upload-intent")
            .set("Authorization", token)
            .send(validBody());

        expect(res.status).toBe(503);
        expect(res.body.error.code).toBe("MEDIA_PROVIDER_UNAVAILABLE");
    });
});
