jest.mock("../../services/media/s3");

const s3 = require("../../services/media/s3");
const { getProvider, getPlaybackUrl } = require("../../services/mediaProvider");

afterEach(() => {
    jest.resetAllMocks();
});

describe("mediaProvider.getProvider", () => {
    it("selects the local provider by name", () => {
        const provider = getProvider("local");
        expect(provider.isConfigured()).toBe(true);
    });

    it("selects the s3 provider by name (mocked — no real network access)", () => {
        s3.isConfigured.mockReturnValue(false);
        const provider = getProvider("s3");
        expect(provider).toBe(s3);
        expect(provider.isConfigured()).toBe(false);
    });

    it("fails clearly for an unsupported provider name", () => {
        expect(() => getProvider("dropbox")).toThrow(/Unsupported media storage provider: "dropbox"/);
    });
});

describe("mediaProvider.getPlaybackUrl", () => {
    it("resolves a legacy bare-filename string to the local /uploads/<key> URL", () => {
        expect(getPlaybackUrl("1778888845516.mp3")).toBe("/uploads/1778888845516.mp3");
    });

    it("resolves a { provider: 'local', key } object the same way", () => {
        expect(getPlaybackUrl({ provider: "local", key: "1788353068556-uuid.mp3" })).toBe(
            "/uploads/1788353068556-uuid.mp3"
        );
    });

    it("dispatches an s3-provider audio value to the s3 module, never making a real network call", () => {
        s3.isConfigured.mockReturnValue(true);
        s3.getPlaybackUrl.mockReturnValue("https://cdn.example.cloudfront.net/audio/abc/def.mp3");

        const url = getPlaybackUrl({ provider: "s3", key: "audio/abc/def.mp3" });

        expect(url).toBe("https://cdn.example.cloudfront.net/audio/abc/def.mp3");
        expect(s3.getPlaybackUrl).toHaveBeenCalledWith("audio/abc/def.mp3");
    });

    it("throws clearly when the resolved provider is not configured", () => {
        s3.isConfigured.mockReturnValue(false);

        expect(() => getPlaybackUrl({ provider: "s3", key: "audio/abc/def.mp3" })).toThrow(
            /Media storage provider "s3" is not configured/
        );
        expect(s3.getPlaybackUrl).not.toHaveBeenCalled();
    });

    it("throws clearly for a malformed audio value", () => {
        expect(() => getPlaybackUrl(null)).toThrow();
        expect(() => getPlaybackUrl(undefined)).toThrow();
        expect(() => getPlaybackUrl({})).toThrow();
        expect(() => getPlaybackUrl(42)).toThrow();
    });

    it("throws clearly for an unsupported provider value stored on the audio object", () => {
        expect(() => getPlaybackUrl({ provider: "dropbox", key: "x.mp3" })).toThrow(
            /Unsupported media storage provider: "dropbox"/
        );
    });
});
