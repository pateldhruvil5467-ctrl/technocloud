import React, { useState } from "react";
import axios from "axios";

export default function RegisterPage({ setShowLogin }) {

    const [username, setUsername] = useState("");
    const [email, setEmail] = useState("");
    const [password, setPassword] = useState("");
    const [role, setRole] = useState("USER");

    const handleRegister = async () => {
        try {

            await axios.post(
                "http://localhost:5000/api/auth/register",
                {
                    username,
                    email,
                    password,
                    role,
                }
            );

            alert("Account created!");
            setShowLogin(false);

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
                    onClick={() => setShowLogin(false)} style={switchStyle}
                >
                    Already have account? Login
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

const switchStyle = {
    marginTop: 20,
    color: "#00f5c4",
    cursor: "pointer",
    textAlign: "center",
};