import React, { useCallback, useEffect, useState } from "react";

import StudioHeader from "../features/studio/StudioHeader";
import StudioStats from "../features/studio/StudioStats";
import StudioTrackList from "../features/studio/StudioTrackList";
import UploadTrackForm from "../features/studio/UploadTrackForm";
import TrackEditor from "../features/studio/TrackEditor";
import DeleteTrackDialog from "../features/studio/DeleteTrackDialog";
import { getMe } from "../services/usersApi";
import { getTracks } from "../services/tracksApi";
import { usePlayer } from "../context/PlayerContext";
import Button from "../components/primitives/Button";
import Skeleton from "../components/primitives/Skeleton";
import EmptyState from "../components/primitives/EmptyState";
import ErrorState from "../components/primitives/ErrorState";

/*
 * StudioPage — Phase UI.4, the authenticated Artist Studio at
 * /my-tracks (route gated in App.js: user?.role === "ARTIST" only —
 * that gate is a UX convenience, not the real security boundary; the
 * backend enforces who may actually upload/edit/delete via requireRole
 * and requireTrackOwnership regardless of what this page renders).
 *
 * There is no GET /api/tracks/mine endpoint. "My tracks" is computed
 * client-side the same way getTrackById already does it in
 * services/tracksApi.js: fetch everything from GET /api/tracks (which,
 * unlike the public feed pages, is unfiltered by visibility — see
 * trackController.getTracks — so this correctly includes the artist's
 * own drafts/unlisted/taken-down tracks too) and keep only the ones
 * whose artistId matches the caller's own ArtistProfile, obtained from
 * GET /api/users/me.
 */
function StudioPage() {
    const [me, setMe] = useState(null);
    const [allTracks, setAllTracks] = useState([]);
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
            const [meData, tracksData] = await Promise.all([getMe(), getTracks()]);
            setMe(meData);
            setAllTracks(tracksData);
            setStatus("ready");
        } catch (error) {
            if (!silent) setStatus("error");
        }
    }, []);

    useEffect(() => {
        load();
    }, [load]);

    const artistProfile = me?.artistProfile;
    const myTracks = artistProfile
        ? allTracks.filter((track) => track.artistId === artistProfile._id)
        : [];

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

            <StudioStats tracks={myTracks} />

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

                {myTracks.length === 0 ? (
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
                    <StudioTrackList tracks={myTracks} onEdit={setEditingTrack} onDelete={setDeletingTrack} />
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
