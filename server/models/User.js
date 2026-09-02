const mongoose = require("mongoose");

const userSchema = new mongoose.Schema(
    {
        username: {
            type: String,
            required: true,
        },
        email: {
            type: String,
            required: true,
            unique: true,
        },
        password: {
            type: String,
            required: true,
            select: false,
        },

        // 🔥 ROLE SYSTEM
        role: {
            type: String,
            enum: ["USER", "ARTIST", "ADMIN"],
            default: "USER",
        },
    },
    { timestamps: true }
);

module.exports = mongoose.model("User", userSchema);