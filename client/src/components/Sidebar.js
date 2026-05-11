import React from "react";

export default function Sidebar({ user }) {

    console.log(user);

    return (
        <aside
            className="glass"
            style={{
                width: 250,
                padding: 30,
                borderRight: "1px solid rgba(255,255,255,0.05)",
                height: "100vh",
                position: "fixed",
                left: 0,
                top: 0
            }}
        >
            <h1
                style={{
                    fontSize: 30,
                    fontWeight: 800,
                    marginBottom: 60,
                    lineHeight: 1.1
                }}
            >
                <div>
                    <div style={{ fontSize: 40 }}>🎧</div>

                    <div className="neonText">
                        TechnoCloud
                    </div>
                </div>
            </h1>

            <div
                style={{
                    display: "flex",
                    flexDirection: "column",
                    gap: 25
                }}
            >
                <p style={linkStyle}>🏠 Home</p>

                <p style={linkStyle}>🔥 Trending</p>

                <p style={linkStyle}>🎵 Library</p>

                {user?.role?.toUpperCase() === "ARTIST" && (
                    <p style={linkStyle}>⬆ Upload</p>
                )}

                {user?.role?.toUpperCase() === "ADMIN" && (
                    <p style={linkStyle}>🛠 Admin Panel</p>
                )}
            </div>
        </aside>
    );
}

const linkStyle = {
    color: "#aaa",
    cursor: "pointer",
    fontSize: 18,
    transition: "0.2s"
};