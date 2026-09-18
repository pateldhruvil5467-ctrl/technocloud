import React, { useEffect, useRef, useState } from "react";

import Button from "../../components/primitives/Button";
import Input from "../../components/primitives/Input";
import { uploadTrack } from "../../services/tracksApi";
import {
    createUploadIntent,
    getServerMediaProvider,
    isMediaProviderUnavailable,
    uploadToPresignedUrl,
} from "../../services/mediaApi";

/*
 * UploadTrackForm — Phase UI.4, migrated in V5.2-B3 to support direct-
 * to-S3 upload alongside the original local multipart path.
 *
 * Only asks for what the local endpoint (POST /api/tracks/upload) and
 * the S3 upload-intent endpoint (POST /api/v1/media/upload-intent)
 * actually need — title/artist are collected either way (for B4's
 * eventual use, and to keep this form's shape stable regardless of
 * which storage path ends up handling any given upload), but only ever
 * sent to the server that consumes them.
 *
 * WHICH PATH RUNS — on mount, this asks GET /api/v1/health which storage
 * provider the server is actually running with (mediaApi.
 * getServerMediaProvider — see server/controllers/healthController.js).
 * That's what decides local vs. S3, not a build-time flag: the same
 * deployed frontend build must work correctly whichever way
 * MEDIA_STORAGE_PROVIDER is set, without a redeploy when it changes.
 * Crucially, this means an environment running "local" NEVER calls
 * upload-intent at all — the S3 branch is only entered once the health
 * check has confirmed "s3". Inside that branch, a specific 503
 * MEDIA_PROVIDER_UNAVAILABLE response from the intent call itself (see
 * mediaApi.isMediaProviderUnavailable) is still handled as one more
 * layer of safe fallback to local — covers the rare case where the
 * health check's snapshot and the intent call's live check disagree.
 * Any OTHER intent failure (401/403/400, or a different 5xx) is a real
 * error, shown as one. If the health check itself fails for any reason,
 * this defaults to "local" — the known-reliable path — rather than
 * blocking upload entirely.
 *
 * Client-side file checks mirror the real limits enforced by
 * server/routes/trackRoutes.js AND server/middleware/
 * validateMediaUploadIntentBody.js (20MB, MP3 only, non-empty,
 * reasonable filename length) so a bad file is caught before a wasted
 * request either way — the server remains the actual authority; these
 * are just early feedback, not enforcement.
 */

const MAX_UPLOAD_BYTES = 20 * 1024 * 1024;
const MAX_FILENAME_LENGTH = 255;
const ACCEPTED_AUDIO_MIME_TYPES = ["audio/mpeg", "audio/mp3"];

function isAbortError(error) {
    return error?.name === "AbortError" || error?.name === "CanceledError";
}

function extractErrorMessage(error) {
    if (error?.name === "S3UploadError") {
        // Never read/shown: S3's own response body (an XML error
        // payload) — see mediaApi.uploadToPresignedUrl.
        return "Upload to storage failed. Please try again.";
    }
    // v1 endpoints (upload-intent, validation, ownership resolution)
    // respond { error: { message } }; auth/requireRole — reached before
    // any v1 code runs — still respond the older { message } shape (see
    // server/middleware/authMiddleware.js / requireRole.js, unchanged).
    // Checked in that order so either shape resolves to a real message.
    return (
        error.response?.data?.error?.message ||
        error.response?.data?.message ||
        "Upload failed. Check your connection and try again."
    );
}

