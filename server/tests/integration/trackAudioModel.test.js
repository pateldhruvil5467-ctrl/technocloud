const mongoose = require("mongoose");

const Track = require("../../models/Track");
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

function baseTrackFields(overrides = {}) {
    return {
        title: "Test Track",
        artist: "Test Artist",
        ...overrides,
    };
}

describe("Track.audio — new representation", () => {
    it("accepts a valid local media object", async () => {
        const track = await Track.create(
            baseTrackFields({ audio: { provider: "local", key: "1788353068556-uuid.mp3" } })
        );

        expect(track.audio).toMatchObject({ provider: "local", key: "1788353068556-uuid.mp3" });
    });

    it("accepts a valid s3 media object", async () => {
        const track = await Track.create(
            baseTrackFields({
                audio: {
                    provider: "s3",
                    key: "audio/507f1f77bcf86cd799439011/uuid.mp3",
                    mimeType: "audio/mpeg",
                    sizeBytes: 4096,
                    durationSec: 180.5,
                },
            })
        );

        expect(track.audio).toMatchObject({
            provider: "s3",
            key: "audio/507f1f77bcf86cd799439011/uuid.mp3",
            sizeBytes: 4096,
            durationSec: 180.5,
        });
    });

    it("rejects an invalid provider", async () => {
        await expect(
            Track.create(baseTrackFields({ audio: { provider: "dropbox", key: "x.mp3" } }))
        ).rejects.toThrow();
    });

    it("rejects a missing key", async () => {
        await expect(Track.create(baseTrackFields({ audio: { provider: "local" } }))).rejects.toThrow();
    });

    it("accepts optional metadata (mimeType/sizeBytes/durationSec) when present, and omits it when absent", async () => {
        const track = await Track.create(
            baseTrackFields({ audio: { provider: "local", key: "no-metadata.mp3" } })
        );

        expect(track.audio.sizeBytes).toBeUndefined();
        expect(track.audio.durationSec).toBeUndefined();
    });

    it("leaves existing non-media fields unaffected by the audio schema change", async () => {
        const track = await Track.create(
            baseTrackFields({
                audio: { provider: "local", key: "x.mp3" },
                genre: "Techno",
                tags: ["dark", "warehouse"],
                visibility: "unlisted",
                isMix: true,
            })
        );

        expect(track.genre).toBe("Techno");
        expect(track.tags).toEqual(["dark", "warehouse"]);
        expect(track.visibility).toBe("unlisted");
        expect(track.isMix).toBe(true);
        expect(track.uploadStatus).toBe("ready"); // schema default, unchanged
    });
});

describe("Track.audio — legacy string backward compatibility", () => {
    it("upgrades a plain string assignment to the new object shape (unchanged uploadTrack controller behavior)", async () => {
        // Mirrors exactly what trackController.uploadTrack still does in
        // this phase: `new Track({ ..., audio: req.file.filename })` — a
        // raw string, not an object. The schema's own `set` transform is
        // what upgrades it, with zero controller change required.
        const track = await Track.create(baseTrackFields({ audio: "1788353068556-uuid.mp3" }));

        expect(track.audio).toEqual({
            provider: "local",
            key: "1788353068556-uuid.mp3",
            mimeType: "audio/mpeg",
        });
    });

    it("reads a pre-existing production-style document (audio stored as a raw string) without throwing", async () => {
        // Inserted via the native driver, bypassing Mongoose entirely —
        // this is the only way to accurately simulate real legacy data,
        // since Track.create()/assignment now auto-upgrades a string via
        // the schema's own `set` transform (see the test above). This is
        // exactly what a real production document looks like today
        // (confirmed live: GET /api/tracks on the deployed backend
        // returns `"audio":"1778888845516.mp3"` for existing tracks).
        await mongoose.connection.collection("tracks").insertOne({
            title: "Legacy Track",
            artist: "Legacy Artist",
            audio: "1778888845516.mp3",
            visibility: "public",
            uploadStatus: "ready",
            tags: [],
            isMix: false,
        });

        let threw = null;
        let tracks = null;
        try {
            tracks = await Track.find({});
        } catch (error) {
            threw = error;
        }

        expect(threw).toBeNull();
        expect(tracks).toHaveLength(1);
        // Mixed has no cast step — the raw legacy value survives a read
        // completely unchanged, exactly as stored. This is the specific,
        // empirically-verified guarantee this schema design relies on
        // (see models/Track.js's comment on why `audio` is Mixed, not a
        // nested Schema/subdocument type).
        expect(tracks[0].audio).toBe("1778888845516.mp3");
    });

    it("does not throw when a whole legacy-string collection is queried via GET-style Track.find()", async () => {
        await mongoose.connection.collection("tracks").insertMany([
            { title: "A", artist: "A", audio: "111.mp3", visibility: "public" },
            { title: "B", artist: "B", audio: "222.mp3", visibility: "public" },
            { title: "C", artist: "C", audio: { provider: "local", key: "already-migrated.mp3" }, visibility: "public" },
        ]);

        const tracks = await Track.find({}).sort({ title: 1 });

        expect(tracks).toHaveLength(3);
        expect(tracks[0].audio).toBe("111.mp3");
        expect(tracks[1].audio).toBe("222.mp3");
        expect(tracks[2].audio).toMatchObject({ provider: "local", key: "already-migrated.mp3" });
    });

    it("re-saving an untouched legacy document (e.g. a title-only update) does not fail validation because audio hasn't been migrated", async () => {
        await mongoose.connection.collection("tracks").insertOne({
            title: "Legacy Track",
            artist: "Legacy Artist",
            audio: "1778888845516.mp3",
            visibility: "public",
        });

        const track = await Track.findOne({});
        track.title = "Renamed Legacy Track";

        await expect(track.save()).resolves.toBeDefined();

        const reloaded = await Track.findById(track._id);
        expect(reloaded.title).toBe("Renamed Legacy Track");
        expect(reloaded.audio).toBe("1778888845516.mp3");
    });
});
