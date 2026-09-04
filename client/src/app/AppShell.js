import React from "react";
import { Outlet } from "react-router-dom";

import NavRail from "./NavRail";
import MobileNav from "./MobileNav";
import PlayerBar from "../components/player/PlayerBar";

/*
 * AppShell — Phase UI.2.
 *
 *   AppShell
 *   ├── NavRail (>=768px) / MobileNav (<768px)
 *   ├── main content -> <Outlet /> (the matched child route)
 *   └── PlayerBar (always mounted, consumes PlayerProvider)
 *
 * Rendered as a React Router layout route (see App.js) so it — and the
 * PlayerBar inside it — stays mounted across every navigation between
 * its child routes. The actual playback state/audio element live one
 * level higher, in PlayerProvider (index.js), so they survive even a
 * navigation that leaves AppShell entirely (e.g. to /login).
 *
 * Content padding reserves space for the fixed rail/nav and player so
 * nothing is ever hidden behind them.
 */

function AppShell({ user, setUser }) {
    return (
        <div className="min-h-screen bg-bg">
            <NavRail user={user} setUser={setUser} />
            <MobileNav user={user} setUser={setUser} />

            <main className="md:pl-16 lg:pl-60 pb-32 md:pb-20">
                <div className="px-4 py-6 md:px-8 md:py-8">
                    <Outlet />
                </div>
            </main>

            <PlayerBar />
        </div>
    );
}

export default AppShell;
