import axios from "axios";

import { API_BASE_URL } from "./api";

/*
 * mediaApi — V5.2-B3.
 *
 * Two distinct responsibilities, deliberately kept in the same file
 * because they're two halves of the same upload flow, but implemented
 * very differently:
 *
 *   createUploadIntent   — a normal authenticated Render API call
 *                           (POST /api/v1/media/upload-intent — see
 *                           server/routes/v1/mediaRoutes.js). Same
 *                           axios + authHeaders() pattern as every other
 *                           call in this services/ directory.
 *
 *   uploadToPresignedUrl — NOT a Render API call. A direct browser -> S3
 *                           request, using the presigned URL the intent
 *                           call returned. Plain fetch, no Authorization
 *                           header, no cookies, no headers beyond
 *                           Content-Type (the one header the presigned
 *                           URL's signature actually covers) — see
 *                           server/services/media/s3.js's
 *                           createUploadTarget for what's actually
 *                           signed.
 */

function authHeaders() {
    return { Authorization: sessionStorage.getItem("token") };
}

/*
 * Which storage provider the server is actually running with right now
 * — "local" or "s3" (see server/config/env.js's mediaStorageProvider,
 * exposed on the existing GET /api/v1/health response as of V5.2-B3 —
 * see server/controllers/healthController.js). This is what lets
 * UploadTrackForm.js decide which upload path to use WITHOUT ever
 * calling POST /api/v1/media/upload-intent in an environment that
 * doesn't have S3 configured — a build-time REACT_APP_* flag would be
 * wrong here (MEDIA_STORAGE_PROVIDER is a runtime, server-only value
 * that can change without a frontend redeploy), and this endpoint was
 * already public/unauthenticated, so no new route was needed for it.
 */
export async function getServerMediaProvider() {
    const res = await axios.get(`${API_BASE_URL}/api/v1/health`);
    return res.data.mediaProvider;
}

export async function createUploadIntent({ filename, mimeType, sizeBytes }, { signal } = {}) {
    const res = await axios.post(
        `${API_BASE_URL}/api/v1/media/upload-intent`,
        { filename, mimeType, sizeBytes },
        { headers: authHeaders(), signal }
    );
    return res.data.data;
}

/*
 * True for exactly the one outcome that means "S3 isn't available right
 * now in this environment — fall back to the existing local multipart
 * upload endpoint." Server-side, this is the single response shape
 * server/services/mediaProvider.js's createUploadTarget produces whether
 * the provider is plainly unconfigured (MEDIA_STORAGE_PROVIDER=local, or
 * s3 without S3_BUCKET/S3_REGION set) OR a real presigner failure
 * occurred — B2 was deliberately security-reviewed to never distinguish
 * the two to an external caller (never leak *why* S3 is unavailable).
 * That's also exactly why this is a safe default to fall back on: even
 * in the rare "S3 configured but currently broken" case, falling back to
 * the confirmed-intact local endpoint means the upload still succeeds
 * rather than the user being blocked by a transient infrastructure
 * issue. Any OTHER response (401/403/400, or a genuinely different 5xx)
 * is a real failure the caller must surface, not silently swallow.
 */
export function isMediaProviderUnavailable(error) {
    return (
        error?.response?.status === 503 &&
        error?.response?.data?.error?.code === "MEDIA_PROVIDER_UNAVAILABLE"
    );
}

/*
 * `mimeType` MUST be the exact same string used to create the intent —
 * never independently re-derived from `file.type` a second time. The
 * presigned URL's signature is bound to this exact Content-Type value;
 * anything else fails with a signature mismatch (a hard failure, not a
 * silently-wrong-type upload) — see UploadTrackForm.js, which reads
 * `file.type` exactly once and passes that same value to both this and
 * createUploadIntent.
 *
 * Errors are normalized to `name: "S3UploadError"` (network failure or a
 * non-2xx response) so callers can show one fixed, safe message without
 * ever needing to read S3's own response body — S3 returns an XML error
 * payload on failure, deliberately never parsed, logged, or surfaced
 * here. An abort (the caller's own cancellation) is re-thrown as-is, not
 * wrapped, so callers can still tell "the user cancelled" apart from a
 * genuine upload failure.
 */
export async function uploadToPresignedUrl(uploadUrl, file, mimeType, { signal } = {}) {
    let res;

    try {
        res = await fetch(uploadUrl, {
            method: "PUT",
            headers: { "Content-Type": mimeType },
            body: file,
            signal,
        });
    } catch (networkError) {
        if (networkError.name === "AbortError") {
            throw networkError;
        }
        const error = new Error("S3 upload failed: network error.");
        error.name = "S3UploadError";
        throw error;
    }

    if (!res.ok) {
        const error = new Error(`S3 upload failed with status ${res.status}.`);
        error.name = "S3UploadError";
        error.status = res.status;
        throw error;
    }

    return res;
}
