const jwt = require("jsonwebtoken");

// 🔐 AUTH MIDDLEWARE
exports.protect = (req, res, next) => {
    const token = req.headers.authorization?.split(" ")[1];

    if (!token) return res.status(401).json({ message: "No token, authorization denied" });

    try {
        const decoded = jwt.verify(token, "secret123");
        req.user = decoded;
        next();
    } catch {
        res.status(401).json({ message: "Invalid token" });

    }
};

exports.isArtist = (req, res, next) => {
    if (req.user.role !== "ARTIST") {
        return res.status(403).json({ message: "Access denied, artists only" });
    }
    next();
};
