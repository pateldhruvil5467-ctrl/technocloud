import React from "react";

import { API_BASE_URL } from "../../services/api";

/*
 * TrackArtwork — Phase UI.3.
 *
 * Track.cover exists on the backend (server/models/Track.js) but no
 * current upload path ever sets it (trackController.uploadTrack never
 * writes it — see the codebase inspection notes in the PR), so every
 * real track today falls through to the deliberate fallback: a quiet
 * geometric monogram over a faint grid, not a stock image or a
 * gradient. Real artwork (if `cover` is ever populated) is expected to
 * follow the same /uploads/<filename> convention as Track.audio, so
 * this already renders it correctly the moment it exists — no future
 * layout change needed.
 *
 * Fixed 1:1 aspect ratio always, so the grid/card layout never shifts
 * regardless of which branch renders.
 */

function initialsFor(track) {
    const source = (track?.title || track?.artist || "?").trim();
    return source.slice(0, 2).toUpperCase();
}

function TrackArtwork({ track, className = "" }) {
    const coverUrl = track?.cover ? `${API_BASE_URL}/uploads/${track.cover}` : null;

    return (
        <div
            className={[
                "relative aspect-square w-full overflow-hidden rounded-md border border-border bg-surface-raised",
                className,
            ].join(" ")}
        >
            {coverUrl ? (
                <img
                    src={coverUrl}
                    alt={`${track.title} artwork`}
                    loading="lazy"
                    className="h-full w-full object-cover"
                />
            ) : (
                <div aria-hidden="true" className="absolute inset-0 flex items-center justify-center">
                    <div
                        className="absolute inset-0 opacity-[0.08]"
                        style={{
                            backgroundImage:
                                "linear-gradient(var(--color-text-faint) 1px, transparent 1px), linear-gradient(90deg, var(--color-text-faint) 1px, transparent 1px)",
                            backgroundSize: "14px 14px",
                        }}
                    />
                    <span className="font-display text-3xl font-semibold text-text-faint">
                        {initialsFor(track)}
                    </span>
                </div>
            )}
        </div>
    );
}

export default TrackArtwork;
