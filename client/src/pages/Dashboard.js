import { useEffect, useState } from "react";
import axios from "axios";

import TrackCard from "../components/TrackCard";
import { API_BASE_URL } from "../services/api";
import { usePlayer } from "../context/PlayerContext";

function Dashboard() {

    const [tracks, setTracks] = useState([]);
    const { playTrack } = usePlayer();

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
                color: "white",
            }}
        >

            {/* TRACK LIST */}

            <div
                style={{
                    display: "flex",
                    flexDirection: "column",
                    gap: "24px",
                    maxWidth: "1100px",
                }}
            >

                {tracks.map((track) => (

                    <TrackCard
                        key={track._id}
                        track={track}
                        onPlay={playTrack}
                    />

                ))}

            </div>

        </div>
    );
}

export default Dashboard;