const jwt = require("jsonwebtoken");
const config = require("../config/env");

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
            config.jwtSecret
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