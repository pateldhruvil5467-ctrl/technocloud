import { useNavigate } from "react-router-dom";

function Topbar({ user, setUser }) {

    const navigate = useNavigate();

    function logout() {

        sessionStorage.clear();

        setUser(null);

        navigate("/login");
    }

    return (

        <div
            style={{
                display: "flex",
                justifyContent: "space-between",
                alignItems: "center",
                marginBottom: "50px",
            }}
        >

            <div>

                <h1
                    style={{
                        fontSize: "72px",
                        margin: 0,
                        fontWeight: "800",
                    }}
                >
                    Discover Music
                </h1>

                <p
                    style={{
                        color: "#666",
                        fontSize: "28px",
                        marginTop: "10px",
                    }}
                >
                    Stream futuristic sounds
                </p>

            </div>

            <div
                style={{
                    display: "flex",
                    alignItems: "center",
                    gap: "20px",
                }}
            >

                <div
                    style={{
                        color: "#29dfff",
                        fontWeight: "700",
                        fontSize: "28px",
                    }}
                >
                    {user?.role}
                </div>

                <button
                    onClick={logout}
                    style={{
                        padding: "18px 32px",
                        borderRadius: "18px",
                        border: "none",
                        background: "#42cfff",
                        fontSize: "24px",
                        fontWeight: "700",
                        cursor: "pointer",
                    }}
                >
                    Logout
                </button>

            </div>

        </div>
    );
}

export default Topbar;