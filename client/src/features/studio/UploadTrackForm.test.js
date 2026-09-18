import React from "react";
import { render, screen, waitFor } from "@testing-library/react";
import userEvent from "@testing-library/user-event";

import UploadTrackForm from "./UploadTrackForm";
import { uploadTrack } from "../../services/tracksApi";
import { createUploadIntent, getServerMediaProvider, uploadToPresignedUrl } from "../../services/mediaApi";

jest.mock("../../services/tracksApi");
jest.mock("../../services/mediaApi", () => ({
    ...jest.requireActual("../../services/mediaApi"),
    getServerMediaProvider: jest.fn(),
    createUploadIntent: jest.fn(),
    uploadToPresignedUrl: jest.fn(),
}));

function makeFile({ name = "track.mp3", type = "audio/mpeg", size = 1024 } = {}) {
    return new File([new ArrayBuffer(size)], name, { type });
}

// Always waits for the mount-time GET /api/v1/health check (see
// UploadTrackForm.js's own top comment) to resolve before returning —
// every test needs this settled before it can meaningfully interact
// with the form, and waiting here (rather than per-test) keeps that one
// assertion from being repeated everywhere while also avoiding
// act()-outside-of-test-boundary warnings from that effect resolving
// asynchronously, unobserved, after a test has already moved on.
async function renderForm(props) {
    const utils = render(<UploadTrackForm onUploaded={jest.fn()} onCancel={jest.fn()} {...props} />);
    await waitFor(() => expect(getServerMediaProvider).toHaveBeenCalledTimes(1));
    return utils;
}

async function fillTitleArtist() {
    await userEvent.type(screen.getByLabelText(/^title$/i), "My Track");
    await userEvent.type(screen.getByLabelText(/^artist$/i), "My Artist");
}

async function selectFile(file) {
    const input = document.getElementById("studio-upload-file");
    await userEvent.upload(input, file);
}

function clickUpload() {
    return userEvent.click(screen.getByRole("button", { name: /^upload$/i }));
}

beforeEach(() => {
    jest.clearAllMocks();
});

describe("UploadTrackForm — local fallback (server reports MEDIA_STORAGE_PROVIDER=local)", () => {
    beforeEach(() => {
        getServerMediaProvider.mockResolvedValue("local");
    });

    it("uses the existing local multipart upload and never calls upload-intent", async () => {
        uploadTrack.mockResolvedValue({ track: { _id: "t1", title: "My Track" } });
        const onUploaded = jest.fn();

        await renderForm({ onUploaded });
        await fillTitleArtist();
        await selectFile(makeFile());
        await clickUpload();

        await waitFor(() => expect(uploadTrack).toHaveBeenCalledTimes(1));
        expect(createUploadIntent).not.toHaveBeenCalled();
        expect(uploadToPresignedUrl).not.toHaveBeenCalled();
        expect(onUploaded).toHaveBeenCalledWith({ _id: "t1", title: "My Track" });
    });

    it("sends title/artist/audio in the FormData, unchanged from before B3", async () => {
        uploadTrack.mockResolvedValue({ track: {} });

        await renderForm();
        await fillTitleArtist();
        await selectFile(makeFile());
        await clickUpload();

        await waitFor(() => expect(uploadTrack).toHaveBeenCalledTimes(1));
        const formData = uploadTrack.mock.calls[0][0];
        expect(formData.get("title")).toBe("My Track");
        expect(formData.get("artist")).toBe("My Artist");
        expect(formData.get("audio")).toBeInstanceOf(File);
    });
});

