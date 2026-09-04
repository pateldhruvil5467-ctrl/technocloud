import React from "react";
import { Link } from "react-router-dom";
import { FiPlay, FiPause, FiEdit2, FiTrash2 } from "react-icons/fi";

import { usePlayer } from "../../context/PlayerContext";
import Badge from "../../components/primitives/Badge";
import TrackArtwork from "../tracks/TrackArtwork";

/*
 * StudioTrackRow — Phase UI.4.
 *
 * The management-list counterpart to TrackCard (features/tracks/TrackCard.js):
 * same usePlayer()-only playback pattern, but a compact row with
 * Edit/Delete actions instead of a public discovery card. Play, Edit,
 * and Delete are three sibling <button> elements — never nested inside
 * one another (an accessibility bug caught and fixed elsewhere in this
 * app during Phase UI.3's mobile player work).
 */
function StudioTrackRow({ track, onEdit, onDelete }) {
    const { currentTrack, isPlaying, playTrack, togglePlayPause } = usePlayer();

    const isCurrent = currentTrack?._id === track._id;
    const isCurrentlyPlaying = isCurrent && isPlaying;
    const tags = Array.isArray(track.tags) ? track.tags : [];

    function handlePlayClick() {
        if (isCurrent) {
            togglePlayPause();
        } else {
            playTrack(track);
        }
    }

    return (
        <div
            className={[
                "flex items-center gap-3 rounded-md border bg-surface p-3 transition-colors duration-fast",
                isCurrent ? "border-accent" : "border-border",
            ].join(" ")}
        >
            <button
                type="button"
                onClick={handlePlayClick}
                aria-label={isCurrentlyPlaying ? `Pause ${track.title}` : `Play ${track.title}`}
                className={[
                    "flex h-10 w-10 flex-none items-center justify-center rounded-full",
                    "bg-accent text-accent-foreground transition-colors duration-fast",
                    "hover:brightness-110 active:brightness-90",
                    "focus-visible:outline focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-accent",
                ].join(" ")}
            >
                {isCurrentlyPlaying ? (
                    <FiPause size={16} aria-hidden="true" />
                ) : (
                    <FiPlay size={16} aria-hidden="true" />
                )}
            </button>

            {/* Fixed-size wrapper rather than passing a conflicting w-12/h-12
                straight into TrackArtwork — its internal "w-full" utility
                isn't guaranteed to lose to a passed-in className at equal
                specificity (see the same caution in Avatar.js). */}
            <div className="h-12 w-12 flex-none">
                <TrackArtwork track={track} />
            </div>

            <div className="flex min-w-0 flex-1 flex-col gap-1">
                <Link
                    to={`/track/${track._id}`}
                    className="w-fit truncate rounded-sm font-body text-sm font-medium text-text hover:text-accent focus-visible:outline focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-accent"
                >
                    {track.title}
                </Link>
                <span className="truncate font-body text-xs text-text-secondary">{track.artist}</span>

                <div className="flex flex-wrap gap-1.5">
                    <Badge technical>{track.visibility}</Badge>
                    {track.genre && <Badge technical>{track.genre}</Badge>}
                    {track.subgenre && <Badge technical>{track.subgenre}</Badge>}
                    {track.isMix && <Badge technical>Mix</Badge>}
                    {tags.map((tag) => (
                        <Badge key={tag} technical>
                            #{tag}
                        </Badge>
                    ))}
                </div>
            </div>

            <div className="flex flex-none gap-1">
                <button
                    type="button"
                    onClick={() => onEdit(track)}
                    aria-label={`Edit ${track.title}`}
                    className="flex h-9 w-9 items-center justify-center rounded-md text-text-secondary hover:bg-surface-raised hover:text-text focus-visible:outline focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-accent"
                >
                    <FiEdit2 size={16} aria-hidden="true" />
                </button>
                <button
                    type="button"
                    onClick={() => onDelete(track)}
                    aria-label={`Delete ${track.title}`}
                    className="flex h-9 w-9 items-center justify-center rounded-md text-text-secondary hover:bg-surface-raised hover:text-danger focus-visible:outline focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-accent"
                >
                    <FiTrash2 size={16} aria-hidden="true" />
                </button>
            </div>
        </div>
    );
}

export default StudioTrackRow;
