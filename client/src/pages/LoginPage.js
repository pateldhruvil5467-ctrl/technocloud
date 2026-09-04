import { useEffect, useState } from "react";
import { useNavigate, useLocation, Link } from "react-router-dom";
import axios from "axios";
import { API_BASE_URL } from "../services/api";

function LoginPage({ setUser }) {

    const navigate = useNavigate();
    const location = useLocation();

    // RequireAuth (app/RequireAuth.js) attaches the originally-requested
    // location as router state before redirecting here, so a login
    // triggered by e.g. visiting /track/abc123 while logged out lands
    // back on /track/abc123 instead of just /home.
    const from = location.state?.from;
    const redirectTo = from ? `${from.pathname}${from.search || ""}` : "/home";

    // A session may already exist if the user types /login into the
    // address bar while still signed in (App.js no longer redirects
    // this route away declaratively — see the comment there). Checked
    // once, on mount, straight from sessionStorage rather than a live
    // `user` prop: this only needs to catch "already had a session
    // before this page ever mounted," not react to `setUser` being
    // called moments later by this same page's own handleLogin.
    useEffect(() => {
        if (sessionStorage.getItem("user")) {
            navigate(redirectTo, { replace: true });
        }
        // Intentionally mount-only — see comment above.
        // eslint-disable-next-line react-hooks/exhaustive-deps
    }, []);

    const [email, setEmail] = useState("");
    const [password, setPassword] = useState("");

    const handleLogin = async (e) => {

        e.preventDefault();

        try {

            const res = await axios.post(
                `${API_BASE_URL}/api/auth/login`,
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

            // REDIRECT — back to wherever the user was trying to go, or
            // /home by default. `replace` so /login doesn't linger in
            // history (no bounce-back-to-login on the browser back button).
            navigate(redirectTo, { replace: true });

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