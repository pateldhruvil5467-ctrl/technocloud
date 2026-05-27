const jwt = require("jsonwebtoken");

const auth = async (req, res, next) => {

    try {

        const token = req.header("Authorization");

        if (!token) {

            return res.status(401).json({
                message: "No token provided",
            });
        }

        const decoded = jwt.verify(
            token,
            "techno_secret"
        );

        req.user = decoded;

        next();

    } catch (error) {

        return res.status(401).json({
            message: "Invalid token",
        });
    }
};

module.exports = auth;