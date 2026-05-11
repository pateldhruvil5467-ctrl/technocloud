import React, { useState } from "react";
import axios from "axios";
import RegisterPage from "./RegisterPage";

import { useAuth } from "../context/AuthContext";

export default function LoginPage() {

    const { login } = useAuth();

    const [email, setEmail] = useState("");
    const [password, setPassword] = useState("");

    const [showRegister, setShowRegister] = useState(false);
    const handleLogin = async () => {
        try {

            const response = await axios.post("http://localhost:5000/api/auth/login",
                { email, password });

            login(response.data);

        } catch (error) {
            console.log(error)
            {
                alert("Login Failed: " + error.response.data.message);
            }
        }
    };

    if (showRegister) {
        return <RegisterPage setShowLogin={setShowRegister} />;
    }

    return (
        <div style={{
            height: "100vh",
            background: "#0a0a0a",
            display: "flex",
            justifyContent: "center",
            alignItems: "center",
            color: "white",
        }}>
            <div style={{
                width: 350,
                padding: 30,
                borderRadius: 16,
                background: "#111",
                border: "1px solid #222",
            }}>
                <h1 style={{ marginBottom: 30 }}>
                    🎧 TechnoCloud
                </h1>

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

                <button
                    onClick={handleLogin}
                    style={buttonStyle}
                >
                    Login
                </button>
                <p
                    onClick={() => setShowRegister(true)}
                    style={{
                        marginTop: 20,
                        color: "#00f5c4",
                        cursor: "pointer",
                        textAlign: "center",
                    }}
                >
                    Create new account
                </p>
            </div>
        </div>
    );
}

const inputStyle = {
    width: "100%",
    padding: 14,
    marginBottom: 14,
    borderRadius: 10,
    border: "1px solid #333",
    background: "#0a0a0a",
    color: "white",
};

const buttonStyle = {
    width: "100%",
    padding: 14,
    borderRadius: 10,
    border: "none",
    background: "#00f5c4",
    fontWeight: 700,
    cursor: "pointer",
};