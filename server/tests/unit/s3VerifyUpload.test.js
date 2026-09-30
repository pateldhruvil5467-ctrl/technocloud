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
// instances s3.js uses — same pattern as tests/unit/s3CreateUploadTarget.test.js.
//
// This whole file's premise is the proof that verifyUpload never makes a
// real AWS request: both AWS packages are jest.mock()'d above, so
// nothing here can reach the real network layer regardless of what any
// individual test asserts.
function loadS3Provider(envOverrides = {}) {
    jest.resetModules();
    process.env = { ...ORIGINAL_ENV, ...envOverrides };

    const { S3Client, HeadObjectCommand } = require("@aws-sdk/client-s3");
    const s3 = require("../../services/media/s3");

    return { s3, S3Client, HeadObjectCommand };
}

const CONFIGURED_ENV = { MEDIA_STORAGE_PROVIDER: "s3", S3_BUCKET: "test-bucket", S3_REGION: "us-east-1" };

describe("services/media/s3.verifyUpload", () => {
    it("throws safely when not configured, without constructing a HeadObjectCommand", async () => {
        const { s3, HeadObjectCommand } = loadS3Provider({
            MEDIA_STORAGE_PROVIDER: "s3",
            S3_BUCKET: undefined,
            S3_REGION: undefined,
        });

        await expect(s3.verifyUpload({ key: "audio/abc/def.mp3" })).rejects.toThrow(/not configured/);
        expect(HeadObjectCommand).not.toHaveBeenCalled();
    });

    it("constructs a HeadObjectCommand with exactly the configured bucket and the given key", async () => {
        const { s3, S3Client, HeadObjectCommand } = loadS3Provider(CONFIGURED_ENV);
        const send = jest.fn().mockResolvedValue({ ContentLength: 1024, ContentType: "audio/mpeg", ETag: '"abc123"' });
        S3Client.mockImplementation(() => ({ send }));

        await s3.verifyUpload({ key: "audio/artist123/uuid.mp3" });

        expect(HeadObjectCommand).toHaveBeenCalledWith({ Bucket: "test-bucket", Key: "audio/artist123/uuid.mp3" });
    });

    it("returns exists:true with contentLength/contentType/etag on success", async () => {
        const { s3, S3Client } = loadS3Provider(CONFIGURED_ENV);
        const send = jest.fn().mockResolvedValue({ ContentLength: 4096, ContentType: "audio/mpeg", ETag: '"deadbeef"' });
        S3Client.mockImplementation(() => ({ send }));

        const result = await s3.verifyUpload({ key: "audio/artist123/uuid.mp3" });

        expect(result).toEqual({ exists: true, contentLength: 4096, contentType: "audio/mpeg", etag: '"deadbeef"' });
    });

    it("returns exists:false for a NotFound error, without rethrowing", async () => {
        const { s3, S3Client } = loadS3Provider(CONFIGURED_ENV);
        const notFound = Object.assign(new Error("NotFound"), { name: "NotFound" });
        const send = jest.fn().mockRejectedValue(notFound);
        S3Client.mockImplementation(() => ({ send }));

        const result = await s3.verifyUpload({ key: "audio/artist123/missing.mp3" });

        expect(result).toEqual({ exists: false });
    });

    it("rethrows an unexpected error (e.g. AccessDenied) rather than treating it as missing", async () => {
        const { s3, S3Client } = loadS3Provider(CONFIGURED_ENV);
        const accessDenied = Object.assign(new Error("Access Denied"), { name: "AccessDenied" });
        const send = jest.fn().mockRejectedValue(accessDenied);
        S3Client.mockImplementation(() => ({ send }));

        await expect(s3.verifyUpload({ key: "audio/artist123/uuid.mp3" })).rejects.toThrow("Access Denied");
    });

    it("never includes credential-shaped values in its result", async () => {
        const { s3, S3Client } = loadS3Provider(CONFIGURED_ENV);
        const send = jest.fn().mockResolvedValue({ ContentLength: 1024, ContentType: "audio/mpeg", ETag: '"abc"' });
        S3Client.mockImplementation(() => ({ send }));

        const result = await s3.verifyUpload({ key: "audio/artist123/uuid.mp3" });

        expect(JSON.stringify(result)).not.toMatch(/AKIA|aws_secret|secretAccessKey|SessionToken/i);
    });
});
