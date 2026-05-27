import { Link } from "react-router-dom";

function Sidebar() {

    const user = JSON.parse(sessionStorage.getItem("user"));

    const linkStyle = {
        color: "white",
        textDecoration: "none",
        fontSize: "22px",
        marginBottom: "34px",
        display: "flex",
        alignItems: "center",
        gap: "14px",
        fontWeight: "600",
        transition: "0.3s",
    };

    return (

        <div
            style={{
                width: "250px",
                height: "100vh",
                background: "#050505",
                borderRight: "1px solid #111",
                padding: "35px 25px",
                position: "fixed",
                left: 0,
                top: 0,
                boxSizing: "border-box",
                zIndex: 100,
            }}
        >

            <div
                style={{
                    fontSize: "70px",
                }}
            >
                🎧
            </div>

            <h1
                style={{
                    color: "#00ffd5",
                    fontSize: "32px",
                    marginTop: "10px",
                    marginBottom: "0",
                    textShadow:
                        "0 0 20px rgba(0,255,213,0.6)",
                }}
            >
                TechnoCloud
            </h1>

            <div
                style={{
                    marginTop: "70px",
                    display: "flex",
                    flexDirection: "column",
                }}
            >

                <Link to="/home" style={linkStyle}>
                    🏠 Home
                </Link>

                <Link to="/trending" style={linkStyle}>
                    🔥 Trending
                </Link>

                <Link to="/library" style={linkStyle}>
                    🎵 Library
                </Link>

                {user?.role === "ARTIST" && (

                    <Link to="/my-tracks" style={linkStyle}>
                        💿 My Tracks
                    </Link>

                )}



            </div>

        </div>
    );
}

export default Sidebar;