import React from "react";
import { render, screen, waitFor } from "@testing-library/react";
import userEvent from "@testing-library/user-event";
import { MemoryRouter } from "react-router-dom";

import DiscoverPage from "./DiscoverPage";
import { PlayerProvider } from "../context/PlayerContext";

jest.mock("../services/tracksApi");
jest.mock("../services/artistsApi");
jest.mock("../services/discoveryApi");

const { searchTracks } = require("../services/tracksApi");
const { searchArtists } = require("../services/artistsApi");
const { interpretDiscoveryQuery } = require("../services/discoveryApi");

const EMPTY_TRACK_PAGE = {
    data: [],
    pagination: { page: 1, limit: 20, total: 0, totalPages: 0, hasNextPage: false, hasPreviousPage: false },
};
const EMPTY_ARTIST_PAGE = {
    data: [],
    pagination: { page: 1, limit: 20, total: 0, pages: 0 },
};

function renderDiscoverPage(initialEntries = ["/discover"]) {
    return render(
        <MemoryRouter initialEntries={initialEntries}>
            <PlayerProvider>
                <DiscoverPage />
            </PlayerProvider>
        </MemoryRouter>
    );
}

async function getAiControls() {
    const input = await screen.findByLabelText(/describe what you want to hear/i);
    const button = screen.getByRole("button", { name: /discover|interpreting/i });
    return { input, button };
}

beforeEach(() => {
    searchTracks.mockResolvedValue(EMPTY_TRACK_PAGE);
    searchArtists.mockResolvedValue(EMPTY_ARTIST_PAGE);
});

afterEach(() => {
    jest.resetAllMocks();
});

describe("DiscoverPage — AI-assisted discovery", () => {
    test("does not call the AI API for an empty query", async () => {
        renderDiscoverPage();
        const { button } = await getAiControls();

        userEvent.click(button);

        expect(interpretDiscoveryQuery).not.toHaveBeenCalled();
    });

    test("applies a successful AI interpretation to the track search request and resets to page 1", async () => {
        interpretDiscoveryQuery.mockResolvedValue({
            intent: { genre: "Techno", subgenre: "Industrial", isMix: true, search: "dark warehouse" },
            unsupported: [],
            source: "ai",
        });

        renderDiscoverPage(["/discover?page=3"]);
        const { input, button } = await getAiControls();

        userEvent.type(input, "dark industrial techno mixes for a warehouse set");
        userEvent.click(button);

        await waitFor(() => {
            expect(searchTracks).toHaveBeenLastCalledWith(
                expect.objectContaining({
                    genre: "Techno",
                    subgenre: "Industrial",
                    isMix: "true",
                    search: "dark warehouse",
                    page: 1,
                }),
                expect.anything()
            );
        });
    });

    test("never forwards protected fields even if present on the AI response", async () => {
        interpretDiscoveryQuery.mockResolvedValue({
            intent: { genre: "Techno", visibility: "draft", artistId: "507f1f77bcf86cd799439011" },
            unsupported: ["visibility", "artistId"],
            source: "ai",
        });

        renderDiscoverPage();
        const { input, button } = await getAiControls();

        userEvent.type(input, "techno");
        userEvent.click(button);

        await waitFor(() => {
            const lastCall = searchTracks.mock.calls[searchTracks.mock.calls.length - 1];
            expect(lastCall[0]).not.toHaveProperty("visibility");
            expect(lastCall[0]).not.toHaveProperty("artistId");
        });
    });

    test("a fallback response still triggers a normal track search, with no alarming error shown", async () => {
        interpretDiscoveryQuery.mockResolvedValue({
            intent: { search: "dark industrial techno" },
            unsupported: [],
            source: "fallback",
        });

        renderDiscoverPage();
        const { input, button } = await getAiControls();

        userEvent.type(input, "dark industrial techno");
        userEvent.click(button);

        await waitFor(() => {
            expect(searchTracks).toHaveBeenLastCalledWith(
                expect.objectContaining({ search: "dark industrial techno" }),
                expect.anything()
            );
        });

        expect(screen.queryByText(/couldn't interpret/i)).not.toBeInTheDocument();
    });

    test("shows a recoverable error state when the AI request fails outright", async () => {
        interpretDiscoveryQuery.mockRejectedValue(new Error("Network Error"));

        renderDiscoverPage();
        const { input, button } = await getAiControls();

        userEvent.type(input, "techno");
        userEvent.click(button);

        await waitFor(() => {
            expect(screen.getByText(/couldn't interpret/i)).toBeInTheDocument();
        });
        expect(screen.getByRole("button", { name: /try again/i })).toBeInTheDocument();
    });

    test("existing manual search still works independently of the AI input", async () => {
        renderDiscoverPage();
        await getAiControls(); // wait for the page (and AI input) to be ready

        const manualSearchInput = screen.getByLabelText(/^search$/i);
        userEvent.type(manualSearchInput, "Amelie Lens{enter}");

        await waitFor(() => {
            expect(searchTracks).toHaveBeenLastCalledWith(
                expect.objectContaining({ search: "Amelie Lens" }),
                expect.anything()
            );
        });

        expect(interpretDiscoveryQuery).not.toHaveBeenCalled();
    });

    test("a stale AI response cannot overwrite a newer one", async () => {
        let resolveFirst;
        let resolveSecond;
        const firstPromise = new Promise((resolve) => {
            resolveFirst = resolve;
        });
        const secondPromise = new Promise((resolve) => {
            resolveSecond = resolve;
        });

        interpretDiscoveryQuery.mockImplementationOnce(() => firstPromise);
        interpretDiscoveryQuery.mockImplementationOnce(() => secondPromise);

        renderDiscoverPage();
        const { input, button } = await getAiControls();

        userEvent.type(input, "first query");
        userEvent.click(button);

        userEvent.clear(input);
        userEvent.type(input, "second query");
        userEvent.click(button);

        // Resolve the NEWER (second) request first, then the stale first
        // one — the stale one must never be allowed to win.
        resolveSecond({ intent: { search: "second result" }, unsupported: [], source: "ai" });

        await waitFor(() => {
            expect(searchTracks).toHaveBeenLastCalledWith(
                expect.objectContaining({ search: "second result" }),
                expect.anything()
            );
        });

        resolveFirst({ intent: { search: "first result" }, unsupported: [], source: "ai" });

        // Flush microtasks, then confirm the stale response never applied.
        await new Promise((resolve) => setTimeout(resolve, 0));

        expect(searchTracks).toHaveBeenLastCalledWith(
            expect.objectContaining({ search: "second result" }),
            expect.anything()
        );
        expect(searchTracks).not.toHaveBeenCalledWith(
            expect.objectContaining({ search: "first result" }),
            expect.anything()
        );
    });
});
