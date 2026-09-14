/*
 * applyDiscoveryIntent — V4.2.
 *
 * Maps a backend-returned discovery intent (POST /api/v1/discovery/interpret,
 * see services/discoveryApi.js) onto the exact URL-parameter patch
 * DiscoverPage's updateParams() already accepts for tracks.
 *
 * This is a second, independent allowlist — NOT a spread of whatever the
 * response contains. The backend's own services/searchIntent.js
 * normalizeIntent() is the real security boundary (it never lets
 * visibility/artistId/userId/Mongo-operator fields through in the first
 * place), but this function does not rely on that alone: it reads exactly
 * five fields off `intent`, each by its own literal name, once. There is
 * no code path here — no loop over Object.keys(intent), no spread — by
 * which an unexpected property on `intent` (however it got there) could
 * ever reach the URL or the track-search API.
 *
 * Always returns all five keys, never a partial patch. A field absent
 * from `intent` maps to "" (which updateParams() already treats as
 * "delete this URL param"), so a new AI interpretation *replaces* the
 * previous manual filters rather than merging with them — e.g. asking
 * for "industrial techno" after having genre=House selected clears
 * House, it doesn't leave it sitting alongside subgenre=Industrial. This
 * is a deliberate predictability choice, not an oversight.
 */

// Mirrors DiscoverPage.js's own SORT_VALUES value-for-value. Kept as an
// independent constant rather than imported from the page — pages are
// not something other modules in this codebase import from, and this
// list is small and stable (see server/services/searchIntent.js's own
// SORT_VALUES, which this matches on the backend side too).
const SORT_VALUES = ["newest", "oldest", "title_asc", "title_desc"];

function normalizedStringField(value) {
    return typeof value === "string" && value.trim().length > 0 ? value.trim() : "";
}

export function applyDiscoveryIntent(intent) {
    const safeIntent = intent && typeof intent === "object" ? intent : {};

    return {
        search: normalizedStringField(safeIntent.search),
        genre: normalizedStringField(safeIntent.genre),
        subgenre: normalizedStringField(safeIntent.subgenre),
        isMix: typeof safeIntent.isMix === "boolean" ? String(safeIntent.isMix) : "",
        sort: typeof safeIntent.sort === "string" && SORT_VALUES.includes(safeIntent.sort) ? safeIntent.sort : "",
    };
}
