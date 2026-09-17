const mongoose = require("mongoose");

const Track = require("../../models/Track");
const { runMigration } = require("../../scripts/migrateLegacyAudio");
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

// Every insert below goes through the native driver (mongoose.connection
// .collection(...)), bypassing the Track model entirely — this is the
// only way to accurately simulate real legacy production data, since
// Track.create()/assignment now auto-upgrades a raw string via the
// schema's own `set` transform (see trackAudioModel.test.js).
async function insertRawTrack(overrides = {}) {
    const doc = {
        title: "Track",
        artist: "Artist",
        audio: "1778888845516.mp3",
        visibility: "public",
        ...overrides,
    };
    const result = await mongoose.connection.collection("tracks").insertOne(doc);
    return result.insertedId;
}

describe("scripts/migrateLegacyAudio — runMigration", () => {
    it("migrates a string-shaped audio field to the new object shape", async () => {
        const id = await insertRawTrack({ audio: "1778888845516.mp3" });

        const counts = await runMigration();

        expect(counts).toEqual({ scanned: 1, eligible: 1, migrated: 1, skipped: 0, failed: 0 });

        const track = await Track.findById(id);
        expect(track.audio).toEqual({
            provider: "local",
            key: "1778888845516.mp3",
            mimeType: "audio/mpeg",
        });
    });

    it("skips a document whose audio is already an object, without overwriting it", async () => {
        const alreadyMigrated = { provider: "s3", key: "audio/abc/def.mp3", mimeType: "audio/mpeg" };
        const id = await insertRawTrack({ audio: alreadyMigrated });

        const counts = await runMigration();

        expect(counts).toEqual({ scanned: 1, eligible: 0, migrated: 0, skipped: 1, failed: 0 });

        const track = await Track.findById(id);
        expect(track.audio).toEqual(alreadyMigrated);
    });

    it("never invents an S3 key — every migrated legacy string becomes provider: local", async () => {
        const id = await insertRawTrack({ audio: "some-legacy-filename.mp3" });

        await runMigration();

        const track = await Track.findById(id);
        expect(track.audio.provider).toBe("local");
        expect(track.audio.key).toBe("some-legacy-filename.mp3");
    });

    it("leaves unrelated fields completely unchanged", async () => {
        const id = await insertRawTrack({
            audio: "1778888845516.mp3",
            title: "purple",
            artist: "boilor",
            genre: "Techno",
            tags: ["dark"],
            visibility: "unlisted",
            isMix: true,
        });

        await runMigration();

        const track = await Track.findById(id);
        expect(track.title).toBe("purple");
        expect(track.artist).toBe("boilor");
        expect(track.genre).toBe("Techno");
        expect(track.tags).toEqual(["dark"]);
        expect(track.visibility).toBe("unlisted");
        expect(track.isMix).toBe(true);
    });

    it("is idempotent — running it a second time re-migrates nothing", async () => {
        await insertRawTrack({ audio: "1778888845516.mp3" });

        const first = await runMigration();
        expect(first).toEqual({ scanned: 1, eligible: 1, migrated: 1, skipped: 0, failed: 0 });

        const second = await runMigration();
        expect(second).toEqual({ scanned: 1, eligible: 0, migrated: 0, skipped: 1, failed: 0 });
    });

    it("handles a malformed/empty legacy audio value safely — counted as failed, never crashes the run", async () => {
        await insertRawTrack({ audio: "" });
        await insertRawTrack({ audio: "1778888845516.mp3" }); // a normal, valid one alongside it

        const counts = await runMigration();

        expect(counts.scanned).toBe(2);
        expect(counts.eligible).toBe(2);
        expect(counts.migrated).toBe(1);
        expect(counts.failed).toBe(1);
    });

    it("dry-run reports what would change without modifying any data", async () => {
        const id = await insertRawTrack({ audio: "1778888845516.mp3" });

        const counts = await runMigration({ dryRun: true });

        expect(counts).toEqual({ scanned: 1, eligible: 1, migrated: 1, skipped: 0, failed: 0 });

        const track = await Track.findById(id);
        expect(track.audio).toBe("1778888845516.mp3"); // still the raw string — untouched
    });

    it("scans and reports correctly across a mixed collection of legacy, migrated, and malformed documents", async () => {
        await insertRawTrack({ audio: "111.mp3" });
        await insertRawTrack({ audio: "222.mp3" });
        await insertRawTrack({ audio: { provider: "local", key: "already-done.mp3" } });
        await insertRawTrack({ audio: "" });

        const counts = await runMigration();

        expect(counts).toEqual({ scanned: 4, eligible: 3, migrated: 2, skipped: 1, failed: 1 });
    });
});
