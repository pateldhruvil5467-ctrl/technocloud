// Minimal structured request logging — one JSON line per completed
// response. Deliberately logs only method/path/status/duration: never
// headers (which would include Authorization) or the request body
// (which can contain passwords), so there is nothing sensitive to
// accidentally leak into logs.
function requestLogger(req, res, next) {
    const startedAt = process.hrtime.bigint();

    res.on("finish", () => {
        const durationMs = Number(process.hrtime.bigint() - startedAt) / 1e6;

        console.log(
            JSON.stringify({
                ts: new Date().toISOString(),
                level: "info",
                method: req.method,
                path: req.originalUrl,
                status: res.statusCode,
                durationMs: Math.round(durationMs),
            })
        );
    });

    next();
}

module.exports = requestLogger;
