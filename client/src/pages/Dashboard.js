import React, { useEffect, useState } from "react";
import axios from "axios";

import Sidebar from "../components/Sidebar";
import TrackCard from "../components/TrackCard";
import MusicPlayer from "../components/MusicPlayer";

export default function Dashboard() {
    const [tracks, setTracks] = useState([]);
    const [audio, setAudio] = useState(null);
    const [playingId, setPlayingId] = useState(null);

    const user =
        JSON.parse(localStorage.getItem("user")) || {};

    useEffect(() => {
        fetchTracks();
    }, []);

    const fetchTracks = async () => {
        try {
            const res = await axios.get(
                "http://localhost:5000/api/tracks"
            );

            setTracks(res.data);
        } catch (err) {
            console.log(err);
        }
    };

    const handlePlay = (track) => {
        if (audio) {
            audio.pause();
        }

        const newAudio = new Audio(
            `http://localhost:5000/${track.audioUrl}`
        );

        newAudio.play();

        setAudio(newAudio);
        setPlayingId(track._id);
    };

    const currentTrack = tracks.find(
        (t) => t._id === playingId
    );

    return (
        <div
            style={{
                display: "flex",
                background:
                    "radial-gradient(circle at top left,#00f5c410,transparent 20%), #050505",
                minHeight: "100vh"
            }}
        >
            <Sidebar user={user} />

            <main
                style={{
                    marginLeft: 250,
                    padding: 40,
                    width: "100%"
                }}
            ><div
                className="glass"
                style={{
                    padding: 40,
                    borderRadius: 30,
                    marginBottom: 40,
                    background:
                        "linear-gradient(135deg,#00f5c410,#0066ff10)"
                }}
            >
                    <h1
                        className="neonText"
                        style={{
                            fontSize: 48,
                            marginBottom: 15
                        }}
                    >
                        Feel The Beat
                    </h1>

                    <p
                        style={{
                            color: "#aaa",
                            fontSize: 48,
                            fontWeight: 700
                        }}
                    >
                        Stream futuristic electronic music on TechnoCloud
                    </p>
                </div>
                <h1
                    style={{
                        marginBottom: 30,
                        fontSize: 42
                    }}
                >
                    Discover Music
                </h1>

                <div
                    style={{
                        display: "grid",
                        gridTemplateColumns:
                            "repeat(auto-fill, minmax(240px,1fr))",
                        gap: 25,
                        paddingBottom: 120
                    }}
                >
                    {tracks.map((track) => (
                        <TrackCard
                            key={track._id}
                            track={track}
                            isPlaying={
                                playingId === track._id
                            }
                            onPlay={() =>
                                handlePlay(track)
                            }
                        />
                    ))}
                </div>
            </main>

            <MusicPlayer
                currentTrack={currentTrack}
                audio={audio}
            />
        </div>
    );
}