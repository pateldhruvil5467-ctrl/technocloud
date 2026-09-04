import React, { useState } from "react";
import { FiPlay, FiPause, FiVolume2, FiVolumeX, FiChevronUp, FiChevronDown } from "react-icons/fi";

import { usePlayer } from "../../context/PlayerContext";
import Avatar from "../primitives/Avatar";

/*
 * PlayerBar — persistent player UI (Phase UI.2).
 *
 * Pure presentation: reads state and calls actions from usePlayer(),
 * never touches the <audio> element directly (that lives in
 * PlayerContext). Mounted once by AppShell, so it survives navigation
 * the same way the audio element does.
 *
 * Fixed height at every breakpoint (whether or not a track is loaded)
 * so the rest of the shell's layout never shifts.
 */

function formatTime(seconds) {
    if (!Number.isFinite(seconds) || seconds < 0) return "0:00";
    const mins = Math.floor(seconds / 60);
    const secs = Math.floor(seconds % 60);
    return `${mins}:${String(secs).padStart(2, "0")}`;
}

function PlayerBar() {
    const {
        currentTrack,
        isPlaying,
        currentTime,
        duration,
        volume,
        togglePlayPause,
        seek,
        setVolume,
    } = usePlayer();

    const [mobileExpanded, setMobileExpanded] = useState(false);

    const hasTrack = Boolean(currentTrack);
    const progressPct = duration > 0 ? Math.min(100, (currentTime / duration) * 100) : 0;

    function handleSeek(e) {
        const value = Number(e.target.value);
        seek((value / 100) * duration);
    }

    function handleVolume(e) {
        setVolume(Number(e.target.value) / 100);
    }

    return (
        <div
            className="fixed bottom-16 md:bottom-0 left-0 right-0 z-20 border-t border-border bg-surface"
            role="region"
            aria-label="Player"
        >
            {/* ---------- Desktop / tablet (>=768px) ---------- */}
            <div className="hidden md:flex items-center gap-4 h-20 px-4 lg:px-6">
                <button
                    type="button"
                    onClick={togglePlayPause}
                    disabled={!hasTrack}
                    aria-label={isPlaying ? "Pause" : "Play"}
                    className={[
                        "flex items-center justify-center w-11 h-11 rounded-full flex-none",
                        "bg-accent text-accent-foreground transition-colors duration-fast",
                        "hover:brightness-110 active:brightness-90",
                        "focus-visible:outline focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-accent",
                        "disabled:opacity-40 disabled:cursor-not-allowed",
                    ].join(" ")}
                >
                    {isPlaying ? <FiPause size={18} aria-hidden="true" /> : <FiPlay size={18} aria-hidden="true" />}
                </button>

                <Avatar name={currentTrack?.title || currentTrack?.artist || "?"} size="md" />

                <div className="flex flex-col min-w-0 w-40 flex-none">
                    <span className="font-body text-sm text-text truncate">
                        {currentTrack ? currentTrack.title : "Nothing playing"}
                    </span>
                    <span className="font-body text-xs text-text-secondary truncate">
                        {currentTrack ? currentTrack.artist : "Select a track to start"}
                    </span>
                </div>

                <div className="flex items-center gap-2 flex-1 min-w-0">
                    <span className="font-technical text-technical text-text-faint w-10 text-right">
                        {formatTime(currentTime)}
                    </span>
                    <input
                        type="range"
                        min="0"
                        max="100"
                        value={progressPct}
                        onChange={handleSeek}
                        disabled={!hasTrack}
                        aria-label="Seek"
                        className="flex-1 accent-accent disabled:opacity-40"
                    />
                    <span className="font-technical text-technical text-text-faint w-10">
                        {formatTime(duration)}
                    </span>
                </div>

                <div className="hidden lg:flex items-center gap-2 w-32 flex-none">
                    {volume === 0 ? (
                        <FiVolumeX size={16} className="text-text-secondary" aria-hidden="true" />
                    ) : (
                        <FiVolume2 size={16} className="text-text-secondary" aria-hidden="true" />
                    )}
                    <input
                        type="range"
                        min="0"
                        max="100"
                        value={Math.round(volume * 100)}
                        onChange={handleVolume}
                        aria-label="Volume"
                        className="flex-1 accent-accent"
                    />
                </div>
            </div>

            {/* ---------- Mobile (<768px) ---------- */}
            <div className="md:hidden">
                <div className="flex items-center gap-3 h-16 px-4">
                    <button
                        type="button"
                        onClick={() => setMobileExpanded((v) => !v)}
                        disabled={!hasTrack}
                        aria-expanded={mobileExpanded}
                        aria-label={mobileExpanded ? "Collapse player" : "Expand player"}
                        className="flex items-center gap-3 flex-1 min-w-0 text-left focus-visible:outline focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-accent disabled:cursor-default"
                    >
                        <Avatar name={currentTrack?.title || currentTrack?.artist || "?"} size="sm" />
                        <div className="flex flex-col min-w-0 flex-1">
                            <span className="font-body text-sm text-text truncate">
                                {currentTrack ? currentTrack.title : "Nothing playing"}
                            </span>
                            <span className="font-body text-xs text-text-secondary truncate">
                                {currentTrack ? currentTrack.artist : "Select a track to start"}
                            </span>
                        </div>
                        {hasTrack &&
                            (mobileExpanded ? (
                                <FiChevronDown size={16} className="text-text-faint flex-none" aria-hidden="true" />
                            ) : (
                                <FiChevronUp size={16} className="text-text-faint flex-none" aria-hidden="true" />
                            ))}
                    </button>

                    <button
                        type="button"
                        onClick={togglePlayPause}
                        disabled={!hasTrack}
                        aria-label={isPlaying ? "Pause" : "Play"}
                        className={[
                            "flex items-center justify-center w-11 h-11 rounded-full flex-none",
                            "bg-accent text-accent-foreground transition-colors duration-fast",
                            "focus-visible:outline focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-accent",
                            "disabled:opacity-40 disabled:cursor-not-allowed",
                        ].join(" ")}
                    >
                        {isPlaying ? <FiPause size={18} aria-hidden="true" /> : <FiPlay size={18} aria-hidden="true" />}
                    </button>
                </div>

                {mobileExpanded && hasTrack && (
                    <div className="flex flex-col gap-3 px-4 pb-4">
                        <div className="flex items-center gap-2">
                            <span className="font-technical text-technical text-text-faint w-10 text-right">
                                {formatTime(currentTime)}
                            </span>
                            <input
                                type="range"
                                min="0"
                                max="100"
                                value={progressPct}
                                onChange={handleSeek}
                                aria-label="Seek"
                                className="flex-1 accent-accent"
                            />
                            <span className="font-technical text-technical text-text-faint w-10">
                                {formatTime(duration)}
                            </span>
                        </div>
                        <div className="flex items-center gap-2">
                            {volume === 0 ? (
                                <FiVolumeX size={16} className="text-text-secondary" aria-hidden="true" />
                            ) : (
                                <FiVolume2 size={16} className="text-text-secondary" aria-hidden="true" />
                            )}
                            <input
                                type="range"
                                min="0"
                                max="100"
                                value={Math.round(volume * 100)}
                                onChange={handleVolume}
                                aria-label="Volume"
                                className="flex-1 accent-accent"
                            />
                        </div>
                    </div>
                )}
            </div>
        </div>
    );
}

export default PlayerBar;
