import React from "react";
import ReactDOM from "react-dom/client";
import { PlayerContext, PlyerProvider } from "./context/PlayerContext";

import "./index.css";

import App from "./App";

import { AuthProvider }
    from "./context/AuthContext";

const root =
    ReactDOM.createRoot(
        document.getElementById("root")
    );

root.render(
    <AuthProvider>
        <PlyerProvider>
            <App />
        </PlyerProvider>
    </AuthProvider>
);