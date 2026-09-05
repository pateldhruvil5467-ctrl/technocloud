// One-time, idempotent backfill.
//
// Discovered while smoke-testing GET /api/v1/tracks against the real
// dev database (see V.1 backend hardening report): pre-existing Track
// documents created before the Phase A.1 fields (visibility, isMix,
// tags, uploadStatus) were added to the schema have none of those
// fields actually stored. Mongoose's schema-level `default` makes them
// LOOK set (e.g. `doc.visibility === "public"`) on any hydrated,
// non-lean read — which is why the legacy GET /api/tracks response
// shows `"visibility":"public"` for them — but a real Mongo query
// filtering on the field (e.g. this phase's new
// `Track.find({ visibility: "public" })`) only matches documents where
// the field is actually stored, so these legacy tracks were invisible
// to the new filterable/paginated v1 listing.
//
// This sets each missing field to exactly the value the schema already
// declares as its default — not a new value, just materializing what
// every other read path already implied. Safe to re-run: only ever
// touches documents where the field doesn't exist yet.
//
// Run manually, once, against a target database:
//   node scripts/backfillTrackDefaults.js
require("dotenv").config();

const mongoose = require("mongoose");
const config = require("../config/env");
const Track = require("../models/Track");

const DEFAULTS = {
    visibility: "public",
    isMix: false,
    tags: [],
    uploadStatus: "ready",
};

(async () => {
    await mongoose.connect(config.mongoUri);

    for (const [field, value] of Object.entries(DEFAULTS)) {
        const result = await Track.updateMany(
            { [field]: { $exists: false } },
            { $set: { [field]: value } }
        );
        console.log(`${field}: backfilled ${result.modifiedCount} document(s).`);
    }

    await mongoose.disconnect();
})();
