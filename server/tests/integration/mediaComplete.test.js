jest.mock("../../services/mediaProvider");

const request = require("supertest");
const bcrypt = require("bcryptjs");
const mongoose = require("mongoose");

const app = require("../../app");
const User = require("../../models/User");
const ArtistProfile = require("../../models/ArtistProfile");
const MediaUploadIntent = require("../../models/MediaUploadIntent");
const Track = require("../../models/Track");
const mediaProvider = require("../../services/mediaProvider");
const config = require("../../config/env");
const { connect, clearDatabase, closeDatabase } = require("../helpers/db");

const TEST_PASSWORD = "TestPass123!";

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

// Same identity-caching convention as tests/integration/mediaUploadIntent.test.js.
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

async function ensureArtistProfile(userId, displayName = "Artist") {
    let profile = await ArtistProfile.findOne({ userId });
    if (!profile) {
        profile = await ArtistProfile.create({ userId, displayName });
    }
    return profile;
}

function makeIntentDoc(artistProfileId, overrides = {}) {
    return {
        artistProfileId,
        provider: "s3",
        key: `audio/${artistProfileId}/${new mongoose.Types.ObjectId().toString()}.mp3`,
        mimeType: "audio/mpeg",
        sizeBytes: 4096,
        originalFilename: "track.mp3",
        expiresAt: new Date(Date.now() + 5 * 60 * 1000),
        ...overrides,
    };
}

function mockVerifySuccess(intent, overrides = {}) {
    mediaProvider.verifyUpload.mockResolvedValue({
        exists: true,
        contentLength: intent.sizeBytes,
        contentType: intent.mimeType,
        etag: '"abc123"',
        ...overrides,
    });
}

function completeBody(uploadId, overrides = {}) {
    return { uploadId: uploadId.toString(), title: "My Track", artist: "My Artist", ...overrides };
}

describe("POST /api/v1/media/complete — happy path", () => {
    it("1. successfully completes an upload and creates a Track", async () => {
        const { token, userId } = await createUserAndLogin("ARTIST");
        const profile = await ensureArtistProfile(userId);
        const intent = await MediaUploadIntent.create(makeIntentDoc(profile._id));
        mockVerifySuccess(intent);

        const res = await request(app)
            .post("/api/v1/media/complete")
            .set("Authorization", token)
            .send(completeBody(intent._id));

        expect(res.status).toBe(201);
        expect(res.body.data.track).toBeDefined();
        expect(res.body.data.track.title).toBe("My Track");
        expect(res.body.data.track.artist).toBe("My Artist");
    });

    it("13. persists a Track with the correct audio shape", async () => {
        const { token, userId } = await createUserAndLogin("ARTIST");
        const profile = await ensureArtistProfile(userId);
        const intent = await MediaUploadIntent.create(makeIntentDoc(profile._id, { sizeBytes: 777, mimeType: "audio/mp3" }));
        mockVerifySuccess(intent);

        const res = await request(app)
            .post("/api/v1/media/complete")
            .set("Authorization", token)
            .send(completeBody(intent._id));

        expect(res.status).toBe(201);

        const track = await Track.findById(res.body.data.track._id);
        expect(track.audio).toMatchObject({
            provider: "s3",
            key: intent.key,
            mimeType: "audio/mp3",
            sizeBytes: 777,
        });
    });
});

describe("POST /api/v1/media/complete — authorization", () => {
    it("2. rejects an unauthenticated request", async () => {
        const res = await request(app).post("/api/v1/media/complete").send(completeBody(new mongoose.Types.ObjectId()));
        expect(res.status).toBe(401);
        expect(mediaProvider.verifyUpload).not.toHaveBeenCalled();
    });

    it("3. rejects an authenticated USER role", async () => {
        const { token } = await createUserAndLogin("USER");

        const res = await request(app)
            .post("/api/v1/media/complete")
            .set("Authorization", token)
            .send(completeBody(new mongoose.Types.ObjectId()));

        expect(res.status).toBe(403);
        expect(mediaProvider.verifyUpload).not.toHaveBeenCalled();
    });
});

