const Track = require("../models/Track");

// The only place a Mongo filter is assembled for track listing — never
// built from raw req.query (see middleware/validateTrackQuery.js, which
// is the sole caller-facing boundary and passes down only a whitelisted,
// type-checked filter object).
//
// createdAt/title sorts are always tied off by a compound _id direction
// (see SORT_MAP) so pagination stays stable even when multiple tracks
// share an identical createdAt timestamp or title — without it, page
// boundaries could shift or duplicate/skip a row between requests.
const SORT_MAP = {
    newest: { createdAt: -1, _id: -1 },
    oldest: { createdAt: 1, _id: 1 },
    title_asc: { title: 1, _id: 1 },
    title_desc: { title: -1, _id: -1 },
};

async function listTracks({ page, limit, sort, filter, search }) {
    const mongoFilter = { ...filter };

    if (search) {
        // Escaped so `search` can only ever match literal substrings —
        // never construct an attacker-controlled regex/operator.
        const escaped = search.replace(/[.*+?^${}()|[\]\\]/g, "\\$&");
        mongoFilter.$or = [
            { title: { $regex: escaped, $options: "i" } },
            { artist: { $regex: escaped, $options: "i" } },
        ];
    }

    const sortSpec = SORT_MAP[sort] || SORT_MAP.newest;
    const skip = (page - 1) * limit;

    // countDocuments (not fetching every matching doc to count them) so
    // an out-of-range page or a broad filter never pulls the full result
    // set into memory just to report a total.
    const [data, total] = await Promise.all([
        Track.find(mongoFilter).sort(sortSpec).skip(skip).limit(limit),
        Track.countDocuments(mongoFilter),
    ]);

    const totalPages = limit > 0 ? Math.ceil(total / limit) : 0;

    return {
        data,
        pagination: {
            page,
            limit,
            total,
            totalPages,
            hasNextPage: page < totalPages,
            hasPreviousPage: page > 1,
        },
    };
}

module.exports = { listTracks };
