const User = require("../models/User");
const bcrypt = require("bcryptjs");
const jwt = require("jsonwebtoken");
const config = require("../config/env");
const { createArtistAccount, createUserAccount } = require("../services/accountProvisioning");

const EMAIL_SHAPE = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;

// The only account-type input public registration accepts. A client can
// request exactly one of these two — never ADMIN, never an arbitrary
// string — and this is the sole signal used to decide the created
// account's role; see the accountType check below.
const ACCOUNT_TYPES = ["USER", "ARTIST"];

// 🔐 REGISTER
exports.register = async (req, res) => {
    try {
        // NOTE: role is intentionally not read from req.body anywhere in
        // this function — a client-supplied "role" is silently ignored,
        // exactly as before V5.2-A. The only account-type signal this
        // endpoint trusts is `accountType`, validated below against a
        // fixed allowlist and mapped internally to a role — it is never
        // reconciled with, or overridden by, a "role" field even if one
        // is present in the request body.
        const { username, email, password, accountType: rawAccountType } = req.body;

        // Closes a real gap: previously, a missing/empty username, email,
        // or password reached User.create() and threw a Mongoose
        // ValidationError, which the catch block below turned into a
        // misleading 500. Kept in this controller's own existing
        // {message} shape rather than the new structured error pipeline,
        // for consistency with every other response this endpoint
        // already returns.
        if (typeof username !== "string" || username.trim().length === 0 || username.length > 50) {
            return res.status(400).json({ message: "Username is required and must be 50 characters or fewer." });
        }

        if (typeof email !== "string" || !EMAIL_SHAPE.test(email) || email.length > 254) {
            return res.status(400).json({ message: "A valid email is required." });
        }

        if (typeof password !== "string" || password.length < 8 || password.length > 128) {
            return res.status(400).json({ message: "Password must be between 8 and 128 characters." });
        }

        // Omitted -> USER, preserving every pre-V5.2-A registration
        // request's existing behavior. Anything else must be an exact,
        // case-sensitive match for one of ACCOUNT_TYPES — a non-string
        // value (e.g. an object/array, which is how a Mongo-operator
        // injection attempt like { "$ne": null } would arrive here) is
        // rejected by the typeof check alone, before it ever reaches an
        // .includes() comparison, and can never reach a database query.
        const accountType = rawAccountType === undefined ? "USER" : rawAccountType;

        if (typeof accountType !== "string" || !ACCOUNT_TYPES.includes(accountType)) {
            return res.status(400).json({ message: "accountType must be one of: USER, ARTIST." });
        }

        const userExists = await User.findOne({ email });
        if (userExists) {
            return res.status(400).json({ message: "User already exists" });
        }

        const hashedPassword = await bcrypt.hash(password, 10);

        // ARTIST registration also creates the account's ArtistProfile
        // (displayName defaulted to the registration username — see
        // services/accountProvisioning.js) as part of the same
        // operation, consistently: a profile-creation failure can never
        // leave an ARTIST-role User stranded without one.
        const user =
            accountType === "ARTIST"
                ? await createArtistAccount({ username, email, hashedPassword })
                : await createUserAccount({ username, email, hashedPassword });

        res.status(201).json({
            id: user._id,
            username: user.username,
            email: user.email,
            role: user.role,
        });

    } catch (err) {
        res.status(500).json({ message: err.message });
    }
};

// 🔐 LOGIN
exports.login = async (req, res) => {
    try {
        const { email, password } = req.body;

        const user = await User.findOne({ email }).select("+password");
        if (!user) return res.status(400).json({ message: "Invalid email" });

        // Closes a real gap: bcrypt.compare() given a non-string password
        // (e.g. omitted entirely, or sent as a number/object) previously
        // threw, falling through to the generic catch below as a
        // misleading 500. Uses the exact same message/shape already used
        // for a genuinely wrong password, since from the client's
        // perspective these are indistinguishable failure modes.
        if (typeof password !== "string") {
            return res.status(400).json({ message: "Invalid password" });
        }

        const isMatch = await bcrypt.compare(password, user.password);
        if (!isMatch) return res.status(400).json({ message: "Invalid password" });

        const token = jwt.sign(
            { id: user._id, username: user.username, role: user.role },
            config.jwtSecret,
            { expiresIn: config.jwtExpiresIn }
        );

        res.json({
            token,
            user: {
                id: user._id,
                username: user.username,
                role: user.role,
            },
        });

    } catch (err) {
        res.status(500).json({ message: err.message });
    }
};