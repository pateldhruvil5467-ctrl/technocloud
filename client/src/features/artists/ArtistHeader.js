import React from "react";

import Avatar from "../../components/primitives/Avatar";
import Badge from "../../components/primitives/Badge";
import { API_BASE_URL } from "../../services/api";

/*
 * ArtistHeader — Phase UI.3.
 *
 * The public identity block for an artist profile. Only renders fields
 * that are actually present — bio, genres, and artistTypes are all
 * optional on the backend (server/models/ArtistProfile.js) and default
 * to "" / [].
 */
function ArtistHeader({ profile, trackCount }) {
    const avatarSrc = profile.avatarKey ? `${API_BASE_URL}/uploads/${profile.avatarKey}` : undefined;
    const genres = Array.isArray(profile.genres) ? profile.genres : [];
    const artistTypes = Array.isArray(profile.artistTypes) ? profile.artistTypes : [];
    const hasBadges = genres.length > 0 || artistTypes.length > 0 || typeof trackCount === "number";

    return (
        <header className="flex flex-col gap-4 md:flex-row md:items-center md:gap-6">
            <Avatar src={avatarSrc} name={profile.displayName} size="xl" />

            <div className="flex min-w-0 flex-col gap-2">
                <h1 className="truncate font-display text-display-md font-semibold text-text">
                    {profile.displayName}
                </h1>

                {profile.bio && (
                    <p className="max-w-prose font-body text-sm text-text-secondary">{profile.bio}</p>
                )}

                {hasBadges && (
                    <div className="flex flex-wrap gap-1.5">
                        {typeof trackCount === "number" && (
                            <Badge technical>
                                {trackCount} {trackCount === 1 ? "track" : "tracks"}
                            </Badge>
                        )}
                        {artistTypes.map((type) => (
                            <Badge key={type} technical>
                                {type}
                            </Badge>
                        ))}
                        {genres.map((genre) => (
                            <Badge key={genre} technical>
                                {genre}
                            </Badge>
                        ))}
                    </div>
                )}
            </div>
        </header>
    );
}

export default ArtistHeader;
