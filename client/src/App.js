import { BrowserRouter, Routes, Route, Navigate } from "react-router-dom";
import { useEffect, useState } from "react";

import LoginPage from "./pages/LoginPage";
import RegisterPage from "./pages/RegisterPage";
import Dashboard from "./pages/Dashboard";
import MyTracksPage from "./pages/MyTracksPage";
import TrendingPage from "./pages/TrendingPage";
import HomePage from "./pages/HomePage";
import TrackDetailPage from "./pages/TrackDetailPage";
import ArtistProfilePage from "./pages/ArtistProfilePage";
import AppShell from "./app/AppShell";

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

                {/* LOGIN */}

                <Route
                    path="/login"
                    element={<LoginPage setUser={setUser} />}
                />

                {/* REGISTER */}

                <Route
                    path="/register"
                    element={<RegisterPage />}
                />

                {/* APP SHELL — persistent nav + player around every other route.
                    Rendered as a layout route so AppShell (and the PlayerBar
                    inside it) stays mounted across navigation between its
                    child routes. */}

                <Route element={<AppShell user={user} setUser={setUser} />}>

                    {/* HOME — Phase UI.3: the public listener feed. Public
                        for everyone, logged in or not (GET /api/tracks
                        needs no auth) — this is the one routing change
                        this phase requires: "/" used to just redirect
                        based on login state with no real content of its
                        own; it now renders that feed directly. "/home"
                        (the NavRail "Home" link's target) is updated the
                        same way so the nav leads somewhere real. */}

                    <Route
                        path="/"
                        element={<HomePage />}
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

                    {/* MY TRACKS */}

                    <Route
                        path="/my-tracks"
                        element={
                            user?.role === "ARTIST" ? (
                                <MyTracksPage />
                            ) : (
                                <Navigate to="/library" />
                            )
                        }
                    />

                </Route>

                {/* INVALID ROUTES */}

                <Route
                    path="*"
                    element={<Navigate to="/" />}
                />

            </Routes>

        </BrowserRouter>

    );
}

export default App;