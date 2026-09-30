// Mirrors tests/unit/mediaProviderCreateUploadTarget.test.js exactly:
// verifyUpload dispatches based on config.mediaStorageProvider (not an
// explicit argument), so exercising it against different providers
// requires the same jest.resetModules() + fresh-require pattern.

const ORIGINAL_ENV = { ...process.env };

afterEach(() => {
    process.env = { ...ORIGINAL_ENV };
    jest.resetModules();
});

describe("mediaProvider.verifyUpload", () => {
    it("fails clearly when the configured provider is 'local' (no verifyUpload support — a completed multer upload IS the verification)", async () => {
        jest.resetModules();
        process.env = { ...ORIGINAL_ENV, MEDIA_STORAGE_PROVIDER: "local" };

        const { verifyUpload } = require("../../services/mediaProvider");

        await expect(verifyUpload({ key: "audio/abc/def.mp3" })).rejects.toThrow(
            /does not support verifying an upload/
        );
    });

    it("dispatches to the s3 provider when configured, without making a real network call", async () => {
        jest.resetModules();
        process.env = {
            ...ORIGINAL_ENV,
            MEDIA_STORAGE_PROVIDER: "s3",
            S3_BUCKET: "test-bucket",
            S3_REGION: "us-east-1",
        };

        jest.doMock("../../services/media/s3", () => ({
            isConfigured: jest.fn().mockReturnValue(true),
            getPlaybackUrl: jest.fn(),
            createUploadTarget: jest.fn(),
            verifyUpload: jest.fn().mockResolvedValue({ exists: true, contentLength: 1024, contentType: "audio/mpeg", etag: '"abc"' }),
        }));

        const { verifyUpload } = require("../../services/mediaProvider");
        const s3 = require("../../services/media/s3");

        const result = await verifyUpload({ key: "audio/abc/def.mp3" });

        expect(result).toEqual({ exists: true, contentLength: 1024, contentType: "audio/mpeg", etag: '"abc"' });
        expect(s3.verifyUpload).toHaveBeenCalledWith({ key: "audio/abc/def.mp3" });
    });

    it("fails clearly (never calls the provider's verifyUpload) when the s3 provider is not configured", async () => {
        jest.resetModules();
        process.env = { ...ORIGINAL_ENV, MEDIA_STORAGE_PROVIDER: "s3" };

        jest.doMock("../../services/media/s3", () => ({
            isConfigured: jest.fn().mockReturnValue(false),
            getPlaybackUrl: jest.fn(),
            createUploadTarget: jest.fn(),
            verifyUpload: jest.fn(),
        }));

        const { verifyUpload } = require("../../services/mediaProvider");
        const s3 = require("../../services/media/s3");

        await expect(verifyUpload({ key: "audio/abc/def.mp3" })).rejects.toThrow(
            /Media storage provider "s3" is not configured/
        );
        expect(s3.verifyUpload).not.toHaveBeenCalled();
    });

    it("fails clearly for a wholly unsupported provider value", async () => {
        jest.resetModules();
        process.env = { ...ORIGINAL_ENV, MEDIA_STORAGE_PROVIDER: "dropbox" };

        const { verifyUpload } = require("../../services/mediaProvider");

        await expect(verifyUpload({ key: "audio/abc/def.mp3" })).rejects.toThrow(
            /Unsupported media storage provider: "dropbox"/
        );
    });
});