describe("POST /api/v1/media/complete — request validation", () => {
    it("4. rejects an invalid (malformed) uploadId", async () => {
        const { token, userId } = await createUserAndLogin("ARTIST");
        await ensureArtistProfile(userId);

        const res = await request(app)
            .post("/api/v1/media/complete")
            .set("Authorization", token)
            .send({ uploadId: "not-a-valid-id", title: "T", artist: "A" });

        expect(res.status).toBe(400);
        expect(res.body.error.code).toBe("VALIDATION_ERROR");
        expect(mediaProvider.verifyUpload).not.toHaveBeenCalled();
    });
});

describe("POST /api/v1/media/complete — intent lookup", () => {
    it("5. returns UPLOAD_INTENT_NOT_FOUND for a well-formed but nonexistent uploadId", async () => {
        const { token, userId } = await createUserAndLogin("ARTIST");
        await ensureArtistProfile(userId);

        const res = await request(app)
            .post("/api/v1/media/complete")
            .set("Authorization", token)
            .send(completeBody(new mongoose.Types.ObjectId()));

        expect(res.status).toBe(404);
        expect(res.body.error.code).toBe("UPLOAD_INTENT_NOT_FOUND");
        expect(mediaProvider.verifyUpload).not.toHaveBeenCalled();
    });

    it("6. returns the SAME UPLOAD_INTENT_NOT_FOUND for an intent belonging to another artist — never leaking ownership", async () => {
        const owner = await createUserAndLogin("ARTIST");
        const ownerProfile = await ensureArtistProfile(owner.userId, "Owner");
        const intent = await MediaUploadIntent.create(makeIntentDoc(ownerProfile._id));

        const other = await createUserAndLogin("ARTIST", "other");
        await ensureArtistProfile(other.userId, "Other");

        const res = await request(app)
            .post("/api/v1/media/complete")
            .set("Authorization", other.token)
            .send(completeBody(intent._id));

        expect(res.status).toBe(404);
        expect(res.body.error.code).toBe("UPLOAD_INTENT_NOT_FOUND");
        expect(mediaProvider.verifyUpload).not.toHaveBeenCalled();

        // The original owner's intent must be completely untouched.
        const stillThere = await MediaUploadIntent.findById(intent._id);
        expect(stillThere).not.toBeNull();
    });

    it("7. returns UPLOAD_INTENT_EXPIRED for the caller's own expired intent", async () => {
        const { token, userId } = await createUserAndLogin("ARTIST");
        const profile = await ensureArtistProfile(userId);
        const intent = await MediaUploadIntent.create(
            makeIntentDoc(profile._id, { expiresAt: new Date(Date.now() - 1000) })
        );

        const res = await request(app)
            .post("/api/v1/media/complete")
            .set("Authorization", token)
            .send(completeBody(intent._id));

        expect(res.status).toBe(410);
        expect(res.body.error.code).toBe("UPLOAD_INTENT_EXPIRED");
        expect(mediaProvider.verifyUpload).not.toHaveBeenCalled();
    });
});

