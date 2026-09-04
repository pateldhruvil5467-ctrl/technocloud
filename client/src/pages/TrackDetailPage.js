import React, { useCallback, useEffect, useState } from "react";
import { useParams, Link } from "react-router-dom";
import { FiPlay, FiPause } from "react-icons/fi";

import TrackArtwork from "../features/tracks/TrackArtwork";
import { getTrackById } from "../services/tracksApi";
import { usePlayer } from "../context/PlayerContext";
import Badge from "../components/primitives/Badge";
import Button from "../components/primitives/Button";
import Skeleton from "../components/primitives/Skeleton";
import EmptyState from "../components/primitives/EmptyState";
import ErrorState from "../components/primitives/ErrorState";

/*
 * TrackDetailPage — Phase UI.3, /track/:id.
 *
 * There is no GET /api/tracks/:id endpoint (see services/tracksApi.js)
 * — getTrackById fetches the full list and finds this one client-side,
 * so a malformed/unknown id naturally falls out as a 404 with no
 * special-casing needed here.
 */

function formatTime(seconds) {
    if (!Number.isFinite(seconds) || seconds < 0) return null;
    const mins = Math.floor(seconds / 60);
    const secs = Math.floor(seconds % 60);
    return `${mins}:${String(secs).padStart(2, "0")}`;
}

function TrackDetailPage() {
    const { id } = useParams();
    const [track, setTrack] = useState(null);
    const [status, setStatus] = useState("loading"); // loading | ready | error | notfound

    const { currentTrack, isPlaying, duration, playTrack, togglePlayPause } = usePlayer();

    const load = useCallback(async () => {
        setStatus("loading");
        try {
            const data = await getTrackById(id);
            setTrack(data);
            setStatus("ready");
        } catch (error) {
            setStatus(error.status === 404 ? "notfound" : "error");
        }
    }, [id]);

    useEffect(() => {
        load();
    }, [load]);

    if (status === "loading") {
        return (
            <div className="flex max-w-3xl flex-col gap-6 md:flex-row md:gap-8">
                <Skeleton className="aspect-square w-full flex-none md:w-64" />
                <div className="flex flex-1 flex-col gap-3">
                    <Skeleton className="h-7 w-2/3" />
                    <Skeleton className="h-4 w-1/3" />
                    <Skeleton className="h-10 w-32" />
                </div>
            </div>
        );
    }

    if (status === "notfound") {
        return <EmptyState message="Track not found." />;
    }

    if (status === "error") {
        return (
            <ErrorState
                message="Couldn't load this track. Check your connection and try again."
                onRetry={load}
            />
        );
    }

    const isCurrent = currentTrack?._id === track._id;
    const isCurrentlyPlaying = isCurrent && isPlaying;
    const knownDuration = isCurrent ? formatTime(duration) : null;
    const tags = Array.isArray(track.tags) ? track.tags : [];
    const hasMetadata = Boolean(track.genre || track.subgenre || track.isMix || tags.length > 0 || knownDuration);

    function handlePlayClick() {
        if (isCurrent) {
            togglePlayPause();
        } else {
            playTrack(track);
        }
    }

    return (
        <div className="flex max-w-3xl flex-col gap-6 md:flex-row md:gap-8">
            <TrackArtwork track={track} className="flex-none md:w-64" />

            <div className="flex min-w-0 flex-col gap-4">
                <div className="flex flex-col gap-1">
                    <h1 className="font-display text-display-md font-semibold text-text">{track.title}</h1>
                    {track.artistId ? (
                        <Link
                            to={`/artist/${track.artistId}`}
                            className="w-fit rounded-sm font-body text-sm text-text-secondary hover:text-accent focus-visible:outline focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-accent"
                        >
                            {track.artist}
                        </Link>
                    ) : (
                        <span className="font-body text-sm text-text-secondary">{track.artist}</span>
                    )}
                </div>

                <Button variant="primary" onClick={handlePlayClick} className="w-fit">
                    {isCurrentlyPlaying ? (
                        <FiPause size={16} aria-hidden="true" />
                    ) : (
                        <FiPlay size={16} aria-hidden="true" />
                    )}
                    {isCurrentlyPlaying ? "Pause" : "Play"}
                </Button>

                {hasMetadata && (
                    <div className="flex flex-wrap gap-1.5">
                        {knownDuration && <Badge technical>{knownDuration}</Badge>}
                        {track.genre && <Badge technical>{track.genre}</Badge>}
                        {track.subgenre && <Badge technical>{track.subgenre}</Badge>}
                        {track.isMix && <Badge technical>Mix</Badge>}
                        {tags.map((tag) => (
                            <Badge key={tag} technical>
                                #{tag}
                            </Badge>
                        ))}
                    </div>
                )}

                {track.createdAt && (
                    <span className="font-body text-xs text-text-faint">
                        Added {new Date(track.createdAt).toLocaleDateString()}
                    </span>
                )}
            </div>
        </div>
    );
}

export default TrackDetailPage;
