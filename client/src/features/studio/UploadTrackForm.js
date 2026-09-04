import React, { useState } from "react";

import Button from "../../components/primitives/Button";
import Input from "../../components/primitives/Input";
import { uploadTrack } from "../../services/tracksApi";

/*
 * UploadTrackForm — Phase UI.4.
 *
 * Only asks for what POST /api/tracks/upload actually accepts at
 * upload time — title, artist, audio file (trackController.uploadTrack
 * ignores anything else in the body). Genre/tags/visibility/etc. are
 * edited afterwards via TrackEditor, once the track exists.
 *
 * Client-side file checks mirror the real limits enforced by
 * server/routes/trackRoutes.js (20MB, audio/mpeg only) so a bad file is
 * caught before a wasted upload — the server remains the actual
 * authority; these are just early feedback, not enforcement.
 */

const MAX_UPLOAD_BYTES = 20 * 1024 * 1024;
const ACCEPTED_AUDIO_MIME_TYPES = ["audio/mpeg", "audio/mp3"];

function UploadTrackForm({ onUploaded, onCancel }) {
    const [title, setTitle] = useState("");
    const [artist, setArtist] = useState("");
    const [file, setFile] = useState(null);
    const [fileError, setFileError] = useState("");
    const [submitError, setSubmitError] = useState("");
    const [submitting, setSubmitting] = useState(false);

    function handleFileChange(e) {
        const selected = e.target.files[0] || null;
        setFile(selected);
        setSubmitError("");

        if (!selected) {
            setFileError("");
            return;
        }

        if (!ACCEPTED_AUDIO_MIME_TYPES.includes(selected.type)) {
            setFileError("Only MP3 audio files are supported.");
        } else if (selected.size > MAX_UPLOAD_BYTES) {
            setFileError("File exceeds the 20MB upload limit.");
        } else {
            setFileError("");
        }
    }

    async function handleSubmit(e) {
        e.preventDefault();
        if (!file || fileError || submitting) return;

        setSubmitting(true);
        setSubmitError("");

        try {
            const formData = new FormData();
            formData.append("title", title);
            formData.append("artist", artist);
            formData.append("audio", file);

            const data = await uploadTrack(formData);
            onUploaded(data.track);
        } catch (error) {
            setSubmitError(
                error.response?.data?.message || "Upload failed. Check your connection and try again."
            );
        } finally {
            setSubmitting(false);
        }
    }

    const canSubmit = title.trim() && artist.trim() && file && !fileError && !submitting;

    return (
        <form
            onSubmit={handleSubmit}
            className="flex flex-col gap-4 rounded-md border border-border bg-surface p-4"
        >
            <Input
                label="Title"
                value={title}
                onChange={(e) => setTitle(e.target.value)}
                required
            />

            <Input
                label="Artist"
                value={artist}
                onChange={(e) => setArtist(e.target.value)}
                required
            />

            <div className="flex flex-col gap-2">
                <label
                    htmlFor="studio-upload-file"
                    className="font-body text-xs font-medium uppercase tracking-wide text-text-secondary"
                >
                    Audio file (MP3, up to 20MB)
                </label>
                <input
                    id="studio-upload-file"
                    type="file"
                    accept="audio/mpeg,audio/mp3"
                    onChange={handleFileChange}
                    className="font-body text-sm text-text-secondary file:mr-3 file:rounded-md file:border file:border-border file:bg-surface-raised file:px-3 file:py-1.5 file:font-body file:text-sm file:text-text"
                />
                {fileError && <p className="font-body text-xs text-danger">{fileError}</p>}
            </div>

            {submitError && <p className="font-body text-xs text-danger">{submitError}</p>}

            <div className="flex gap-2">
                <Button type="submit" variant="primary" disabled={!canSubmit}>
                    {submitting ? "Uploading…" : "Upload"}
                </Button>
                <Button type="button" variant="ghost" onClick={onCancel} disabled={submitting}>
                    Cancel
                </Button>
            </div>
        </form>
    );
}

export default UploadTrackForm;
