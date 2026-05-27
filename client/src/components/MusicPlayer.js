function MusicPlayer({ track }) {

    if (!track) return null;

    return (

        <div
            style={{
                position: "fixed",
                bottom: "20px",
                left: "50%",
                transform: "translateX(-50%)",

                width: "900px",
                maxWidth: "90%",

                backgroundColor: "#050505",
                border: "1px solid #111",

                borderRadius: "24px",

                padding: "20px 30px",

                display: "flex",
                alignItems: "center",
                justifyContent: "space-between",

                boxShadow: "0 0 40px rgba(0,255,200,0.15)",
            }}
        >

            {/* LEFT */}

            <div
                style={{
                    display: "flex",
                    alignItems: "center",
                    gap: "20px",
                }}
            >

                <div
                    style={{
                        width: "90px",
                        height: "90px",
                        borderRadius: "20px",
                        background:
                            "linear-gradient(135deg,#4fc3f7,#7c4dff)",
                    }}
                />

                <div>

                    <h2
                        style={{
                            margin: 0,
                            color: "white",
                            fontSize: "28px",
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

            {/* AUDIO */}

            <audio
                controls
                autoPlay
                src={`http://localhost:5000/uploads/${track.audio}`}
                style={{
                    width: "420px",
                }}
            />

        </div>
    );
}

export default MusicPlayer;