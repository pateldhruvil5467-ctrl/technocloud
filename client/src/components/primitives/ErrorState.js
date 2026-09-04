import React from "react";

import Button from "./Button";

/*
 * ErrorState — TechnoCloud primitive (Phase UI.3).
 *
 * For genuinely retryable failures (network/API errors) — never used
 * for alert(). See EmptyState for not-found/empty-result cases, which
 * aren't retryable.
 */
function ErrorState({ message, onRetry }) {
    return (
        <div className="flex flex-col items-center justify-center gap-3 rounded-md border border-border bg-surface px-6 py-16 text-center">
            <p className="font-body text-sm text-danger">{message}</p>
            {onRetry && (
                <Button variant="secondary" onClick={onRetry}>
                    Retry
                </Button>
            )}
        </div>
    );
}

export default ErrorState;
