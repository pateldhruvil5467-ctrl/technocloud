import React from "react";
import { NavLink, useNavigate } from "react-router-dom";
import { FiHome, FiCompass, FiHeadphones, FiMusic, FiLogOut } from "react-icons/fi";

/*
 * MobileNav — bottom navigation bar for viewports below the md
 * breakpoint (768px). Compact, large touch targets (min ~44px).
 * Same destination set as NavRail's primary items, plus Studio for
 * ARTIST accounts. Logout sits apart from the destination tabs, since
 * it isn't a content destination.
 */

const TABS = [
    { key: "home", label: "Home", to: "/home", icon: FiHome },
    { key: "discover", label: "Discover", icon: FiCompass, comingSoon: true },
    { key: "library", label: "Library", to: "/library", icon: FiHeadphones },
];

function Tab({ item }) {
    const Icon = item.icon;

    if (item.comingSoon) {
        return (
            <div
                className="flex flex-1 flex-col items-center justify-center gap-1 min-h-[44px] text-text-faint"
                aria-disabled="true"
            >
                <Icon size={20} aria-hidden="true" />
                <span className="font-body text-[10px]">{item.label}</span>
            </div>
        );
    }

    return (
        <NavLink
            to={item.to}
            className={({ isActive }) =>
                [
                    "flex flex-1 flex-col items-center justify-center gap-1 min-h-[44px]",
                    "focus-visible:outline focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-accent",
                    isActive ? "text-accent" : "text-text-secondary",
                ].join(" ")
            }
        >
            <Icon size={20} aria-hidden="true" />
            <span className="font-body text-[10px]">{item.label}</span>
        </NavLink>
    );
}

function MobileNav({ user, setUser }) {
    const navigate = useNavigate();
    const tabs = user?.role === "ARTIST"
        ? [...TABS, { key: "my-tracks", label: "Studio", to: "/my-tracks", icon: FiMusic }]
        : TABS;

    function handleLogout() {
        sessionStorage.clear();
        setUser(null);
        navigate("/login");
    }

    return (
        <nav
            aria-label="Primary"
            className="md:hidden fixed bottom-0 left-0 right-0 h-16 border-t border-border bg-surface flex items-stretch"
        >
            {tabs.map((item) => (
                <Tab key={item.key} item={item} />
            ))}
            {user && (
                <button
                    type="button"
                    onClick={handleLogout}
                    aria-label="Log out"
                    className="flex flex-none w-16 flex-col items-center justify-center gap-1 min-h-[44px] border-l border-border text-text-secondary focus-visible:outline focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-accent"
                >
                    <FiLogOut size={20} aria-hidden="true" />
                    <span className="font-body text-[10px]">Log out</span>
                </button>
            )}
        </nav>
    );
}

export default MobileNav;
