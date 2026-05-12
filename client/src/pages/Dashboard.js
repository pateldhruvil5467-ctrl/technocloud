import Sidebar from "../components/Sidebar";
import Topbar from "../components/Topbar";
import TrackCard from "../components/TrackCard";

function Dashboard() {

    const user = JSON.parse(
        sessionStorage.getItem("user")
    );

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

                    <div>

                        <h2 className="text-white text-5xl font-bold mb-10">
                            Featured Tracks
                        </h2>

                        <div className="grid grid-cols-3 gap-8">

                            <TrackCard
                                title="Midnight Pulse"
                                artist="DJ Nova"
                                color="bg-gradient-to-br from-cyan-400 to-cyan-900"
                            />

                            <TrackCard
                                title="Neon Dreams"
                                artist="CyberWave"
                                color="bg-gradient-to-br from-pink-500 to-pink-900"
                            />

                            <TrackCard
                                title="Future Bass"
                                artist="SynthX"
                                color="bg-gradient-to-br from-purple-500 to-indigo-900"
                            />

                        </div>


                    </div>

                </div>

            </div>

        </div>
    );
}

export default Dashboard;