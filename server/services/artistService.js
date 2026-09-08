const ArtistProfile = require("../models/ArtistProfile");

// The actual projection boundary for GET /api/v1/artists — an explicit
// inclusion list, not the raw document. `userId` (the internal reference
// to the owning User account) is deliberately absent: it is never a
// public-safe field, and since this is a MongoDB-level projection (not
// post-fetch scrubbing), a value never selected here can never leak
// through this endpoint even if the ArtistProfile schema grows new
// internal fields later.
const PUBLIC_FIELDS = "_id displayName bio avatarKey genres artistTypes links verified createdAt";

// Mirrors services/trackService.js's SORT_MAP pattern exactly: every
// sort is tied off with a compound _id direction so pagination stays
// stable even when multiple artists share an identical createdAt
// timestamp or displayName.
const SORT_MAP = {
    newest: { createdAt: -1, _id: -1 },
    oldest: { createdAt: 1, _id: 1 },
    name_asc: { displayName: 1, _id: 1 },
    name_desc: { displayName: -1, _id: -1 },
};

async function listArtists({ page, limit, sort, filter, search }) {
    const mongoFilter = {};

    if (filter.genre) {
        // ArtistProfile.genres is a plain array field — querying it with
        // a scalar value is Mongo's standard "array contains this exact
        // element" match, no $elemMatch needed for a single equality
        // condition. Exact, case-sensitive match, same behavior class as
        // trackService's own genre filter (no case-folding invented here
        // either).
        mongoFilter.genres = filter.genre;
    }

    if (search) {
        // Escaped exactly like trackService's own search branch, so
        // `search` can only ever match a literal substring — never
        // construct an attacker-controlled regex/operator.
        const escaped = search.replace(/[.*+?^${}()|[\]\\]/g, "\\$&");
        mongoFilter.displayName = { $regex: escaped, $options: "i" };
    }

    const sortSpec = SORT_MAP[sort] || SORT_MAP.newest;
    const skip = (page - 1) * limit;

    // Same two-query shape as trackService.listTracks: countDocuments
    // instead of fetching every matching document just to count them, so
    // an out-of-range page or a broad filter never pulls the full result
    // set into memory. No per-artist Track query anywhere in this
    // function — the artist directory never touches the Track
    // collection at all.
    const [data, total] = await Promise.all([
        ArtistProfile.find(mongoFilter).select(PUBLIC_FIELDS).sort(sortSpec).skip(skip).limit(limit),
        ArtistProfile.countDocuments(mongoFilter),
    ]);

    const pages = limit > 0 ? Math.ceil(total / limit) : 0;

    return {
        data,
        pagination: { page, limit, total, pages },
    };
}

module.exports = { listArtists };
