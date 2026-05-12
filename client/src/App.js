import { BrowserRouter, Routes, Route, Navigate } from "react-router-dom";

import LoginPage from "./pages/LoginPage";
import RegisterPage from "./pages/RegisterPage";
import Dashboard from "./pages/Dashboard";

function App() {

    const user = sessionStorage.getItem("user")
        ? JSON.parse(sessionStorage.getItem("user"))
        : null;

    return (
        <BrowserRouter>
            <Routes>

                {/* LOGIN PAGE */}
                <Route
                    path="/"
                    element={
                        user ? <Navigate to="/dashboard" /> : <LoginPage />
                    }
                />

                {/* REGISTER PAGE */}
                <Route
                    path="/register"
                    element={<RegisterPage />}
                />

                {/* DASHBOARD */}
                <Route
                    path="/dashboard"
                    element={
                        user ? <Dashboard /> : <Navigate to="/" />
                    }
                />

            </Routes>
        </BrowserRouter>
    );
}

export default App;