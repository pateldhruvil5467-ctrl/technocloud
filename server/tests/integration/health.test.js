const request = require("supertest");

const app = require("../../app");
const { connect, closeDatabase } = require("../helpers/db");

beforeAll(async () => {
    await connect();
});

afterAll(async () => {
    await closeDatabase();
});

// V5.2-B3 — GET /api/v1/health now also reports which media storage
// provider the server is running with (config.mediaStorageProvider —
// "local" in this test environment, since nothing overrides
// MEDIA_STORAGE_PROVIDER). This is what lets the frontend decide local
// vs. S3 WITHOUT ever calling POST /api/v1/media/upload-intent in an
// environment that doesn't have S3 configured — see
// client/src/services/mediaApi.js / UploadTrackForm.js.
describe("GET /api/v1/health — mediaProvider", () => {
    it("reports the server's configured media storage provider", async () => {
        const res = await request(app).get("/api/v1/health");

        expect(res.status).toBe(200);
        expect(res.body.mediaProvider).toBe("local");
    });

    it("preserves the existing status/uptime/database fields unchanged", async () => {
        const res = await request(app).get("/api/v1/health");

        expect(res.body.status).toBe("ok");
        expect(res.body.database).toBe("connected");
        expect(typeof res.body.uptime).toBe("number");
    });

    it("still exposes no secrets", async () => {
        const res = await request(app).get("/api/v1/health");

        expect(JSON.stringify(res.body)).not.toMatch(/mongodb|mongo_uri|jwt|secret|AKIA/i);
    });
});
