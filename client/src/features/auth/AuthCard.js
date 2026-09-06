import React from "react";

/*
 * AuthCard — Phase UI.5-A.
 *
 * The one thing LoginPage and RegisterPage genuinely share: a centered
 * card on an empty page, with the TechnoCloud wordmark, an optional
 * title/subtitle, and an optional footer line (the "switch to the other
 * auth page" link). Everything page-specific — the actual form, its
 * fields, its submit behavior — stays in the page itself; this is
 * layout/presentation only, deliberately kept that small.
 *
 * Mirrors the wordmark treatment already established in NavRail.js
 * ("TC" / "TechnoCloud" in font-display with an accent-colored first
 * word) and Modal.js's card styling (rounded-md border bg-surface +
 * shadow-elevation) — no new visual vocabulary introduced.
 */
function AuthCard({ title, subtitle, children, footer }) {
    return (
        <div className="flex min-h-screen items-center justify-center bg-bg px-4 py-12">
            <div className="w-full max-w-sm rounded-md border border-border bg-surface p-6 shadow-elevation sm:p-8">
                <div className="mb-8 flex flex-col items-center gap-3 text-center">
                    <span className="font-display text-lg font-semibold tracking-wide text-text">
                        <span className="text-accent">Techno</span>Cloud
                    </span>

                    {title && (
                        <h1 className="font-display text-display-sm font-semibold text-text">{title}</h1>
                    )}

                    {subtitle && (
                        <p className="font-body text-sm text-text-secondary">{subtitle}</p>
                    )}
                </div>

                {children}

                {footer && (
                    <div className="mt-6 text-center font-body text-sm text-text-secondary">{footer}</div>
                )}
            </div>
        </div>
    );
}

export default AuthCard;
