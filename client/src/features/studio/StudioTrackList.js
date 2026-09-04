import React from "react";

import StudioTrackRow from "./StudioTrackRow";
import EmptyState from "../../components/primitives/EmptyState";

/*
 * StudioTrackList — Phase UI.4. Plain vertical list of the artist's own
 * tracks (draft/unlisted/takedown included, unlike the public feed) —
 * a management list reads better as rows than the public discovery
 * grid used elsewhere.
 */
function StudioTrackList({ tracks, onEdit, onDelete }) {
    if (tracks.length === 0) {
        return <EmptyState message="No tracks match this view." />;
    }

    return (
        <div className="flex flex-col gap-2">
            {tracks.map((track) => (
                <StudioTrackRow key={track._id} track={track} onEdit={onEdit} onDelete={onDelete} />
            ))}
        </div>
    );
}

export default StudioTrackList;
