const mongoose = require("mongoose");

const User = require("../models/User");
const ArtistProfile = require("../models/ArtistProfile");

// V5.2-A — secure artist onboarding. Registration is the one place a new
// ARTIST account (and its required ArtistProfile) can be created together;
// everywhere else in the app (trackController.uploadTrack) only ever
// reuses an existing profile, never creates a second one for the same
// user (see ArtistProfile.userId's unique index).

function isTransactionsUnsupportedError(error) {
    // MongoDB's standalone (non-replica-set) servers reject any command
    // carrying a transaction number with this exact error — code 20,
    // codeName "IllegalOperation". This project's own test suite runs
    // against exactly such a server (mongodb-memory-server's default
    // MongoMemoryServer.create() is a standalone instance, not a replica
    // set — see tests/setup/globalSetup.js), so this fallback is not a
    // theoretical path: it is the one actually exercised by every ARTIST
    // registration test run locally and in CI. MongoDB Atlas (this
    // project's production target) is always at least a 3-node replica
    // set, so production registrations take the transactional path above.
    return Boolean(
        error &&
            (error.code === 20 ||
                error.codeName === "IllegalOperation" ||
                /Transaction numbers are only allowed on a replica set member or mongos/i.test(error.message || ""))
    );
}

// Creates the User and its ArtistProfile as a single atomic operation.
// Requires a replica-set (or mongos) MongoDB deployment.
async function createArtistAccountWithTransaction({ username, email, hashedPassword }) {
    const session = await mongoose.startSession();

    try {
        let createdUser;

        await session.withTransaction(async () => {
            const [user] = await User.create(
                [{ username, email, password: hashedPassword, role: "ARTIST" }],
                { session }
            );

            await ArtistProfile.create(
                [{ userId: user._id, displayName: user.username }],
                { session }
            );

            createdUser = user;
        });

        return createdUser;
    } finally {
        await session.endSession();
    }
}

// Fallback for a MongoDB deployment that can't run multi-document
// transactions. Creates the User first, then the ArtistProfile; if the
// profile step fails for any reason, the just-created User is deleted so
// no ARTIST account is ever left stranded without its required profile —
// the same end guarantee the transactional path gives, achieved by a
// compensating action instead of native atomicity.
async function createArtistAccountWithCompensation({ username, email, hashedPassword }) {
    const user = await User.create({ username, email, password: hashedPassword, role: "ARTIST" });

    try {
        await ArtistProfile.create({ userId: user._id, displayName: user.username });
    } catch (profileError) {
        await User.findByIdAndDelete(user._id);
        throw profileError;
    }

    return user;
}

async function createArtistAccount({ username, email, hashedPassword }) {
    try {
        return await createArtistAccountWithTransaction({ username, email, hashedPassword });
    } catch (error) {
        if (isTransactionsUnsupportedError(error)) {
            return createArtistAccountWithCompensation({ username, email, hashedPassword });
        }

        throw error;
    }
}

async function createUserAccount({ username, email, hashedPassword }) {
    return User.create({ username, email, password: hashedPassword, role: "USER" });
}

module.exports = { createArtistAccount, createUserAccount };