describe("POST /api/v1/media/complete — S3 verification", () => {
    it("8. returns UPLOAD_OBJECT_NOT_FOUND when the S3 object is missing, and leaves the intent intact", async () => {
        const { token, userId } = await createUserAndLogin("ARTIST");
        const profile = await ensureArtistProfile(userId);
        const intent = await MediaUploadIntent.create(makeIntentDoc(profile._id));
        mediaProvider.verifyUpload.mockResolvedValue({ exists: false });

        const res = await request(app)
            .post("/api/v1/media/complete")
            .set("Authorization", token)
            .send(completeBody(intent._id));

        expect(res.status).toBe(404);
        expect(res.body.error.code).toBe("UPLOAD_OBJECT_NOT_FOUND");

        const stillThere = await MediaUploadIntent.findById(intent._id);
        expect(stillThere).not.toBeNull();
    });

    it("9./24. returns a safe MEDIA_VERIFICATION_FAILED for AccessDenied, never leaking raw AWS details, and leaves the intent intact", async () => {
        const { token, userId } = await createUserAndLogin("ARTIST");
        const profile = await ensureArtistProfile(userId);
        const intent = await MediaUploadIntent.create(makeIntentDoc(profile._id));
        mediaProvider.verifyUpload.mockRejectedValue(
            Object.assign(new Error("AccessDenied: User arn:aws:iam::123456789012:user/real is not authorized"), {
                name: "AccessDenied",
            })
        );

        const res = await request(app)
            .post("/api/v1/media/complete")
            .set("Authorization", token)
            .send(completeBody(intent._id));

        expect(res.status).toBe(503);
        expect(res.body.error.code).toBe("MEDIA_VERIFICATION_FAILED");
        expect(JSON.stringify(res.body)).not.toMatch(/arn:aws|AccessDenied|123456789012|stack/i);

        const stillThere = await MediaUploadIntent.findById(intent._id);
        expect(stillThere).not.toBeNull();
    });

    it("10. returns UPLOAD_TOO_LARGE when actual size exceeds config.uploadMaxBytes, and leaves the intent intact", async () => {
        const { token, userId } = await createUserAndLogin("ARTIST");
        const profile = await ensureArtistProfile(userId);
        const oversized = config.uploadMaxBytes + 1024;
        const intent = await MediaUploadIntent.create(makeIntentDoc(profile._id, { sizeBytes: oversized }));
        mockVerifySuccess(intent, { contentLength: oversized });

        const res = await request(app)
            .post("/api/v1/media/complete")
            .set("Authorization", token)
            .send(completeBody(intent._id));

        expect(res.status).toBe(400);
        expect(res.body.error.code).toBe("UPLOAD_TOO_LARGE");

        const stillThere = await MediaUploadIntent.findById(intent._id);
        expect(stillThere).not.toBeNull();
    });

    it("11a. returns UPLOAD_SIZE_MISMATCH when actual size is LARGER than declared, and leaves the intent intact", async () => {
        const { token, userId } = await createUserAndLogin("ARTIST");
        const profile = await ensureArtistProfile(userId);
        const intent = await MediaUploadIntent.create(makeIntentDoc(profile._id, { sizeBytes: 4096 }));
        mockVerifySuccess(intent, { contentLength: 5000 });

        const res = await request(app)
            .post("/api/v1/media/complete")
            .set("Authorization", token)
            .send(completeBody(intent._id));

        expect(res.status).toBe(400);
        expect(res.body.error.code).toBe("UPLOAD_SIZE_MISMATCH");

        const stillThere = await MediaUploadIntent.findById(intent._id);
        expect(stillThere).not.toBeNull();
    });

    it("11b. returns UPLOAD_SIZE_MISMATCH when actual size is SMALLER than declared, and leaves the intent intact", async () => {
        const { token, userId } = await createUserAndLogin("ARTIST");
        const profile = await ensureArtistProfile(userId);
        const intent = await MediaUploadIntent.create(makeIntentDoc(profile._id, { sizeBytes: 4096 }));
        mockVerifySuccess(intent, { contentLength: 100 });

        const res = await request(app)
            .post("/api/v1/media/complete")
            .set("Authorization", token)
            .send(completeBody(intent._id));

        expect(res.status).toBe(400);
        expect(res.body.error.code).toBe("UPLOAD_SIZE_MISMATCH");

        const stillThere = await MediaUploadIntent.findById(intent._id);
        expect(stillThere).not.toBeNull();
    });

    it("12. returns UPLOAD_MIME_MISMATCH when actual Content-Type differs from declared, and leaves the intent intact", async () => {
        const { token, userId } = await createUserAndLogin("ARTIST");
        const profile = await ensureArtistProfile(userId);
        const intent = await MediaUploadIntent.create(makeIntentDoc(profile._id, { mimeType: "audio/mpeg" }));
        mockVerifySuccess(intent, { contentType: "application/octet-stream" });

        const res = await request(app)
            .post("/api/v1/media/complete")
            .set("Authorization", token)
            .send(completeBody(intent._id));

        expect(res.status).toBe(400);
        expect(res.body.error.code).toBe("UPLOAD_MIME_MISMATCH");

        const stillThere = await MediaUploadIntent.findById(intent._id);
        expect(stillThere).not.toBeNull();
    });

    it("23. a verification failure leaves the intent retryable — a subsequent matching completion succeeds", async () => {
        const { token, userId } = await createUserAndLogin("ARTIST");
        const profile = await ensureArtistProfile(userId);
        const intent = await MediaUploadIntent.create(makeIntentDoc(profile._id, { mimeType: "audio/mpeg" }));

        mockVerifySuccess(intent, { contentType: "application/octet-stream" });
        const failed = await request(app)
            .post("/api/v1/media/complete")
            .set("Authorization", token)
            .send(completeBody(intent._id));
        expect(failed.status).toBe(400);

        mockVerifySuccess(intent); // now matches
        const retried = await request(app)
            .post("/api/v1/media/complete")
            .set("Authorization", token)
            .send(completeBody(intent._id));

        expect(retried.status).toBe(201);
    });
});

