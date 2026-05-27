function TrackCard({ track, onPlay }) {

    return (

        <div
            style={{
                width: "100%",
                backgroundColor: "#050505",
                border: "1px solid #00ffd5",
                borderRadius: "20px",

                padding: "20px",

                display: "flex",
                flexDirection: "row",

                justifyContent: "space-between",
                alignItems: "center",

                boxSizing: "border-box",

                marginBottom: "20px",
            }}
        >

            {/* LEFT SIDE */}

            <div
                style={{
                    display: "flex",
                    alignItems: "center",
                    gap: "20px",
                }}
            >

                <div
                    style={{
                        width: "80px",
                        height: "80px",
                        borderRadius: "18px",
                        background:
                            "linear-gradient(135deg,#4fc3f7,#7c4dff)",
                    }}
                />

                <div>

                    <h2
                        style={{
                            margin: 0,
                            fontSize: "32px",
                            color: "white",
                        }}
                    >
                        {track.title}
                    </h2>

                    <p
                        style={{
                            marginTop: "8px",
                            color: "#888",
                            fontSize: "20px",
                        }}
                    >
                        {track.artist}
                    </p>

                </div>

            </div>

            {/* BUTTON */}

            <button
                onClick={() => onPlay(track)}
                style={{
                    backgroundColor: "#12f0d0",
                    border: "none",
                    padding: "16px 28px",
                    borderRadius: "16px",

                    fontSize: "22px",
                    fontWeight: "700",

                    cursor: "pointer",
                }}
            >
                ▶ Play
            </button>

        </div>
    );
}

export default TrackCard;