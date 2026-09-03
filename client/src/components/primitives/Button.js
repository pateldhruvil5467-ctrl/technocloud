import React from "react";

/*
 * Button — TechnoCloud primitive (Phase UI.1).
 *
 * Four variants only: primary (the one accent action per view), secondary
 * (default action), ghost (low-emphasis/inline action), danger (destructive,
 * text/border only — never a solid danger fill by default, so it doesn't
 * compete with the accent as a second "loud" color).
 */

const VARIANT_CLASSES = {
    primary:
        "bg-accent text-accent-foreground hover:brightness-110 active:brightness-90",
    secondary:
        "bg-surface-raised text-text border border-border hover:border-border-strong",
    ghost:
        "bg-transparent text-text-secondary hover:text-text hover:bg-surface-raised",
    danger:
        "bg-transparent text-danger border border-danger hover:bg-danger hover:text-accent-foreground",
};

function Button({
    variant = "primary",
    type = "button",
    disabled = false,
    className = "",
    children,
    ...rest
}) {
    const variantClass = VARIANT_CLASSES[variant] || VARIANT_CLASSES.primary;

    return (
        <button
            type={type}
            disabled={disabled}
            className={[
                "inline-flex items-center justify-center gap-2",
                "rounded-md px-4 py-2",
                "font-body text-sm font-medium",
                "transition-colors duration-fast",
                "focus-visible:outline focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-accent",
                "disabled:opacity-40 disabled:cursor-not-allowed disabled:pointer-events-none",
                variantClass,
                className,
            ].join(" ")}
            {...rest}
        >
            {children}
        </button>
    );
}

export default Button;
