jest.mock("@aws-sdk/client-s3");
jest.mock("@aws-sdk/s3-request-presigner");

const ORIGINAL_ENV = { ...process.env };

afterEach(() => {
    process.env = { ...ORIGINAL_ENV };
});

// jest.resetModules() clears the whole module registry, including
// automocked modules — a reference to an automocked export captured
// BEFORE resetModules() is a different mock instance than the one a
// freshly-required module (like services/media/s3, which itself
// requires @aws-sdk/client-s3) will actually call internally. Every
// mock reference this file needs is therefore re-required together with
// the provider, right after resetModules(), so they're always the exact
// instances s3.js uses.
//
// This whole file's premise is the proof that createUploadTarget never
// makes a real AWS request: both AWS packages are jest.mock()'d above,
// so nothing here can reach the real network layer regardless of what
// any individual test asserts.
function loadS3Provider(envOverrides = {}) {
    jest.resetModules();
    process.env = { ...ORIGINAL_ENV, ...envOverrides };

    const { S3Client, PutObjectCommand } = require("@aws-sdk/client-s3");
    const { getSignedUrl } = require("@aws-sdk/s3-request-presigner");
    const s3 = require("../../services/media/s3");

    return { s3, S3Client, PutObjectCommand, getSignedUrl };
}

describe("services/media/s3.createUploadTarget", () => {
    it("throws safely when not configured, without calling getSignedUrl", async () => {
        const { s3, getSignedUrl } = loadS3Provider({
            MEDIA_STORAGE_PROVIDER: "s3",
            S3_BUCKET: undefined,
            S3_REGION: undefined,
        });

        await expect(
            s3.createUploadTarget({ key: "audio/abc/def.mp3", mimeType: "audio/mpeg", sizeBytes: 1024 })
        ).rejects.toThrow(/not configured/);

        expect(getSignedUrl).not.toHaveBeenCalled();
    });

    it("works with only S3_BUCKET and S3_REGION — CLOUDFRONT_DOMAIN is not required for presigning", async () => {
        const { s3, getSignedUrl } = loadS3Provider({
            MEDIA_STORAGE_PROVIDER: "s3",
            S3_BUCKET: "test-bucket",
            S3_REGION: "us-east-1",
            CLOUDFRONT_DOMAIN: undefined,
        });
        getSignedUrl.mockResolvedValue("https://test-bucket.s3.amazonaws.com/audio/abc/def.mp3?X-Amz-Signature=mock");

        await expect(
            s3.createUploadTarget({ key: "audio/abc/def.mp3", mimeType: "audio/mpeg", sizeBytes: 1024 })
        ).resolves.toBeDefined();
    });

    it("constructs a PutObjectCommand with exactly the configured bucket, the given key, and the given Content-Type", async () => {
        const { s3, getSignedUrl, PutObjectCommand } = loadS3Provider({
            MEDIA_STORAGE_PROVIDER: "s3",
            S3_BUCKET: "test-bucket",
            S3_REGION: "us-east-1",
        });
        getSignedUrl.mockResolvedValue("https://signed-url.example");

        await s3.createUploadTarget({ key: "audio/abc/def.mp3", mimeType: "audio/mpeg", sizeBytes: 1024 });

        expect(PutObjectCommand).toHaveBeenCalledWith({
            Bucket: "test-bucket",
            Key: "audio/abc/def.mp3",
            ContentType: "audio/mpeg",
        });
    });

    it("presigns via getSignedUrl using the configured expiry, and returns it alongside expiresIn", async () => {
        const { s3, getSignedUrl, S3Client, PutObjectCommand } = loadS3Provider({
            MEDIA_STORAGE_PROVIDER: "s3",
            S3_BUCKET: "test-bucket",
            S3_REGION: "us-east-1",
            MEDIA_PRESIGNED_URL_EXPIRY_SECONDS: "120",
        });
        getSignedUrl.mockResolvedValue("https://signed-url.example");

        const result = await s3.createUploadTarget({ key: "audio/abc/def.mp3", mimeType: "audio/mpeg", sizeBytes: 1024 });

        expect(getSignedUrl).toHaveBeenCalledWith(expect.any(S3Client), expect.any(PutObjectCommand), {
            expiresIn: 120,
        });
        expect(result).toEqual({ uploadUrl: "https://signed-url.example", expiresIn: 120 });
    });

    it("defaults the expiry to 300 seconds when unset", async () => {
        const { s3, getSignedUrl } = loadS3Provider({
            MEDIA_STORAGE_PROVIDER: "s3",
            S3_BUCKET: "test-bucket",
            S3_REGION: "us-east-1",
            MEDIA_PRESIGNED_URL_EXPIRY_SECONDS: undefined,
        });
        getSignedUrl.mockResolvedValue("https://signed-url.example");

        const result = await s3.createUploadTarget({ key: "audio/abc/def.mp3", mimeType: "audio/mpeg", sizeBytes: 1024 });

        expect(result.expiresIn).toBe(300);
    });

    it("constructs the S3 client with only the configured region — no explicit credentials object", async () => {
        const { s3, getSignedUrl, S3Client } = loadS3Provider({
            MEDIA_STORAGE_PROVIDER: "s3",
            S3_BUCKET: "test-bucket",
            S3_REGION: "eu-west-1",
        });
        getSignedUrl.mockResolvedValue("https://signed-url.example");

        await s3.createUploadTarget({ key: "audio/abc/def.mp3", mimeType: "audio/mpeg", sizeBytes: 1024 });

        expect(S3Client).toHaveBeenCalledWith({ region: "eu-west-1" });
    });

    it("never includes credential-shaped values in its result", async () => {
        const { s3, getSignedUrl } = loadS3Provider({
            MEDIA_STORAGE_PROVIDER: "s3",
            S3_BUCKET: "test-bucket",
            S3_REGION: "us-east-1",
        });
        getSignedUrl.mockResolvedValue("https://signed-url.example/audio/abc/def.mp3?X-Amz-Signature=abc123");

        const result = await s3.createUploadTarget({ key: "audio/abc/def.mp3", mimeType: "audio/mpeg", sizeBytes: 1024 });

        expect(JSON.stringify(result)).not.toMatch(/AKIA|aws_secret|secretAccessKey|SessionToken/i);
    });

    it("propagates a presigner failure as a real rejection (the controller layer is what converts this to a safe API error)", async () => {
        const { s3, getSignedUrl } = loadS3Provider({
            MEDIA_STORAGE_PROVIDER: "s3",
            S3_BUCKET: "test-bucket",
            S3_REGION: "us-east-1",
        });
        getSignedUrl.mockRejectedValue(new Error("AccessDenied: simulated presigner failure"));

        await expect(
            s3.createUploadTarget({ key: "audio/abc/def.mp3", mimeType: "audio/mpeg", sizeBytes: 1024 })
        ).rejects.toThrow("AccessDenied: simulated presigner failure");
    });
});
