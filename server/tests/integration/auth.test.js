const request = require("supertest");
const bcrypt = require("bcryptjs");
const jwt = require("jsonwebtoken");

const app = require("../../app");
const User = require("../../models/User");
const { connect, clearDatabase, closeDatabase } = require("../helpers/db");

beforeAll(async () => {
    await connect();
});

afterEach(async () => {
    await clearDatabase();
});

afterAll(async () => {
    await closeDatabase();
});

describe("POST /api/auth/register", () => {
    it("registers a new user successfully", async () => {
        const res = await request(app).post("/api/auth/register").send({
            username: "testuser",
            email: "testuser@example.com",
            password: "TestPass123!",
        });

        expect(res.status).toBe(201);
        expect(res.body).toMatchObject({
            username: "testuser",
            email: "testuser@example.com",
            role: "USER",
        });
        expect(res.body.id).toBeDefined();
        expect(res.body.password).toBeUndefined();
    });

    it("rejects a duplicate email", async () => {
        await request(app).post("/api/auth/register").send({
            username: "first",
            email: "dup@example.com",
            password: "TestPass123!",
        });

        const res = await request(app).post("/api/auth/register").send({
            username: "second",
            email: "dup@example.com",
            password: "TestPass123!",
        });

        expect(res.status).toBe(400);
        expect(res.body.message).toBe("User already exists");
    });

    it("ignores a client-supplied ADMIN role and still creates a USER", async () => {
        const res = await request(app).post("/api/auth/register").send({
            username: "escalator",
            email: "escalator@example.com",
            password: "TestPass123!",
            role: "ADMIN",
        });

        expect(res.status).toBe(201);
        expect(res.body.role).toBe("USER");

        const stored = await User.findOne({ email: "escalator@example.com" });
        expect(stored.role).toBe("USER");
    });
});

describe("POST /api/auth/login", () => {
    beforeEach(async () => {
        const hashedPassword = await bcrypt.hash("TestPass123!", 10);

        await User.create({
            username: "loginuser",
            email: "login@example.com",
            password: hashedPassword,
            role: "USER",
        });
    });

    it("logs in successfully with correct credentials", async () => {
        const res = await request(app).post("/api/auth/login").send({
            email: "login@example.com",
            password: "TestPass123!",
        });

        expect(res.status).toBe(200);
        expect(res.body.token).toBeDefined();
        expect(res.body.user).toMatchObject({
            username: "loginuser",
            role: "USER",
        });

        // The JWT itself must carry id, username, and role — username is
        // what lets the upload flow attribute tracks by identity instead
        // of guessing from request-body text (see trackController.js).
        const decoded = jwt.decode(res.body.token);
        expect(decoded).toMatchObject({
            username: "loginuser",
            role: "USER",
        });
        expect(decoded.id).toBeDefined();
    });

    it("rejects an invalid password", async () => {
        const res = await request(app).post("/api/auth/login").send({
            email: "login@example.com",
            password: "WrongPassword",
        });

        expect(res.status).toBe(400);
        expect(res.body.message).toBe("Invalid password");
    });

    it("rejects an unknown email", async () => {
        const res = await request(app).post("/api/auth/login").send({
            email: "doesnotexist@example.com",
            password: "TestPass123!",
        });

        expect(res.status).toBe(400);
        expect(res.body.message).toBe("Invalid email");
    });

    it("handles a missing email/password body as invalid credentials", async () => {
        const res = await request(app).post("/api/auth/login").send({});

        expect(res.status).toBe(400);
        expect(res.body.message).toBe("Invalid email");
    });
});

describe("Backward-compatible JWTs", () => {
    it("accepts an old-style token that has no username claim", async () => {
        const user = await User.create({
            username: "legacyuser",
            email: "legacy@example.com",
            password: await bcrypt.hash("TestPass123!", 10),
            role: "USER",
        });

        // Simulates a token issued before the JWT started carrying a
        // username claim — signature and expiry are still valid, only
        // the payload shape is old.
        const legacyToken = jwt.sign(
            { id: user._id, role: user.role },
            process.env.JWT_SECRET,
            { expiresIn: "7d" }
        );

        const res = await request(app)
            .get("/api/users/me")
            .set("Authorization", legacyToken);

        expect(res.status).toBe(200);
        expect(res.body.username).toBe("legacyuser");
    });
});
