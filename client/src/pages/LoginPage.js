import { useEffect, useState } from "react";
import { useNavigate, useLocation, Link } from "react-router-dom";
import axios from "axios";

import { API_BASE_URL } from "../services/api";
import AuthCard from "../features/auth/AuthCard";
import Button from "../components/primitives/Button";
import Input from "../components/primitives/Input";

/*
 * LoginPage — Phase UI.5-A. Same auth flow as before (see the git
 * history of this file for the pre-migration version), rebuilt on the
 * design system. Nothing about the flow itself changed:
 *   - POST /api/auth/login, same request body
 *   - sessionStorage.setItem("token"/"user"), same keys/shapes
 *   - setUser(res.data.user) updates App.js's lifted auth state
 *   - navigate(redirectTo, { replace: true }) — redirectTo still comes
 *     from RequireAuth's router state when this page was reached via a
 *     redirect (see app/RequireAuth.js), defaulting to /home otherwise
 *   - the mount-only "already signed in? skip this page" effect is
 *     unchanged — see the comment on it below for why it isn't a live
 *     `user` check (that was a deliberately-fixed race, not a guess)
 */
function LoginPage({ setUser }) {
    const navigate = useNavigate();
    const location = useLocation();

    const from = location.state?.from;
    const redirectTo = from ? `${from.pathname}${from.search || ""}` : "/home";

    // A session may already exist if the user types /login into the
    // address bar while still signed in. Checked once, on mount, straight
    // from sessionStorage rather than a live `user` prop — this only
    // needs to catch "already had a session before this page ever
    // mounted," not react to setUser being called moments later by this
    // same page's own handleLogin (doing that live would race against —
    // and sometimes lose to — the post-submit redirect below).
    useEffect(() => {
        if (sessionStorage.getItem("user")) {
            navigate(redirectTo, { replace: true });
        }
        // eslint-disable-next-line react-hooks/exhaustive-deps
    }, []);

    // Router state set by RegisterPage right before it redirects here on
    // a successful registration (see RegisterPage.js) — registration
    // issues no token, so this is the one place that tells the user
    // their new account is ready to log into.
    const justRegistered = Boolean(location.state?.justRegistered);

    const [email, setEmail] = useState("");
    const [password, setPassword] = useState("");
    const [error, setError] = useState("");
    const [submitting, setSubmitting] = useState(false);

    async function handleLogin(e) {
        e.preventDefault();
        if (submitting) return;

        setSubmitting(true);
        setError("");

        try {
            const res = await axios.post(`${API_BASE_URL}/api/auth/login`, { email, password });

            sessionStorage.setItem("token", res.data.token);
            sessionStorage.setItem("user", JSON.stringify(res.data.user));

            setUser(res.data.user);

            navigate(redirectTo, { replace: true });
            // No setSubmitting(false) here — this component is about to
            // be replaced by the redirect target; resetting it after an
            // unmount would be a no-op at best.
        } catch (err) {
            setError(err.response?.data?.message || "Login failed. Check your connection and try again.");
            setSubmitting(false);
        }
    }

    return (
        <AuthCard
            title="Log in"
            subtitle="Welcome back to TechnoCloud."
            footer={
                <>
                    Don&apos;t have an account?{" "}
                    <Link
                        to="/register"
                        className="rounded-sm font-medium text-accent hover:underline focus-visible:outline focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-accent"
                    >
                        Sign up
                    </Link>
                </>
            }
        >
            <form onSubmit={handleLogin} className="flex flex-col gap-4">
                {justRegistered && (
                    <p className="font-body text-sm text-success">Account created. Log in to continue.</p>
                )}

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
                    autoComplete="current-password"
                    value={password}
                    onChange={(e) => setPassword(e.target.value)}
                    required
                />

                {error && (
                    <p role="alert" className="font-body text-xs text-danger">
                        {error}
                    </p>
                )}

                <Button type="submit" variant="primary" disabled={submitting} className="mt-2 w-full">
                    {submitting ? "Logging in…" : "Log in"}
                </Button>
            </form>
        </AuthCard>
    );
}

export default LoginPage;
