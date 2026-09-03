const User = require("../models/User");
const ArtistProfile = require("../models/ArtistProfile");

exports.getMe = async (req, res) => {

    try {

        const user = await User.findById(req.user.id);

        if (!user) {
            return res.status(404).json({ message: "User not found" });
        }

        const response = {
            id: user._id,
            username: user.username,
            email: user.email,
            role: user.role,
        };

        if (user.role === "ARTIST") {
            const artistProfile = await ArtistProfile.findOne({ userId: user._id });

            if (artistProfile) {
                response.artistProfile = artistProfile;
            }
        }

        res.json(response);

    } catch (error) {

        res.status(500).json({ message: error.message });
    }
};
