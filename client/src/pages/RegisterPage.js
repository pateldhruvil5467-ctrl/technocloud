import { useEffect, useState } from "react";
import { useNavigate, Link } from "react-router-dom";
import axios from "axios";

import { API_BASE_URL } from "../services/api";
import AuthCard from "../features/auth/AuthCard";
import Button from "../components/primitives/Button";
import Input from "../components/primitives/Input";

/*
 * RegisterPage — V5.2-A secure artist onboarding.
 *   - POST /api/auth/register with { username, email, password, accountType }
 *     — accountType is "USER" or "ARTIST" (default "USER"), the only
 *     account-type field the backend trusts (server/controllers/
 *     authController.js validates it against a fixed allowlist and maps
 *     it internally to `role`; a client-supplied `role` field is never
 *     sent and never consulted)
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
    const [accountType, setAccountType] = useState("USER");
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
                accountType,
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

                <fieldset className="flex flex-col gap-2">
                    <legend className="font-body text-xs font-medium uppercase tracking-wide text-text-secondary">
                        Account type
                    </legend>

                    <div className="grid grid-cols-2 gap-2">
                        {[
                            { value: "USER", label: "Listener", hint: "Browse and play tracks." },
                            { value: "ARTIST", label: "Artist", hint: "Unlocks the Artist Studio for uploading tracks." },
                        ].map((option) => (
                            <label
                                key={option.value}
                                className={[
                                    "flex cursor-pointer flex-col gap-1 rounded-md border p-3 transition-colors duration-fast",
                                    "has-[:focus-visible]:outline has-[:focus-visible]:outline-2 has-[:focus-visible]:outline-offset-2 has-[:focus-visible]:outline-accent",
                                    accountType === option.value
                                        ? "border-accent bg-surface-raised"
                                        : "border-border hover:border-border-strong",
                                ].join(" ")}
                            >
                                <span className="flex items-center gap-2">
                                    <input
                                        type="radio"
                                        name="accountType"
                                        value={option.value}
                                        checked={accountType === option.value}
                                        onChange={(e) => setAccountType(e.target.value)}
                                        className="accent-accent"
                                    />
                                    <span className="font-body text-sm font-medium text-text">{option.label}</span>
                                </span>
                                <span className="font-body text-xs text-text-secondary">{option.hint}</span>
                            </label>
                        ))}
                    </div>
                </fieldset>

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
