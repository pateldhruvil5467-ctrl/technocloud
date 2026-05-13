import Sidebar from "../components/Sidebar";
import Topbar from "../components/Topbar";
import TrackCard from "../components/TrackCard";
import MusicPlayer from "../components/MusicPlayer";

function Dashboard() {

    const user = JSON.parse(
        sessionStorage.getItem("user")
    );

    const tracks = [
        {
            title: "Cyber Dreams",
            artist: "TechnoCloud",
            audio:
                "https://www.soundhelix.com/examples/mp3/SoundHelix-Song-1.mp3",
            cover: "from-cyan-400 to-blue-600",
        },
        {
            title: "Neon Waves",
            artist: "SynthX",
            audio:
                "https://www.soundhelix.com/examples/mp3/SoundHelix-Song-2.mp3",
            cover: "from-pink-500 to-fuchsia-700",
        },
        {
            title: "Midnight Pulse",
            artist: "Nova",
            audio:
                "https://www.soundhelix.com/examples/mp3/SoundHelix-Song-3.mp3",
            cover: "from-violet-500 to-indigo-700",
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

                <div className="p-10 pb-40">

                    {/* HERO SECTION */}

                    <div className="bg-gradient-to-r from-[#001a17] to-[#001d33] rounded-[30px] p-10 border border-[#161616] mb-14">

                        <h1 className="text-5xl font-extrabold text-[#00ffd5] leading-none drop-shadow-[0_0_25px_#00ffd5]">
                            Feel The Beat
                        </h1>

                        <p className="text-gray-400 text-lg mt-6">
                            Welcome back, {user?.username}
                        </p>

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
                            />

                        ))}

                    </div>

                </div>

            </div>

            {/* MUSIC PLAYER */}

            <MusicPlayer />

        </div>
    );
}

export default Dashboard;