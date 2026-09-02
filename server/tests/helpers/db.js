const mongoose = require("mongoose");

async function connect() {
    await mongoose.connect(process.env.MONGO_URI);
}

async function clearDatabase() {
    const collections = mongoose.connection.collections;

    for (const key in collections) {
        await collections[key].deleteMany({});
    }
}

async function closeDatabase() {
    await mongoose.connection.dropDatabase();
    await mongoose.connection.close();
}

module.exports = { connect, clearDatabase, closeDatabase };
