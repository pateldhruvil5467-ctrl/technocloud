import { useEffect, useRef, useState } from "react";

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

    const audioRef = useRef(null);

    const [duration, setDuration] = useState(0);

    const [currentTime, setCurrentTime] = useState(0);

    useEffect(() => {

        if (!audioRef.current || !currentTrack) return;

        if (isPlaying) {

            audioRef.current
                .play()
                .catch((err) => console.log(err));

        } else {

            audioRef.current.pause();
        }

    }, [isPlaying, currentTrack]);

    const handleLoadedMetadata = () => {

        setDuration(audioRef.current.duration);
    };

    const handleTimeUpdate = () => {

        setCurrentTime(audioRef.current.currentTime);
    };

    const formatTime = (time) => {

        if (!time) return "0:00";

        const minutes = Math.floor(time / 60);

        const seconds = Math.floor(time % 60);

        return `${minutes}:${seconds < 10 ? "0" : ""}${seconds}`;
    };

    return (

        <div className="fixed bottom-0 left-0 right-0 h-[95px] bg-black/95 border-t border-cyan-400/20 backdrop-blur-lg flex items-center justify-between px-8 z-50">

            {/* LEFT */}

            <div className="flex items-center gap-4 w-[300px]">

                <div className="w-14 h-14 rounded-2xl bg-gradient-to-br from-cyan-400 to-blue-500"></div>

                <div>

                    <h3 className="text-white font-semibold">
                        {currentTrack?.title || "No Track Selected"}
                    </h3>

                    <p className="text-gray-400 text-sm">
                        {currentTrack?.artist || "Select a track"}
                    </p>

                </div>

            </div>

            {/* CENTER */}

            <div className="flex flex-col items-center flex-1 max-w-[600px]">

                <div className="flex items-center gap-8 mb-2">

                    <button className="text-white text-xl">
                        <FaStepBackward />
                    </button>

                    <button
                        onClick={() => setIsPlaying(!isPlaying)}
                        className="w-16 h-16 rounded-full bg-cyan-400 flex items-center justify-center text-black text-2xl shadow-[0_0_25px_#00ffd5]"
                    >

                        {isPlaying ? <FaPause /> : <FaPlay />}

                    </button>

                    <button className="text-white text-xl">
                        <FaStepForward />
                    </button>

                </div>

                <div className="flex items-center gap-3 w-full">

                    <span className="text-gray-400 text-sm">
                        {formatTime(currentTime)}
                    </span>

                    <input
                        type="range"
                        min="0"
                        max={duration || 0}
                        value={currentTime}
                        onChange={(e) => {
                            audioRef.current.currentTime = e.target.value;
                            setCurrentTime(e.target.value);
                        }}
                        className="flex-1"
                    />

                    <span className="text-gray-400 text-sm">
                        {formatTime(duration)}
                    </span>

                </div>

            </div>

            {/* RIGHT */}

            <div className="w-[300px] text-right text-gray-500">
                TechnoCloud v1
            </div>

            {/* AUDIO */}

            {
                currentTrack && (

                    <audio
                        ref={audioRef}
                        src={currentTrack.audio}
                        onLoadedMetadata={handleLoadedMetadata}
                        onTimeUpdate={handleTimeUpdate}
                    />
                )
            }

        </div>
    );
}

export default MusicPlayer;