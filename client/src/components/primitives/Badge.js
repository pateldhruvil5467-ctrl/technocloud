import React from "react";

/*
 * Badge — TechnoCloud primitive (Phase UI.1).
 *
 * `technical` encodes the platform's core typography rule directly in
 * the API: monospace means this is a fact about the audio (BPM, key,
 * duration, tags). Non-technical badges use the body face for ordinary
 * labels (visibility, status, etc.).
 */

function Badge({ technical = false, className = "", children, ...rest }) {
    return (
        <span
            className={[
                "inline-flex items-center gap-1 rounded-sm border border-border bg-surface-raised px-2 py-0.5",
                technical
                    ? "font-technical text-technical tracking-wide text-text-secondary"
                    : "font-body text-xs text-text-secondary",
                className,
            ].join(" ")}
            {...rest}
        >
            {children}
        </span>
    );
}

export default Badge;
