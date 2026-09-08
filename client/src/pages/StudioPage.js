import React, { useCallback, useEffect, useState } from "react";

import StudioHeader from "../features/studio/StudioHeader";
import StudioStats from "../features/studio/StudioStats";
import StudioTrackList from "../features/studio/StudioTrackList";
import UploadTrackForm from "../features/studio/UploadTrackForm";
import TrackEditor from "../features/studio/TrackEditor";
import DeleteTrackDialog from "../features/studio/DeleteTrackDialog";
import { getMe } from "../services/usersApi";
import { getMyTracks } from "../services/tracksApi";
import { usePlayer } from "../context/PlayerContext";
import Button from "../components/primitives/Button";
import Skeleton from "../components/primitives/Skeleton";
import EmptyState from "../components/primitives/EmptyState";
import ErrorState from "../components/primitives/ErrorState";

// Studio has no pagination UI of its own — it previously showed an
// artist's entire (unpaginated) catalog, and this keeps that behavior
// intact against the now-paginated endpoint. 100 is that endpoint's own
// maximum (see server/middleware/validateTrackQuery.js), comfortably
// covering any realistic artist catalog without inventing real
// pagination controls this phase didn't ask for.
const MY_TRACKS_LIMIT = 100;

/*
 * StudioPage — migrated to GET /api/v1/me/tracks (V.3). Ownership is now
 * entirely the server's responsibility: the client never sends or
 * compares an artistId to decide which tracks belong to the signed-in
 * artist — it just asks "my tracks," and the server can only ever
 * answer that question about the authenticated caller (see
 * server/middleware/resolveOwnArtistProfile.js). Previously this page
 * fetched the ENTIRE public track collection via getTracks() and
 * filtered client-side by artistId — that filter is gone; nothing
 * client-side scopes ownership anymore.
 *
 * getMe() is still used here, unrelated to that removed filter — it's
 * the source of the artist's own displayName/avatarKey for
 * StudioHeader, and its `artistProfile` presence is also how this page
 * tells a genuinely brand-new artist (no ArtistProfile yet — normal;
 * every artist starts here, before their first upload) apart from one
 * with an empty catalog. getMyTracks() is deliberately not called in
 * the no-profile case: it would just 404 (ARTIST_PROFILE_NOT_FOUND) for
 * an entirely expected state, and a generic "couldn't load, retry"
 * ErrorState would be actively misleading there (retrying gets the same
 * 404) — the existing "haven't uploaded anything yet" EmptyState is the
 * correct, meaningful response, so that's what a missing profile still
 * produces, exactly as before this migration.
 */
function StudioPage() {
    const [me, setMe] = useState(null);
    const [tracks, setTracks] = useState([]);
    const [status, setStatus] = useState("loading"); // loading | ready | error

    const [showUpload, setShowUpload] = useState(false);
    const [editingTrack, setEditingTrack] = useState(null);
    const [deletingTrack, setDeletingTrack] = useState(null);

    const { currentTrack, pause } = usePlayer();

    // `silent` reloads (after a successful upload/edit/delete) refresh
    // data without dropping back to the loading skeleton or an error
    // screen — the mutation already succeeded, so the page should keep
    // showing what it has rather than flash.
    const load = useCallback(async ({ silent = false } = {}) => {
        if (!silent) setStatus("loading");
        try {
            const meData = await getMe();
            setMe(meData);

            if (meData.artistProfile) {
                const result = await getMyTracks({ limit: MY_TRACKS_LIMIT });
                setTracks(result.data);
            } else {
                setTracks([]);
            }

            setStatus("ready");
        } catch (error) {
            // A 404 here can only mean the ArtistProfile disappeared
            // between the two calls above (no deletion path exists for
            // it today, so this is a defensive fallback, not an expected
            // path) — treated the same as "no profile yet": a genuinely
            // empty studio, not a failure.
            if (error.response?.data?.error?.code === "ARTIST_PROFILE_NOT_FOUND") {
                setTracks([]);
                setStatus("ready");
                return;
            }
            if (!silent) setStatus("error");
        }
    }, []);

    useEffect(() => {
        load();
    }, [load]);

    const artistProfile = me?.artistProfile;

    function handleUploaded() {
        setShowUpload(false);
        load({ silent: true });
    }

    function handleSaved() {
        setEditingTrack(null);
        load({ silent: true });
    }

    function handleDeleted(trackId) {
        if (currentTrack?._id === trackId) {
            pause();
        }
        setDeletingTrack(null);
        load({ silent: true });
    }

    if (status === "loading") {
        return (
            <div className="flex flex-col gap-8">
                <div className="flex items-center gap-6">
                    <Skeleton className="h-20 w-20 rounded-md md:h-28 md:w-28" />
                    <Skeleton className="h-6 w-48" />
                </div>
                <div className="grid grid-cols-2 gap-3 sm:grid-cols-3 lg:grid-cols-5">
                    {Array.from({ length: 5 }).map((_, i) => (
                        <Skeleton key={i} className="h-20 w-full" />
                    ))}
                </div>
                <div className="flex flex-col gap-2">
                    {Array.from({ length: 3 }).map((_, i) => (
                        <Skeleton key={i} className="h-16 w-full" />
                    ))}
                </div>
            </div>
        );
    }

    if (status === "error") {
        return (
            <ErrorState
                message="Couldn't load your studio. Check your connection and try again."
                onRetry={load}
            />
        );
    }

    return (
        <div className="flex flex-col gap-8">
            <StudioHeader
                displayName={artistProfile?.displayName || me.username}
                avatarKey={artistProfile?.avatarKey}
            />

            <StudioStats tracks={tracks} />

            <div className="flex flex-col gap-4">
                <div className="flex items-center justify-between gap-4">
                    <h2 className="font-display text-display-sm font-semibold text-text">My Tracks</h2>
                    {!showUpload && (
                        <Button variant="primary" onClick={() => setShowUpload(true)}>
                            Upload track
                        </Button>
                    )}
                </div>

                {showUpload && (
                    <UploadTrackForm onUploaded={handleUploaded} onCancel={() => setShowUpload(false)} />
                )}

                {tracks.length === 0 ? (
                    <EmptyState
                        message="You haven't uploaded any tracks yet."
                        action={
                            !showUpload && (
                                <Button variant="secondary" onClick={() => setShowUpload(true)}>
                                    Upload your first track
                                </Button>
                            )
                        }
                    />
                ) : (
                    <StudioTrackList tracks={tracks} onEdit={setEditingTrack} onDelete={setDeletingTrack} />
                )}
            </div>

            {editingTrack && (
                <TrackEditor track={editingTrack} onSaved={handleSaved} onClose={() => setEditingTrack(null)} />
            )}

            {deletingTrack && (
                <DeleteTrackDialog
                    track={deletingTrack}
                    onDeleted={handleDeleted}
                    onClose={() => setDeletingTrack(null)}
                />
            )}
        </div>
    );
}

export default StudioPage;
