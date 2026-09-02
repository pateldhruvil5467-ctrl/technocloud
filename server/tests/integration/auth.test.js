const request = require("supertest");
const bcrypt = require("bcryptjs");

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
