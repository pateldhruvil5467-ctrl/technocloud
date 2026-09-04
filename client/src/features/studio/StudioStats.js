import React from "react";

/*
 * StudioStats — Phase UI.4.
 *
 * Every number here is a plain count derived from the artist's own
 * fetched tracks — no analytics backend, no plays/likes/followers
 * (none of that exists on the Track model, and none is invented here).
 */
function StudioStats({ tracks }) {
    const total = tracks.length;
    const publicCount = tracks.filter((t) => t.visibility === "public").length;
    const draftCount = tracks.filter((t) => t.visibility === "draft").length;
    const otherCount = total - publicCount - draftCount;
    const mixCount = tracks.filter((t) => t.isMix).length;

    const tiles = [
        { label: "Tracks", value: total },
        { label: "Public", value: publicCount },
        { label: "Drafts", value: draftCount },
        { label: "Unlisted / Taken Down", value: otherCount },
        { label: "Mixes", value: mixCount },
    ];

    return (
        <div className="grid grid-cols-2 gap-3 sm:grid-cols-3 lg:grid-cols-5">
            {tiles.map((tile) => (
                <div
                    key={tile.label}
                    className="flex flex-col gap-1 rounded-md border border-border bg-surface p-4"
                >
                    <span className="font-display text-2xl font-semibold text-text">{tile.value}</span>
                    <span className="font-body text-xs text-text-secondary">{tile.label}</span>
                </div>
            ))}
        </div>
    );
}

export default StudioStats;
