import React, { useEffect, useState } from "react";
import axios from "axios";
import { useNavigate, Link } from "react-router-dom";
import { API_BASE_URL } from "../services/api";

export default function RegisterPage() {

    const navigate = useNavigate();

    // Mirrors LoginPage.js's mount-only session check — see the comment
    // there and in App.js for why this isn't a route-level ternary.
    useEffect(() => {
        if (sessionStorage.getItem("user")) {
            navigate("/home", { replace: true });
        }
    }, [navigate]);

    const [username, setUsername] = useState("");
    const [email, setEmail] = useState("");
    const [password, setPassword] = useState("");
    const [role, setRole] = useState("USER");

    const handleRegister = async () => {
        try {

            await axios.post(
                `${API_BASE_URL}/api/auth/register`,
                {
                    username,
                    email,
                    password,
                    role,
                }
            );

            // Registration issues no token (see server/controllers/
            // authController.js) — it doesn't log the user in, so send
            // them to /login to do that next, rather than into the app.
            alert("Account created! Please log in.");
            navigate("/login");

        } catch (err) {
            console.log(err);
            alert("Registration failed");
        }
    };

    return (
        <div style={containerStyle}>
            <div style={cardStyle}>

                <h1 style={logoStyle}>
                    🎧 TechnoCloud
                </h1>

                <input
                    type="text"
                    placeholder="Username"
                    value={username}
                    onChange={(e) => setUsername(e.target.value)}
                    style={inputStyle}
                />

                <input
                    type="email"
                    placeholder="Email"
                    value={email}
                    onChange={(e) => setEmail(e.target.value)}
                    style={inputStyle}
                />

                <input
                    type="password"
                    placeholder="Password"
                    value={password}
                    onChange={(e) => setPassword(e.target.value)}
                    style={inputStyle}
                />

                <select
                    value={role}
                    onChange={(e) => setRole(e.target.value)}
                    style={inputStyle}
                >
                    <option value="USER">Listener</option>
                    <option value="ARTIST">Artist</option>
                </select>

                <button
                    onClick={handleRegister}
                    style={buttonStyle}
                >
                    Create Account
                </button>

                <p
                    style={{
                        marginTop: "20px",
                        color: "#aaa",
                        textAlign: "center",
                    }}
                >
                    Already have account?{" "}
                    <Link
                        to="/"
                        style={{
                            color: "#00ffd5",
                            textDecoration: "none",
                            fontWeight: "600",
                        }}
                    >
                        Login
                    </Link>
                </p>

            </div>
        </div>
    );
}

const containerStyle = {
    height: "100vh",
    background: "#050505",
    display: "flex",
    justifyContent: "center",
    alignItems: "center",
};

const cardStyle = {
    width: 380,
    padding: 40,
    borderRadius: 24,
    background: "#0c0c0c",
    border: "1px solid #1f1f1f",
    boxShadow: "0 0 30px rgba(0,245,196,0.08)",
};

const logoStyle = {
    color: "white",
    marginBottom: 30,
    fontSize: 42,
};

const inputStyle = {
    width: "100%",
    padding: 16,
    marginBottom: 16,
    borderRadius: 14,
    border: "1px solid #222",
    background: "#050505",
    color: "white",
    fontSize: 16,
};

const buttonStyle = {
    width: "100%",
    padding: 16,
    border: "none",
    borderRadius: 14,
    background: "#00f5c4",
    color: "black",
    fontWeight: 700,
    fontSize: 16,
    cursor: "pointer",
};
