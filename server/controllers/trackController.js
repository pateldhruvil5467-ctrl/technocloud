const Track = require("../models/Track");

// upload
exports.uploadTrack = async (req, res) => {
    try {
        console.log("BODY:", req.body);
        console.log("FILE:", req.file);

        const { title, artist } = req.body;

        if (!req.file) {
            return res.status(400).json({ error: "No file uploaded" });
        }

        const newTrack = new Track({
            title,
            artist,
            audioUrl: req.file.path,
        });

        await newTrack.save();

        res.status(201).json(newTrack);

    } catch (err) {
        console.error(err);
        res.status(500).json({ error: "Upload failed" });
    }
};

//THIS MUST EXIST
exports.getTracks = async (req, res) => {
    try {
        const tracks = await Track.find().sort({ createdAt: -1 });
        res.json(tracks);
    } catch (error) {
        res.status(500).json({ error: error.message });
    }
};
exports.deleteTrack = async (req, res) => {
    try {
        const track = await Track.findById(req.params.id);

        if (!track) {
            return res.status(404).json({ message: "Track not found" });
        }

        await track.deleteOne();

        res.json({ message: "Track deleted successfully" });
    } catch (error) {
        res.status(500).json({ error: error.message });
    }
};