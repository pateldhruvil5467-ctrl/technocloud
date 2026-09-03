import React from "react";

/*
 * Avatar — TechnoCloud primitive (Phase UI.1).
 *
 * Image when available, falls back to a monogram derived from `name`.
 * Sizes are a fixed small scale (not arbitrary px) to stay consistent
 * with the rest of the token system.
 */

const SIZE_CLASSES = {
    sm: "w-8 h-8 text-xs",
    md: "w-10 h-10 text-sm",
    lg: "w-14 h-14 text-lg",
};

function initials(name) {
    return (name || "")
        .trim()
        .split(/\s+/)
        .slice(0, 2)
        .map((part) => part[0]?.toUpperCase())
        .join("");
}

function Avatar({ src, name = "", size = "md", className = "", ...rest }) {
    const sizeClass = SIZE_CLASSES[size] || SIZE_CLASSES.md;

    if (src) {
        return (
            <img
                src={src}
                alt={name}
                className={[
                    "rounded-md border border-border object-cover",
                    sizeClass,
                    className,
                ].join(" ")}
                {...rest}
            />
        );
    }

    return (
        <div
            role="img"
            aria-label={name || "Avatar"}
            className={[
                "flex items-center justify-center rounded-md border border-border bg-surface-raised",
                "font-display text-text-secondary",
                sizeClass,
                className,
            ].join(" ")}
            {...rest}
        >
            {initials(name) || "?"}
        </div>
    );
}

export default Avatar;
