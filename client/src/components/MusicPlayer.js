import { useContext, useEffect, useRef, useState } from "react";
import { PlayerContext } from "../context/PlayerContext";

function MusicPlayer() {

    const { currentTrack } = useContext(PlayerContext);

    const audioRef = useRef(null);

    const [isPlaying, setIsPlaying] = useState(false);

    const [currentTime, setCurrentTime] = useState(0);

    const [duration, setDuration] = useState(0);

    // PLAY TRACK WHEN SELECTED

    useEffect(() => {

        if (currentTrack && audioRef.current) {

            audioRef.current.src = currentTrack.audio;

            audioRef.current.play()
                .then(() => {
                    setIsPlaying(true);
                })
                .catch((err) => {
                    console.log(err);
                });
        }

    }, [currentTrack]);

    // PLAY / PAUSE

    const togglePlay = () => {

        if (!audioRef.current) return;

        if (isPlaying) {

            audioRef.current.pause();
            setIsPlaying(false);

        } else {

            audioRef.current.play();
            setIsPlaying(true);
        }
    };

    // UPDATE TIME

    const handleTimeUpdate = () => {

        setCurrentTime(audioRef.current.currentTime);

        setDuration(audioRef.current.duration || 0);
    };

    // FORMAT TIME

    const formatTime = (time) => {

        if (!time) return "0:00";

        const minutes = Math.floor(time / 60);

        const seconds = Math.floor(time % 60);

        return `${minutes}:${seconds < 10 ? "0" : ""}${seconds}`;
    };

    return (

        <div className="fixed bottom-0 left-0 right-0 h-24 bg-black/95 border-t border-cyan-500/20 backdrop-blur-xl flex items-center justify-between px-8 z-50">

            {/* AUDIO ELEMENT */}

            <audio
                ref={audioRef}
                onTimeUpdate={handleTimeUpdate}
            />

            {/* TRACK INFO */}

            <div className="flex items-center gap-4 w-[250px]">

                <div className="w-16 h-16 rounded-2xl bg-gradient-to-br from-cyan-400 to-violet-600 shadow-[0_0_25px_rgba(0,255,213,0.4)]"></div>

                <div>

                    <h3 className="text-white font-bold">

                        {currentTrack?.title || "No Track Selected"}

                    </h3>

                    <p className="text-gray-400 text-sm">

                        {currentTrack?.artist || "Select a track"}

                    </p>

                </div>

            </div>

            {/* PLAYER CONTROLS */}

            <div className="flex flex-col items-center flex-1 max-w-2xl">

                <button
                    onClick={togglePlay}
                    className="w-16 h-16 rounded-full bg-cyan-400 text-black text-2xl font-bold shadow-[0_0_30px_rgba(0,255,213,0.7)] hover:scale-105 transition"
                >

                    {isPlaying ? "❚❚" : "▶"}

                </button>

                <div className="flex items-center gap-3 w-full mt-3">

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
                        className="w-full accent-cyan-400"
                    />

                    <span className="text-gray-400 text-sm">
                        {formatTime(duration)}
                    </span>

                </div>

            </div>

            {/* VERSION */}

            <div className="w-[200px] text-right text-gray-500 text-sm">
                TechnoCloud v1
            </div>

        </div>
    );
}

export default MusicPlayer;