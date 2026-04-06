const mongoose = require('mongoose');

const trackSchema = new mongoose.Schema({
    title: String,
    artist: String,
    audioUrl: String,
    uploadedBy: { type: mongoose.Schema.Types.ObjectId, ref: 'User' },
}, { timestamps: true });

module.exports = mongoose.model('Track', trackSchema);
