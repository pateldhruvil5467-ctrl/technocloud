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
