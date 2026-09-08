import axios from "axios";

import { API_BASE_URL } from "./api";

/*
 * Artist resource calls (Phase UI.3). GET /api/artists/:id is public
 * (no auth) and already returns { artistProfile, tracks } — see
 * server/controllers/artistController.js.
 */
export async function getArtistById(id) {
    const res = await axios.get(`${API_BASE_URL}/api/artists/${id}`);
    return res.data;
}

// The only Discovery-relevant query keys GET /api/v1/artists accepts
// (see server/README.md's "Artists — v1" section). Built the same way
// tracksApi.js's searchTracks builds its own whitelist — an explicit,
// fixed list, not whatever the caller happens to pass — so this
// function's contract can't silently grow beyond what the endpoint
// actually supports.
const ARTIST_SEARCH_PARAM_KEYS = ["search", "genre", "sort", "page", "limit"];

/*
 * Public artist directory/search (V3.2). Calls GET /api/v1/artists,
 * unauthenticated, returning { data, pagination } unchanged — note this
 * endpoint's pagination shape (page/limit/total/pages) is deliberately
 * different from getMyTracks/searchTracks's (which also carry
 * totalPages/hasNextPage/hasPreviousPage); callers must not assume the
 * two are interchangeable.
 */
export async function searchArtists(params = {}, { signal } = {}) {
    const query = {};
    for (const key of ARTIST_SEARCH_PARAM_KEYS) {
        const value = params[key];
        if (value !== undefined && value !== null && value !== "") {
            query[key] = value;
        }
    }

    const res = await axios.get(`${API_BASE_URL}/api/v1/artists`, { params: query, signal });
    return res.data;
}
