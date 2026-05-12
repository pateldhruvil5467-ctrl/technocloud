function TrackCard({ title, artist, color }) {
    return (
        <div className="bg-[#0d0d0d] border border-[#1b1b1b] rounded-3xl p-5 hover:border-[#00ffd5] hover:-translate-y-2 transition duration-300 group cursor-pointer">

            {/* COVER */}

            <div
                className={`h-[240px] rounded-2xl mb-5 relative overflow-hidden ${color}`}
            >

                {/* PLAY BUTTON */}

                <div className="absolute bottom-4 right-4 w-14 h-14 rounded-full bg-[#00ffd5] flex items-center justify-center opacity-0 group-hover:opacity-100 transition">

                    <span className="text-black text-xl font-bold">
                        ▶
                    </span>

                </div>

            </div>

            {/* TRACK INFO */}

            <h3 className="text-white text-2xl font-bold">
                {title}
            </h3>

            <p className="text-gray-500 mt-2 text-lg">
                {artist}
            </p>

            {/* TAGS */}

            <div className="flex gap-3 mt-5">

                <span className="bg-[#151515] text-[#00ffd5] px-3 py-1 rounded-full text-sm">
                    Electronic
                </span>

                <span className="bg-[#151515] text-gray-400 px-3 py-1 rounded-full text-sm">
                    3:45
                </span>

            </div>

        </div>
    );
}

export default TrackCard;