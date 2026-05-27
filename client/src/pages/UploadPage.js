import { useState } from "react";
import axios from "axios";

function UploadPage() {

    const [title, setTitle] = useState("");
    const [audio, setAudio] = useState(null);

    const user =
        JSON.parse(
            sessionStorage.getItem("user")
        );

    if (user?.role !== "ARTIST") {
        window.location.href = "/library";
    }

    const uploadTrack = async (e) => {

        e.preventDefault();

        const formData = new FormData();

        formData.append("title", title);
        formData.append("audio", audio);
        formData.append("artist", user.username);

        try {

            await axios.post(
                "http://localhost:5000/api/tracks/upload",
                formData
            );

            alert("Track Uploaded");

        } catch (err) {

            console.log(err);

            alert("Upload failed");
        }
    };

    return (
        <div
            style={{
                padding: "40px",
            }}
        >

            <h1
                style={{
                    color: "white",
                    marginBottom: "30px",
                }}
            >
                Upload Track
            </h1>

            <form onSubmit={uploadTrack}>

                <input
                    type="text"
                    placeholder="Track title"
                    value={title}
                    onChange={(e) =>
                        setTitle(e.target.value)
                    }
                    style={inputStyle}
                />

                <input
                    type="file"
                    accept="audio/*"
                    onChange={(e) =>
                        setAudio(e.target.files[0])
                    }
                    style={inputStyle}
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
    padding: "16px",
    marginBottom: "20px",
    borderRadius: "12px",
};

const buttonStyle = {
    padding: "16px 26px",
    borderRadius: "12px",
    border: "none",
    background: "#00ffd5",
    fontWeight: "700",
};

export default UploadPage;