import React from "react";
import { Navigate, Outlet, useLocation } from "react-router-dom";

/*
 * RequireAuth — Authentication Regression Fix.
 *
 * Gates every application route behind a real session. Reuses the same
 * `user` state App.js already derives from sessionStorage (see App.js
 * and LoginPage.js) — no second auth context, no new state introduced.
 * Rendered as a layout route wrapping AppShell (see App.js), so it
 * covers every child route AppShell has, uniformly, without listing
 * them one by one.
 *
 * Captures the attempted location on the redirect so LoginPage can send
 * the user back to where they meant to go once they authenticate — see
 * LoginPage.js's `location.state.from` handling.
 *
 * This is a UX/navigation guard only, not a security boundary — the
 * backend (authMiddleware / requireRole / requireTrackOwnership)
 * remains the real authority and is unchanged.
 */
function RequireAuth({ user }) {
    const location = useLocation();

    if (!user) {
        return <Navigate to="/login" replace state={{ from: location }} />;
    }

    return <Outlet />;
}

export default RequireAuth;
