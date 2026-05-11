import React from "react";

export default function MusicPlayer({
    currentTrack,
    audio
}) {
    if (!currentTrack) return null;

    return (
        <div
            className="glass"
            style={{
                position: "fixed",
                bottom: 0,
                left: 250,
                right: 0,
                height: 90,
                display: "flex",
                alignItems: "center",
                justifyContent: "space-between",
                padding: "0 40px",
                borderTop:
                    "1px solid rgba(255,255,255,0.05)"
            }}
        >
            <div>
                <h3>{currentTrack.title}</h3>
                <p style={{ color: "#999" }}>
                    {currentTrack.artist}
                </p>
            </div>

            <div
                style={{
                    display: "flex",
                    gap: 20
                }}
            >
                <button
                    className="neonGlow"
                    onClick={() => audio?.play()}
                    style={btn}
                >
                    ▶
                </button>

                <button
                    onClick={() => audio?.pause()}
                    style={btn}
                >
                    ⏸
                </button>
            </div>
        </div>
    );
}

const btn = {
    width: 50,
    height: 50,
    borderRadius: "50%",
    border: "none",
    background: "#00f5c4",
    cursor: "pointer",
    fontSize: 20,
    fontWeight: "bold"
};