import UploadModal from "../components/UploadModal";
import Sidebar from "../components/Sidebar";
import Topbar from "../components/Topbar";
import TrackCard from "../components/TrackCard";
import MusicPlayer from "../components/MusicPlayer";
import { useEffect, useState } from "react";
import axios from "axios";

function Dashboard() {

    const [showUpload, setShowUpload] = useState(false);
    const storedData = JSON.parse(
        sessionStorage.getItem("user")
    );

    const user = storedData?.user;
    console.log(user);
    const [tracks, setTracks] = useState([]);

    const [currentTrack, setCurrentTrack] = useState(null);
    const [isPlaying, setIsPlaying] = useState(false);

    useEffect(() => {

        axios
            .get("http://localhost:5000/api/tracks")

            .then((res) => {

                const formattedTracks = res.data.map((track) => ({

                    ...track,

                    audio: `http://localhost:5000/uploads/${track.audio}`,

                    cover: "from-cyan-400 to-blue-600",

                }));

                setTracks(formattedTracks);

            })

            .catch((err) => {
                console.log(err);
            });

    }, []);
    return (

        <div className="flex bg-black min-h-screen">

            {/* SIDEBAR */}

            <Sidebar
                user={user}
                openUpload={() => setShowUpload(true)}
            />

            {/* MAIN CONTENT */}

            <div className="flex-1">

                {/* TOPBAR */}

                <Topbar user={user} />

                {/* PAGE CONTENT */}

                <div className="p-10 pb-40">

                    {/* HERO SECTION */}

                    <div className="bg-gradient-to-r from-[#001a17] to-[#001d33] rounded-[30px] p-10 border border-[#161616] mb-14">

                        <h1 className="text-5xl font-extrabold text-[#00ffd5] leading-none drop-shadow-[0_0_25px_#00ffd5]">
                            Feel The Beat
                        </h1>

                        <p className="text-gray-400 text-lg mt-6">
                            Welcome back, {user?.username}
                        </p>
                        {
                            user?.role === "artist" && (

                                <button
                                    onClick={() => setShowUpload(true)}
                                    className="mt-6 px-6 py-3 rounded-xl bg-cyan-400 text-black font-bold hover:scale-105 transition"
                                >
                                    Upload Track
                                </button>
                            )
                        }
                    </div>

                    {/* TRACK SECTION */}

                    <h2 className="text-4xl font-bold text-white mb-8">
                        Featured Tracks
                    </h2>

                    <div className="grid grid-cols-1 md:grid-cols-2 xl:grid-cols-3 gap-8">

                        {tracks.map((track, index) => (

                            <TrackCard
                                key={index}
                                track={track}
                                onPlay={() => {
                                    setCurrentTrack(track);
                                    setIsPlaying(true);
                                }}
                            />

                        ))}

                    </div>

                </div>

            </div>

            {/* MUSIC PLAYER */}

            <MusicPlayer
                currentTrack={currentTrack}
                isPlaying={isPlaying}
                setIsPlaying={setIsPlaying}
            />

            {
                showUpload && (
                    <UploadModal
                        closeModal={() => setShowUpload(false)}
                    />
                )
            }
        </div>
    );
}

export default Dashboard;