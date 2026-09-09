const {
    interpretSearchIntent,
} = require("../../services/aiProvider");

describe("aiProvider.interpretSearchIntent", () => {
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
});