const mongoose = require("mongoose");

const { connect, clearDatabase, closeDatabase } = require("../helpers/db");
// Required normally (no jest.resetModules() involved) so this shares the
// exact same `mongoose` singleton `connect()` below establishes a
// connection on — a module required AFTER jest.resetModules() gets a
// fresh, disconnected `mongoose` instance instead (see loadPresenter()
// below), which is exactly right for the provider-switching tests (none
// of which touch the database) but would silently break any test that
// also needs a real Mongo connection.
const Track = require("../../models/Track");
const trackPresenterDefault = require("../../services/trackPresenter");

// config/env.js reads process.env and freezes the result once, at
// require time — exercising trackPresenter against a DIFFERENT provider
// configuration (e.g. s3) requires the same jest.resetModules() +
// fresh-require pattern already established in
// tests/unit/mediaConfig.test.js / mediaProviderCreateUploadTarget.test.js.
// Only used by tests that don't also need the database (see the note
// above) — the test environment's real, default config (local provider)
// is already correct for every DB-touching test.
const ORIGINAL_ENV = { ...process.env };

afterEach(() => {
    process.env = { ...ORIGINAL_ENV };
    jest.restoreAllMocks();
});

function loadPresenter(envOverrides = {}) {
    jest.resetModules();
    process.env = { ...ORIGINAL_ENV, ...envOverrides };
    return {
        trackPresenter: require("../../services/trackPresenter"),
        mediaProvider: require("../../services/mediaProvider"),
    };
}

describe("trackPresenter.presentTrack — resolution", () => {
    it("resolves a legacy string audio value through the local provider", () => {
        const track = { _id: new mongoose.Types.ObjectId(), title: "T", artist: "A", audio: "1778888845516.mp3" };

        const result = trackPresenterDefault.presentTrack(track);

        expect(result.playbackUrl).toBe("/uploads/1778888845516.mp3");
    });

    it("resolves a canonical S3 audio object through the S3 provider", () => {
        const { trackPresenter } = loadPresenter({
            MEDIA_STORAGE_PROVIDER: "s3",
            S3_BUCKET: "test-bucket",
            S3_REGION: "us-east-1",
            CLOUDFRONT_DOMAIN: "d123456.cloudfront.net",
        });
        const track = {
            _id: new mongoose.Types.ObjectId(),
            title: "T",
            artist: "A",
            audio: { provider: "s3", key: "audio/artist123/uuid.mp3", mimeType: "audio/mpeg", sizeBytes: 4096 },
        };

        const result = trackPresenter.presentTrack(track);

        expect(result.playbackUrl).toBe("https://d123456.cloudfront.net/audio/artist123/uuid.mp3");
    });

    it("preserves every existing field unchanged, and never replaces/mutates audio into a URL", () => {
        const id = new mongoose.Types.ObjectId();
        const track = {
            _id: id,
            title: "T",
            artist: "A",
            // A "local"-shaped object here (rather than "s3", which
            // isn't configured in this default test environment) keeps
            // this test's own resolution incidental-free — its point is
            // field preservation, not error handling (see the dedicated
            // "provider failure handling" describe block for that).
            audio: { provider: "local", key: "1788353068556-uuid.mp3", mimeType: "audio/mpeg", sizeBytes: 4096 },
            genre: "Techno",
            visibility: "public",
        };

        const result = trackPresenterDefault.presentTrack(track);

        expect(result).toMatchObject({ _id: id, title: "T", artist: "A", genre: "Techno", visibility: "public" });
        expect(result.playbackUrl).toBe("/uploads/1788353068556-uuid.mp3");
        expect(result.audio).toEqual({
            provider: "local",
            key: "1788353068556-uuid.mp3",
            mimeType: "audio/mpeg",
            sizeBytes: 4096,
        });
    });
});

