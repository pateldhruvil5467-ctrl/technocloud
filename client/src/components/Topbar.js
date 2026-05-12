function Topbar({ user }) {

    const handleLogout = () => {

        sessionStorage.clear();

        window.location.href = "/";
    };

    return (
        <div className="h-[90px] border-b border-[#151515] flex items-center justify-between px-12">

            {/* Left */}

            <div>
                <h1 className="text-4xl font-bold text-white">
                    Discover Music
                </h1>

                <p className="text-gray-500 text-base mt-2">
                    Stream futuristic sounds
                </p>
            </div>

            {/* Right */}

            <div className="flex items-center gap-6">

                <div className="text-[#00ffd5] text-lg font-semibold">
                    {user?.username}
                </div>

                <button
                    onClick={handleLogout}
                    className="bg-[#00ffd5] text-black font-bold px-6 py-3 rounded-2xl hover:scale-105 transition"
                >
                    Logout
                </button>

            </div>

        </div>
    );
}

export default Topbar;