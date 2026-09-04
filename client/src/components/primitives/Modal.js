import React, { useEffect } from "react";

/*
 * Modal — TechnoCloud primitive (Phase UI.4).
 *
 * A minimal centered dialog overlay. Added for the Artist Studio's edit
 * and delete-confirmation flows, which both need the same
 * overlay/ESC-to-close/backdrop-click-to-close behavior — no existing
 * primitive covered this before now.
 */
function Modal({ title, onClose, children }) {
    useEffect(() => {
        function handleKeyDown(e) {
            if (e.key === "Escape") onClose();
        }
        window.addEventListener("keydown", handleKeyDown);
        return () => window.removeEventListener("keydown", handleKeyDown);
    }, [onClose]);

    return (
        <div
            className="fixed inset-0 z-50 flex items-center justify-center bg-black/60 p-4"
            onMouseDown={(e) => {
                if (e.target === e.currentTarget) onClose();
            }}
        >
            <div
                role="dialog"
                aria-modal="true"
                aria-labelledby="modal-title"
                className="flex max-h-[90vh] w-full max-w-md flex-col gap-4 overflow-y-auto rounded-md border border-border bg-surface p-6 shadow-elevation"
            >
                <h2 id="modal-title" className="font-display text-lg font-semibold text-text">
                    {title}
                </h2>
                {children}
            </div>
        </div>
    );
}

export default Modal;
