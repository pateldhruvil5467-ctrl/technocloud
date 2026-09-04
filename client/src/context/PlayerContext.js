import {
    createContext,
    useCallback,
    useContext,
    useEffect,
    useRef,
    useState,
} from "react";

import { API_BASE_URL } from "../services/api";

/*
 * TechnoCloud application-level player (Phase UI.2).
 *
 * Single source of playback truth. Mounted once, high in the tree (see
 * index.js), so it never unmounts on route navigation — this is what
 * makes playback survive moving between pages. The native <audio>
 * element lives here, not in any page or in PlayerBar; PlayerBar (and
 * anything else) only ever reads state/calls actions through usePlayer().
 */

const PlayerContext = createContext(null);

const VOLUME_STORAGE_KEY = "technocloud:player:volume";

function getStoredVolume() {
    try {
        const stored = window.localStorage.getItem(VOLUME_STORAGE_KEY);
        const parsed = stored !== null ? Number(stored) : NaN;
        return Number.isFinite(parsed) ? Math.min(1, Math.max(0, parsed)) : 1;
    } catch (error) {
        return 1;
    }
}

export function PlayerProvider({ children }) {
    const audioRef = useRef(null);

    const [currentTrack, setCurrentTrack] = useState(null);
    const [isPlaying, setIsPlaying] = useState(false);
    const [currentTime, setCurrentTime] = useState(0);
    const [duration, setDuration] = useState(0);
    const [volume, setVolumeState] = useState(getStoredVolume);
    const [error, setError] = useState(null);

    // Load a new track's src whenever it changes, then play it. Playing
    // the *same* track again (see playTrack below) is handled as a
    // resume instead of reaching this effect, so it never restarts from 0.
    useEffect(() => {
        const audio = audioRef.current;
        if (!audio || !currentTrack) return;

        audio.src = `${API_BASE_URL}/uploads/${currentTrack.audio}`;
        audio.currentTime = 0;
        setCurrentTime(0);
        setError(null);

        const playPromise = audio.play();
        if (playPromise && typeof playPromise.catch === "function") {
            playPromise.catch(() => {
                // Browser blocked autoplay, or the track failed to load —
                // fail quietly into a paused state instead of throwing.
                setIsPlaying(false);
            });
        }
        // currentTrack is the only thing that should re-trigger a load.
        // eslint-disable-next-line react-hooks/exhaustive-deps
    }, [currentTrack]);

    // Keep the <audio> element's volume in sync and persist the
    // preference — a low-risk UI setting, not identity/security data.
    useEffect(() => {
        if (audioRef.current) {
            audioRef.current.volume = volume;
        }
        try {
            window.localStorage.setItem(VOLUME_STORAGE_KEY, String(volume));
        } catch (error) {
            // Ignore storage failures (private browsing, quota, etc).
        }
    }, [volume]);

    const playTrack = useCallback(
        (track) => {
            if (!track) return;

            if (currentTrack && currentTrack._id === track._id) {
                // Already the active track — resume rather than reload.
                const audio = audioRef.current;
                if (audio && audio.paused) {
                    audio.play().catch(() => setIsPlaying(false));
                }
                return;
            }

            setCurrentTrack(track);
        },
        [currentTrack]
    );

    const togglePlayPause = useCallback(() => {
        const audio = audioRef.current;
        if (!audio || !currentTrack) return;

        if (audio.paused) {
            audio.play().catch(() => setIsPlaying(false));
        } else {
            audio.pause();
        }
    }, [currentTrack]);

    const pause = useCallback(() => {
        audioRef.current?.pause();
    }, []);

    const seek = useCallback((time) => {
        const audio = audioRef.current;
        if (!audio || !Number.isFinite(time)) return;
        audio.currentTime = time;
        setCurrentTime(time);
    }, []);

    const setVolume = useCallback((value) => {
        if (!Number.isFinite(value)) return;
        setVolumeState(Math.min(1, Math.max(0, value)));
    }, []);

    // <audio> element events are the real source of truth for playback
    // state — these handlers just mirror it into React state for the UI.
    const handleTimeUpdate = useCallback((e) => {
        setCurrentTime(e.currentTarget.currentTime);
    }, []);

    const handleDurationChange = useCallback((e) => {
        const value = e.currentTarget.duration;
        setDuration(Number.isFinite(value) ? value : 0);
    }, []);

    const handlePlay = useCallback(() => setIsPlaying(true), []);
    const handlePause = useCallback(() => setIsPlaying(false), []);

    const handleEnded = useCallback(() => {
        setIsPlaying(false);
        setCurrentTime(0);
    }, []);

    const handleError = useCallback(() => {
        setIsPlaying(false);
        setError("This track couldn't be played.");
    }, []);

    const value = {
        currentTrack,
        isPlaying,
        currentTime,
        duration,
        volume,
        error,
        playTrack,
        togglePlayPause,
        pause,
        seek,
        setVolume,
    };

    return (
        <PlayerContext.Provider value={value}>
            {children}
            <audio
                ref={audioRef}
                preload="metadata"
                onTimeUpdate={handleTimeUpdate}
                onDurationChange={handleDurationChange}
                onLoadedMetadata={handleDurationChange}
                onPlay={handlePlay}
                onPause={handlePause}
                onEnded={handleEnded}
                onError={handleError}
            />
        </PlayerContext.Provider>
    );
}

export function usePlayer() {
    const context = useContext(PlayerContext);
    if (!context) {
        throw new Error("usePlayer must be used within a PlayerProvider");
    }
    return context;
}
