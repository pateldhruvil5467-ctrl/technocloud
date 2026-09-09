const request = require("supertest");

jest.mock("../../services/aiProvider");

const aiProvider = require("../../services/aiProvider");
const AppError = require("../../utils/AppError");
const app = require("../../app");
const { connect, clearDatabase, closeDatabase } = require("../helpers/db");

const ENDPOINT = "/api/v1/discovery/interpret";

beforeAll(async () => {
    await connect();
});

afterEach(async () => {
    jest.resetAllMocks();
    await clearDatabase();
});

afterAll(async () => {
    await closeDatabase();
});

// The AI provider layer is mocked at the exact same boundary
// aiProvider.js itself presents to the rest of the app — no test in
// this file ever reaches services/ai/gemini.js, the network, or
// requires a GEMINI_API_KEY.

describe("POST /api/v1/discovery/interpret — request validation", () => {
    test("rejects a missing query", async () => {
        const res = await request(app).post(ENDPOINT).send({});

        expect(res.status).toBe(400);
        expect(res.body.error.code).toBe("VALIDATION_ERROR");
    });

    test("rejects an empty query", async () => {
        const res = await request(app).post(ENDPOINT).send({ query: "" });
        expect(res.status).toBe(400);
    });

    test("rejects a whitespace-only query", async () => {
        const res = await request(app).post(ENDPOINT).send({ query: "     " });
        expect(res.status).toBe(400);
    });

    test("rejects a numeric query", async () => {
        const res = await request(app).post(ENDPOINT).send({ query: 123 });
        expect(res.status).toBe(400);
    });

    test("rejects an array query", async () => {
        const res = await request(app)
            .post(ENDPOINT)
            .send({ query: ["dark", "techno"] });
        expect(res.status).toBe(400);
    });

    test("rejects an object query", async () => {
        const res = await request(app)
            .post(ENDPOINT)
            .send({ query: { $ne: null } });
        expect(res.status).toBe(400);
    });

    test("rejects a boolean query", async () => {
        const res = await request(app).post(ENDPOINT).send({ query: true });
        expect(res.status).toBe(400);
    });

    test("rejects a query over the 100-character maximum", async () => {
        const res = await request(app)
            .post(ENDPOINT)
            .send({ query: "a".repeat(101) });
        expect(res.status).toBe(400);
    });

    test("rejects a non-object request body", async () => {
        // A top-level JSON array, not an object — Array.isArray() is
        // explicitly checked in validateDiscoveryBody.js.
        const res = await request(app).post(ENDPOINT).send(["dark", "techno"]);
        expect(res.status).toBe(400);
    });

    test("never calls the AI provider for an invalid request", async () => {
        await request(app).post(ENDPOINT).send({});
        expect(aiProvider.interpretSearchIntent).not.toHaveBeenCalled();
    });
});

describe("POST /api/v1/discovery/interpret — successful AI interpretation", () => {
    test("returns a normalized intent with source: ai", async () => {
        aiProvider.interpretSearchIntent.mockResolvedValue({
            genre: "Techno",
            subgenre: "Industrial",
            isMix: true,
            search: "dark warehouse",
        });

        const res = await request(app)
            .post(ENDPOINT)
            .send({ query: "dark industrial techno mixes" });

        expect(res.status).toBe(200);
        expect(res.body).toEqual({
            intent: {
                genre: "Techno",
                subgenre: "Industrial",
                isMix: true,
                search: "dark warehouse",
            },
            unsupported: [],
            source: "ai",
        });
        expect(aiProvider.interpretSearchIntent).toHaveBeenCalledWith("dark industrial techno mixes");
    });

    test("returns a well-formed response shape", async () => {
        aiProvider.interpretSearchIntent.mockResolvedValue({ search: "warehouse" });

        const res = await request(app).post(ENDPOINT).send({ query: "warehouse" });

        expect(res.status).toBe(200);
        expect(res.body).toHaveProperty("intent");
        expect(res.body).toHaveProperty("unsupported");
        expect(res.body).toHaveProperty("source");
    });
});