describe("POST /api/v1/media/complete — trust boundary (client cannot influence server-derived fields)", () => {
    it("14. artistId always comes from the server-resolved ArtistProfile", async () => {
        const { token, userId } = await createUserAndLogin("ARTIST");
        const profile = await ensureArtistProfile(userId);
        const intent = await MediaUploadIntent.create(makeIntentDoc(profile._id));
        mockVerifySuccess(intent);

        const res = await request(app)
            .post("/api/v1/media/complete")
            .set("Authorization", token)
            .send(completeBody(intent._id));

        const track = await Track.findById(res.body.data.track._id);
        expect(track.artistId.toString()).toBe(profile._id.toString());
    });

    it("15. uploadedBy always comes from the authenticated user's own username", async () => {
        const { token, userId, username } = await createUserAndLogin("ARTIST");
        const profile = await ensureArtistProfile(userId);
        const intent = await MediaUploadIntent.create(makeIntentDoc(profile._id));
        mockVerifySuccess(intent);

        const res = await request(app)
            .post("/api/v1/media/complete")
            .set("Authorization", token)
            .send(completeBody(intent._id));

        const track = await Track.findById(res.body.data.track._id);
        expect(track.uploadedBy).toBe(username);
    });

    it("16. a client-supplied provider is silently ignored — the persisted provider is always 's3'", async () => {
        const { token, userId } = await createUserAndLogin("ARTIST");
        const profile = await ensureArtistProfile(userId);
        const intent = await MediaUploadIntent.create(makeIntentDoc(profile._id));
        mockVerifySuccess(intent);

        const res = await request(app)
            .post("/api/v1/media/complete")
            .set("Authorization", token)
            .send(completeBody(intent._id, { provider: "local" }));

        expect(res.status).toBe(201);
        const track = await Track.findById(res.body.data.track._id);
        expect(track.audio.provider).toBe("s3");
    });

    it("17. a client-supplied key is silently ignored — the persisted key always comes from the intent", async () => {
        const { token, userId } = await createUserAndLogin("ARTIST");
        const profile = await ensureArtistProfile(userId);
        const intent = await MediaUploadIntent.create(makeIntentDoc(profile._id));
        mockVerifySuccess(intent);

        const res = await request(app)
            .post("/api/v1/media/complete")
            .set("Authorization", token)
            .send(completeBody(intent._id, { key: "audio/attacker-chosen/evil.mp3" }));

        expect(res.status).toBe(201);
        const track = await Track.findById(res.body.data.track._id);
        expect(track.audio.key).toBe(intent.key);
        expect(track.audio.key).not.toContain("attacker");
    });

    it("18. a client-supplied artistProfileId targeting another artist is silently ignored", async () => {
        const { token, userId } = await createUserAndLogin("ARTIST");
        const profile = await ensureArtistProfile(userId);
        const intent = await MediaUploadIntent.create(makeIntentDoc(profile._id));
        mockVerifySuccess(intent);

        const other = await createUserAndLogin("ARTIST", "other2");
        const otherProfile = await ensureArtistProfile(other.userId, "Other2");

        const res = await request(app)
            .post("/api/v1/media/complete")
            .set("Authorization", token)
            .send(completeBody(intent._id, { artistProfileId: otherProfile._id.toString() }));

        expect(res.status).toBe(201);
        const track = await Track.findById(res.body.data.track._id);
        expect(track.artistId.toString()).toBe(profile._id.toString());
        expect(track.artistId.toString()).not.toBe(otherProfile._id.toString());
    });

    it("19. a client-supplied sizeBytes is silently ignored — the persisted size always comes from the verified HeadObject result", async () => {
        const { token, userId } = await createUserAndLogin("ARTIST");
        const profile = await ensureArtistProfile(userId);
        const intent = await MediaUploadIntent.create(makeIntentDoc(profile._id, { sizeBytes: 4096 }));
        mockVerifySuccess(intent); // real verified contentLength is 4096

        const res = await request(app)
            .post("/api/v1/media/complete")
            .set("Authorization", token)
            .send(completeBody(intent._id, { sizeBytes: 1 }));

        expect(res.status).toBe(201);
        const track = await Track.findById(res.body.data.track._id);
        expect(track.audio.sizeBytes).toBe(4096);
    });

    it("20. a client-supplied mimeType is silently ignored — the persisted mimeType always comes from the verified HeadObject result", async () => {
        const { token, userId } = await createUserAndLogin("ARTIST");
        const profile = await ensureArtistProfile(userId);
        const intent = await MediaUploadIntent.create(makeIntentDoc(profile._id, { mimeType: "audio/mpeg" }));
        mockVerifySuccess(intent); // real verified contentType is audio/mpeg

        const res = await request(app)
            .post("/api/v1/media/complete")
            .set("Authorization", token)
            .send(completeBody(intent._id, { mimeType: "video/mp4" }));

        expect(res.status).toBe(201);
        const track = await Track.findById(res.body.data.track._id);
        expect(track.audio.mimeType).toBe("audio/mpeg");
    });
});

