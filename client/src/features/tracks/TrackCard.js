import React from "react";
import { Link } from "react-router-dom";
import { FiPlay, FiPause } from "react-icons/fi";

import { usePlayer } from "../../context/PlayerContext";
import Badge from "../../components/primitives/Badge";
import TrackArtwork from "./TrackArtwork";

/*
 * TrackCard — Phase UI.3.
 *
 * The reusable public listener card, used by Home and Artist Profile.
 * Reads and drives playback entirely through usePlayer() — no local
 * audio state, no local currentTrack, no <audio> element here. Only
 * fields that actually exist on the backend Track model are rendered;
 * nothing here is fabricated (no BPM/key/energy — those fields don't
 * exist yet).
 */
function TrackCard({ track }) {
    const { currentTrack, isPlaying, playTrack, togglePlayPause } = usePlayer();

    const isCurrent = currentTrack?._id === track._id;
    const isCurrentlyPlaying = isCurrent && isPlaying;
    const tags = Array.isArray(track.tags) ? track.tags.slice(0, 2) : [];
    const hasMetadata = Boolean(track.genre || track.subgenre || track.isMix || tags.length > 0);

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
                "flex flex-col gap-3 rounded-md border bg-surface p-3 transition-colors duration-fast",
                isCurrent ? "border-accent" : "border-border hover:border-border-strong",
            ].join(" ")}
        >
            <div className="relative">
                <TrackArtwork track={track} />
                <button
                    type="button"
                    onClick={handlePlayClick}
                    aria-label={isCurrentlyPlaying ? `Pause ${track.title}` : `Play ${track.title}`}
                    className={[
                        "absolute bottom-2 right-2 flex h-11 w-11 items-center justify-center rounded-full",
                        "bg-accent text-accent-foreground shadow-elevation transition-colors duration-fast",
                        "hover:brightness-110 active:brightness-90",
                        "focus-visible:outline focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-accent",
                    ].join(" ")}
                >
                    {isCurrentlyPlaying ? (
                        <FiPause size={18} aria-hidden="true" />
                    ) : (
                        <FiPlay size={18} aria-hidden="true" />
                    )}
                </button>
            </div>

            <div className="flex min-w-0 flex-col gap-1">
                <Link
                    to={`/track/${track._id}`}
                    className="truncate rounded-sm font-body text-sm font-medium text-text hover:text-accent focus-visible:outline focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-accent"
                >
                    {track.title}
                </Link>

                {track.artistId ? (
                    <Link
                        to={`/artist/${track.artistId}`}
                        className="w-fit truncate rounded-sm font-body text-xs text-text-secondary hover:text-accent focus-visible:outline focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-accent"
                    >
                        {track.artist}
                    </Link>
                ) : (
                    <span className="truncate font-body text-xs text-text-secondary">{track.artist}</span>
                )}
            </div>

            {hasMetadata && (
                <div className="flex flex-wrap gap-1.5">
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

            {isCurrent && (
                <span className="font-technical text-technical text-accent">
                    {isPlaying ? "Now playing" : "Paused"}
                </span>
            )}
        </div>
    );
}

export default TrackCard;
