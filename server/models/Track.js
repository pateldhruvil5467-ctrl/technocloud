const mongoose = require("mongoose");

const trackSchema = new mongoose.Schema({

    title: {
        type: String,
        required: true,
    },

    artist: {
        type: String,
        required: true,
    },

    audio: {
        type: String,
        required: true,
    },

    cover: {
        type: String,
        default: "",
    },

    uploadedBy: {
        type: String,
        default: "Unknown Artist",
    },

}, {
    timestamps: true,
});

module.exports = mongoose.model("Track", trackSchema);