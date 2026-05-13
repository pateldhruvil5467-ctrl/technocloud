import React, { useEffect, useRef, useState } from "react";
import {
    FaPlay,
    FaPause,
    FaStepBackward,
    FaStepForward,
} from "react-icons/fa";

function MusicPlayer({
    currentTrack,
    isPlaying,
    setIsPlaying,
}) {
    const [playing, setPlaying] = useState(false);

    const audioRef = useRef(null);
    const [currentTime, setCurrentTime] = useState(0);
    const [duration, setDuration] = useState(0);

    useEffect(() => {
        const audio = audioRef.current;

        if (!audio || !currentTrack) return;

        if (isPlaying) {
            audio
                .play()
                .catch((err) => console.log("Playback prevented:", err));
        } else {
            audio.pause();
        }

        const updateTime = () => {
            setCurrentTime(audio.currentTime);
            setDuration(audio.duration || 0);
        };

        audio.addEventListener("timeupdate", updateTime);
        audio.addEventListener("loadedmetadata", updateTime);

        return () => {
            audio.removeEventListener("timeupdate", updateTime);
            audio.removeEventListener("loadedmetadata", updateTime);
        };
    }, [isPlaying, currentTrack]);

    const formatTime = (time) => {
        if (!time) return "0:00";

        const minutes = Math.floor(time / 60);
        const seconds = Math.floor(time % 60);

        return `${minutes}:${seconds < 10 ? "0" : ""}${seconds}`;
    };

    return (
        <div className="fixed bottom-0 left-0 w-full h-24 bg-black/90 backdrop-blur-xl border-t border-cyan-500/20 flex items-center justify-between px-8 z-50">

            {/* LEFT */}
            <div className="flex items-center gap-4">
                <div className="w-14 h-14 rounded-xl bg-gradient-to-br from-cyan-400 to-purple-600 shadow-[0_0_20px_#00ffe0]"></div>

                <div>
                    <h3 className="text-white font-semibold text-sm">
                        {currentTrack?.title || "No Track Selected"}
                    </h3>

                    <p className="text-gray-400 text-xs">
                        {currentTrack?.artist || "Select a track"}
                    </p>
                </div>
            </div>

            {/* CENTER CONTROLS */}
            <div className="flex flex-col items-center w-[40%]">

                <div className="flex items-center gap-6 text-white mb-2">
                    <button className="hover:text-cyan-400 transition">
                        <FaStepBackward />
                    </button>

                    <button
                        onClick={() => setIsPlaying(!isPlaying)}
                        className="w-12 h-12 rounded-full bg-cyan-400 text-black flex items-center justify-center shadow-[0_0_25px_#00ffe0] hover:scale-110 transition"
                    >
                        {isPlaying ? <FaPause /> : <FaPlay />}
                    </button>

                    <button className="hover:text-cyan-400 transition">
                        <FaStepForward />
                    </button>
                </div>

                {/* PROGRESS BAR */}
                <div className="w-full flex items-center gap-3">
                    <span className="text-xs text-gray-400">{formatTime(currentTime)}</span>

                    <div className="flex-1 h-1 bg-gray-800 rounded-full overflow-hidden">
                        <div
                            className="h-full bg-cyan-400 shadow-[0_0_10px_#00ffe0]"
                            style={{
                                width: `${duration ? (currentTime / duration) * 100 : 0}%`,
                            }}
                        ></div>
                    </div>

                    <span className="text-xs text-gray-400">{formatTime(duration)}</span>
                </div>
            </div>

            {/* RIGHT */}
            <div className="text-gray-400 text-sm">
                TechnoCloud v1
            </div>
            <audio
                ref={audioRef}
                src={currentTrack?.audio || ""}
            />
        </div>
    );
}

export default MusicPlayer;