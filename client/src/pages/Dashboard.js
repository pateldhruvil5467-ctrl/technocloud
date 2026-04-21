import React, { useEffect, useState } from "react";
import axios from "axios";
import PlayerBar from "../components/PlayerBar";


export default function Dashboard() {
    const [tracks, setTracks] = useState([]);
    const [playingId, setPlayingId] = useState(null);
    const [audio, setAudio] = useState(null);
    const [liked, setLiked] = useState(new Set());

    // 🎧 FETCH TRACKS
    useEffect(() => {
        axios.get("http://localhost:5000/api/tracks")
            .then(res => {
                setTracks(res.data);
                if (res.data.length > 0) {
                    handlePlay(res.data[0]);
                }
            })
            .catch(err => console.log(err));
    }, []);

    // ▶️ PLAY HANDLER (CORE LOGIC)
    const handlePlay = (track) => {
        if (audio) {
            audio.pause();
        }

        const newAudio = new Audio(`http://localhost:5000/${track.audioUrl}`);
        newAudio.play();

        setAudio(newAudio);
        setPlayingId(track._id);
    };

    // ❤️ LIKE TOGGLE
    const toggleLike = (id) => {
        setLiked(prev => {
            const next = new Set(prev);
            next.has(id) ? next.delete(id) : next.add(id);
            return next;
        });
    };

    const currentTrack = tracks.find(t => t._id === playingId);

    return (
        <div style={{
            display: "flex",
            height: "100vh",
            background: "#0a0a0a",
            color: "white"
        }}>

            {/* SIDEBAR */}
            <aside style={{
                width: 220,
                padding: 20,
                borderRight: "1px solid #222"
            }}>
                <h2>🎧 TechnoCloud</h2>
                <p style={{ color: "#00f5c4" }}>Home</p>
                <p style={{ color: "#aaa" }}>Upload</p>
            </aside>

            {/* MAIN */}
            <main style={{
                flex: 1,
                padding: "30px",
                maxWidth: "900px",
                margin: "0 auto",
                paddingBottom: "100px"
            }}>

                <h2 style={{ marginBottom: 20 }}>Featured Tracks</h2>

                <div style={{ display: "flex", flexDirection: "column", gap: 10 }}>
                    {tracks.map((track, index) => (
                        <TrackRow
                            key={track._id}
                            track={track}
                            index={index}
                            isPlaying={playingId === track._id}
                            isLiked={liked.has(track._id)}
                            onPlay={() => handlePlay(track)}
                            onLike={() => toggleLike(track._id)}
                        />
                    ))}
                </div>

                {/* NOW PLAYING */}
                <PlayerBar track={currentTrack} audio={audio} />
            </main>
        </div>
    );
}
/* ================= TRACK ROW ================= */
function TrackRow({ track, index, isPlaying, isLiked, onPlay, onLike }) {
    return (
        <div
            onClick={onPlay}
            style={{
                display: "flex",
                alignItems: "center",
                justifyContent: "space-between",
                padding: "16px",
                borderRadius: "12px",
                background: isPlaying
                    ? "linear-gradient(90deg, #00f5c420, transparent)"
                    : "#111",
                border: "1px solid #222",
                cursor: "pointer"
            }}
        >
            {/* LEFT */}
            <div style={{ display: "flex", alignItems: "center", gap: 12 }}>
                <div style={{ width: 30 }}>
                    {isPlaying ? "▶" : index + 1}
                </div>

                <div>
                    <div style={{
                        fontWeight: 600,
                        color: isPlaying ? "#00f5c4" : "#fff"
                    }}>
                        {track.title}
                    </div>

                    <div style={{ fontSize: 12, color: "#aaa" }}>
                        {track.artist}
                    </div>
                </div>
            </div>

            {/* RIGHT */}
            <button
                onClick={(e) => {
                    e.stopPropagation();
                    onLike();
                }}
                style={{
                    background: "none",
                    border: "none",
                    fontSize: 18,
                    cursor: "pointer"
                }}
            >
                {isLiked ? "❤️" : "🤍"}
            </button>
        </div>
    );
}

/* ================= NOW PLAYING ================= */
function NowPlayingPanel({ track, audio }) {
    if (!track) return null;

    return (
        <div style={{
            marginTop: 30,
            padding: 20,
            border: "1px solid #333",
            borderRadius: 12
        }}>
            <h3>Now Playing</h3>

            <p>{track.title} - {track.artist}</p>

            {audio && (
                <div style={{ marginTop: 10 }}>
                    <button onClick={() => audio.play()}>▶ Play</button>
                    <button onClick={() => audio.pause()}>⏸ Pause</button>
                </div>
            )}
        </div>
    );
}