import axios from "axios";

import { API_BASE_URL } from "./api";

/*
 * AI-assisted discovery intent (V4.2). Calls POST /api/v1/discovery/interpret
 * — public, no auth, same as GET /api/v1/tracks/GET /api/v1/artists — and
 * returns the response body unchanged: { intent, unsupported, source }.
 *
 * This function does not interpret, filter, or trust the response in any
 * way — it is a plain HTTP call. Deciding which fields of `intent` are
 * safe to apply to Discovery's URL state is
 * features/discovery/applyDiscoveryIntent.js's job, not this file's; see
 * that module's own comment for why that separation matters here in
 * particular (`intent` is server-normalized, but the frontend still never
 * trusts it blindly).
 */
export async function interpretDiscoveryQuery(query, { signal } = {}) {
    const res = await axios.post(
        `${API_BASE_URL}/api/v1/discovery/interpret`,
        { query },
        { signal }
    );
    return res.data;
}
