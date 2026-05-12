function Sidebar({ user }) {
    return (
        <div className="w-[300px] min-h-screen bg-[#0b0b0b] border-r border-[#161616] p-8">

            {/* Logo */}

            <div className="mb-20">
                <div className="text-7xl mb-3">
                    🎧
                </div>

                <h1 className="text-4xl font-bold text-[#00ffd5] drop-shadow-[0_0_15px_#00ffd5]">
                    TechnoCloud
                </h1>
            </div>

            {/* Navigation */}

            <div className="flex flex-col gap-8 text-3xl">

                <button className="text-gray-300 hover:text-[#00ffd5] transition">
                    🏠 Home
                </button>

                <button className="text-gray-300 hover:text-[#00ffd5] transition">
                    🔥 Trending
                </button>

                <button className="text-gray-300 hover:text-[#00ffd5] transition">
                    🎵 Library
                </button>

                {user?.role === "ARTIST" && (
                    <button className="text-[#00ffd5] font-semibold">
                        ⬆ Upload Track
                    </button>
                )}

            </div>

        </div>
    );
}

export default Sidebar;