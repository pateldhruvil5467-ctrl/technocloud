module.exports = {
    testEnvironment: "node",
    globalSetup: "./tests/setup/globalSetup.js",
    globalTeardown: "./tests/setup/globalTeardown.js",
    testMatch: ["**/tests/integration/**/*.test.js"],
    testTimeout: 30000,
};
