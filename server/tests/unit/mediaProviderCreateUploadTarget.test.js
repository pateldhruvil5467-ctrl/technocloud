// Separate from tests/unit/mediaProvider.test.js's getPlaybackUrl/
// getProvider coverage: createUploadTarget dispatches based on
// config.mediaStorageProvider (not an explicit argument), so exercising
// it against different providers requires the same jest.resetModules() +
// fresh-require pattern tests/unit/mediaConfig.test.js already
// establishes for config/env.js itself.

const ORIGINAL_ENV = { ...process.env };

afterEach(() => {
    process.env = { ...ORIGINAL_ENV };
    jest.resetModules();
});

describe("mediaProvider.createUploadTarget", () => {
    it("fails clearly when the configured provider is 'local' (no createUploadTarget support — local uploads use the existing multer route instead)", async () => {
        jest.resetModules();
        process.env = { ...ORIGINAL_ENV, MEDIA_STORAGE_PROVIDER: "local" };

        const { createUploadTarget } = require("../../services/mediaProvider");

        await expect(
            createUploadTarget({ key: "audio/abc/def.mp3", mimeType: "audio/mpeg", sizeBytes: 1024 })
        ).rejects.toThrow(/does not support creating an upload target/);
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
            createUploadTarget: jest
                .fn()
                .mockResolvedValue({ uploadUrl: "https://test-bucket.s3.amazonaws.com/audio/abc/def.mp3?X-Amz-Signature=mock", expiresIn: 300 }),
        }));

        const { createUploadTarget } = require("../../services/mediaProvider");
        const s3 = require("../../services/media/s3");

        const result = await createUploadTarget({ key: "audio/abc/def.mp3", mimeType: "audio/mpeg", sizeBytes: 1024 });

        expect(result.uploadUrl).toContain("X-Amz-Signature");
        expect(s3.createUploadTarget).toHaveBeenCalledWith({
            key: "audio/abc/def.mp3",
            mimeType: "audio/mpeg",
            sizeBytes: 1024,
        });
    });

    it("fails clearly (never calls the provider's createUploadTarget) when the s3 provider is not configured", async () => {
        jest.resetModules();
        process.env = { ...ORIGINAL_ENV, MEDIA_STORAGE_PROVIDER: "s3" };

        jest.doMock("../../services/media/s3", () => ({
            isConfigured: jest.fn().mockReturnValue(false),
            getPlaybackUrl: jest.fn(),
            createUploadTarget: jest.fn(),
        }));

        const { createUploadTarget } = require("../../services/mediaProvider");
        const s3 = require("../../services/media/s3");

        await expect(
            createUploadTarget({ key: "audio/abc/def.mp3", mimeType: "audio/mpeg", sizeBytes: 1024 })
        ).rejects.toThrow(/Media storage provider "s3" is not configured/);
        expect(s3.createUploadTarget).not.toHaveBeenCalled();
    });

    it("fails clearly for a wholly unsupported provider value", async () => {
        jest.resetModules();
        process.env = { ...ORIGINAL_ENV, MEDIA_STORAGE_PROVIDER: "dropbox" };

        const { createUploadTarget } = require("../../services/mediaProvider");

        await expect(
            createUploadTarget({ key: "audio/abc/def.mp3", mimeType: "audio/mpeg", sizeBytes: 1024 })
        ).rejects.toThrow(/Unsupported media storage provider: "dropbox"/);
    });
});
