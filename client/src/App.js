import { BrowserRouter, Routes, Route, Navigate } from "react-router-dom";
import { useEffect, useState } from "react";

import LoginPage from "./pages/LoginPage";
import RegisterPage from "./pages/RegisterPage";
import Dashboard from "./pages/Dashboard";
import MyTracksPage from "./pages/MyTracksPage";
import TrendingPage from "./pages/TrendingPage";

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

                {/* DEFAULT ROUTE */}

                <Route
                    path="/"
                    element={
                        user ? (
                            <Navigate to="/library" />
                        ) : (
                            <Navigate to="/login" />
                        )
                    }
                />

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

                {/* DASHBOARD */}

                <Route
                    path="/library"
                    element={<Dashboard />}
                />

                <Route
                    path="/home"
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