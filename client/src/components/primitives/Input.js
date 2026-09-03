import React, { useId } from "react";

/*
 * Input — TechnoCloud primitive (Phase UI.1).
 *
 * Always renders a real <label>, associated via a stable generated id
 * (React's useId) unless the caller supplies its own `id`. Placeholder
 * text is never a substitute for the label.
 */

function Input({ label, error, id, className = "", ...rest }) {
    const generatedId = useId();
    const inputId = id || generatedId;
    const errorId = `${inputId}-error`;

    return (
        <div className="flex flex-col gap-2">
            {label && (
                <label
                    htmlFor={inputId}
                    className="font-body text-xs font-medium uppercase tracking-wide text-text-secondary"
                >
                    {label}
                </label>
            )}
            <input
                id={inputId}
                aria-invalid={error ? "true" : undefined}
                aria-describedby={error ? errorId : undefined}
                className={[
                    "rounded-md border bg-surface px-3 py-2",
                    "font-body text-sm text-text placeholder:text-text-faint",
                    "transition-colors duration-fast",
                    "focus-visible:outline focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-accent",
                    error ? "border-danger" : "border-border",
                    className,
                ].join(" ")}
                {...rest}
            />
            {error && (
                <p id={errorId} className="font-body text-xs text-danger">
                    {error}
                </p>
            )}
        </div>
    );
}

export default Input;
