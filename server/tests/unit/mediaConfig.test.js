// V5.2-B1 — config/env.js's media-storage fields. config/env.js reads
// process.env and freezes the result once, at require time, so exercising
// it against different env combinations requires jest.resetModules() +
// a fresh require() per scenario — MONGO_URI/JWT_SECRET are left exactly
// as tests/setup/globalSetup.js already sets them (never unset), since
// config/env.js exits the process if either is missing.

const ORIGINAL_ENV = { ...process.env };

afterEach(() => {
    process.env = { ...ORIGINAL_ENV };
    jest.resetModules();
});

function loadConfig(overrides = {}) {
    jest.resetModules();
    process.env = { ...ORIGINAL_ENV, ...overrides };
    return require("../../config/env");
}

describe("config/env.js — media storage", () => {
    it("defaults mediaStorageProvider to 'local' when unset", () => {
        const config = loadConfig({ MEDIA_STORAGE_PROVIDER: undefined });
        expect(config.mediaStorageProvider).toBe("local");
    });

    it("the local provider works with no S3 configuration present at all", () => {
        const config = loadConfig({
            MEDIA_STORAGE_PROVIDER: undefined,
            S3_BUCKET: undefined,
            S3_REGION: undefined,
            CLOUDFRONT_DOMAIN: undefined,
        });

        expect(config.mediaStorageProvider).toBe("local");
        expect(config.s3Bucket).toBeNull();
        expect(config.s3Region).toBeNull();
        expect(config.cloudfrontDomain).toBeNull();
    });

    it("recognizes an explicit MEDIA_STORAGE_PROVIDER=s3 and the accompanying S3 configuration", () => {
        const config = loadConfig({
            MEDIA_STORAGE_PROVIDER: "s3",
            S3_BUCKET: "technocloud-media-test",
            S3_REGION: "us-east-1",
            CLOUDFRONT_DOMAIN: "d123456.cloudfront.net",
        });

        expect(config.mediaStorageProvider).toBe("s3");
        expect(config.s3Bucket).toBe("technocloud-media-test");
        expect(config.s3Region).toBe("us-east-1");
        expect(config.cloudfrontDomain).toBe("d123456.cloudfront.net");
    });

    it("does not crash the app at startup when MEDIA_STORAGE_PROVIDER=s3 but S3 config is missing — handled by the provider's own isConfigured() gate, not a hard failure here", () => {
        let config;
        expect(() => {
            config = loadConfig({
                MEDIA_STORAGE_PROVIDER: "s3",
                S3_BUCKET: undefined,
                S3_REGION: undefined,
                CLOUDFRONT_DOMAIN: undefined,
            });
        }).not.toThrow();

        expect(config.mediaStorageProvider).toBe("s3");
        expect(config.s3Bucket).toBeNull();

        // The real gate is services/media/s3.js's isConfigured() — load
        // it fresh against this same env so it reads the just-loaded
        // config, not a previously-cached one.
        jest.resetModules();
        process.env = { ...ORIGINAL_ENV, MEDIA_STORAGE_PROVIDER: "s3" };
        const s3 = require("../../services/media/s3");
        expect(s3.isConfigured()).toBe(false);
    });

    it("V5.2-B2: the s3 provider is configured for presigning with only S3_BUCKET/S3_REGION — CLOUDFRONT_DOMAIN is not required", () => {
        jest.resetModules();
        process.env = {
            ...ORIGINAL_ENV,
            MEDIA_STORAGE_PROVIDER: "s3",
            S3_BUCKET: "technocloud-media-test",
            S3_REGION: "us-east-1",
            CLOUDFRONT_DOMAIN: undefined,
        };

        const s3 = require("../../services/media/s3");
        expect(s3.isConfigured()).toBe(true);
    });

    it("V5.2-B2: getPlaybackUrl still requires CLOUDFRONT_DOMAIN specifically, even when isConfigured() is true", () => {
        jest.resetModules();
        process.env = {
            ...ORIGINAL_ENV,
            MEDIA_STORAGE_PROVIDER: "s3",
            S3_BUCKET: "technocloud-media-test",
            S3_REGION: "us-east-1",
            CLOUDFRONT_DOMAIN: undefined,
        };

        const s3 = require("../../services/media/s3");
        expect(s3.isConfigured()).toBe(true);
        expect(() => s3.getPlaybackUrl("audio/abc/def.mp3")).toThrow(/CLOUDFRONT_DOMAIN/);
    });

    it("defaults mediaPresignedUrlExpirySeconds to 300 when unset", () => {
        const config = loadConfig({ MEDIA_PRESIGNED_URL_EXPIRY_SECONDS: undefined });
        expect(config.mediaPresignedUrlExpirySeconds).toBe(300);
    });

    it("respects an overridden mediaPresignedUrlExpirySeconds", () => {
        const config = loadConfig({ MEDIA_PRESIGNED_URL_EXPIRY_SECONDS: "600" });
        expect(config.mediaPresignedUrlExpirySeconds).toBe(600);
    });

    it("V5.2-B2: defaults mediaUploadIntentRateLimitMax to 20 when unset", () => {
        const config = loadConfig({ MEDIA_UPLOAD_INTENT_RATE_LIMIT_MAX: undefined });
        expect(config.mediaUploadIntentRateLimitMax).toBe(20);
    });

    it("V5.2-B2: respects an overridden mediaUploadIntentRateLimitMax", () => {
        const config = loadConfig({ MEDIA_UPLOAD_INTENT_RATE_LIMIT_MAX: "5" });
        expect(config.mediaUploadIntentRateLimitMax).toBe(5);
    });

    it("never reads or exposes any AWS credential value — no such field exists on config at all", () => {
        const config = loadConfig({
            MEDIA_STORAGE_PROVIDER: "s3",
            S3_ACCESS_KEY_ID: "AKIA_SHOULD_NEVER_BE_READ",
            S3_SECRET_ACCESS_KEY: "shouldnevereberead",
        });

        expect(JSON.stringify(config)).not.toMatch(/AKIA_SHOULD_NEVER_BE_READ|shouldnevereberead/);
        expect(config.s3AccessKeyId).toBeUndefined();
        expect(config.s3SecretAccessKey).toBeUndefined();
    });
});
