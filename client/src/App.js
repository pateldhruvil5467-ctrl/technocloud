import { BrowserRouter, Routes, Route, Navigate } from "react-router-dom";
import { useEffect, useState } from "react";

import LoginPage from "./pages/LoginPage";
import RegisterPage from "./pages/RegisterPage";
import Dashboard from "./pages/Dashboard";
import StudioPage from "./pages/StudioPage";
import TrendingPage from "./pages/TrendingPage";
import HomePage from "./pages/HomePage";
import TrackDetailPage from "./pages/TrackDetailPage";
import ArtistProfilePage from "./pages/ArtistProfilePage";
import AppShell from "./app/AppShell";
import RequireAuth from "./app/RequireAuth";

function App() {

    const [user, setUser] = useState(
        JSON.parse(sessionStorage.getItem("user"))
    );

    useEffect(() => {

        const storedUser = sessionStorage.getItem("user");

        if (storedUser) {
            setUser(JSON.parse(storedUser));
        }

    }, []);

    return (

        <BrowserRouter>

            <Routes>

                {/* LOGIN / REGISTER — the only routes reachable without a
                    session. Each page redirects itself to /home on mount
                    if a session already exists (see the mount-only effect
                    in LoginPage.js / RegisterPage.js) — deliberately NOT a
                    route-level `user ? ... : ...` ternary here: that would
                    re-evaluate live against the same `user` state a fresh
                    login/register just changed, racing against — and
                    sometimes winning over — LoginPage's own post-submit
                    redirect (including the return-to-location one). A
                    mount-only check has no such race: it runs once, before
                    any submit, so it only ever fires for the "typed /login
                    into the address bar while already signed in" case. */}

                <Route
                    path="/login"
                    element={<LoginPage setUser={setUser} />}
                />

                <Route
                    path="/register"
                    element={<RegisterPage />}
                />

                {/* EVERYTHING ELSE requires a session (Authentication
                    Regression Fix). RequireAuth is a layout route sitting
                    above AppShell, so every current and future AppShell
                    child is gated uniformly — nothing needs to opt in
                    route by route, and AppShell itself can't accidentally
                    render for a logged-out visitor. */}

                <Route element={<RequireAuth user={user} />}>

                    {/* APP SHELL — persistent nav + player around every
                        protected route. Rendered as a layout route so
                        AppShell (and the PlayerBar inside it) stays
                        mounted across navigation between its child
                        routes. */}

                    <Route element={<AppShell user={user} setUser={setUser} />}>

                        {/* "/" is a canonical entry point only — the real
                            feed lives at "/home" (also NavRail's "Home"
                            link target). */}

                        <Route
                            path="/"
                            element={<Navigate to="/home" replace />}
                        />

                        <Route
                            path="/home"
                            element={<HomePage />}
                        />

                        {/* TRACK DETAIL — Phase UI.3 */}

                        <Route
                            path="/track/:id"
                            element={<TrackDetailPage />}
                        />

                        {/* ARTIST PROFILE — Phase UI.3 */}

                        <Route
                            path="/artist/:id"
                            element={<ArtistProfilePage />}
                        />

                        {/* LIBRARY — unchanged, out of scope for this phase */}

                        <Route
                            path="/library"
                            element={<Dashboard />}
                        />

                        {/* TRENDING */}

                        <Route
                            path="/trending"
                            element={<TrendingPage />}
                        />

                        {/* ARTIST STUDIO — Phase UI.4. Route path kept as
                            "/my-tracks" deliberately (no routing churn):
                            both NavRail and MobileNav already link here, and
                            nothing about the URL itself needed to change,
                            only what renders at it. This role check is
                            layered on top of RequireAuth above — a logged-in
                            non-ARTIST still gets bounced to /library, exactly
                            as before. */}

                        <Route
                            path="/my-tracks"
                            element={
                                user?.role === "ARTIST" ? (
                                    <StudioPage />
                                ) : (
                                    <Navigate to="/library" />
                                )
                            }
                        />

                    </Route>

                </Route>

                {/* INVALID ROUTES — falls through to "/", which then
                    re-evaluates auth state itself (RequireAuth → /login for
                    a logged-out visitor, or the "/" → "/home" redirect for
                    an authenticated one). */}

                <Route
                    path="*"
                    element={<Navigate to="/" />}
                />

            </Routes>

        </BrowserRouter>

    );
}

export default App;