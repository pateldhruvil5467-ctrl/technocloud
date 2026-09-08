import React, { useCallback, useEffect, useId, useState } from "react";
import { useSearchParams } from "react-router-dom";

import TrackCard from "../features/tracks/TrackCard";
import { searchTracks } from "../services/tracksApi";
import Input from "../components/primitives/Input";
import Button from "../components/primitives/Button";
import Skeleton from "../components/primitives/Skeleton";
import EmptyState from "../components/primitives/EmptyState";
import ErrorState from "../components/primitives/ErrorState";

/*
 * DiscoverPage — V3.1.
 *
 * Public track search/browse, built entirely on GET /api/v1/tracks (see
 * services/tracksApi.js's searchTracks). The URL is the single source of
 * truth for every piece of Discovery state — search/genre/subgenre/isMix/
 * sort/page/limit all live in the query string, nowhere else, so a
 * refresh, a copied link, or browser back/forward all reproduce the exact
 * same result set.
 *
 * SECURITY: `visibility` is never read from, written to, or forwarded
 * from this page — see searchTracks's fixed param whitelist. Discovery
 * only ever sees whatever GET /api/v1/tracks's own public-only default
 * returns.
 */

const SORT_OPTIONS = [
    { value: "newest", label: "Newest" },
    { value: "oldest", label: "Oldest" },
    { value: "title_asc", label: "Title A–Z" },
    { value: "title_desc", label: "Title Z–A" },
];
const SORT_VALUES = SORT_OPTIONS.map((option) => option.value);

const MIX_OPTIONS = [
    { value: "", label: "All tracks" },
    { value: "true", label: "Mixes only" },
    { value: "false", label: "Tracks only" },
];

const DEFAULT_LIMIT = 20;
const MAX_LIMIT = 100;
const SKELETON_COUNT = 8;
const GRID_CLASSES = "grid grid-cols-1 gap-4 md:grid-cols-2 lg:grid-cols-3 xl:grid-cols-4";
const TEXT_FILTER_DEBOUNCE_MS = 400;

const SELECT_CLASSES =
    "rounded-md border border-border bg-surface px-3 py-2 font-body text-sm text-text focus-visible:outline focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-accent";
const SELECT_LABEL_CLASSES = "font-body text-xs font-medium uppercase tracking-wide text-text-secondary";

function clampPage(raw) {
    const n = Number(raw);
    return Number.isInteger(n) && n >= 1 ? n : 1;
}

function clampLimit(raw) {
    const n = Number(raw);
    return Number.isInteger(n) && n >= 1 && n <= MAX_LIMIT ? n : DEFAULT_LIMIT;
}

function normalizeSort(raw) {
    return SORT_VALUES.includes(raw) ? raw : "newest";
}

function normalizeIsMix(raw) {
    return raw === "true" || raw === "false" ? raw : "";
}

// Reads and validates every Discovery-relevant value straight off the URL.
// Anything malformed (a non-numeric page, an out-of-range limit, an
// unrecognized sort) is normalized to a safe default here rather than
// ever being forwarded to the API — the same defensive posture
// server/middleware/validateTrackQuery.js already takes, mirrored
// client-side of the same contract. Only these seven keys are ever read;
// nothing else in the URL reaches the page's state or the API.
function readDiscoverState(searchParams) {
    return {
        search: searchParams.get("search") || "",
        genre: searchParams.get("genre") || "",
        subgenre: searchParams.get("subgenre") || "",
        isMix: normalizeIsMix(searchParams.get("isMix")),
        sort: normalizeSort(searchParams.get("sort")),
        page: clampPage(searchParams.get("page")),
        limit: clampLimit(searchParams.get("limit")),
    };
}

