import { createContext, useState } from "react";

export const PlayerContext =
    createContext();

export function PlayerProvider({ children }) {

    const [currentTrack, setCurrentTrack] =
        useState(null);

    return (
        <PlayerContext.Provider
            value={{
                currentTrack,
                setCurrentTrack,
            }}
        >
            {children}
        </PlayerContext.Provider>
    );
}