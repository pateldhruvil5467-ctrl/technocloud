// One-time, idempotent migration.
//
// Upgrades every Track document whose `audio` field is still the
// pre-V5.2-B1 bare-filename string (e.g. "1778888845516.mp3" — see the
// V5.2-B production architecture audit) into the new
// { provider: "local", key, mimeType } shape (see models/Track.js /
// utils/audioMedia.js). Always writes provider: "local" — this script
// only re-describes an existing local-filesystem reference, it never
// invents an S3 key, and it never checks whether the referenced file
// still exists on disk (that's a separate, explicit recovery question —
// see the V5.2-B audit's "Existing Production Data" section — not
// something a schema-shape migration should silently assert one way or
// the other).
//
// Safe to re-run: only ever touches documents where `audio` is CURRENTLY
// a string. A document whose `audio` is already an object (previously
// migrated, or created fresh under the current schema) is left
// completely untouched — never re-migrated, never overwritten.
//
// Usage:
//   node scripts/migrateLegacyAudio.js            # apply the migration
//   node scripts/migrateLegacyAudio.js --dry-run   # report only, no writes
//
// IMPORTANT: this connects to whatever MONGO_URI is configured in the
// environment it's run in — point it at the intended database
// explicitly. This script has no special awareness of "production" vs.
// "local" beyond that, and per V5.2-B1's own instructions has NOT been
// run against the production Atlas database as part of this phase.
const mongoose = require("mongoose");

const Track = require("../models/Track");
const { toAudioObject } = require("../utils/audioMedia");

// The actual migration logic, exported separately from the
// connect/disconnect/argv-parsing below so it can be exercised directly
// against an already-connected test database (see
// tests/integration/migrateLegacyAudio.test.js) without this file's own
// mongoose.connect() call fighting over the connection.
async function runMigration({ dryRun = false } = {}) {
    const counts = { scanned: 0, eligible: 0, migrated: 0, skipped: 0, failed: 0 };

    const cursor = Track.find({}).cursor();

    for await (const track of cursor) {
        counts.scanned += 1;

        if (typeof track.audio !== "string") {
            // Already an object (new shape, or a previous migration run)
            // — or some other unexpected type. Either way, not eligible;
            // never touched.
            counts.skipped += 1;
            continue;
        }

        counts.eligible += 1;

        try {
            const migratedAudio = toAudioObject(track.audio);

            if (dryRun) {
                console.log(
                    `[dry-run] would migrate Track ${track._id}: "${track.audio}" -> ${JSON.stringify(migratedAudio)}`
                );
            } else {
                track.audio = migratedAudio;
                await track.save();
            }

            counts.migrated += 1;
        } catch (error) {
            counts.failed += 1;
            console.error(`Failed to migrate Track ${track._id}: ${error.message}`);
        }
    }

    return counts;
}

module.exports = { runMigration };

// Only connects/runs as a standalone script — never on require(), so
// requiring this module from a test (or, in principle, from application
// code) never has the side effect of touching a database. Also never
// invoked from server startup (server.js/app.js) — this is exclusively
// a manually-run, one-time operation.
if (require.main === module) {
    (async () => {
        require("dotenv").config();
        const config = require("../config/env");

        const dryRun = process.argv.includes("--dry-run");

        await mongoose.connect(config.mongoUri);

        const counts = await runMigration({ dryRun });

        console.log(dryRun ? "Dry run complete." : "Migration complete.");
        console.log(counts);

        await mongoose.disconnect();
    })();
}
