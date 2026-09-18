import axios from "axios";

import {
    createUploadIntent,
    getServerMediaProvider,
    isMediaProviderUnavailable,
    uploadToPresignedUrl,
} from "./mediaApi";
import { API_BASE_URL } from "./api";

jest.mock("axios");

afterEach(() => {
    jest.resetAllMocks();
    sessionStorage.clear();
});

describe("mediaApi.createUploadIntent", () => {
    it("posts to the correct endpoint with exactly filename/mimeType/sizeBytes, and an Authorization header", async () => {
        sessionStorage.setItem("token", "test-token");
        axios.post.mockResolvedValue({
            data: { data: { uploadId: "u1", key: "audio/a1/u1.mp3", uploadUrl: "https://x", expiresAt: "2026-01-01T00:00:00.000Z" } },
        });

        const result = await createUploadIntent({ filename: "a.mp3", mimeType: "audio/mpeg", sizeBytes: 123 });

        expect(axios.post).toHaveBeenCalledWith(
            `${API_BASE_URL}/api/v1/media/upload-intent`,
            { filename: "a.mp3", mimeType: "audio/mpeg", sizeBytes: 123 },
            expect.objectContaining({ headers: { Authorization: "test-token" } })
        );
        expect(result).toEqual({
            uploadId: "u1",
            key: "audio/a1/u1.mp3",
            uploadUrl: "https://x",
            expiresAt: "2026-01-01T00:00:00.000Z",
        });
    });

    it("forwards an AbortController signal when provided", async () => {
        axios.post.mockResolvedValue({ data: { data: {} } });
        const controller = new AbortController();

        await createUploadIntent({ filename: "a.mp3", mimeType: "audio/mpeg", sizeBytes: 1 }, { signal: controller.signal });

        const [, , config] = axios.post.mock.calls[0];
        expect(config.signal).toBe(controller.signal);
    });

    it("propagates a rejection from axios rather than swallowing it", async () => {
        axios.post.mockRejectedValue({ response: { status: 400 } });
        await expect(createUploadIntent({ filename: "a.mp3", mimeType: "audio/mpeg", sizeBytes: 1 })).rejects.toMatchObject({
            response: { status: 400 },
        });
    });
});

describe("mediaApi.isMediaProviderUnavailable", () => {
    it("is true for exactly a 503 with code MEDIA_PROVIDER_UNAVAILABLE", () => {
        expect(
            isMediaProviderUnavailable({ response: { status: 503, data: { error: { code: "MEDIA_PROVIDER_UNAVAILABLE" } } } })
        ).toBe(true);
    });

    it("is false for a different error code at 503", () => {
        expect(
            isMediaProviderUnavailable({ response: { status: 503, data: { error: { code: "SOME_OTHER_ERROR" } } } })
        ).toBe(false);
    });

    it("is false for a 400/401/403", () => {
        expect(isMediaProviderUnavailable({ response: { status: 400, data: { error: { code: "VALIDATION_ERROR" } } } })).toBe(false);
        expect(isMediaProviderUnavailable({ response: { status: 401, data: { message: "No token provided" } } })).toBe(false);
        expect(isMediaProviderUnavailable({ response: { status: 403, data: { message: "Forbidden" } } })).toBe(false);
    });

    it("is false for a malformed/missing error shape", () => {
        expect(isMediaProviderUnavailable(new Error("network"))).toBe(false);
        expect(isMediaProviderUnavailable(undefined)).toBe(false);
        expect(isMediaProviderUnavailable({})).toBe(false);
    });
});

describe("mediaApi.getServerMediaProvider", () => {
    it("reads mediaProvider off GET /api/v1/health", async () => {
        axios.get.mockResolvedValue({ data: { status: "ok", database: "connected", mediaProvider: "s3" } });

        const provider = await getServerMediaProvider();

        expect(axios.get).toHaveBeenCalledWith(`${API_BASE_URL}/api/v1/health`);
        expect(provider).toBe("s3");
    });
});

describe("mediaApi.uploadToPresignedUrl", () => {
    let originalFetch;

    beforeEach(() => {
        originalFetch = global.fetch;
        global.fetch = jest.fn();
    });

    afterEach(() => {
        global.fetch = originalFetch;
    });

    it("PUTs to the exact uploadUrl with only a Content-Type header, the file as the body, and no Authorization header", async () => {
        global.fetch.mockResolvedValue({ ok: true, status: 200 });
        const file = new File([new ArrayBuffer(10)], "a.mp3", { type: "audio/mpeg" });

        await uploadToPresignedUrl("https://bucket.s3.amazonaws.com/key?X-Amz-Signature=abc", file, "audio/mpeg");

        expect(global.fetch).toHaveBeenCalledWith(
            "https://bucket.s3.amazonaws.com/key?X-Amz-Signature=abc",
            expect.objectContaining({ method: "PUT", headers: { "Content-Type": "audio/mpeg" }, body: file })
        );

        const [, options] = global.fetch.mock.calls[0];
        expect(Object.keys(options.headers)).toEqual(["Content-Type"]);
        expect(options.headers).not.toHaveProperty("Authorization");
        expect(options.credentials).toBeUndefined();
    });

    it("forwards an AbortController signal to fetch", async () => {
        global.fetch.mockResolvedValue({ ok: true });
        const file = new File([new ArrayBuffer(10)], "a.mp3", { type: "audio/mpeg" });
        const controller = new AbortController();

        await uploadToPresignedUrl("https://x", file, "audio/mpeg", { signal: controller.signal });

        const [, options] = global.fetch.mock.calls[0];
        expect(options.signal).toBe(controller.signal);
    });

    it("throws a normalized S3UploadError on a non-2xx response, never reading the response body", async () => {
        const text = jest.fn();
        global.fetch.mockResolvedValue({ ok: false, status: 403, text });
        const file = new File([new ArrayBuffer(10)], "a.mp3", { type: "audio/mpeg" });

        await expect(uploadToPresignedUrl("https://x", file, "audio/mpeg")).rejects.toMatchObject({
            name: "S3UploadError",
            status: 403,
        });
        expect(text).not.toHaveBeenCalled();
    });

    it("throws a normalized S3UploadError on a network failure", async () => {
        global.fetch.mockRejectedValue(new TypeError("Failed to fetch"));
        const file = new File([new ArrayBuffer(10)], "a.mp3", { type: "audio/mpeg" });

        await expect(uploadToPresignedUrl("https://x", file, "audio/mpeg")).rejects.toMatchObject({
            name: "S3UploadError",
        });
    });

    it("re-throws an AbortError as-is, not wrapped as S3UploadError", async () => {
        const abortError = new DOMException("aborted", "AbortError");
        global.fetch.mockRejectedValue(abortError);
        const file = new File([new ArrayBuffer(10)], "a.mp3", { type: "audio/mpeg" });

        await expect(uploadToPresignedUrl("https://x", file, "audio/mpeg")).rejects.toBe(abortError);
    });
});
