import React from "react";

/*
 * Skeleton — TechnoCloud primitive (Phase UI.1).
 *
 * A plain loading-placeholder surface. Uses Tailwind's built-in
 * animate-pulse rather than a custom animation system; the app-wide
 * reduced-motion rule in global.css neutralizes it for users who
 * request reduced motion. Size is left entirely to the caller via
 * className (e.g. "w-full h-20") — no width/height prop API to guess.
 */

function Skeleton({ className = "", ...rest }) {
    return (
        <div
            aria-hidden="true"
            className={["animate-pulse rounded-md bg-surface-raised", className].join(" ")}
            {...rest}
        />
    );
}

export default Skeleton;
