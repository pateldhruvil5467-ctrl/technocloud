import Sidebar from "../components/Sidebar";
import Topbar from "../components/Topbar";
import TrackCard from "../components/TrackCard";
import MusicPlayer from "../components/MusicPlayer";
import cyberSong from "../assets/cyber.mp3";
import { useState } from "react";

function Dashboard() {

    const user = JSON.parse(
        sessionStorage.getItem("user")
    );

    const [currentTrack, setCurrentTrack] = useState(null);
    const [isPlaying, setIsPlaying] = useState(false);

    const tracks = [
        {
            id: 1,
            title: "Cyber Dreams",
            artist: "TechnoCloud",
            cover: "from-cyan-400 to-blue-600",
            audio: cyberSong,
        },
        {
            id: 2,
            title: "Neon Waves",
            artist: "Synth Artist",
            cover: "from-pink-500 to-purple-700",
            audio: cyberSong,
        },
        {
            id: 3,
            title: "Midnight Pulse",
            artist: "Future Bass",
            cover: "from-purple-500 to-indigo-700",
            audio: cyberSong,
        },
    ];

    return (
        <div className="flex bg-black min-h-screen">

            {/* SIDEBAR */}

            <Sidebar user={user} />

            {/* MAIN CONTENT */}

            <div className="flex-1">

                {/* TOPBAR */}

                <Topbar user={user} />

                {/* PAGE CONTENT */}

                <div className="p-10">

                    {/* HERO SECTION */}

                    <div className="bg-gradient-to-r from-[#001a17] to-[#001d33] rounded-[30px] p-10 border border-[#161616] mb-14">

                        <h1 className="text-6xl font-extrabold text-[#00ffd5] leading-none drop-shadow-[0_0_25px_#00ffd5]">
                            Feel The Beat
                        </h1>

                        <p className="text-gray-400 text-lg mt-6">
                            Welcome back, {user?.username}
                        </p>

                    </div>

                    {/* FEATURED TRACKS */}

                    <div className="grid grid-cols-1 md:grid-cols-2 xl:grid-cols-3 gap-8">

                        {tracks.map((track) => (
                            <div
                                key={track.id}
                                onClick={() => {
                                    setCurrentTrack(track);
                                    setIsPlaying(true);
                                }}
                                className="bg-[#111111] border border-white/5 rounded-3xl p-5 hover:border-cyan-400/40 transition cursor-pointer group"
                            >

                                <div
                                    className={`h-52 rounded-2xl bg-gradient-to-br ${track.cover} mb-5`}
                                ></div>

                                <h3 className="text-white text-xl font-semibold">
                                    {track.title}
                                </h3>

                                <p className="text-gray-400 mt-1">
                                    {track.artist}
                                </p>

                            </div>
                        ))}

                    </div>
                    <MusicPlayer
                        currentTrack={currentTrack}
                        isPlaying={isPlaying}
                        setIsPlaying={setIsPlaying}
                    />
                </div>

            </div>

        </div>
    );
}

export default Dashboard;