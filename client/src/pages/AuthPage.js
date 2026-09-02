import React, { useState } from "react";
import axios from "axios";
import { API_BASE_URL } from "../services/api";

export default function AuthPage({ setUser }) {
    const [email, setEmail] = useState("");
    const [password, setPassword] = useState("");

    const handleLogin = async () => {
        try {
            const res = await axios.post(
                `${API_BASE_URL}/api/auth/login`,
                { email, password }
            );

            localStorage.setItem("token", res.data.token);
            setUser(res.data.user);

        } catch (err) {
            alert("Login failed");
        }
    };

    return (
        <div>
            <h2>Login</h2>

            <input
                placeholder="Email"
                onChange={(e) => setEmail(e.target.value)}
            />

            <input
                placeholder="Password"
                type="password"
                onChange={(e) => setPassword(e.target.value)}
            />

            <button onClick={handleLogin}>Login</button>
        </div>
    );
}