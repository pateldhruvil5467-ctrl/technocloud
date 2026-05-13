const Track = require("../models/Track");

const uploadTrack = async (req, res) => {
    try {
        const { title } = req.body;

        if (!req.file) {
            return res.status(400).json({
                message: "No file uploaded",
            });
        }

        const newTrack = new Track({
            title,
            artist: req.user.username,
            audioUrl: `/uploads/${req.file.filename}`,
            uploadedBy: req.user._id,
        });

        await newTrack.save();

        res.status(201).json(newTrack);
    } catch (error) {
        console.log(error);

        res.status(500).json({
            message: "Upload failed",
        });
    }
};

const getTracks = async (req, res) => {
    try {
        const tracks = await Track.find().sort({
            createdAt: -1,
        });

        res.json(tracks);
    } catch (error) {
        res.status(500).json({
            message: "Failed to fetch tracks",
        });
    }
};

module.exports = {
    uploadTrack,
    getTracks,
};