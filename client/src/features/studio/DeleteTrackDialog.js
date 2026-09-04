import React, { useState } from "react";

import Modal from "../../components/primitives/Modal";
import Button from "../../components/primitives/Button";
import { deleteTrack } from "../../services/tracksApi";

/*
 * DeleteTrackDialog — Phase UI.4. Names the track being deleted so the
 * confirmation is unambiguous, and disables both actions while the
 * request is in flight so a slow connection can't be double-submitted.
 */
function DeleteTrackDialog({ track, onDeleted, onClose }) {
    const [error, setError] = useState("");
    const [deleting, setDeleting] = useState(false);

    async function handleConfirm() {
        if (deleting) return;
        setDeleting(true);
        setError("");

        try {
            await deleteTrack(track._id);
            onDeleted(track._id);
        } catch (error) {
            setError(
                error.response?.data?.message || "Couldn't delete this track. Check your connection and try again."
            );
            setDeleting(false);
        }
    }

    return (
        <Modal title="Delete track" onClose={onClose}>
            <p className="font-body text-sm text-text-secondary">
                Delete <span className="text-text">"{track.title}"</span>? This can't be undone.
            </p>

            {error && <p className="font-body text-xs text-danger">{error}</p>}

            <div className="flex gap-2">
                <Button variant="danger" onClick={handleConfirm} disabled={deleting}>
                    {deleting ? "Deleting…" : "Delete"}
                </Button>
                <Button variant="ghost" onClick={onClose} disabled={deleting}>
                    Cancel
                </Button>
            </div>
        </Modal>
    );
}

export default DeleteTrackDialog;
