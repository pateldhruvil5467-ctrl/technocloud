import React, { useState } from "react";

import Modal from "../../components/primitives/Modal";
import Button from "../../components/primitives/Button";
import Input from "../../components/primitives/Input";
import { updateTrack } from "../../services/tracksApi";

/*
 * TrackEditor — Phase UI.4.
 *
 * The field set here is exactly PUT /api/tracks/:id's allowlist —
 * title, artist, genre, subgenre, tags, isMix, visibility (see
 * server/controllers/trackController.js updateTrack). Nothing else is
 * offered because nothing else is persisted.
 */

const VISIBILITY_OPTIONS = ["draft", "public", "unlisted", "takedown"];

function TrackEditor({ track, onSaved, onClose }) {
    const [title, setTitle] = useState(track.title || "");
    const [artist, setArtist] = useState(track.artist || "");
    const [genre, setGenre] = useState(track.genre || "");
    const [subgenre, setSubgenre] = useState(track.subgenre || "");
    const [tags, setTags] = useState((track.tags || []).join(", "));
    const [isMix, setIsMix] = useState(Boolean(track.isMix));
    const [visibility, setVisibility] = useState(track.visibility || "public");
    const [error, setError] = useState("");
    const [saving, setSaving] = useState(false);

    async function handleSubmit(e) {
        e.preventDefault();
        if (saving) return;

        setSaving(true);
        setError("");

        try {
            const payload = {
                title: title.trim(),
                artist: artist.trim(),
                genre: genre.trim(),
                subgenre: subgenre.trim(),
                tags: tags
                    .split(",")
                    .map((tag) => tag.trim())
                    .filter(Boolean),
                isMix,
                visibility,
            };

            const data = await updateTrack(track._id, payload);
            onSaved(data.track);
        } catch (error) {
            setError(
                error.response?.data?.message || "Couldn't save changes. Check your connection and try again."
            );
        } finally {
            setSaving(false);
        }
    }

    return (
        <Modal title="Edit track" onClose={onClose}>
            <form onSubmit={handleSubmit} className="flex flex-col gap-4">
                <Input label="Title" value={title} onChange={(e) => setTitle(e.target.value)} required />
                <Input label="Artist" value={artist} onChange={(e) => setArtist(e.target.value)} required />
                <Input label="Genre" value={genre} onChange={(e) => setGenre(e.target.value)} />
                <Input label="Subgenre" value={subgenre} onChange={(e) => setSubgenre(e.target.value)} />
                <Input
                    label="Tags (comma-separated)"
                    value={tags}
                    onChange={(e) => setTags(e.target.value)}
                />

                <div className="flex flex-col gap-2">
                    <label className="font-body text-xs font-medium uppercase tracking-wide text-text-secondary">
                        Visibility
                    </label>
                    <select
                        value={visibility}
                        onChange={(e) => setVisibility(e.target.value)}
                        className="rounded-md border border-border bg-surface px-3 py-2 font-body text-sm text-text focus-visible:outline focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-accent"
                    >
                        {VISIBILITY_OPTIONS.map((option) => (
                            <option key={option} value={option}>
                                {option}
                            </option>
                        ))}
                    </select>
                </div>

                <label className="flex items-center gap-2 font-body text-sm text-text">
                    <input
                        type="checkbox"
                        checked={isMix}
                        onChange={(e) => setIsMix(e.target.checked)}
                        className="h-4 w-4 rounded-sm border border-border accent-accent"
                    />
                    This is a mix
                </label>

                {error && <p className="font-body text-xs text-danger">{error}</p>}

                <div className="flex gap-2">
                    <Button type="submit" variant="primary" disabled={saving}>
                        {saving ? "Saving…" : "Save changes"}
                    </Button>
                    <Button type="button" variant="ghost" onClick={onClose} disabled={saving}>
                        Cancel
                    </Button>
                </div>
            </form>
        </Modal>
    );
}

export default TrackEditor;
