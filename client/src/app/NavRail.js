import React from "react";
import { NavLink, useNavigate } from "react-router-dom";
import {
    FiHome,
    FiCompass,
    FiHeadphones,
    FiLayout,
    FiMusic,
    FiLogOut,
} from "react-icons/fi";

/*
 * NavRail — persistent desktop/tablet navigation (Phase UI.2).
 *
 * Icon-only at tablet widths (md), icon + label at desktop (lg) — one
 * component covers both tiers instead of two near-duplicates. Hidden
 * below md; MobileNav takes over there.
 *
 * Destinations without a real route yet are rendered disabled rather
 * than invented — see the "comingSoon" entries below.
 */

const PRIMARY_ITEMS = [
    { key: "home", label: "Home", to: "/home", icon: FiHome },
    { key: "discover", label: "Discover", icon: FiCompass, comingSoon: true },
    { key: "library", label: "Library", to: "/library", icon: FiHeadphones },
];

const STUDIO_ITEMS = [
    { key: "dashboard", label: "Dashboard", icon: FiLayout, comingSoon: true },
    { key: "my-tracks", label: "My Tracks", to: "/my-tracks", icon: FiMusic },
];

function NavItem({ item }) {
    const Icon = item.icon;

    if (item.comingSoon) {
        return (
            <div
                className="flex items-center gap-3 rounded-md px-3 py-2.5 text-text-faint cursor-not-allowed"
                aria-disabled="true"
                title={`${item.label} — coming soon`}
            >
                <Icon size={18} aria-hidden="true" />
                <span className="hidden lg:inline font-body text-sm">{item.label}</span>
                <span className="hidden lg:inline ml-auto font-technical text-[10px] uppercase tracking-wide text-text-faint">
                    Soon
                </span>
            </div>
        );
    }

    return (
        <NavLink
            to={item.to}
            className={({ isActive }) =>
                [
                    "flex items-center gap-3 rounded-md px-3 py-2.5 transition-colors duration-fast",
                    "focus-visible:outline focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-accent",
                    isActive
                        ? "bg-surface-raised text-accent"
                        : "text-text-secondary hover:text-text hover:bg-surface-raised",
                ].join(" ")
            }
        >
            <Icon size={18} aria-hidden="true" />
            <span className="hidden lg:inline font-body text-sm">{item.label}</span>
        </NavLink>
    );
}

function NavRail({ user, setUser }) {
    const navigate = useNavigate();

    function handleLogout() {
        sessionStorage.clear();
        setUser(null);
        navigate("/login");
    }

    return (
        <nav
            aria-label="Primary"
            className="hidden md:flex md:flex-col md:fixed md:top-0 md:left-0 md:bottom-20 md:w-16 lg:w-60 border-r border-border bg-surface p-3 gap-6 overflow-y-auto"
        >
            <div className="flex items-center gap-2 px-2 py-2">
                <span className="font-display font-semibold text-accent text-sm tracking-wide">TC</span>
                <span className="hidden lg:inline font-display font-semibold text-text text-sm tracking-wide">
                    TechnoCloud
                </span>
            </div>

            <div className="flex flex-col gap-1">
                <span className="hidden lg:block px-3 font-technical text-[10px] uppercase tracking-wide text-text-faint mb-1">
                    Primary
                </span>
                {PRIMARY_ITEMS.map((item) => (
                    <NavItem key={item.key} item={item} />
                ))}
            </div>

            {user?.role === "ARTIST" && (
                <div className="flex flex-col gap-1">
                    <span className="hidden lg:block px-3 font-technical text-[10px] uppercase tracking-wide text-text-faint mb-1">
                        Studio
                    </span>
                    {STUDIO_ITEMS.map((item) => (
                        <NavItem key={item.key} item={item} />
                    ))}
                </div>
            )}

            {user && (
                <div className="mt-auto flex flex-col gap-2 border-t border-border pt-3">
                    <div className="hidden lg:flex flex-col px-3">
                        <span className="font-body text-sm text-text truncate">{user.username}</span>
                        <span className="font-technical text-[10px] uppercase tracking-wide text-text-faint">
                            {user.role}
                        </span>
                    </div>
                    <button
                        type="button"
                        onClick={handleLogout}
                        aria-label="Log out"
                        className={[
                            "flex items-center gap-3 rounded-md px-3 py-2.5",
                            "text-text-secondary hover:text-text hover:bg-surface-raised transition-colors duration-fast",
                            "focus-visible:outline focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-accent",
                        ].join(" ")}
                    >
                        <FiLogOut size={18} aria-hidden="true" />
                        <span className="hidden lg:inline font-body text-sm">Log out</span>
                    </button>
                </div>
            )}
        </nav>
    );
}

export default NavRail;
