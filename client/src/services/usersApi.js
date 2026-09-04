import axios from "axios";

import { API_BASE_URL } from "./api";

/*
 * Current-user resource calls (Phase UI.4). GET /api/users/me requires
 * auth and returns { id, username, email, role } plus `artistProfile`
 * when the caller is an ARTIST with one already created (see
 * server/controllers/userController.js — there is no ArtistProfile
 * until the first successful track upload, so this can legitimately be
 * absent for a brand-new ARTIST account).
 */
export async function getMe() {
    const res = await axios.get(`${API_BASE_URL}/api/users/me`, {
        headers: { Authorization: sessionStorage.getItem("token") },
    });
    return res.data;
}