function UploadTrackForm({ onUploaded, onCancel }) {
    const [title, setTitle] = useState("");
    const [artist, setArtist] = useState("");
    const [file, setFile] = useState(null);
    const [fileError, setFileError] = useState("");
    const [submitError, setSubmitError] = useState("");
    const [submitting, setSubmitting] = useState(false);
    const [uploadSucceeded, setUploadSucceeded] = useState(false);
    // null while the health check is still in flight — handleSubmit
    // treats that exactly like "local" (see the module comment above).
    const [mediaProvider, setMediaProvider] = useState(null);

    const abortControllerRef = useRef(null);
    const mountedRef = useRef(true);

    useEffect(() => {
        let cancelled = false;

        getServerMediaProvider()
            .then((provider) => {
                if (!cancelled) setMediaProvider(provider);
            })
            .catch(() => {
                if (!cancelled) setMediaProvider("local");
            });

        return () => {
            cancelled = true;
        };
    }, []);

    useEffect(
        () => () => {
            mountedRef.current = false;
        },
        []
    );

    function handleFileChange(e) {
        const selected = e.target.files[0] || null;
        setFile(selected);
        setSubmitError("");
        setUploadSucceeded(false);

        if (!selected) {
            setFileError("");
            return;
        }

        if (!ACCEPTED_AUDIO_MIME_TYPES.includes(selected.type)) {
            setFileError("Only MP3 audio files are supported.");
        } else if (selected.size === 0) {
            setFileError("Selected file is empty.");
        } else if (selected.size > MAX_UPLOAD_BYTES) {
            setFileError("File exceeds the 20MB upload limit.");
        } else if (selected.name.length > MAX_FILENAME_LENGTH) {
            setFileError("Filename is too long.");
        } else {
            setFileError("");
        }
    }

    async function uploadViaS3(controller) {
        // Read once, reused unchanged for both the intent request and
        // the S3 PUT's Content-Type — never re-derived a second time.
        // By this point (canSubmit already required !fileError) this is
        // guaranteed to already be an accepted MP3 MIME type, so no
        // further normalization is needed or attempted.
        const mimeType = file.type;

        let intent;
        try {
            intent = await createUploadIntent(
                { filename: file.name, mimeType, sizeBytes: file.size },
                { signal: controller.signal }
            );
        } catch (intentError) {
            if (!isMediaProviderUnavailable(intentError)) {
                throw intentError;
            }
            return false; // fall back to local
        }

        await uploadToPresignedUrl(intent.uploadUrl, file, mimeType, { signal: controller.signal });

        if (mountedRef.current) {
            setUploadSucceeded(true);
        }
        // Deliberately NOT calling onUploaded(...) here — there is no
        // Track yet (V5.2-B4 creates one from this completed upload).
        // Nothing about a new track is reported upward; the "uploaded,
        // awaiting processing" state below is the only thing shown.
        return true;
    }

    async function uploadViaLocal() {
        const formData = new FormData();
        formData.append("title", title);
        formData.append("artist", artist);
        formData.append("audio", file);

        const data = await uploadTrack(formData);
        if (mountedRef.current) {
            onUploaded(data.track);
        }
    }

    async function handleSubmit(e) {
        e.preventDefault();
        if (!file || fileError || submitting) return;

        setSubmitting(true);
        setSubmitError("");

        const controller = new AbortController();
        abortControllerRef.current = controller;

        try {
            const uploadedViaS3 = mediaProvider === "s3" && (await uploadViaS3(controller));

            if (!uploadedViaS3) {
                await uploadViaLocal();
            }
        } catch (error) {
            if (isAbortError(error)) {
                return;
            }
            if (mountedRef.current) {
                setSubmitError(extractErrorMessage(error));
            }
        } finally {
            abortControllerRef.current = null;
            if (mountedRef.current) {
                setSubmitting(false);
            }
        }
    }

    function handleCancel() {
        if (abortControllerRef.current) {
            abortControllerRef.current.abort();
            abortControllerRef.current = null;
        }
        onCancel();
    }

    const canSubmit = title.trim() && artist.trim() && file && !fileError && !submitting;

    if (uploadSucceeded) {
        return (
            <div className="flex flex-col gap-3 rounded-md border border-border bg-surface p-4">
                <p className="font-body text-sm text-text">
                    Upload complete — your track is queued for processing and will appear here once it&apos;s
                    ready.
                </p>
                <Button type="button" variant="secondary" onClick={onCancel} className="self-start">
                    Done
                </Button>
            </div>
        );
    }

    return (
        <form
            onSubmit={handleSubmit}
            className="flex flex-col gap-4 rounded-md border border-border bg-surface p-4"
        >
            <Input
                label="Title"
                value={title}
                onChange={(e) => setTitle(e.target.value)}
                required
                disabled={submitting}
            />

            <Input
                label="Artist"
                value={artist}
                onChange={(e) => setArtist(e.target.value)}
                required
                disabled={submitting}
            />

            <div className="flex flex-col gap-2">
                <label
                    htmlFor="studio-upload-file"
                    className="font-body text-xs font-medium uppercase tracking-wide text-text-secondary"
                >
                    Audio file (MP3, up to 20MB)
                </label>
                <input
                    id="studio-upload-file"
                    type="file"
                    accept="audio/mpeg,audio/mp3"
                    onChange={handleFileChange}
                    disabled={submitting}
                    className="font-body text-sm text-text-secondary file:mr-3 file:rounded-md file:border file:border-border file:bg-surface-raised file:px-3 file:py-1.5 file:font-body file:text-sm file:text-text"
                />
                {fileError && <p className="font-body text-xs text-danger">{fileError}</p>}
            </div>

            {submitError && (
                <p role="alert" className="font-body text-xs text-danger">
                    {submitError}
                </p>
            )}

            <div className="flex gap-2">
                <Button type="submit" variant="primary" disabled={!canSubmit}>
                    {submitting ? "Uploading…" : "Upload"}
                </Button>
                <Button type="button" variant="ghost" onClick={handleCancel}>
                    Cancel
                </Button>
            </div>
        </form>
    );
}

export default UploadTrackForm;
