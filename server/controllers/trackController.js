const Track = require("../models/Track");

exports.uploadTrack = async (req, res) => {

    try {

        const user = req.user;

        const newTrack = new Track({

            title: req.body.title,

            artist: req.body.artist,

            uploadedBy: user.username,

            audio:
                "http://localhost:5000/uploads/" +
                req.file.filename,
        });

        await newTrack.save();

        res.status(201).json({
            message: "Track uploaded successfully",
            track: newTrack,
        });

    } catch (error) {

        res.status(500).json({
            error: error.message,
        });
    }
};

exports.getTracks = async (req, res) => {

    try {

        const tracks = await Track.find()
            .sort({ createdAt: -1 });

        res.json(tracks);

    } catch (error) {

        res.status(500).json({
            error: error.message,
        });
    }
};