function DiscoverPage() {
    const [searchParams, setSearchParams] = useSearchParams();
    const state = readDiscoverState(searchParams);

    // Local text-input state, decoupled from the URL so typing feels
    // immediate. Committed to the URL (and therefore the API) after a
    // short pause, on blur, or on submit — never once per keystroke.
    const [searchInput, setSearchInput] = useState(state.search);
    const [genreInput, setGenreInput] = useState(state.genre);
    const [subgenreInput, setSubgenreInput] = useState(state.subgenre);

    const [tracks, setTracks] = useState([]);
    const [pagination, setPagination] = useState(null);
    const [status, setStatus] = useState("loading"); // loading | ready | error
    const [retryToken, setRetryToken] = useState(0);

    const mixId = useId();
    const sortId = useId();

    // Keep the local text inputs in sync when the URL changes from
    // outside typing (back/forward navigation, a pasted link, "Clear
    // filters") rather than the debounce below.
    useEffect(() => {
        setSearchInput(state.search);
        setGenreInput(state.genre);
        setSubgenreInput(state.subgenre);
        // eslint-disable-next-line react-hooks/exhaustive-deps
    }, [state.search, state.genre, state.subgenre]);

    const updateParams = useCallback(
        (patch, { resetPage = true } = {}) => {
            setSearchParams((prev) => {
                const next = new URLSearchParams(prev);
                Object.entries(patch).forEach(([key, value]) => {
                    if (value === undefined || value === null || value === "") {
                        next.delete(key);
                    } else {
                        next.set(key, String(value));
                    }
                });
                if (resetPage) {
                    next.set("page", "1");
                }
                return next;
            });
        },
        [setSearchParams]
    );

    const commitTextFilters = useCallback(() => {
        updateParams({ search: searchInput, genre: genreInput, subgenre: subgenreInput });
    }, [searchInput, genreInput, subgenreInput, updateParams]);

    // Debounce: commit the three free-text fields together after a pause
    // in typing. Enter (form submit) or leaving a field (blur) commits
    // immediately instead of waiting — see handleFiltersSubmit / the
    // onBlur handlers below. Whichever fires first wins; the others
    // become no-ops once the URL already matches the local input state.
    useEffect(() => {
        const timeout = setTimeout(() => {
            if (
                searchInput !== state.search ||
                genreInput !== state.genre ||
                subgenreInput !== state.subgenre
            ) {
                commitTextFilters();
            }
        }, TEXT_FILTER_DEBOUNCE_MS);
        return () => clearTimeout(timeout);
        // eslint-disable-next-line react-hooks/exhaustive-deps
    }, [searchInput, genreInput, subgenreInput]);

    // Data fetch — the URL (via `state`) is the only trigger. An
    // AbortController cancels a still-in-flight request the moment the
    // URL changes again, so a slow older response can never overwrite a
    // newer one.
    useEffect(() => {
        const controller = new AbortController();

        async function load() {
            setStatus("loading");
            try {
                const result = await searchTracks(
                    {
                        search: state.search,
                        genre: state.genre,
                        subgenre: state.subgenre,
                        isMix: state.isMix,
                        sort: state.sort,
                        page: state.page,
                        limit: state.limit,
                    },
                    { signal: controller.signal }
                );
                setTracks(result.data);
                setPagination(result.pagination);
                setStatus("ready");
            } catch (error) {
                if (controller.signal.aborted) return;
                setStatus("error");
            }
        }

        load();
        return () => controller.abort();
        // eslint-disable-next-line react-hooks/exhaustive-deps
    }, [state.search, state.genre, state.subgenre, state.isMix, state.sort, state.page, state.limit, retryToken]);

    const hasActiveCriteria = Boolean(state.search || state.genre || state.subgenre || state.isMix);

    function handleFiltersSubmit(e) {
        e.preventDefault();
        commitTextFilters();
    }

    function handleMixChange(e) {
        updateParams({ isMix: e.target.value });
    }

    function handleSortChange(e) {
        updateParams({ sort: e.target.value });
    }

    function handleClearFilters() {
        updateParams({ search: "", genre: "", subgenre: "", isMix: "" });
    }

    function handlePrevPage() {
        if (state.page <= 1) return;
        updateParams({ page: state.page - 1 }, { resetPage: false });
    }

    function handleNextPage() {
        if (!pagination?.hasNextPage) return;
        updateParams({ page: state.page + 1 }, { resetPage: false });
    }

    function handleRetry() {
        setRetryToken((t) => t + 1);
    }

    return (
        <div className="flex flex-col gap-8">
            <header className="flex flex-col gap-2">
                <h1 className="font-display text-display-lg font-semibold text-text">Discover</h1>
                <p className="max-w-prose font-body text-sm text-text-secondary">
                    Search and filter every public track on TechnoCloud.
                </p>
            </header>

            <form onSubmit={handleFiltersSubmit} className="flex flex-col gap-4">
                <div className="flex flex-col gap-4 md:flex-row md:flex-wrap md:items-end">
                    <div className="w-full md:w-64">
                        <Input
                            label="Search"
                            type="search"
                            placeholder="Search by title or artist"
                            value={searchInput}
                            onChange={(e) => setSearchInput(e.target.value)}
                        />
                    </div>

                    <div className="w-full md:w-40">
                        <Input
                            label="Genre"
                            placeholder="Any genre"
                            value={genreInput}
                            onChange={(e) => setGenreInput(e.target.value)}
                            onBlur={commitTextFilters}
                        />
                    </div>

                    <div className="w-full md:w-40">
                        <Input
                            label="Subgenre"
                            placeholder="Any subgenre"
                            value={subgenreInput}
                            onChange={(e) => setSubgenreInput(e.target.value)}
                            onBlur={commitTextFilters}
                        />
                    </div>

                    <div className="flex w-full flex-col gap-2 md:w-40">
                        <label htmlFor={mixId} className={SELECT_LABEL_CLASSES}>
                            Type
                        </label>
                        <select id={mixId} value={state.isMix} onChange={handleMixChange} className={SELECT_CLASSES}>
                            {MIX_OPTIONS.map((option) => (
                                <option key={option.value} value={option.value}>
                                    {option.label}
                                </option>
                            ))}
                        </select>
                    </div>

                    <div className="flex w-full flex-col gap-2 md:w-40">
                        <label htmlFor={sortId} className={SELECT_LABEL_CLASSES}>
                            Sort
                        </label>
                        <select id={sortId} value={state.sort} onChange={handleSortChange} className={SELECT_CLASSES}>
                            {SORT_OPTIONS.map((option) => (
                                <option key={option.value} value={option.value}>
                                    {option.label}
                                </option>
                            ))}
                        </select>
                    </div>

                    <div className="flex gap-2">
                        <Button type="submit" variant="secondary">
                            Search
                        </Button>
                        {hasActiveCriteria && (
                            <Button type="button" variant="ghost" onClick={handleClearFilters}>
                                Clear filters
                            </Button>
                        )}
                    </div>
                </div>
            </form>

            {status === "loading" && (
                <div className={GRID_CLASSES}>
                    {Array.from({ length: SKELETON_COUNT }).map((_, i) => (
                        <div key={i} className="flex flex-col gap-3">
                            <Skeleton className="aspect-square w-full" />
                            <Skeleton className="h-4 w-3/4" />
                            <Skeleton className="h-3 w-1/2" />
                        </div>
                    ))}
                </div>
            )}

            {status === "error" && (
                <ErrorState
                    message="Couldn't load results. Check your connection and try again."
                    onRetry={handleRetry}
                />
            )}

            {status === "ready" && tracks.length === 0 && hasActiveCriteria && (
                <EmptyState
                    message="No tracks match your search. Try a different search term or filter."
                    action={
                        <Button variant="secondary" onClick={handleClearFilters}>
                            Clear filters
                        </Button>
                    }
                />
            )}

            {status === "ready" && tracks.length === 0 && !hasActiveCriteria && (
                <EmptyState message="No public tracks are available yet." />
            )}

            {status === "ready" && tracks.length > 0 && (
                <div className="flex flex-col gap-4">
                    <p className="font-body text-xs text-text-faint">
                        {pagination.total} {pagination.total === 1 ? "track" : "tracks"} found
                    </p>

                    <div className={GRID_CLASSES}>
                        {tracks.map((track) => (
                            <TrackCard key={track._id} track={track} />
                        ))}
                    </div>

                    <div className="flex items-center justify-between gap-4 pt-2">
                        <Button
                            type="button"
                            variant="secondary"
                            onClick={handlePrevPage}
                            disabled={state.page <= 1}
                            aria-label="Previous page"
                        >
                            Previous
                        </Button>

                        <span className="font-technical text-technical text-text-faint">
                            Page {pagination.page} of {Math.max(pagination.totalPages, 1)}
                        </span>

                        <Button
                            type="button"
                            variant="secondary"
                            onClick={handleNextPage}
                            disabled={!pagination.hasNextPage}
                            aria-label="Next page"
                        >
                            Next
                        </Button>
                    </div>
                </div>
            )}
        </div>
    );
}

export default DiscoverPage;
