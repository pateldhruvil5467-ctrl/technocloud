import { useState } from "react";
import axios from "axios";
import { API_BASE_URL } from "../services/api";

function MyTracksPage() {

    const [title, setTitle] = useState("");
    const [artist, setArtist] = useState("");
    const [audio, setAudio] = useState(null);

    const handleUpload = async (e) => {

        e.preventDefault();

        try {

            const formData = new FormData();

            formData.append("title", title);
            formData.append("artist", artist);
            formData.append("audio", audio);

            await axios.post(
                `${API_BASE_URL}/api/tracks/upload`,
                formData,
                {
                    headers: {
                        Authorization: sessionStorage.getItem("token"),
                    },
                }
            );

            alert("Track uploaded successfully");

            window.location.href = "/";

        } catch (err) {

            console.log(err);

            alert("Upload failed");
        }
    };

    return (
        <div
            style={{
                minHeight: "100vh",
                background: "#000",
                color: "white",
                display: "flex",
                justifyContent: "center",
                alignItems: "center",
                fontFamily: "sans-serif",
            }}
        >

            <form
                onSubmit={handleUpload}
                style={{
                    width: "500px",
                    background: "#0a0a0a",
                    padding: "40px",
                    borderRadius: "30px",
                    border: "1px solid #00ffd5",
                    boxShadow:
                        "0 0 30px rgba(0,255,200,0.2)",
                }}
            >

                <h1
                    style={{
                        marginBottom: "30px",
                        fontSize: "48px",
                    }}
                >
                    Upload Track
                </h1>

                <input
                    type="text"
                    placeholder="Track Title"
                    value={title}
                    onChange={(e) =>
                        setTitle(e.target.value)
                    }
                    style={inputStyle}
                />

                <input
                    type="text"
                    placeholder="Artist Name"
                    value={artist}
                    onChange={(e) =>
                        setArtist(e.target.value)
                    }
                    style={inputStyle}
                />

                <input
                    type="file"
                    accept="audio/*"
                    onChange={(e) =>
                        setAudio(e.target.files[0])
                    }
                    style={{
                        marginBottom: "25px",
                        color: "white",
                    }}
                />

                <button
                    type="submit"
                    style={buttonStyle}
                >
                    Upload
                </button>

            </form>

        </div>
    );
}

const inputStyle = {

    width: "100%",
    padding: "18px",
    marginBottom: "20px",
    borderRadius: "14px",
    border: "1px solid #222",
    background: "#050505",
    color: "white",
    fontSize: "18px",
    boxSizing: "border-box",
};

const buttonStyle = {

    width: "100%",
    padding: "18px",
    borderRadius: "14px",
    border: "none",
    background: "#00ffd5",
    color: "black",
    fontWeight: "700",
    fontSize: "20px",
    cursor: "pointer",
};

export default MyTracksPage;