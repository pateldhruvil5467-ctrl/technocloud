import { Link } from "react-router-dom";

function DashboardLayout({
    children,
    user,
    showUpload,
    setShowUpload
}) {

    return (
        <div
            style={{
                display: "flex",
                background: "#000",
                color: "white",
                minHeight: "100vh",
                fontFamily: "Arial"
            }}
        >

            {/* SIDEBAR */}
            <div
                style={{
                    width: "260px",
                    background: "#050505",
                    padding: "30px 20px",
                    borderRight: "1px solid #111"
                }}
            >

                <div
                    style={{
                        fontSize: "50px",
                        marginBottom: "10px"
                    }}
                >
                    🎧
                </div>

                <h1
                    style={{
                        color: "#00ffe1",
                        marginBottom: "60px"
                    }}
                >
                    TechnoCloud
                </h1>

                <div
                    style={{
                        display: "flex",
                        flexDirection: "column",
                        gap: "25px",
                        fontSize: "28px"
                    }}
                >

                    <Link
                        to="/home"
                        style={{
                            color: "white",
                            textDecoration: "none"
                        }}
                    >
                        🏠 Home
                    </Link>

                    <Link
                        to="/trending"
                        style={{
                            color: "white",
                            textDecoration: "none"
                        }}
                    >
                        🔥 Trending
                    </Link>

                    <Link
                        to="/library"
                        style={{
                            color: "white",
                            textDecoration: "none"
                        }}
                    >
                        🎵 Library
                    </Link>

                </div>

            </div>

            {/* MAIN */}
            <div
                style={{
                    flex: 1,
                    display: "flex",
                    flexDirection: "column"
                }}
            >

                {/* TOPBAR */}
                <div
                    style={{
                        padding: "40px",
                        borderBottom: "1px solid #111",
                        display: "flex",
                        justifyContent: "space-between",
                        alignItems: "center"
                    }}
                >

                    <div>
                        <h1
                            style={{
                                fontSize: "72px",
                                margin: 0
                            }}
                        >
                            Discover Music
                        </h1>

                        <p
                            style={{
                                color: "#888",
                                marginTop: "10px"
                            }}
                        >
                            Stream futuristic sounds
                        </p>
                    </div>

                    <div
                        style={{
                            display: "flex",
                            alignItems: "center",
                            gap: "20px"
                        }}
                    >

                        <div
                            style={{
                                color: "#00e5ff",
                                fontWeight: "bold"
                            }}
                        >
                            {user?.username} ({user?.role})
                        </div>

                        <button
                            style={{
                                background: "#29dfff",
                                border: "none",
                                padding: "15px 30px",
                                borderRadius: "18px",
                                fontWeight: "bold",
                                cursor: "pointer"
                            }}
                        >
                            Logout
                        </button>

                    </div>

                </div>

                {/* CONTENT */}
                <div
                    style={{
                        flex: 1,
                        padding: "40px"
                    }}
                >
                    {children}
                </div>

                {/* PLAYER */}
                <div
                    style={{
                        height: "120px",
                        borderTop: "1px solid #111",
                        display: "flex",
                        justifyContent: "space-between",
                        alignItems: "center",
                        padding: "0 40px",
                        background: "#020202"
                    }}
                >

                    <div>
                        <h3>No Track Selected</h3>
                        <p style={{ color: "#888" }}>
                            Select a track
                        </p>
                    </div>

                    <button
                        style={{
                            width: "90px",
                            height: "90px",
                            borderRadius: "50%",
                            border: "none",
                            background: "#29dfff",
                            fontSize: "30px",
                            cursor: "pointer"
                        }}
                    >
                        ▶
                    </button>

                    <div style={{ color: "#666" }}>
                        TechnoCloud v1
                    </div>

                </div>

            </div>

        </div>
    );
}

export default DashboardLayout;