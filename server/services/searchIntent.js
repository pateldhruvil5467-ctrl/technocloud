const SORT_VALUES = ["newest", "oldest", "title_asc", "title_desc"];

const MAX_STRING_FILTER_LENGTH = 100;
const MAX_SEARCH_LENGTH = 100;

const ALLOWED_INTENT_FIELDS = new Set([
    "genre",
    "subgenre",
    "isMix",
    "sort",
    "search",
]);

function isPlainObject(value) {
    return (
        value !== null &&
        typeof value === "object" &&
        !Array.isArray(value)
    );
}

function normalizeString(value, maxLength) {
    if (typeof value !== "string") {
        return null;
    }

    const normalized = value.trim();

    if (normalized.length === 0 || normalized.length > maxLength) {
        return null;
    }

    return normalized;
}

function normalizeIntent(rawIntent) {
    if (!isPlainObject(rawIntent)) {
        return {
            intent: {},
            unsupported: [],
            valid: false,
        };
    }

    const intent = {};
    const unsupported = [];

    // Reject every field outside the explicit allowlist.
    for (const key of Object.keys(rawIntent)) {
        if (!ALLOWED_INTENT_FIELDS.has(key)) {
            unsupported.push(key);
        }
    }

    // genre
    if (rawIntent.genre !== undefined && rawIntent.genre !== null) {
        const genre = normalizeString(
            rawIntent.genre,
            MAX_STRING_FILTER_LENGTH
        );

        if (genre !== null) {
            intent.genre = genre;
        } else {
            unsupported.push("genre");
        }
    }

    // subgenre
    if (
        rawIntent.subgenre !== undefined &&
        rawIntent.subgenre !== null
    ) {
        const subgenre = normalizeString(
            rawIntent.subgenre,
            MAX_STRING_FILTER_LENGTH
        );

        if (subgenre !== null) {
            intent.subgenre = subgenre;
        } else {
            unsupported.push("subgenre");
        }
    }

    // isMix
    if (rawIntent.isMix !== undefined && rawIntent.isMix !== null) {
        if (typeof rawIntent.isMix === "boolean") {
            intent.isMix = rawIntent.isMix;
        } else {
            unsupported.push("isMix");
        }
    }

    // sort
    if (rawIntent.sort !== undefined && rawIntent.sort !== null) {
        if (typeof rawIntent.sort === "string" && SORT_VALUES.includes(rawIntent.sort)) {
            intent.sort = rawIntent.sort;
        } else {
            unsupported.push("sort");
        }
    }

    // search
    if (rawIntent.search !== undefined && rawIntent.search !== null) {
        const search = normalizeString(
            rawIntent.search,
            MAX_SEARCH_LENGTH
        );

        if (search !== null) {
            intent.search = search;
        } else {
            unsupported.push("search");
        }
    }

    return {
        intent,
        unsupported: [...new Set(unsupported)],
        valid: true,
    };
}

function createFallbackIntent(query) {
    const normalizedQuery = normalizeString(query, MAX_SEARCH_LENGTH);

    return {
        search: normalizedQuery || "",
    };
}

module.exports = {
    normalizeIntent,
    createFallbackIntent,
    SORT_VALUES,
    MAX_STRING_FILTER_LENGTH,
    MAX_SEARCH_LENGTH,
};