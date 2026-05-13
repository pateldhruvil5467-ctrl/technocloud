import { useContext } from "react";
import { PlayerContext } from "../context/PlayerContext";

function TrackCard({ track }) {

    const { setCurrentTrack } = useContext(PlayerContext);

    return (

        <div
            onClick={() => setCurrentTrack(track)}
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
    );
}

export default TrackCard;