describe("UploadTrackForm — S3 flow (server reports MEDIA_STORAGE_PROVIDER=s3)", () => {
    beforeEach(() => {
        getServerMediaProvider.mockResolvedValue("s3");
    });

    it("requests an upload intent with the exact filename/mimeType/sizeBytes", async () => {
        createUploadIntent.mockResolvedValue({ uploadUrl: "https://s3.example/put" });
        uploadToPresignedUrl.mockResolvedValue({ ok: true });

        await renderForm();
        await fillTitleArtist();
        await selectFile(makeFile({ name: "track.mp3", type: "audio/mpeg", size: 4096 }));
        await clickUpload();

        await waitFor(() => expect(createUploadIntent).toHaveBeenCalledTimes(1));
        const [payload] = createUploadIntent.mock.calls[0];
        expect(payload).toEqual({ filename: "track.mp3", mimeType: "audio/mpeg", sizeBytes: 4096 });
    });

    it("never sends provider/key/bucket/artistProfileId/userId in the intent request", async () => {
        createUploadIntent.mockResolvedValue({ uploadUrl: "https://s3.example/put" });
        uploadToPresignedUrl.mockResolvedValue({ ok: true });

        await renderForm();
        await fillTitleArtist();
        await selectFile(makeFile());
        await clickUpload();

        await waitFor(() => expect(createUploadIntent).toHaveBeenCalledTimes(1));
        const [payload] = createUploadIntent.mock.calls[0];
        expect(Object.keys(payload).sort()).toEqual(["filename", "mimeType", "sizeBytes"]);
    });

    it("PUTs directly to the returned uploadUrl with the exact intent MIME as Content-Type and the File as the body", async () => {
        createUploadIntent.mockResolvedValue({ uploadUrl: "https://s3.example/put-here" });
        uploadToPresignedUrl.mockResolvedValue({ ok: true });
        const file = makeFile({ type: "audio/mpeg" });

        await renderForm();
        await fillTitleArtist();
        await selectFile(file);
        await clickUpload();

        await waitFor(() => expect(uploadToPresignedUrl).toHaveBeenCalledTimes(1));
        const [url, body, mimeType] = uploadToPresignedUrl.mock.calls[0];
        expect(url).toBe("https://s3.example/put-here");
        expect(body).toBe(file);
        expect(mimeType).toBe("audio/mpeg");
    });

    it("never uses the client's original audio/mp3 MIME to override what was already sent to the intent", async () => {
        createUploadIntent.mockResolvedValue({ uploadUrl: "https://s3.example/put" });
        uploadToPresignedUrl.mockResolvedValue({ ok: true });

        await renderForm();
        await fillTitleArtist();
        await selectFile(makeFile({ type: "audio/mp3" }));
        await clickUpload();

        await waitFor(() => expect(uploadToPresignedUrl).toHaveBeenCalledTimes(1));
        const [intentPayload] = createUploadIntent.mock.calls[0];
        const [, , putMimeType] = uploadToPresignedUrl.mock.calls[0];
        expect(putMimeType).toBe(intentPayload.mimeType);
        expect(putMimeType).toBe("audio/mp3");
    });

    it("does not call the local upload endpoint at all once the S3 PUT succeeds", async () => {
        createUploadIntent.mockResolvedValue({ key: "audio/artist123/uuid.mp3", uploadUrl: "https://s3.example/put" });
        uploadToPresignedUrl.mockResolvedValue({ ok: true });

        await renderForm();
        await fillTitleArtist();
        await selectFile(makeFile());
        await clickUpload();

        await waitFor(() => expect(uploadToPresignedUrl).toHaveBeenCalledTimes(1));
        expect(uploadTrack).not.toHaveBeenCalled();
    });

    it("shows the uploaded/waiting-for-processing state after a successful S3 PUT, and never calls Track creation", async () => {
        createUploadIntent.mockResolvedValue({ uploadUrl: "https://s3.example/put" });
        uploadToPresignedUrl.mockResolvedValue({ ok: true });
        const onUploaded = jest.fn();

        await renderForm({ onUploaded });
        await fillTitleArtist();
        await selectFile(makeFile());
        await clickUpload();

        expect(await screen.findByText(/queued for processing/i)).toBeInTheDocument();
        expect(onUploaded).not.toHaveBeenCalled();
        expect(uploadTrack).not.toHaveBeenCalled();
    });
});

describe("UploadTrackForm — client-side validation", () => {
    beforeEach(() => {
        getServerMediaProvider.mockResolvedValue("local");
    });

    it("disables Upload when no file is selected", async () => {
        await renderForm();
        await fillTitleArtist();
        expect(screen.getByRole("button", { name: /^upload$/i })).toBeDisabled();
    });

    it("rejects an unsupported MIME type", async () => {
        await renderForm();
        await fillTitleArtist();
        await selectFile(makeFile({ type: "audio/wav" }));

        expect(await screen.findByText(/only mp3/i)).toBeInTheDocument();
        expect(screen.getByRole("button", { name: /^upload$/i })).toBeDisabled();
    });

    it("rejects a zero-size file", async () => {
        await renderForm();
        await fillTitleArtist();
        await selectFile(makeFile({ size: 0 }));

        expect(await screen.findByText(/empty/i)).toBeInTheDocument();
        expect(screen.getByRole("button", { name: /^upload$/i })).toBeDisabled();
    });

    it("rejects a file over the 20MB limit", async () => {
        await renderForm();
        await fillTitleArtist();
        await selectFile(makeFile({ size: 21 * 1024 * 1024 }));

        expect(await screen.findByText(/exceeds the 20mb upload limit/i)).toBeInTheDocument();
        expect(screen.getByRole("button", { name: /^upload$/i })).toBeDisabled();
    });

    it("accepts a file exactly at the 20MB limit", async () => {
        await renderForm();
        await fillTitleArtist();
        await selectFile(makeFile({ size: 20 * 1024 * 1024 }));

        expect(screen.getByRole("button", { name: /^upload$/i })).not.toBeDisabled();
    });
});

