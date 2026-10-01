import React from "react";
import { render, screen, fireEvent } from "@testing-library/react";
import userEvent from "@testing-library/user-event";

import { PlayerProvider, usePlayer } from "./PlayerContext";

/*
 * V5.2-B5.2 — PlayerContext now reads currentTrack.playbackUrl (resolved
 * server-side, see server/services/trackPresenter.js) instead of building
 * a `/uploads/${currentTrack.audio}` URL itself. These tests exercise
 * that migration directly against the context's public API, using a
 * small consumer harness rather than any real page, so they aren't
 * coupled to PlayerBar's markup.
 */

// jsdom does not implement real media playback — HTMLMediaElement.play()
// throws "Not implemented" by default, and `.paused` never changes on its
// own. jsdom defines these per-instance (not solely via the shared
// prototype), so they're mocked directly on each rendered <audio> node —
// an own-property assignment always shadows the prototype either way,
// regardless of how jsdom itself implements the element. Tests fire the
// corresponding "play"/"pause"/"ended"/"error" DOM events explicitly (via
// fireEvent) wherever they need React's onPlay/onPause/etc handlers to
// run — exactly what a real browser would do once playback actually
// starts/stops, which keeps state transitions deterministic under test.
function mockAudioElement(audio) {
    let playing = false;

    Object.defineProperty(audio, "paused", {
        configurable: true,
        get: () => !playing,
    });

    audio.play = jest.fn(() => {
        playing = true;
        return Promise.resolve();
    });
    audio.pause = jest.fn(() => {
        playing = false;
    });
    audio.load = jest.fn();

    return audio;
}

// Reads/calls the context so tests can assert on it and drive it without
// going through any real page component.
function Harness({ trackA, trackB }) {
    const player = usePlayer();

    return (
        <div>
            <div data-testid="title">{player.currentTrack ? player.currentTrack.title : "none"}</div>
            <div data-testid="is-playing">{String(player.isPlaying)}</div>
            <div data-testid="error">{player.error || ""}</div>
            <div data-testid="current-time">{player.currentTime}</div>
            <button onClick={() => player.playTrack(trackA)}>Play A</button>
            {trackB && <button onClick={() => player.playTrack(trackB)}>Play B</button>}
            <button onClick={player.togglePlayPause}>Toggle</button>
            <button onClick={player.pause}>Pause</button>
        </div>
    );
}

function renderHarness({ trackA, trackB } = {}) {
    const utils = render(
        <PlayerProvider>
            <Harness trackA={trackA} trackB={trackB} />
        </PlayerProvider>
    );
    const audio = mockAudioElement(document.querySelector("audio"));
    return { ...utils, audio };
}

