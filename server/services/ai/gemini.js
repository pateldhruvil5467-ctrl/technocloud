const config = require("../../config/env");

/**
 * Google Gemini implementation of the AI search-intent provider.
 *
 * This module is deliberately the ONLY place in the codebase that knows
 * anything about Gemini's REST contract, response envelope, or auth
 * scheme. Nothing outside services/aiProvider.js ever requires this file
 * directly. No SDK dependency is used — Node's built-in `fetch`/
 * `AbortController` are enough for a single JSON POST, so adding this
 * provider added zero new npm dependencies.
 *
 * The value returned by interpret() is NOT validated or sanitized here —
 * it is whatever Gemini's response parses to as JSON, which may be any
 * shape, including something hostile. That is intentional: shape
 * validation is searchIntent.normalizeIntent()'s exclusive job (the
 * actual trust boundary), and duplicating it here would just be a second,
 * easier-to-forget-to-update copy of the same allowlist. This module's
 * only contract is "return parsed JSON from the model, or throw."
 */

const API_BASE = "https://generativelanguage.googleapis.com/v1beta/models";

// Deliberately narrow: tells the model the exact (small) vocabulary the
// rest of the app already validates against (see
// services/searchIntent.js's SORT_VALUES/ALLOWED_INTENT_FIELDS) — this
// improves the odds of a directly-usable response, but is a quality
// improvement, not a security control. A model that ignores every word
// of this and returns arbitrary JSON is handled exactly the same as one
// that follows it perfectly: normalizeIntent() decides what survives,
// not this prompt.
const SYSTEM_INSTRUCTION = [
    "You translate a short natural-language music search request into a",
    "JSON object describing search intent for a track catalog.",
    "",
    "Respond with ONLY a single JSON object. No prose, no markdown, no",
    "code fences.",
    "",
    "Allowed keys (omit any you cannot confidently infer):",
    '- "genre": string',
    '- "subgenre": string',
    '- "isMix": boolean',
    '- "sort": one of "newest", "oldest", "title_asc", "title_desc"',
    '- "search": string — a short free-text fragment for anything that',
    "  does not fit the fields above (mood, vibe, descriptive words)",
    "",
    "Never invent a key that is not in this list. If the request mentions",
    "something these fields cannot express (e.g. tempo/BPM, a specific",
    "artist, visibility/ownership), simply omit it rather than guessing a",
    "field name for it.",
].join("\n");

function isConfigured() {
    return Boolean(config.geminiApiKey);
}

async function interpret(query) {
    const controller = new AbortController();
    const timeoutId = setTimeout(() => controller.abort(), config.aiRequestTimeoutMs);

    let response;
    try {
        response = await fetch(
            `${API_BASE}/${encodeURIComponent(config.geminiModel)}:generateContent?key=${encodeURIComponent(
                config.geminiApiKey
            )}`,
            {
                method: "POST",
                headers: { "Content-Type": "application/json" },
                body: JSON.stringify({
                    systemInstruction: { parts: [{ text: SYSTEM_INSTRUCTION }] },
                    contents: [{ role: "user", parts: [{ text: query }] }],
                    // Gemini's own structured-output mode — asks the API
                    // to guarantee syntactically valid JSON. A real
                    // reliability improvement, still not a trust
                    // boundary: normalizeIntent() runs regardless.
                    generationConfig: { responseMimeType: "application/json" },
                }),
                signal: controller.signal,
            }
        );
    } catch (error) {
        // Network failure, DNS failure, or the AbortController firing on
        // timeout all land here. Message is safe to log (no key, no
        // prompt, no response body) but is never returned to callers —
        // aiProvider.js converts every thrown error from this module
        // into a generic AppError before it leaves the service layer.
        if (error.name === "AbortError") {
            throw new Error("Gemini request timed out.");
        }
        throw new Error("Gemini request failed: network error.");
    } finally {
        clearTimeout(timeoutId);
    }

    if (!response.ok) {
        // Deliberately not including response body text here — it could
        // echo back the request (and therefore the user's query) in a
        // provider error payload, and this message may end up in a log
        // line (see aiProvider.js).
        throw new Error(`Gemini request failed with status ${response.status}.`);
    }

    const payload = await response.json();
    const text = payload?.candidates?.[0]?.content?.parts?.[0]?.text;

    if (typeof text !== "string" || text.trim().length === 0) {
        throw new Error("Gemini response did not contain the expected text content.");
    }

    try {
        return JSON.parse(text);
    } catch (parseError) {
        throw new Error("Gemini response was not valid JSON.");
    }
}

module.exports = { isConfigured, interpret };
