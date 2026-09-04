import React, { useCallback, useEffect, useState } from "react";
import { useParams } from "react-router-dom";

import ArtistHeader from "../features/artists/ArtistHeader";
import TrackCard from "../features/tracks/TrackCard";
import { getArtistById } from "../services/artistsApi";
import Skeleton from "../components/primitives/Skeleton";
import EmptyState from "../components/primitives/EmptyState";
import ErrorState from "../components/primitives/ErrorState";

/*
 * ArtistProfilePage — Phase UI.3, /artist/:id. Public — no auth
 * dependency, works identically logged in or out (GET /api/artists/:id
 * requires no authentication and already returns only public tracks).
 */

const GRID_CLASSES = "grid grid-cols-1 gap-4 md:grid-cols-2 lg:grid-cols-3 xl:grid-cols-4";

// GET /api/artists/:id casts an invalid id to a Mongoose ObjectId
// server-side and returns 500 (not a clean 404) for a malformed one —
// a known, pre-existing backend quirk, out of scope to fix this phase.
// Checking the shape client-side first avoids surfacing that as a
// misleading "try again" error for what's really just a bad link.
const OBJECT_ID_PATTERN = /^[a-f0-9]{24}$/i;

function ArtistProfilePage() {
    const { id } = useParams();
    const [data, setData] = useState(null);
    const [status, setStatus] = useState("loading"); // loading | ready | error | notfound

    const load = useCallback(async () => {
        if (!OBJECT_ID_PATTERN.test(id)) {
            setStatus("notfound");
            return;
        }

        setStatus("loading");
        try {
            const result = await getArtistById(id);
            setData(result);
            setStatus("ready");
        } catch (error) {
            setStatus(error.response?.status === 404 ? "notfound" : "error");
        }
    }, [id]);

    useEffect(() => {
        load();
    }, [load]);

    if (status === "loading") {
        return (
            <div className="flex flex-col gap-8">
                <div className="flex flex-col gap-4 md:flex-row md:items-center md:gap-6">
                    <Skeleton className="h-20 w-20 rounded-md md:h-28 md:w-28" />
                    <div className="flex flex-1 flex-col gap-2">
                        <Skeleton className="h-6 w-48" />
                        <Skeleton className="h-4 w-64" />
                    </div>
                </div>
                <div className={GRID_CLASSES}>
                    {Array.from({ length: 4 }).map((_, i) => (
                        <div key={i} className="flex flex-col gap-3">
                            <Skeleton className="aspect-square w-full" />
                            <Skeleton className="h-4 w-3/4" />
                        </div>
                    ))}
                </div>
            </div>
        );
    }

    if (status === "notfound") {
        return <EmptyState message="Artist not found." />;
    }

    if (status === "error") {
        return (
            <ErrorState
                message="Couldn't load this artist. Check your connection and try again."
                onRetry={load}
            />
        );
    }

    const { artistProfile, tracks } = data;

    return (
        <div className="flex flex-col gap-8">
            <ArtistHeader profile={artistProfile} trackCount={tracks.length} />

            {tracks.length === 0 ? (
                <EmptyState message="No public tracks yet." />
            ) : (
                <div className={GRID_CLASSES}>
                    {tracks.map((track) => (
                        <TrackCard key={track._id} track={track} />
                    ))}
                </div>
            )}
        </div>
    );
}

export default ArtistProfilePage;