describe("UploadTrackForm — error handling", () => {
    it("shows a safe message for a 400 intent validation failure, without falling back to local", async () => {
        getServerMediaProvider.mockResolvedValue("s3");
        createUploadIntent.mockRejectedValue({
            response: { status: 400, data: { error: { code: "VALIDATION_ERROR", message: "sizeBytes must be a positive integer." } } },
        });

        await renderForm();
        await fillTitleArtist();
        await selectFile(makeFile());
        await clickUpload();

        expect(await screen.findByText(/sizeBytes must be a positive integer/i)).toBeInTheDocument();
        expect(uploadTrack).not.toHaveBeenCalled();
    });

    it("shows a safe message for a 401 (legacy {message} shape), without falling back to local", async () => {
        getServerMediaProvider.mockResolvedValue("s3");
        createUploadIntent.mockRejectedValue({ response: { status: 401, data: { message: "No token provided" } } });

        await renderForm();
        await fillTitleArtist();
        await selectFile(makeFile());
        await clickUpload();

        expect(await screen.findByText(/no token provided/i)).toBeInTheDocument();
        expect(uploadTrack).not.toHaveBeenCalled();
    });

    it("shows a safe message for a 403 (legacy {message} shape), without falling back to local", async () => {
        getServerMediaProvider.mockResolvedValue("s3");
        createUploadIntent.mockRejectedValue({ response: { status: 403, data: { message: "Forbidden: insufficient role" } } });

        await renderForm();
        await fillTitleArtist();
        await selectFile(makeFile());
        await clickUpload();

        expect(await screen.findByText(/forbidden/i)).toBeInTheDocument();
        expect(uploadTrack).not.toHaveBeenCalled();
    });

    it("falls back to local upload on a 503 MEDIA_PROVIDER_UNAVAILABLE", async () => {
        getServerMediaProvider.mockResolvedValue("s3");
        createUploadIntent.mockRejectedValue({
            response: { status: 503, data: { error: { code: "MEDIA_PROVIDER_UNAVAILABLE", message: "Upload authorization is currently unavailable." } } },
        });
        uploadTrack.mockResolvedValue({ track: { _id: "t1" } });

        await renderForm();
        await fillTitleArtist();
        await selectFile(makeFile());
        await clickUpload();

        await waitFor(() => expect(uploadTrack).toHaveBeenCalledTimes(1));
    });

    it("does NOT fall back for a 503 carrying a different error code", async () => {
        getServerMediaProvider.mockResolvedValue("s3");
        createUploadIntent.mockRejectedValue({
            response: { status: 503, data: { error: { code: "SOME_OTHER_ERROR", message: "Something else went wrong." } } },
        });

        await renderForm();
        await fillTitleArtist();
        await selectFile(makeFile());
        await clickUpload();

        expect(await screen.findByText(/something else went wrong/i)).toBeInTheDocument();
        expect(uploadTrack).not.toHaveBeenCalled();
    });

    it("shows a safe generic message for an S3 403, never a raw AWS detail", async () => {
        getServerMediaProvider.mockResolvedValue("s3");
        createUploadIntent.mockResolvedValue({ uploadUrl: "https://s3.example/put" });
        const s3Error = Object.assign(new Error("S3 upload failed with status 403."), { name: "S3UploadError", status: 403 });
        uploadToPresignedUrl.mockRejectedValue(s3Error);

        await renderForm();
        await fillTitleArtist();
        await selectFile(makeFile());
        await clickUpload();

        expect(await screen.findByText(/upload to storage failed/i)).toBeInTheDocument();
    });

    it("shows the same safe generic message for an S3 500 or a network failure", async () => {
        getServerMediaProvider.mockResolvedValue("s3");
        createUploadIntent.mockResolvedValue({ uploadUrl: "https://s3.example/put" });
        const s3Error = Object.assign(new Error("S3 upload failed: network error."), { name: "S3UploadError" });
        uploadToPresignedUrl.mockRejectedValue(s3Error);

        await renderForm();
        await fillTitleArtist();
        await selectFile(makeFile());
        await clickUpload();

        expect(await screen.findByText(/upload to storage failed/i)).toBeInTheDocument();
    });
});