describe("PlayerContext — playbackUrl as the sole playback source", () => {
    it("plays a valid local-style playbackUrl", () => {
        const track = {
            _id: "1",
            title: "Local Track",
            artist: "Artist",
            audio: "1788353068556-uuid.mp3",
            playbackUrl: "/uploads/1788353068556-uuid.mp3",
        };
        const { audio } = renderHarness({ trackA: track });

        userEvent.click(screen.getByText("Play A"));

        expect(audio.getAttribute("src")).toBe("/uploads/1788353068556-uuid.mp3");
        expect(audio.play).toHaveBeenCalledTimes(1);
        expect(screen.getByTestId("error").textContent).toBe("");

        fireEvent(audio, new window.Event("play"));
        expect(screen.getByTestId("is-playing").textContent).toBe("true");
    });

    it("plays a valid S3/CloudFront-style playbackUrl", () => {
        const track = {
            _id: "2",
            title: "S3 Track",
            artist: "Artist",
            audio: { provider: "s3", key: "audio/artist123/uuid.mp3" },
            playbackUrl: "https://d123456.cloudfront.net/audio/artist123/uuid.mp3",
        };
        const { audio } = renderHarness({ trackA: track });

        userEvent.click(screen.getByText("Play A"));

        expect(audio.getAttribute("src")).toBe("https://d123456.cloudfront.net/audio/artist123/uuid.mp3");
        expect(audio.play).toHaveBeenCalledTimes(1);

        fireEvent(audio, new window.Event("play"));
        expect(screen.getByTestId("is-playing").textContent).toBe("true");
    });

    it("never constructs /uploads/${track.audio} itself — only ever uses playbackUrl", () => {
        const track = {
            _id: "3",
            title: "Mismatch Track",
            artist: "Artist",
            // A deliberately different filename in `audio` than in
            // `playbackUrl` — if the player still read `.audio` for
            // playback (as it did before V5.2-B5.1/B5.2), the resulting
            // src would contain "should-not-be-used.mp3".
            audio: "should-not-be-used.mp3",
            playbackUrl: "https://cdn.example.com/real-key.mp3",
        };
        const { audio } = renderHarness({ trackA: track });

        userEvent.click(screen.getByText("Play A"));

        expect(audio.getAttribute("src")).toBe("https://cdn.example.com/real-key.mp3");
        expect(audio.getAttribute("src")).not.toMatch(/should-not-be-used/);
        expect(audio.getAttribute("src")).not.toMatch(/^\/uploads\//);
    });

    it("fails safely when playbackUrl is missing, without assigning an invalid src or throwing", () => {
        const track = { _id: "4", title: "Broken Track", artist: "Artist", audio: "x.mp3", playbackUrl: null };
        const { audio } = renderHarness({ trackA: track });

        userEvent.click(screen.getByText("Play A"));

        expect(audio.getAttribute("src")).toBeNull();
        expect(audio.play).not.toHaveBeenCalled();
        expect(screen.getByTestId("error").textContent).toBe("This track couldn't be played.");
        expect(screen.getByTestId("is-playing").textContent).toBe("false");
    });

    it("fails safely when playbackUrl is present but not a usable string (e.g. an object)", () => {
        const track = { _id: "5", title: "Malformed Track", artist: "Artist", playbackUrl: { not: "a string" } };
        const { audio } = renderHarness({ trackA: track });

        userEvent.click(screen.getByText("Play A"));

        expect(audio.getAttribute("src")).toBeNull();
        expect(audio.play).not.toHaveBeenCalled();
        // In particular, never the literal string a bare object would
        // stringify to if it were assigned straight to `src`.
        expect(audio.getAttribute("src")).not.toBe("[object Object]");
    });

    it("does not throw or get stuck when Play is clicked again on a track with no playbackUrl", () => {
        const track = { _id: "6", title: "Broken Track", artist: "Artist", playbackUrl: null };
        const { audio } = renderHarness({ trackA: track });

        expect(() => {
            userEvent.click(screen.getByText("Play A"));
            userEvent.click(screen.getByText("Play A"));
        }).not.toThrow();

        expect(audio.getAttribute("src")).toBeNull();
        expect(screen.getByTestId("error").textContent).toBe("This track couldn't be played.");
    });

    it("switches the audio source when the active track changes", () => {
        const trackA = { _id: "a", title: "Track A", artist: "Artist", playbackUrl: "/uploads/a.mp3" };
        const trackB = { _id: "b", title: "Track B", artist: "Artist", playbackUrl: "https://cdn.example.com/b.mp3" };
        const { audio } = renderHarness({ trackA, trackB });

        userEvent.click(screen.getByText("Play A"));
        expect(audio.getAttribute("src")).toBe("/uploads/a.mp3");

        userEvent.click(screen.getByText("Play B"));
        expect(audio.getAttribute("src")).toBe("https://cdn.example.com/b.mp3");
        expect(screen.getByTestId("title").textContent).toBe("Track B");
    });

    it("play/pause still works via togglePlayPause", () => {
        const track = { _id: "1", title: "Track", artist: "Artist", playbackUrl: "/uploads/a.mp3" };
        const { audio } = renderHarness({ trackA: track });

        userEvent.click(screen.getByText("Play A"));
        fireEvent(audio, new window.Event("play"));
        expect(screen.getByTestId("is-playing").textContent).toBe("true");

        userEvent.click(screen.getByText("Toggle"));
        expect(audio.pause).toHaveBeenCalledTimes(1);
        fireEvent(audio, new window.Event("pause"));
        expect(screen.getByTestId("is-playing").textContent).toBe("false");

        userEvent.click(screen.getByText("Toggle"));
        expect(audio.play).toHaveBeenCalledTimes(2);
        fireEvent(audio, new window.Event("play"));
        expect(screen.getByTestId("is-playing").textContent).toBe("true");
    });

    it("ended behavior remains intact — resets playing state and current time", () => {
        const track = { _id: "1", title: "Track", artist: "Artist", playbackUrl: "/uploads/a.mp3" };
        const { audio } = renderHarness({ trackA: track });

        userEvent.click(screen.getByText("Play A"));
        fireEvent(audio, new window.Event("play"));
        expect(screen.getByTestId("is-playing").textContent).toBe("true");

        fireEvent(audio, new window.Event("ended"));

        expect(screen.getByTestId("is-playing").textContent).toBe("false");
        expect(screen.getByTestId("current-time").textContent).toBe("0");
    });

    it("handles a native playback error cleanly, without leaking implementation details", () => {
        const track = { _id: "1", title: "Track", artist: "Artist", playbackUrl: "/uploads/a.mp3" };
        const { audio } = renderHarness({ trackA: track });

        userEvent.click(screen.getByText("Play A"));
        fireEvent(audio, new window.Event("error"));

        expect(screen.getByTestId("is-playing").textContent).toBe("false");
        expect(screen.getByTestId("error").textContent).toBe("This track couldn't be played.");
    });

    it("renders exactly one <audio> element", () => {
        const track = { _id: "1", title: "Track", artist: "Artist", playbackUrl: "/uploads/a.mp3" };
        const { container } = renderHarness({ trackA: track });

        expect(container.querySelectorAll("audio")).toHaveLength(1);
    });
});
