const mongoose = require("mongoose");

const trackSchema = new mongoose.Schema(
    {
        title: {
            type: String,
            required: true,
        },

        artist: {
            type: String,
            required: true,
        },

        audioUrl: {
            type: String,
            required: true,
        },

        uploadedBy: {
            type: mongoose.Schema.Types.ObjectId,
            ref: "User",
        },
    },
    { timestamps: true }
);

module.exports = mongoose.model("Track", trackSchema);