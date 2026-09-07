import React from "react";

import EmptyState from "../components/primitives/EmptyState";

/*
 * TrendingPage — Phase UI.5-C, /trending.
 *
 * There is no trending/popularity backend — the API-hardening phase
 * deliberately avoided inventing "trending"/"popular" semantics (see
 * server/README.md's known-limitations section), and nothing on the
 * Track model tracks plays, likes, or rankings. This page does not
 * fabricate any of that; it's an honest "not available yet" state
 * built on the same design system as every other page, replacing the
 * old bare `<h1>🔥 Trending Tracks</h1>` placeholder.
 *
 * Note: NavRail/MobileNav's own "Discover" nav item is a separate,
 * still-disabled entry with no route at all — this page is not that.
 * This is the existing, real /trending route (see App.js), simply
 * built out properly instead of left unbuilt.
 */
function TrendingPage() {
    return (
        <div className="flex flex-col gap-8">
            <header className="flex flex-col gap-2">
                <h1 className="font-display text-display-lg font-semibold text-text">Trending</h1>
                <p className="max-w-prose font-body text-sm text-text-secondary">
                    Trending and discovery features are on the way.
                </p>
            </header>

            <EmptyState
                message="Trending isn't available yet."
                action={
                    <p className="max-w-sm font-body text-xs text-text-faint">
                        Once there&apos;s enough listening activity across TechnoCloud, this page will
                        highlight tracks and artists gaining traction.
                    </p>
                }
            />
        </div>
    );
}

export default TrendingPage;
