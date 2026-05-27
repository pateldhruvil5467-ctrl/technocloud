import { useEffect, useState } from "react";
import axios from "axios";

import Sidebar from "../components/Sidebar";
import TrackCard from "../components/TrackCard";
import MusicPlayer from "../components/MusicPlayer";

function HomePage() {

    const [tracks, setTracks] = useState([]);
    const [currentTrack, setCurrentTrack] = useState(null);

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

    return (

        <div
            style={{
                background: "#000",
                minHeight: "100vh",
                color: "white",
            }}
        >

            <Sidebar />

            <div
                style={{
                    marginLeft: "320px",
                    padding: "50px",
                    paddingBottom: "180px",
                }}
            >

                <h1
                    style={{
                        fontSize: "72px",
                        marginBottom: "10px",
                    }}
                >
                    Discover Music
                </h1>

                <p
                    style={{
                        color: "#777",
                        fontSize: "28px",
                        marginBottom: "40px",
                    }}
                >
                    Stream futuristic sounds
                </p>

                {/* TRACK LIST */}

                <div
                    style={{
                        display: "flex",
                        flexDirection: "column",
                        gap: "20px",
                        width: "100%",
                        maxWidth: "1100px",
                    }}
                >

                    {tracks.map((track) => (

                        <TrackCard
                            key={track._id}
                            track={track}
                            onPlay={setCurrentTrack}
                        />

                    ))}

                </div>

            </div>

            <MusicPlayer track={currentTrack} />

        </div>
    );
}

export default HomePage;