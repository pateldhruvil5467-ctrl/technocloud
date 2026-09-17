const validateMediaUploadIntentBody = require("../../middleware/validateMediaUploadIntentBody");

function runMiddleware(body) {
    const req = { body };
    const res = {};
    const next = jest.fn();
    validateMediaUploadIntentBody(req, res, next);
    return { req, next };
}

function validBody(overrides = {}) {
    return {
        filename: "track.mp3",
        mimeType: "audio/mpeg",
        sizeBytes: 4 * 1024 * 1024,
        ...overrides,
    };
}

describe("validateMediaUploadIntentBody", () => {
    it("accepts a well-formed request and normalizes it onto req.mediaUploadIntent", () => {
        const { req, next } = runMiddleware(validBody());

        expect(next).toHaveBeenCalledWith();
        expect(req.mediaUploadIntent).toEqual({
            filename: "track.mp3",
            mimeType: "audio/mpeg",
            sizeBytes: 4 * 1024 * 1024,
        });
    });

    it("accepts audio/mp3 as well as audio/mpeg", () => {
        const { next } = runMiddleware(validBody({ mimeType: "audio/mp3" }));
        expect(next).toHaveBeenCalledWith();
    });

    it("trims the filename", () => {
        const { req, next } = runMiddleware(validBody({ filename: "  track.mp3  " }));
        expect(next).toHaveBeenCalledWith();
        expect(req.mediaUploadIntent.filename).toBe("track.mp3");
    });

    it("rejects a non-object body", () => {
        const { next } = runMiddleware([1, 2, 3]);
        expect(next).toHaveBeenCalledWith(expect.objectContaining({ statusCode: 400, code: "VALIDATION_ERROR" }));
    });

    it("rejects a null body", () => {
        const { next } = runMiddleware(null);
        expect(next).toHaveBeenCalledWith(expect.objectContaining({ statusCode: 400 }));
    });

    it("rejects a missing filename", () => {
        const { next } = runMiddleware(validBody({ filename: undefined }));
        expect(next).toHaveBeenCalledWith(expect.objectContaining({ statusCode: 400, code: "VALIDATION_ERROR" }));
    });

    it("rejects an empty-string filename", () => {
        const { next } = runMiddleware(validBody({ filename: "" }));
        expect(next).toHaveBeenCalledWith(expect.objectContaining({ statusCode: 400 }));
    });

    it("rejects a whitespace-only filename", () => {
        const { next } = runMiddleware(validBody({ filename: "   " }));
        expect(next).toHaveBeenCalledWith(expect.objectContaining({ statusCode: 400 }));
    });

    it("rejects a filename over 255 characters", () => {
        const { next } = runMiddleware(validBody({ filename: `${"a".repeat(252)}.mp3` }));
        expect(next).toHaveBeenCalledWith(expect.objectContaining({ statusCode: 400 }));
    });

    it("accepts a filename at exactly 255 characters", () => {
        const { next } = runMiddleware(validBody({ filename: `${"a".repeat(251)}.mp3` }));
        expect(next).toHaveBeenCalledWith();
    });

    it("rejects a missing mimeType", () => {
        const { next } = runMiddleware(validBody({ mimeType: undefined }));
        expect(next).toHaveBeenCalledWith(expect.objectContaining({ statusCode: 400 }));
    });

    it("rejects an unsupported mimeType", () => {
        const { next } = runMiddleware(validBody({ mimeType: "video/mp4" }));
        expect(next).toHaveBeenCalledWith(expect.objectContaining({ statusCode: 400 }));
    });

    it("rejects a non-MP3 audio mimeType", () => {
        const { next } = runMiddleware(validBody({ mimeType: "audio/wav" }));
        expect(next).toHaveBeenCalledWith(expect.objectContaining({ statusCode: 400 }));
    });

    it("does not trust the filename extension as proof of MIME type", () => {
        const { next } = runMiddleware(validBody({ filename: "definitely-audio.mp3", mimeType: "application/octet-stream" }));
        expect(next).toHaveBeenCalledWith(expect.objectContaining({ statusCode: 400 }));
    });

    it("rejects a missing sizeBytes", () => {
        const { next } = runMiddleware(validBody({ sizeBytes: undefined }));
        expect(next).toHaveBeenCalledWith(expect.objectContaining({ statusCode: 400 }));
    });

    it("rejects a zero sizeBytes", () => {
        const { next } = runMiddleware(validBody({ sizeBytes: 0 }));
        expect(next).toHaveBeenCalledWith(expect.objectContaining({ statusCode: 400 }));
    });

    it("rejects a negative sizeBytes", () => {
        const { next } = runMiddleware(validBody({ sizeBytes: -1 }));
        expect(next).toHaveBeenCalledWith(expect.objectContaining({ statusCode: 400 }));
    });

    it("rejects a non-integer sizeBytes", () => {
        const { next } = runMiddleware(validBody({ sizeBytes: 123.45 }));
        expect(next).toHaveBeenCalledWith(expect.objectContaining({ statusCode: 400 }));
    });

    it("rejects a non-numeric sizeBytes", () => {
        const { next } = runMiddleware(validBody({ sizeBytes: "4096" }));
        expect(next).toHaveBeenCalledWith(expect.objectContaining({ statusCode: 400 }));
    });

    it("rejects a sizeBytes over the 20MB limit", () => {
        const { next } = runMiddleware(validBody({ sizeBytes: 21 * 1024 * 1024 }));
        expect(next).toHaveBeenCalledWith(expect.objectContaining({ statusCode: 400 }));
    });

    it("accepts a sizeBytes exactly at the 20MB limit", () => {
        const { next } = runMiddleware(validBody({ sizeBytes: 20 * 1024 * 1024 }));
        expect(next).toHaveBeenCalledWith();
    });

    it("never forwards client-supplied ownership/path fields onto req.mediaUploadIntent", () => {
        const { req, next } = runMiddleware(
            validBody({
                artistProfileId: "000000000000000000000000",
                userId: "000000000000000000000000",
                owner: "attacker",
                provider: "s3",
                key: "audio/attacker/evil.mp3",
                bucket: "attacker-bucket",
            })
        );

        expect(next).toHaveBeenCalledWith();
        expect(req.mediaUploadIntent).toEqual({
            filename: "track.mp3",
            mimeType: "audio/mpeg",
            sizeBytes: 4 * 1024 * 1024,
        });
    });
});
