const { AUDIO_PROVIDERS, DEFAULT_AUDIO_MIME_TYPE, toAudioObject, isValidAudioValue } = require("../../utils/audioMedia");

describe("audioMedia.toAudioObject", () => {
    it("upgrades a legacy bare filename string to a local-provider object", () => {
        expect(toAudioObject("1778888845516.mp3")).toEqual({
            provider: "local",
            key: "1778888845516.mp3",
            mimeType: DEFAULT_AUDIO_MIME_TYPE,
        });
    });

    it("leaves an already-object value unchanged", () => {
        const value = { provider: "s3", key: "audio/abc/def.mp3", mimeType: "audio/mpeg" };
        expect(toAudioObject(value)).toBe(value);
    });
});

describe("audioMedia.isValidAudioValue", () => {
    it("accepts a legacy non-empty filename string", () => {
        expect(isValidAudioValue("1778888845516.mp3")).toBe(true);
    });

    it("rejects an empty string", () => {
        expect(isValidAudioValue("")).toBe(false);
        expect(isValidAudioValue("   ")).toBe(false);
    });

    it("accepts a valid local media object", () => {
        expect(isValidAudioValue({ provider: "local", key: "1788353068556-uuid.mp3" })).toBe(true);
    });

    it("accepts a valid s3 media object with optional metadata", () => {
        expect(
            isValidAudioValue({
                provider: "s3",
                key: "audio/507f1f77bcf86cd799439011/uuid.mp3",
                mimeType: "audio/mpeg",
                sizeBytes: 4096,
                durationSec: 180.5,
            })
        ).toBe(true);
    });

    it("rejects an unrecognized provider", () => {
        expect(isValidAudioValue({ provider: "dropbox", key: "x.mp3" })).toBe(false);
    });

    it("rejects a missing provider", () => {
        expect(isValidAudioValue({ key: "x.mp3" })).toBe(false);
    });

    it("rejects a missing key", () => {
        expect(isValidAudioValue({ provider: "local" })).toBe(false);
    });

    it("rejects an empty-string key", () => {
        expect(isValidAudioValue({ provider: "local", key: "" })).toBe(false);
    });

    it("rejects a non-string mimeType", () => {
        expect(isValidAudioValue({ provider: "local", key: "x.mp3", mimeType: 123 })).toBe(false);
    });

    it("rejects a negative sizeBytes", () => {
        expect(isValidAudioValue({ provider: "local", key: "x.mp3", sizeBytes: -1 })).toBe(false);
    });

    it("rejects a negative durationSec", () => {
        expect(isValidAudioValue({ provider: "local", key: "x.mp3", durationSec: -1 })).toBe(false);
    });

    it("rejects null, arrays, and non-object primitives", () => {
        expect(isValidAudioValue(null)).toBe(false);
        expect(isValidAudioValue(undefined)).toBe(false);
        expect(isValidAudioValue(42)).toBe(false);
        expect(isValidAudioValue(["local", "x.mp3"])).toBe(false);
    });
});

describe("audioMedia constants", () => {
    it("exposes exactly the two supported providers", () => {
        expect(AUDIO_PROVIDERS).toEqual(["local", "s3"]);
    });
});
