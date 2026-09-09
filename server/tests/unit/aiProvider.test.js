jest.mock("../../services/ai/gemini");

const gemini = require("../../services/ai/gemini");
const {
    interpretSearchIntent,
} = require("../../services/aiProvider");

describe("aiProvider.interpretSearchIntent", () => {
    afterEach(() => {
        jest.resetAllMocks();
    });

    test("rejects a non-string query", async () => {
        await expect(
            interpretSearchIntent(123)
        ).rejects.toMatchObject({
            statusCode: 400,
            code: "VALIDATION_ERROR",
        });
    });

    test("rejects an empty query", async () => {
        await expect(
            interpretSearchIntent("")
        ).rejects.toMatchObject({
            statusCode: 400,
            code: "VALIDATION_ERROR",
        });
    });

    test("rejects a whitespace-only query", async () => {
        await expect(
            interpretSearchIntent("     ")
        ).rejects.toMatchObject({
            statusCode: 400,
            code: "VALIDATION_ERROR",
        });
    });

    test("does not silently pretend the provider succeeded", async () => {
        await expect(
            interpretSearchIntent("dark industrial techno")
        ).rejects.toMatchObject({
            statusCode: 503,
            code: "AI_PROVIDER_UNAVAILABLE",
        });
    });

    test("returns 503 AI_PROVIDER_UNAVAILABLE and never calls interpret() when the provider reports unconfigured", async () => {
        gemini.isConfigured.mockReturnValue(false);

        await expect(
            interpretSearchIntent("dark industrial techno")
        ).rejects.toMatchObject({
            statusCode: 503,
            code: "AI_PROVIDER_UNAVAILABLE",
        });

        expect(gemini.interpret).not.toHaveBeenCalled();
    });

    test("returns the provider's raw structured output untouched when configured and successful", async () => {
        // "Raw" here means exactly that — including a field
        // (visibility) the AI must never be trusted with. This function
        // is not the trust boundary; searchIntent.normalizeIntent() is,
        // and callers are required to run its output through that next.
        // This test exists to make that boundary explicit and prevent
        // anyone from "helpfully" adding filtering logic to this module
        // later.
        gemini.isConfigured.mockReturnValue(true);
        gemini.interpret.mockResolvedValue({ genre: "Techno", visibility: "draft" });

        const result = await interpretSearchIntent("dark techno");

        expect(result).toEqual({ genre: "Techno", visibility: "draft" });
        expect(gemini.interpret).toHaveBeenCalledWith("dark techno");
    });

    test("wraps a provider failure into a safe 503, never a 500 or a crash", async () => {
        gemini.isConfigured.mockReturnValue(true);
        gemini.interpret.mockRejectedValue(new Error("Gemini request failed with status 429."));

        await expect(
            interpretSearchIntent("dark techno")
        ).rejects.toMatchObject({
            statusCode: 503,
            code: "AI_PROVIDER_UNAVAILABLE",
        });
    });

    test("never exposes the underlying provider error message to the caller", async () => {
        gemini.isConfigured.mockReturnValue(true);
        gemini.interpret.mockRejectedValue(new Error("some internal provider detail"));

        await expect(interpretSearchIntent("dark techno")).rejects.toMatchObject({
            statusCode: 503,
            code: "AI_PROVIDER_UNAVAILABLE",
            message: "AI search interpretation is currently unavailable.",
        });
    });

    test("wraps a non-Error rejection from the provider into the same safe 503", async () => {
        gemini.isConfigured.mockReturnValue(true);
        // Defensive case: a provider module could theoretically reject
        // with a non-Error value (e.g. a plain string or undefined).
        // This must still resolve to the same safe outcome, not an
        // unhandled shape crashing the error-logging code.
        gemini.interpret.mockRejectedValue("not an Error instance");

        await expect(
            interpretSearchIntent("dark techno")
        ).rejects.toMatchObject({
            statusCode: 503,
            code: "AI_PROVIDER_UNAVAILABLE",
        });
    });
});