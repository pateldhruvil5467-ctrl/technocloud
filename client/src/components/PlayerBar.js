import React, { useEffect, useState } from "react";

export default function PlayerBar({ track, audio }) {
    const [currentTime, setCurrentTime] = useState(0);
    const [duration, setDuration] = useState(0);

    useEffect(() => {
        if (!audio) return;

        const updateTime = () => {
            setCurrentTime(audio.currentTime);
            setDuration(audio.duration || 0);
        };

        audio.addEventListener("timeupdate", updateTime);

        return () => {
            audio.removeEventListener("timeupdate", updateTime);
        };
    }, [audio]);

    if (!track) return null;

    const formatTime = (time) => {
        const min = Math.floor(time / 60);
        const sec = Math.floor(time % 60);
        return `${min}:${sec < 10 ? "0" : ""}${sec}`;
    };

    const handleSeek = (e) => {
        const value = e.target.value;
        audio.currentTime = value;
        setCurrentTime(value);
    };

    return (
        <div style={{
            position: "fixed",
            bottom: 0,
            left: 0,
            right: 0,
            height: 80,
            background: "#111",
            borderTop: "1px solid #222",
            display: "flex",
            alignItems: "center",
            justifyContent: "space-between",
            padding: "0 20px",
            zIndex: 1000
        }}>

            {/* LEFT: TRACK INFO */}
            <div>
                <div style={{ fontWeight: 600 }}>{track.title}</div>
                <div style={{ fontSize: 12, color: "#aaa" }}>{track.artist}</div>
            </div>

            {/* CENTER: CONTROLS */}
            <div style={{ display: "flex", alignItems: "center", gap: 10 }}>
                <button onClick={() => audio?.play()}>▶</button>
                <button onClick={() => audio?.pause()}>⏸</button>
            </div>

            {/* RIGHT: PROGRESS */}
            <div style={{ display: "flex", alignItems: "center", gap: 10, width: 300 }}>
                <span>{formatTime(currentTime)}</span>

                <input
                    type="range"
                    min="0"
                    max={duration || 0}
                    value={currentTime}
                    onChange={handleSeek}
                    style={{ flex: 1 }}
                />

                <span>{formatTime(duration)}</span>
            </div>
        </div>
    );
}