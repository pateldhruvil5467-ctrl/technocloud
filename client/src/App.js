import React, { useEffect, useState } from "react";

function App() {
    const [tracks, setTracks] = useState([]);

    useEffect(() => {
        fetch("http://localhost:5000/api/tracks")
            .then((res) => res.json())
            .then((data) => setTracks(data))
            .catch((err) => console.error(err));
    }, []);

    return (
        <div style={{ padding: "20px" }}>
            <h1>🎧 TechnoCloud</h1>

            {tracks.length === 0 ? (
                <p>No tracks found</p>
            ) : (
                tracks.map((track) => (
                    <div key={track._id} style={{ marginBottom: "20px" }}>
                        <h3>{track.title}</h3>
                        <p>{track.artist}</p>

                        <audio controls>
                            <source
                                src={`http://localhost:5000/${track.audioUrl.replace(/\\/g, "/")}`}
                                type="audio/mpeg"
                            />
                        </audio>
                    </div>
                ))
            )}
        </div>
    );
}

export default App;