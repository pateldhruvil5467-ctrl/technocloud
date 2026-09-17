const { generateAudioObjectKey, ALLOWED_AUDIO_EXTENSION } = require("../../utils/mediaKey");

const ARTIST_ID = "507f1f77bcf86cd799439011";
const KEY_PATTERN = new RegExp(
    `^audio/${ARTIST_ID}/[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}\\.mp3$`,
    "i"
);

describe("generateAudioObjectKey", () => {
    it("generates a key matching audio/{artistProfileId}/{uuid}.mp3", () => {
        const key = generateAudioObjectKey(ARTIST_ID);
        expect(key).toMatch(KEY_PATTERN);
    });

    it("always uses the allowlisted .mp3 extension", () => {
        const key = generateAudioObjectKey(ARTIST_ID, "whatever.wav");
        expect(key.endsWith(ALLOWED_AUDIO_EXTENSION)).toBe(true);
    });

    it("generates a unique key on every call", () => {
        const first = generateAudioObjectKey(ARTIST_ID);
        const second = generateAudioObjectKey(ARTIST_ID);
        expect(first).not.toBe(second);
    });

    it("rejects a missing/empty artistProfileId", () => {
        expect(() => generateAudioObjectKey("")).toThrow();
        expect(() => generateAudioObjectKey(undefined)).toThrow();
        expect(() => generateAudioObjectKey(null)).toThrow();
    });

    it("rejects an artistProfileId containing path separators", () => {
        expect(() => generateAudioObjectKey("../../etc")).toThrow();
        expect(() => generateAudioObjectKey("abc/def")).toThrow();
    });

    describe("original filename is never used verbatim, regardless of content", () => {
        const maliciousFilenames = [
            "../../evil.mp3",
            "..\\evil.mp3",
            "/absolute/path.mp3",
            "attacker/../../file.mp3",
            "C:\\Windows\\System32\\evil.mp3",
            "normal-safe-name.mp3",
            null,
            undefined,
        ];

        it.each(maliciousFilenames)("produces the same safe key shape regardless of originalFilename=%p", (filename) => {
            const key = generateAudioObjectKey(ARTIST_ID, filename);

            expect(key).toMatch(KEY_PATTERN);
            expect(key).not.toContain("..");
            expect(key).not.toContain("evil");
            expect(key).not.toContain("attacker");
            expect(key).not.toContain("Windows");
            expect(key).not.toContain("\\");
            expect(key.startsWith(`audio/${ARTIST_ID}/`)).toBe(true);
        });
    });
});
