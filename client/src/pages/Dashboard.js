import { useEffect, useState } from "react";
import axios from "axios";

import Sidebar from "../components/Sidebar";
import TrackCard from "../components/TrackCard";
import MusicPlayer from "../components/MusicPlayer";
import Topbar from "../components/Topbar";
import { API_BASE_URL } from "../services/api";

function Dashboard() {

    const [tracks, setTracks] = useState([]);
    const [currentTrack, setCurrentTrack] = useState(null);

    const user = JSON.parse(sessionStorage.getItem("user"));

    useEffect(() => {

        fetchTracks();

    }, []);

    const fetchTracks = async () => {

        try {

            const res = await axios.get(
                `${API_BASE_URL}/api/tracks`
            );

            console.log(res.data);

            setTracks(res.data);

        } catch (error) {

            console.log(error);

        }
    };

    return (

        <div
            style={{
                backgroundColor: "#000",
                minHeight: "100vh",
                color: "white",
                overflowX: "hidden",
            }}
        >

            <Sidebar />

            <div
                style={{
                    marginLeft: "300px",
                    padding: "40px",
                    paddingBottom: "180px",
                }}
            >

                {/* TOPBAR */}

                <Topbar
                    user={user}
                    setUser={() => {
                        sessionStorage.clear();
                        window.location.href = "/login";
                    }}
                />

                {/* TRACK LIST */}

                <div
                    style={{
                        display: "flex",
                        flexDirection: "column",
                        gap: "24px",
                        marginTop: "40px",
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

            {/* MUSIC PLAYER */}

            {currentTrack && (

                <MusicPlayer track={currentTrack} />

            )}

        </div>
    );
}

export default Dashboard;