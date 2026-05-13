import { useState } from "react";
import axios from "axios";

function UploadModal({ closeModal }) {

    const [title, setTitle] = useState("");

    const [artist, setArtist] = useState("");

    const [audio, setAudio] = useState(null);

    const handleUpload = async (e) => {

        e.preventDefault();

        if (!audio) {
            return alert("Please select audio file");
        }

        const formData = new FormData();

        formData.append("title", title);

        formData.append("artist", artist);

        formData.append("audio", audio);

        try {

            await axios.post(
                "http://localhost:5000/api/tracks/upload",
                formData
            );

            alert("Track uploaded successfully");

            window.location.reload();

        } catch (error) {

            console.log(error);

            alert("Upload failed");
        }
    };

    return (

        <div className="fixed inset-0 bg-black/70 backdrop-blur-sm flex justify-center items-center z-50">

            <div className="w-[500px] bg-[#0d0d0d] border border-cyan-400/20 rounded-3xl p-8">

                <div className="flex justify-between items-center mb-8">

                    <h2 className="text-3xl font-bold text-cyan-400">
                        Upload Track
                    </h2>

                    <button
                        onClick={closeModal}
                        className="text-gray-400 hover:text-white text-2xl"
                    >
                        ✕
                    </button>

                </div>

                <form
                    onSubmit={handleUpload}
                    className="space-y-6"
                >

                    <input
                        type="text"
                        placeholder="Track Title"
                        value={title}
                        onChange={(e) => setTitle(e.target.value)}
                        className="w-full bg-[#111] border border-white/10 rounded-xl px-5 py-4 text-white outline-none focus:border-cyan-400"
                    />

                    <input
                        type="text"
                        placeholder="Artist Name"
                        value={artist}
                        onChange={(e) => setArtist(e.target.value)}
                        className="w-full bg-[#111] border border-white/10 rounded-xl px-5 py-4 text-white outline-none focus:border-cyan-400"
                    />

                    <input
                        type="file"
                        accept="audio/*"
                        onChange={(e) => setAudio(e.target.files[0])}
                        className="w-full text-gray-300"
                    />

                    <button
                        type="submit"
                        className="w-full py-4 rounded-xl bg-cyan-400 text-black font-bold hover:scale-[1.02] transition"
                    >
                        Upload Track
                    </button>

                </form>

            </div>

        </div>
    );
}

export default UploadModal;