describe("UploadTrackForm — state and cancellation", () => {
    it("shows an 'Uploading…' state and disables the form while a request is in flight", async () => {
        getServerMediaProvider.mockResolvedValue("local");
        let resolveUpload;
        uploadTrack.mockImplementation(
            () =>
                new Promise((resolve) => {
                    resolveUpload = resolve;
                })
        );

        await renderForm();
        await fillTitleArtist();
        await selectFile(makeFile());
        await clickUpload();

        expect(screen.getByRole("button", { name: /uploading/i })).toBeDisabled();

        resolveUpload({ track: {} });
        await waitFor(() => expect(uploadTrack).toHaveBeenCalledTimes(1));
    });

    it("prevents a duplicate submission while one is already in flight", async () => {
        getServerMediaProvider.mockResolvedValue("local");
        let resolveUpload;
        uploadTrack.mockImplementation(
            () =>
                new Promise((resolve) => {
                    resolveUpload = resolve;
                })
        );

        await renderForm();
        await fillTitleArtist();
        await selectFile(makeFile());

        const button = screen.getByRole("button", { name: /uploading|^upload$/i });
        await userEvent.click(button);
        await userEvent.click(button); // disabled by now — a no-op

        resolveUpload({ track: {} });
        await waitFor(() => expect(uploadTrack).toHaveBeenCalledTimes(1));
    });

    it("aborts an in-progress S3 PUT on Cancel and restores a usable, non-error form state", async () => {
        getServerMediaProvider.mockResolvedValue("s3");
        createUploadIntent.mockResolvedValue({ uploadUrl: "https://s3.example/put" });
        let rejectPut;
        uploadToPresignedUrl.mockImplementation(
            () =>
                new Promise((_, reject) => {
                    rejectPut = reject;
                })
        );

        await renderForm();
        await fillTitleArtist();
        await selectFile(makeFile());
        await clickUpload();

        await waitFor(() => expect(uploadToPresignedUrl).toHaveBeenCalledTimes(1));
        expect(screen.getByRole("button", { name: /uploading/i })).toBeDisabled();

        const [, , , { signal }] = uploadToPresignedUrl.mock.calls[0];
        expect(signal.aborted).toBe(false);

        await userEvent.click(screen.getByRole("button", { name: /cancel/i }));
        expect(signal.aborted).toBe(true);

        // The real fetch/axios layer would reject with this shape once
        // its own signal fires — simulated here since uploadToPresignedUrl
        // itself is mocked in this test.
        rejectPut(Object.assign(new Error("aborted"), { name: "AbortError" }));

        await waitFor(() => expect(screen.getByRole("button", { name: /^upload$/i })).not.toBeDisabled());
        expect(screen.queryByRole("alert")).not.toBeInTheDocument();
    });

    it("does not create a second intent when Cancel is clicked mid-upload", async () => {
        getServerMediaProvider.mockResolvedValue("s3");
        createUploadIntent.mockResolvedValue({ uploadUrl: "https://s3.example/put" });
        uploadToPresignedUrl.mockImplementation(() => new Promise(() => {})); // never resolves in this test

        await renderForm();
        await fillTitleArtist();
        await selectFile(makeFile());
        await clickUpload();

        await waitFor(() => expect(createUploadIntent).toHaveBeenCalledTimes(1));
        await userEvent.click(screen.getByRole("button", { name: /cancel/i }));

        expect(createUploadIntent).toHaveBeenCalledTimes(1);
    });

    it("calls onCancel when Cancel is clicked", async () => {
        getServerMediaProvider.mockResolvedValue("local");
        const onCancel = jest.fn();

        await renderForm({ onCancel });
        await userEvent.click(screen.getByRole("button", { name: /cancel/i }));

        expect(onCancel).toHaveBeenCalledTimes(1);
    });
});
