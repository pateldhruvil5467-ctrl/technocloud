import React from "react";

/*
 * EmptyState — TechnoCloud primitive (Phase UI.3).
 *
 * Used both for genuine empty results ("No tracks yet.") and for
 * not-found states (invalid track/artist id) — neither is retryable,
 * which is what distinguishes this from ErrorState. `action` is an
 * optional slot (e.g. a Button) for the rare case there's something
 * meaningful to do about it; most callers omit it.
 */
function EmptyState({ message, action }) {
    return (
        <div className="flex flex-col items-center justify-center gap-3 rounded-md border border-border bg-surface px-6 py-16 text-center">
            <p className="font-body text-sm text-text-secondary">{message}</p>
            {action}
        </div>
    );
}

export default EmptyState;
