import React from "react";
import ReactDOM from "react-dom/client";

import App from "./App";

import { PlayerProvider } from "./context/PlayerContext";

import "./styles/global.css";

const root = ReactDOM.createRoot(
    document.getElementById("root")
);

root.render(


    <PlayerProvider>

        <App />

    </PlayerProvider>



);