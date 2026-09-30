const mongoose = require("mongoose");

const validateMediaCompleteBody = require("../../middleware/validateMediaCompleteBody");

function runMiddleware(body) {
    const req = { body };
    const res = {};
    const next = jest.fn();
    validateMediaCompleteBody(req, res, next);
    return { req, next };
}

const VALID_UPLOAD_ID = new mongoose.Types.ObjectId().toString();

function validBody(overrides = {}) {
    return {
        uploadId: VALID_UPLOAD_ID,
        title: "My Track",
        artist: "My Artist",
        ...overrides,
    };
}

describe("validateMediaCompleteBody", () => {
    it("accepts a well-formed request and normalizes it onto req.mediaComplete", () => {
        const { req, next } = runMiddleware(validBody());

        expect(next).toHaveBeenCalledWith();
        expect(req.mediaComplete).toEqual({
            uploadId: VALID_UPLOAD_ID,
            title: "My Track",
            artist: "My Artist",
        });
    });

    it("rejects a non-object body", () => {
        const { next } = runMiddleware([1, 2, 3]);
        expect(next).toHaveBeenCalledWith(expect.objectContaining({ statusCode: 400, code: "VALIDATION_ERROR" }));
    });

    it("rejects a null body", () => {
        const { next } = runMiddleware(null);
        expect(next).toHaveBeenCalledWith(expect.objectContaining({ statusCode: 400 }));
    });

    describe("uploadId", () => {
        it("rejects a missing uploadId", () => {
            const { next } = runMiddleware(validBody({ uploadId: undefined }));
            expect(next).toHaveBeenCalledWith(expect.objectContaining({ statusCode: 400, code: "VALIDATION_ERROR" }));
        });

        it("rejects a malformed uploadId (not a valid ObjectId)", () => {
            const { next } = runMiddleware(validBody({ uploadId: "not-a-valid-id" }));
            expect(next).toHaveBeenCalledWith(expect.objectContaining({ statusCode: 400, code: "VALIDATION_ERROR" }));
        });

        it("rejects a non-string uploadId", () => {
            const { next } = runMiddleware(validBody({ uploadId: 12345 }));
            expect(next).toHaveBeenCalledWith(expect.objectContaining({ statusCode: 400 }));
        });
    });

    describe("title", () => {
        it("rejects a missing title", () => {
            const { next } = runMiddleware(validBody({ title: undefined }));
            expect(next).toHaveBeenCalledWith(expect.objectContaining({ statusCode: 400 }));
        });

        it("rejects an empty title", () => {
            const { next } = runMiddleware(validBody({ title: "" }));
            expect(next).toHaveBeenCalledWith(expect.objectContaining({ statusCode: 400 }));
        });

        it("rejects a whitespace-only title", () => {
            const { next } = runMiddleware(validBody({ title: "   " }));
            expect(next).toHaveBeenCalledWith(expect.objectContaining({ statusCode: 400 }));
        });

        it("rejects a title over 200 characters", () => {
            const { next } = runMiddleware(validBody({ title: "a".repeat(201) }));
            expect(next).toHaveBeenCalledWith(expect.objectContaining({ statusCode: 400 }));
        });

        it("accepts a title at exactly 200 characters", () => {
            const { next } = runMiddleware(validBody({ title: "a".repeat(200) }));
            expect(next).toHaveBeenCalledWith();
        });
    });

    describe("artist", () => {
        it("rejects a missing artist", () => {
            const { next } = runMiddleware(validBody({ artist: undefined }));
            expect(next).toHaveBeenCalledWith(expect.objectContaining({ statusCode: 400 }));
        });

        it("rejects an empty artist", () => {
            const { next } = runMiddleware(validBody({ artist: "" }));
            expect(next).toHaveBeenCalledWith(expect.objectContaining({ statusCode: 400 }));
        });

        it("rejects an artist over 200 characters", () => {
            const { next } = runMiddleware(validBody({ artist: "a".repeat(201) }));
            expect(next).toHaveBeenCalledWith(expect.objectContaining({ statusCode: 400 }));
        });
    });

    it("never forwards unexpected/ownership-shaped fields onto req.mediaComplete", () => {
        const { req, next } = runMiddleware(
            validBody({
                provider: "s3",
                key: "audio/attacker/evil.mp3",
                bucket: "attacker-bucket",
                artistProfileId: "000000000000000000000000",
                userId: "000000000000000000000000",
                owner: "attacker",
                mimeType: "audio/mpeg",
                sizeBytes: 999999,
            })
        );

        expect(next).toHaveBeenCalledWith();
        expect(req.mediaComplete).toEqual({
            uploadId: VALID_UPLOAD_ID,
            title: "My Track",
            artist: "My Artist",
        });
    });
});
