import { useState } from "react";
import { useNavigate, Link } from "react-router-dom";
import axios from "axios";

function LoginPage({ setUser }) {

    const navigate = useNavigate();

    const [email, setEmail] = useState("");
    const [password, setPassword] = useState("");

    const handleLogin = async (e) => {

        e.preventDefault();

        try {

            const res = await axios.post(
                "http://localhost:5000/api/auth/login",
                {
                    email,
                    password,
                }
            );

            // SAVE TOKEN
            sessionStorage.setItem(
                "token",
                res.data.token
            );

            // SAVE USER
            sessionStorage.setItem(
                "user",
                JSON.stringify(res.data.user)
            );

            // UPDATE APP STATE
            setUser(res.data.user);

            // REDIRECT
            navigate("/");

        } catch (err) {

            console.log(err);

            alert(
                err.response?.data?.message || "Login failed"
            );
        }
    };

    return (

        <div
            style={{
                height: "100vh",
                background: "#050505",
                display: "flex",
                justifyContent: "center",
                alignItems: "center",
                fontFamily: "sans-serif",
            }}
        >

            <form
                onSubmit={handleLogin}
                style={{
                    width: "380px",
                    padding: "40px",
                    borderRadius: "25px",
                    background: "#0d0d0d",
                    border: "1px solid #1f1f1f",
                    boxShadow: "0 0 40px rgba(0,255,200,0.15)",
                }}
            >

                <h1
                    style={{
                        color: "#fff",
                        marginBottom: "35px",
                        fontSize: "48px",
                        fontWeight: "800",
                    }}
                >
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
                    type="submit"
                    style={buttonStyle}
                >
                    Login
                </button>

                <p
                    style={{
                        marginTop: "20px",
                        color: "#aaa",
                        textAlign: "center",
                    }}
                >
                    Don't have an account?{" "}

                    <Link
                        to="/register"
                        style={{
                            color: "#00ffd5",
                            textDecoration: "none",
                        }}
                    >
                        Signup
                    </Link>

                </p>

            </form>

        </div>
    );
}

const inputStyle = {
    width: "100%",
    padding: "16px",
    marginBottom: "20px",
    borderRadius: "12px",
    border: "1px solid #222",
    background: "#050505",
    color: "white",
    fontSize: "16px",
    outline: "none",
    boxSizing: "border-box",
};

const buttonStyle = {
    width: "100%",
    padding: "16px",
    borderRadius: "12px",
    border: "none",
    background: "#00ffd5",
    color: "black",
    fontWeight: "700",
    fontSize: "18px",
    cursor: "pointer",
};

export default LoginPage;