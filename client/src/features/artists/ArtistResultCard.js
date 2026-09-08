import React from "react";
import { Link } from "react-router-dom";

import Avatar from "../../components/primitives/Avatar";
import Badge from "../../components/primitives/Badge";
import { API_BASE_URL } from "../../services/api";

/*
 * ArtistResultCard — V3.2.
 *
 * The artist-directory equivalent of features/tracks/TrackCard — a
 * compact, grid-friendly result card, not the full profile header
 * (features/artists/ArtistHeader.js is that, and stays reserved for
 * ArtistProfilePage). Its avatarKey -> src derivation mirrors
 * ArtistHeader's exactly, since both are rendering the same
 * ArtistProfile.avatarKey convention.
 *
 * Only fields the GET /api/v1/artists response can actually contain are
 * rendered (see server/README.md's "Artists — v1" public-field list) —
 * nothing here is fabricated.
 */
function ArtistResultCard({ artist }) {
    const avatarSrc = artist.avatarKey ? `${API_BASE_URL}/uploads/${artist.avatarKey}` : undefined;
    const genres = Array.isArray(artist.genres) ? artist.genres.slice(0, 3) : [];

    return (
        <Link
            to={`/artist/${artist._id}`}
            className={[
                "flex flex-col items-center gap-3 rounded-md border border-border bg-surface p-4 text-center",
                "transition-colors duration-fast hover:border-border-strong",
                "focus-visible:outline focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-accent",
            ].join(" ")}
        >
            <Avatar src={avatarSrc} name={artist.displayName} size="lg" />

            <span className="w-full truncate font-body text-sm font-medium text-text">{artist.displayName}</span>

            {genres.length > 0 && (
                <div className="flex flex-wrap justify-center gap-1.5">
                    {genres.map((genre) => (
                        <Badge key={genre} technical>
                            {genre}
                        </Badge>
                    ))}
                </div>
            )}
        </Link>
    );
}

export default ArtistResultCard;
