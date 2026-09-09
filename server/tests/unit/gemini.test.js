jest.mock("../../config/env", () => ({
    geminiApiKey: null,
    geminiModel: "gemini-2.0-flash",
    aiRequestTimeoutMs: 5000,
}));

const config = require("../../config/env");
const { isConfigured, interpret } = require("../../services/ai/gemini");

// This file mocks the network layer directly (global.fetch) rather than
// any SDK — services/ai/gemini.js deliberately has no SDK dependency, it
// is a single fetch() call. No test here ever reaches the real network.
describe("services/ai/gemini", () => {
    const originalFetch = global.fetch;

    afterEach(() => {
        global.fetch = originalFetch;
        config.geminiApiKey = null;
        config.aiRequestTimeoutMs = 5000;
    });

    describe("isConfigured", () => {
        test("is false when no API key is configured", () => {
            config.geminiApiKey = null;
            expect(isConfigured()).toBe(false);
        });

        test("is true when an API key is configured", () => {
            config.geminiApiKey = "test-key";
            expect(isConfigured()).toBe(true);
        });
    });

    describe("interpret", () => {
        beforeEach(() => {
            config.geminiApiKey = "test-key";
        });

        function mockFetchResolved(response) {
            global.fetch = jest.fn().mockResolvedValue(response);
        }

        test("returns the parsed JSON object from a valid response", async () => {
            mockFetchResolved({
                ok: true,
                status: 200,
                json: async () => ({
                    candidates: [
                        {
                            content: {
                                parts: [
                                    {
                                        text: JSON.stringify({
                                            genre: "Techno",
                                            search: "dark warehouse",
                                        }),
                                    },
                                ],
                            },
                        },
                    ],
                }),
            });

            const result = await interpret("dark techno for a warehouse set");

            expect(result).toEqual({ genre: "Techno", search: "dark warehouse" });
        });

        test("returns whatever JSON shape the model responds with, unvalidated (normalizeIntent's job, not this module's)", async () => {
            mockFetchResolved({
                ok: true,
                status: 200,
                json: async () => ({
                    candidates: [
                        {
                            content: {
                                parts: [
                                    {
                                        text: JSON.stringify({
                                            visibility: "draft",
                                            $where: "this.x",
                                        }),
                                    },
                                ],
                            },
                        },
                    ],
                }),
            });

            const result = await interpret("anything");

            expect(result).toEqual({ visibility: "draft", $where: "this.x" });
        });

        test("sends the query, model, and API key to the expected endpoint", async () => {
            mockFetchResolved({
                ok: true,
                status: 200,
                json: async () => ({
                    candidates: [{ content: { parts: [{ text: "{}" }] } }],
                }),
            });

            await interpret("test query");

            expect(global.fetch).toHaveBeenCalledTimes(1);
            const [url, options] = global.fetch.mock.calls[0];

            expect(url).toContain("gemini-2.0-flash");
            expect(url).toContain("key=test-key");
            expect(options.method).toBe("POST");

            const body = JSON.parse(options.body);
            expect(body.contents[0].parts[0].text).toBe("test query");
            expect(body.generationConfig.responseMimeType).toBe("application/json");
        });

        test("throws when the HTTP response is not ok", async () => {
            mockFetchResolved({ ok: false, status: 429, json: async () => ({}) });

            await expect(interpret("query")).rejects.toThrow(/status 429/);
        });

        test("throws when the response text is not valid JSON", async () => {
            mockFetchResolved({
                ok: true,
                status: 200,
                json: async () => ({
                    candidates: [{ content: { parts: [{ text: "not json at all {{{" }] } }],
                }),
            });

            await expect(interpret("query")).rejects.toThrow(/not valid JSON/);
        });

        test("throws when the response is missing the expected candidate structure", async () => {
            mockFetchResolved({ ok: true, status: 200, json: async () => ({}) });

            await expect(interpret("query")).rejects.toThrow(/expected text content/);
        });

        test("throws when the response text is empty", async () => {
            mockFetchResolved({
                ok: true,
                status: 200,
                json: async () => ({
                    candidates: [{ content: { parts: [{ text: "   " }] } }],
                }),
            });

            await expect(interpret("query")).rejects.toThrow(/expected text content/);
        });

        test("throws a safe error on a network failure", async () => {
            global.fetch = jest.fn().mockRejectedValue(new Error("ECONNREFUSED"));

            await expect(interpret("query")).rejects.toThrow(/network error/);
        });

        test("throws on timeout and aborts the in-flight request", async () => {
            config.aiRequestTimeoutMs = 10;

            global.fetch = jest.fn().mockImplementation((url, options) => {
                return new Promise((resolve, reject) => {
                    options.signal.addEventListener("abort", () => {
                        const abortError = new Error("This operation was aborted");
                        abortError.name = "AbortError";
                        reject(abortError);
                    });
                });
            });

            await expect(interpret("query")).rejects.toThrow(/timed out/);
        });
    });
});
