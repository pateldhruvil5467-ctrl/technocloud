import React from "react";

import Avatar from "../../components/primitives/Avatar";
import { API_BASE_URL } from "../../services/api";

/*
 * StudioHeader — Phase UI.4.
 *
 * Identity block for the authenticated artist's own studio, mirroring
 * ArtistHeader's public layout (features/artists/ArtistHeader.js) but
 * scoped to the owner's own view — no trackCount badge here since
 * StudioStats covers that with real breakdown, not a single number.
 */
function StudioHeader({ displayName, avatarKey }) {
    const avatarSrc = avatarKey ? `${API_BASE_URL}/uploads/${avatarKey}` : undefined;

    return (
        <header className="flex flex-col gap-4 md:flex-row md:items-center md:gap-6">
            <Avatar src={avatarSrc} name={displayName} size="xl" />

            <div className="flex min-w-0 flex-col gap-1">
                <span className="font-technical text-[10px] uppercase tracking-wide text-text-faint">
                    Artist Studio
                </span>
                <h1 className="truncate font-display text-display-md font-semibold text-text">
                    {displayName}
                </h1>
            </div>
        </header>
    );
}

export default StudioHeader;
