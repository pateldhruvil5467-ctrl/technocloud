import { useEffect, useState } from "react";
import { useNavigate, Link } from "react-router-dom";
import axios from "axios";

import { API_BASE_URL } from "../services/api";
import AuthCard from "../features/auth/AuthCard";
import Button from "../components/primitives/Button";
import Input from "../components/primitives/Input";

/*
 * RegisterPage — Phase UI.5-A. Same registration flow as before, rebuilt
 * on the design system:
 *   - POST /api/auth/register with { username, email, password, role }
 *     — role is still sent (existing behavior, unchanged) even though
 *     the backend ignores it for public registration and always creates
 *     a USER (server/controllers/authController.js)
 *   - registration issues no token, so it never logs the user in —
 *     still redirects to /login afterward, same as before, now passing
 *     a flash message via router state instead of alert() (see
 *     LoginPage.js's `justRegistered` handling)
 *
 * Pre-migration, the submit button was a plain onClick handler outside
 * any <form> — Enter in a field did nothing. Now a real <form onSubmit>,
 * which is both the accessibility fix requested and what makes Enter
 * work.
 */
function RegisterPage() {
    const navigate = useNavigate();

    // Mirrors LoginPage.js's mount-only session check — see the comment
    // there for why this isn't a route-level ternary in App.js.
    useEffect(() => {
        if (sessionStorage.getItem("user")) {
            navigate("/home", { replace: true });
        }
    }, [navigate]);

    const [username, setUsername] = useState("");
    const [email, setEmail] = useState("");
    const [password, setPassword] = useState("");
    const [role, setRole] = useState("USER");
    const [error, setError] = useState("");
    const [submitting, setSubmitting] = useState(false);

    async function handleRegister(e) {
        e.preventDefault();
        if (submitting) return;

        setSubmitting(true);
        setError("");

        try {
            await axios.post(`${API_BASE_URL}/api/auth/register`, {
                username,
                email,
                password,
                role,
            });

            navigate("/login", { state: { justRegistered: true } });
        } catch (err) {
            setError(err.response?.data?.message || "Registration failed. Check your connection and try again.");
            setSubmitting(false);
        }
    }

    return (
        <AuthCard
            title="Create account"
            subtitle="Join TechnoCloud."
            footer={
                <>
                    Already have an account?{" "}
                    <Link
                        to="/login"
                        className="rounded-sm font-medium text-accent hover:underline focus-visible:outline focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-accent"
                    >
                        Log in
                    </Link>
                </>
            }
        >
            <form onSubmit={handleRegister} className="flex flex-col gap-4">
                <Input
                    label="Username"
                    type="text"
                    autoComplete="username"
                    value={username}
                    onChange={(e) => setUsername(e.target.value)}
                    required
                />

                <Input
                    label="Email"
                    type="email"
                    autoComplete="email"
                    value={email}
                    onChange={(e) => setEmail(e.target.value)}
                    required
                />

                <Input
                    label="Password"
                    type="password"
                    autoComplete="new-password"
                    value={password}
                    onChange={(e) => setPassword(e.target.value)}
                    required
                />

                <div className="flex flex-col gap-2">
                    <label
                        htmlFor="register-role"
                        className="font-body text-xs font-medium uppercase tracking-wide text-text-secondary"
                    >
                        Account type
                    </label>
                    <select
                        id="register-role"
                        value={role}
                        onChange={(e) => setRole(e.target.value)}
                        className="rounded-md border border-border bg-surface px-3 py-2 font-body text-sm text-text focus-visible:outline focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-accent"
                    >
                        <option value="USER">Listener</option>
                        <option value="ARTIST">Artist</option>
                    </select>
                </div>

                {error && (
                    <p role="alert" className="font-body text-xs text-danger">
                        {error}
                    </p>
                )}

                <Button type="submit" variant="primary" disabled={submitting} className="mt-2 w-full">
                    {submitting ? "Creating account…" : "Create account"}
                </Button>
            </form>
        </AuthCard>
    );
}

export default RegisterPage;
