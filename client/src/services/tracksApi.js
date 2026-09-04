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
 * The following three calls back the Artist Studio (Phase UI.4). Each
 * mirrors the real backend contract exactly (server/routes/trackRoutes.js,
 * server/controllers/trackController.js) rather than a hoped-for one:
 *
 * - uploadTrack only ever accepts title/artist/audio — the controller
 *   silently ignores anything else sent at upload time.
 * - updateTrack's allowlist is exactly title/artist/genre/subgenre/tags/
 *   isMix/visibility; callers should only ever pass those keys.
 * - There is no GET /api/tracks/mine — "my tracks" is the same
 *   client-side filter pattern as getTrackById above, done by the
 *   caller (StudioPage) using getTracks() plus the caller's own
 *   ArtistProfile id from GET /api/users/me.
 */

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
