import React, { useCallback, useEffect, useState } from "react";

import TrackCard from "../features/tracks/TrackCard";
import { getTracks } from "../services/tracksApi";
import Skeleton from "../components/primitives/Skeleton";
import EmptyState from "../components/primitives/EmptyState";
import ErrorState from "../components/primitives/ErrorState";

/*
 * Dashboard — Phase UI.5-B, the Library page at /library.
 *
 * Mirrors HomePage.js's data/status pattern exactly (same service call,
 * same status machine, same grid, same state primitives) — there is no
 * "saved tracks" or "my library" concept anywhere in the backend (no
 * likes/playlists/favorites on the Track or User models), so this
 * deliberately shows the same full catalog GET /api/tracks already
 * returns, not a fabricated personalized view. The only real
 * distinction from Home right now is framing/copy; if a genuine
 * library concept (saved/followed tracks) is added to the backend
 * later, this is the page that would start filtering by it.
 */

const SKELETON_COUNT = 8;
const GRID_CLASSES = "grid grid-cols-1 gap-4 md:grid-cols-2 lg:grid-cols-3 xl:grid-cols-4";

function Dashboard() {
    const [tracks, setTracks] = useState([]);
    const [status, setStatus] = useState("loading"); // loading | ready | error

    const loadTracks = useCallback(async () => {
        setStatus("loading");
        try {
            const data = await getTracks();
            setTracks(data);
            setStatus("ready");
        } catch (error) {
            setStatus("error");
        }
    }, []);

    useEffect(() => {
        loadTracks();
    }, [loadTracks]);

    return (
        <div className="flex flex-col gap-8">
            <header className="flex flex-col gap-2">
                <h1 className="font-display text-display-lg font-semibold text-text">Library</h1>
                <p className="max-w-prose font-body text-sm text-text-secondary">
                    Every track available on TechnoCloud.
                </p>
            </header>

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
                    message="Couldn't load your library. Check your connection and try again."
                    onRetry={loadTracks}
                />
            )}

            {status === "ready" && tracks.length === 0 && (
                <EmptyState message="No tracks are available yet." />
            )}

            {status === "ready" && tracks.length > 0 && (
                <div className={GRID_CLASSES}>
                    {tracks.map((track) => (
                        <TrackCard key={track._id} track={track} />
                    ))}
                </div>
            )}
        </div>
    );
}

export default Dashboard;
