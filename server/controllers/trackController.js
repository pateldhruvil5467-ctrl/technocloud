const Track = require("../models/Track");

// upload
exports.uploadTrack = async (req, res) => {
    try {
        const { title, artist } = req.body;

        const track = new Track({
            title,
            artist,
            audioUrl: req.file.path.replace(/\\/g, '/'),
        });

        await track.save();

        res.json({ message: "Track uploaded successfully", track });
    } catch (error) {
        res.status(500).json({ error: error.message });
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
