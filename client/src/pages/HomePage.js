import React, { useCallback, useEffect, useState } from "react";

import TrackCard from "../features/tracks/TrackCard";
import { getTracks } from "../services/tracksApi";
import Skeleton from "../components/primitives/Skeleton";
import EmptyState from "../components/primitives/EmptyState";
import ErrorState from "../components/primitives/ErrorState";

/*
 * HomePage — Phase UI.3. The primary public listener feed, at "/" and
 * "/home". Works identically for logged-in and logged-out visitors —
 * GET /api/tracks requires no authentication.
 */

const SKELETON_COUNT = 8;
const GRID_CLASSES = "grid grid-cols-1 gap-4 md:grid-cols-2 lg:grid-cols-3 xl:grid-cols-4";

function HomePage() {
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
                <h1 className="font-display text-display-lg font-semibold text-text">Home</h1>
                <p className="max-w-prose font-body text-sm text-text-secondary">
                    Freshly uploaded tracks from the TechnoCloud community.
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
                    message="Couldn't load tracks. Check your connection and try again."
                    onRetry={loadTracks}
                />
            )}

            {status === "ready" && tracks.length === 0 && <EmptyState message="No tracks yet." />}

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

export default HomePage;
