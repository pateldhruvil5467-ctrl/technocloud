import React from "react";

export default function TrackCard({
    track,
    isPlaying,
    onPlay
}) {
    return (
        <div
            onClick={onPlay}
            className="glass"
            style={{
                padding: 20,
                borderRadius: 20,
                cursor: "pointer",
                transition: "0.3s",
                border: isPlaying
                    ? "1px solid #00f5c4"
                    : "1px solid rgba(255,255,255,0.05)"
            }}
        >
            <div
                style={{
                    height: 180,
                    borderRadius: 15,
                    marginBottom: 15,
                    background:
                        "linear-gradient(135deg,#00f5c4,#0066ff)",
                    position: "relative"
                }}
            >
                <div
                    style={{
                        position: "absolute",
                        inset: 0,
                        background:
                            "url('https://images.unsplash.com/photo-1493225457124-a3eb161ffa5f?q=80&w=1200') center/cover",
                        opacity: 0.35,
                        borderRadius: 15
                    }}
                />
            </div>

            <h3>{track.title}</h3>

            <p style={{ color: "#999" }}>
                {track.artist}
            </p>
        </div>
    );
}