describe("trackPresenter.presentTrack — does not mutate the original", () => {
    it("leaves a plain object input untouched", () => {
        const track = { _id: new mongoose.Types.ObjectId(), title: "T", artist: "A", audio: "x.mp3" };

        trackPresenterDefault.presentTrack(track);

        expect(track.playbackUrl).toBeUndefined();
        expect(Object.prototype.hasOwnProperty.call(track, "playbackUrl")).toBe(false);
    });

    describe("with a real Mongoose Track document", () => {
        beforeAll(async () => {
            await connect();
        });

        afterEach(async () => {
            await clearDatabase();
        });

        afterAll(async () => {
            await closeDatabase();
        });

        it("leaves the document untouched", async () => {
            const track = await Track.create({ title: "T", artist: "A", audio: "x.mp3" });

            const result = trackPresenterDefault.presentTrack(track);

            expect(result.playbackUrl).toBe("/uploads/x.mp3");
            expect(track.playbackUrl).toBeUndefined();
            expect(track.toObject().playbackUrl).toBeUndefined();
        });
    });
});

describe("trackPresenter.presentTrack — provider failure handling", () => {
    it("returns playbackUrl: null and logs server-side, without throwing, when the provider is unconfigured", () => {
        const { trackPresenter } = loadPresenter({
            MEDIA_STORAGE_PROVIDER: "s3",
            S3_BUCKET: undefined,
            S3_REGION: undefined,
        });
        const consoleErrorSpy = jest.spyOn(console, "error").mockImplementation(() => {});

        const track = {
            _id: new mongoose.Types.ObjectId(),
            title: "T",
            artist: "A",
            audio: { provider: "s3", key: "audio/artist123/uuid.mp3" },
        };

        let result;
        expect(() => {
            result = trackPresenter.presentTrack(track);
        }).not.toThrow();

        expect(result.playbackUrl).toBeNull();
        expect(consoleErrorSpy).toHaveBeenCalledTimes(1);
    });

    it("never leaks raw provider/AWS error details into the presented result — only into the server-side log", () => {
        const { trackPresenter, mediaProvider } = loadPresenter({
            MEDIA_STORAGE_PROVIDER: "s3",
            S3_BUCKET: "test-bucket",
            S3_REGION: "us-east-1",
        });
        const consoleErrorSpy = jest.spyOn(console, "error").mockImplementation(() => {});
        const rawAwsError = new Error(
            "AccessDenied: User arn:aws:iam::123456789012:user/real-account is not authorized to perform: s3:GetObject"
        );
        jest.spyOn(mediaProvider, "getPlaybackUrl").mockImplementation(() => {
            throw rawAwsError;
        });

        const track = {
            _id: new mongoose.Types.ObjectId(),
            title: "T",
            artist: "A",
            audio: { provider: "s3", key: "audio/artist123/uuid.mp3" },
        };

        const result = trackPresenter.presentTrack(track);

        expect(result.playbackUrl).toBeNull();
        expect(JSON.stringify(result)).not.toMatch(/arn:aws|AccessDenied|123456789012/);

        // The raw detail IS present in the server-side log call — proof
        // it was captured for debugging, just never returned to the
        // client (matches controllers/v1/mediaController.js's own
        // established provider-error logging convention).
        const loggedLine = consoleErrorSpy.mock.calls[0][0];
        expect(loggedLine).toMatch(/AccessDenied/);
    });
});

describe("trackPresenter.presentTracks", () => {
    it("maps presentTrack over a list, isolating one unresolvable track from the rest", () => {
        jest.spyOn(console, "error").mockImplementation(() => {});

        const good = { _id: new mongoose.Types.ObjectId(), title: "Good", artist: "A", audio: "good.mp3" };
        // audio.provider is "s3" regardless of the server's own default
        // ("local" here) — getPlaybackUrl dispatches on the audio
        // value's OWN provider field, and s3 is unconfigured in this
        // test env, so this one throws while `good` still resolves.
        const bad = {
            _id: new mongoose.Types.ObjectId(),
            title: "Bad",
            artist: "A",
            audio: { provider: "s3", key: "x.mp3" },
        };

        const results = trackPresenterDefault.presentTracks([good, bad]);

        expect(results).toHaveLength(2);
        expect(results[0].playbackUrl).toBe("/uploads/good.mp3");
        expect(results[1].playbackUrl).toBeNull();
    });

    it("returns an empty array for an empty list", () => {
        expect(trackPresenterDefault.presentTracks([])).toEqual([]);
    });
});
