const User = require("../models/User");
const bcrypt = require("bcryptjs");
const jwt = require("jsonwebtoken");
const config = require("../config/env");

const EMAIL_SHAPE = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;

// 🔐 REGISTER
exports.register = async (req, res) => {
    try {
        // NOTE: role is intentionally not read from req.body — public
        // registration always defaults to USER (see User schema default).
        // ADMIN/ARTIST assignment requires a separate, non-public path
        // that does not exist yet.
        const { username, email, password } = req.body;

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

        const userExists = await User.findOne({ email });
        if (userExists) {
            return res.status(400).json({ message: "User already exists" });
        }

        const hashedPassword = await bcrypt.hash(password, 10);

        const user = await User.create({
            username,
            email,
            password: hashedPassword,
        });

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