describe("POST /api/v1/media/complete — idempotency and concurrency", () => {
    it("21. a repeated completion for the same uploadId returns UPLOAD_INTENT_NOT_FOUND the second time", async () => {
        const { token, userId } = await createUserAndLogin("ARTIST");
        const profile = await ensureArtistProfile(userId);
        const intent = await MediaUploadIntent.create(makeIntentDoc(profile._id));
        mockVerifySuccess(intent);

        const first = await request(app)
            .post("/api/v1/media/complete")
            .set("Authorization", token)
            .send(completeBody(intent._id));
        expect(first.status).toBe(201);

        const second = await request(app)
            .post("/api/v1/media/complete")
            .set("Authorization", token)
            .send(completeBody(intent._id));
        expect(second.status).toBe(404);
        expect(second.body.error.code).toBe("UPLOAD_INTENT_NOT_FOUND");

        const tracks = await Track.find({ "audio.key": intent.key });
        expect(tracks).toHaveLength(1);
    });

    it("22. two concurrent completion requests for the same uploadId result in exactly one Track and one UPLOAD_INTENT_NOT_FOUND", async () => {
        const { token, userId } = await createUserAndLogin("ARTIST");
        const profile = await ensureArtistProfile(userId);
        const intent = await MediaUploadIntent.create(makeIntentDoc(profile._id));
        mockVerifySuccess(intent);

        const [first, second] = await Promise.all([
            request(app).post("/api/v1/media/complete").set("Authorization", token).send(completeBody(intent._id)),
            request(app).post("/api/v1/media/complete").set("Authorization", token).send(completeBody(intent._id)),
        ]);

        const statuses = [first.status, second.status].sort();
        expect(statuses).toEqual([201, 404]);

        const failed = first.status === 404 ? first : second;
        expect(failed.body.error.code).toBe("UPLOAD_INTENT_NOT_FOUND");

        const tracks = await Track.find({ "audio.key": intent.key });
        expect(tracks).toHaveLength(1);

        const remainingIntent = await MediaUploadIntent.findById(intent._id);
        expect(remainingIntent).toBeNull();
    });
});