describe("POST /api/v1/discovery/interpret — untrusted AI output is stripped", () => {
    test("strips visibility from AI output", async () => {
        aiProvider.interpretSearchIntent.mockResolvedValue({
            genre: "Techno",
            visibility: "draft",
        });

        const res = await request(app).post(ENDPOINT).send({ query: "techno" });

        expect(res.status).toBe(200);
        expect(res.body.intent).toEqual({ genre: "Techno" });
        expect(res.body.intent.visibility).toBeUndefined();
        expect(res.body.unsupported).toContain("visibility");
    });

    test("strips artistId from AI output", async () => {
        aiProvider.interpretSearchIntent.mockResolvedValue({
            genre: "Techno",
            artistId: "507f1f77bcf86cd799439011",
        });

        const res = await request(app).post(ENDPOINT).send({ query: "techno" });

        expect(res.status).toBe(200);
        expect(res.body.intent).toEqual({ genre: "Techno" });
        expect(res.body.intent.artistId).toBeUndefined();
        expect(res.body.unsupported).toContain("artistId");
    });

    test("strips userId and uploadedBy from AI output", async () => {
        aiProvider.interpretSearchIntent.mockResolvedValue({
            genre: "Techno",
            userId: "abc123",
            uploadedBy: "someone",
        });

        const res = await request(app).post(ENDPOINT).send({ query: "techno" });

        expect(res.status).toBe(200);
        expect(res.body.intent).toEqual({ genre: "Techno" });
        expect(res.body.unsupported).toEqual(expect.arrayContaining(["userId", "uploadedBy"]));
    });

    test("strips Mongo operator fields from AI output", async () => {
        aiProvider.interpretSearchIntent.mockResolvedValue({
            genre: "Techno",
            $where: "this.visibility === 'draft'",
            $or: [{ visibility: "draft" }],
        });

        const res = await request(app).post(ENDPOINT).send({ query: "techno" });

        expect(res.status).toBe(200);
        expect(res.body.intent).toEqual({ genre: "Techno" });
        expect(res.body.unsupported).toEqual(expect.arrayContaining(["$where", "$or"]));
    });

    test("never exposes raw AI provider output verbatim in the response", async () => {
        aiProvider.interpretSearchIntent.mockResolvedValue({
            genre: "Techno",
            password: "super-secret-value",
            role: "ADMIN",
            mongoFilter: { visibility: "draft" },
        });

        const res = await request(app).post(ENDPOINT).send({ query: "techno" });

        expect(res.status).toBe(200);
        expect(res.body.intent).toEqual({ genre: "Techno" });
        expect(JSON.stringify(res.body)).not.toMatch(/super-secret-value/);
        expect(res.body.intent.password).toBeUndefined();
        expect(res.body.intent.role).toBeUndefined();
        expect(res.body.intent.mongoFilter).toBeUndefined();
    });
});

describe("POST /api/v1/discovery/interpret — AI unavailable, safe fallback", () => {
    test("falls back to plain-text search when the AI provider is unavailable", async () => {
        aiProvider.interpretSearchIntent.mockRejectedValue(
            new AppError(503, "AI_PROVIDER_UNAVAILABLE", "AI search interpretation is currently unavailable.")
        );

        const res = await request(app)
            .post(ENDPOINT)
            .send({ query: "dark industrial techno" });

        expect(res.status).toBe(200);
        expect(res.body).toEqual({
            intent: { search: "dark industrial techno" },
            unsupported: [],
            source: "fallback",
        });
    });

    test("does not pretend the AI succeeded when falling back", async () => {
        aiProvider.interpretSearchIntent.mockRejectedValue(
            new AppError(503, "AI_PROVIDER_UNAVAILABLE", "AI search interpretation is currently unavailable.")
        );

        const res = await request(app).post(ENDPOINT).send({ query: "warehouse techno" });

        expect(res.body.source).toBe("fallback");
        expect(res.body.source).not.toBe("ai");
    });

    test("does not expose provider internals in the fallback response", async () => {
        aiProvider.interpretSearchIntent.mockRejectedValue(
            new AppError(503, "AI_PROVIDER_UNAVAILABLE", "AI search interpretation is currently unavailable.")
        );

        const res = await request(app).post(ENDPOINT).send({ query: "warehouse techno" });

        expect(JSON.stringify(res.body)).not.toMatch(/gemini/i);
        expect(JSON.stringify(res.body)).not.toMatch(/api.?key/i);
    });
});

describe("POST /api/v1/discovery/interpret — unexpected provider errors", () => {
    test("does not treat an unexpected provider error as a normal fallback", async () => {
        aiProvider.interpretSearchIntent.mockRejectedValue(new Error("unexpected internal failure"));

        const res = await request(app).post(ENDPOINT).send({ query: "techno" });

        expect(res.status).toBe(500);
        expect(res.body.error).toBeDefined();
        expect(JSON.stringify(res.body)).not.toMatch(/unexpected internal failure/);
    });
});
