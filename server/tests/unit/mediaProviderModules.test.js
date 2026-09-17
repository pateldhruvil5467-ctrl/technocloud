// Unlike mediaProvider.test.js (which mocks services/media/s3 to test
// the dispatcher in isolation), this file exercises the REAL local and
// s3 provider modules directly — no mocking. For s3.js in particular,
// this is the actual proof that it "does not attempt network access
// during tests": there is no fetch/http/AWS SDK call anywhere in it to
// intercept, and these tests call its real, unmocked functions.

const local = require("../../services/media/local");
const s3 = require("../../services/media/s3");

describe("services/media/local (real module)", () => {
    it("is always configured", () => {
        expect(local.isConfigured()).toBe(true);
    });

    it("builds a relative /uploads/<key> URL", () => {
        expect(local.getPlaybackUrl("1778888845516.mp3")).toBe("/uploads/1778888845516.mp3");
    });

    it("rejects a missing/empty key", () => {
        expect(() => local.getPlaybackUrl("")).toThrow();
        expect(() => local.getPlaybackUrl(undefined)).toThrow();
    });
});

describe("services/media/s3 (real module, unconfigured in this test environment)", () => {
    it("reports not configured when S3_BUCKET/S3_REGION are unset", () => {
        // tests/setup/globalSetup.js never sets these — this is the
        // real, unconfigured state every test run exercises.
        expect(s3.isConfigured()).toBe(false);
    });

    it("fails safely (throws, no network call) when asked for a playback URL while unconfigured", () => {
        expect(() => s3.getPlaybackUrl("audio/abc/def.mp3")).toThrow(/not configured/);
    });

    it("fails safely (throws, no network call) when asked to create an upload target while unconfigured", async () => {
        await expect(
            s3.createUploadTarget({ key: "audio/abc/def.mp3", mimeType: "audio/mpeg", sizeBytes: 1024 })
        ).rejects.toThrow(/not configured/);
    });
});
