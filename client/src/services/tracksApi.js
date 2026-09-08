import axios from "axios";

import { API_BASE_URL } from "./api";

/*
 * Track resource calls (Phase UI.3). Centralizes what previously lived
 * inline in page components (Dashboard.js still has its own copy for
 * its own out-of-scope Studio use — not touched here).
 */

export async function getTracks() {
    const res = await axios.get(`${API_BASE_URL}/api/tracks`);
    return res.data;
}

/*
 * There is no GET /api/tracks/:id endpoint on the backend — confirmed
 * by inspecting server/routes/trackRoutes.js (only GET "/", POST
 * "/upload", PUT "/:id", DELETE "/:id" exist). Rather than have every
 * page that wants a single track know that and re-implement the
 * workaround, that's hidden here: fetch the full list and find the
 * track client-side. If a real single-track endpoint is added later,
 * this is the only place that needs to change.
 *
 * Throws an error with `.status = 404` when the id isn't found, so
 * callers can handle it the same way as a real backend 404.
 */
export async function getTrackById(id) {
    const tracks = await getTracks();
    const track = tracks.find((t) => t._id === id);

    if (!track) {
        const error = new Error("Track not found");
        error.status = 404;
        throw error;
    }

    return track;
}

function authHeaders() {
    return { Authorization: sessionStorage.getItem("token") };
}

/*
 * The following calls back the Artist Studio (Phase UI.4 / V.3
 * migration to the owner-scoped endpoint). Each mirrors the real
 * backend contract exactly (server/routes/trackRoutes.js,
 * server/routes/v1/meRoutes.js, server/controllers/trackController.js)
 * rather than a hoped-for one:
 *
 * - uploadTrack only ever accepts title/artist/audio — the controller
 *   silently ignores anything else sent at upload time.
 * - updateTrack's allowlist is exactly title/artist/genre/subgenre/tags/
 *   isMix/visibility; callers should only ever pass those keys.
 * - getMyTracks calls GET /api/v1/me/tracks — the server resolves
 *   ownership entirely from the caller's JWT (see
 *   server/middleware/resolveOwnArtistProfile.js); this function never
 *   sends an artistId or any other ownership field. The frontend has no
 *   authority over whose tracks come back, only the server does.
 */

/*
 * Returns the authenticated artist's own tracks (every visibility —
 * public/draft/unlisted/takedown — since this is for Studio management,
 * not the public feed) as { data, pagination }, not a bare array; see
 * server/README.md's "Tracks — v1, owner-scoped" section for the exact
 * contract. Callers that just want the track list should read
 * `.data` off the result rather than assuming an array response.
 */
export async function getMyTracks(params = {}) {
    const res = await axios.get(`${API_BASE_URL}/api/v1/me/tracks`, {
        headers: authHeaders(),
        params,
    });
    return res.data;
}

// The only Discovery-relevant query keys GET /api/v1/tracks accepts (see
// server/README.md's "Tracks — v1" section). `visibility` is deliberately
// NOT in this list — Discovery is public browsing, and the endpoint's own
// public-only default is exactly what Discovery should always get; there
// is no legitimate reason for this page to ever request
// draft/unlisted/takedown content. Building the request from this fixed
// whitelist (rather than forwarding whatever the caller passes) makes
// that a structural guarantee, not just a convention callers have to
// remember.
const SEARCH_PARAM_KEYS = ["search", "genre", "subgenre", "isMix", "sort", "page", "limit"];

/*
 * Public track search/discovery (V3.1). Calls GET /api/v1/tracks — the
 * same paginated/filterable/sortable engine already documented in
 * server/README.md, unauthenticated, returning { data, pagination }
 * unchanged (no shape transformation here — callers read `.data` /
 * `.pagination` directly, same convention as getMyTracks).
 */
export async function searchTracks(params = {}, { signal } = {}) {
    const query = {};
    for (const key of SEARCH_PARAM_KEYS) {
        const value = params[key];
        if (value !== undefined && value !== null && value !== "") {
            query[key] = value;
        }
    }

    const res = await axios.get(`${API_BASE_URL}/api/v1/tracks`, { params: query, signal });
    return res.data;
}

export async function uploadTrack(formData) {
    const res = await axios.post(`${API_BASE_URL}/api/tracks/upload`, formData, {
        headers: authHeaders(),
    });
    return res.data;
}

export async function updateTrack(id, payload) {
    const res = await axios.put(`${API_BASE_URL}/api/tracks/${id}`, payload, {
        headers: authHeaders(),
    });
    return res.data;
}

export async function deleteTrack(id) {
    const res = await axios.delete(`${API_BASE_URL}/api/tracks/${id}`, {
        headers: authHeaders(),
    });
    return res.data;
}
