// jest-dom adds custom jest matchers for asserting on DOM nodes.
// allows you to do things like:
// expect(element).toHaveTextContent(/react/i)
// learn more: https://github.com/testing-library/jest-dom
import "@testing-library/jest-dom";

// react-router-dom v7's internals reference TextEncoder/TextDecoder,
// which the Jest 27 jsdom test environment (bundled with react-scripts
// 5) does not provide globally, unlike a real browser or a newer Node
// test environment. Polyfilled from Node's own built-in `util` module —
// no new dependency.
import { TextEncoder, TextDecoder } from "util";

if (typeof global.TextEncoder === "undefined") {
    global.TextEncoder = TextEncoder;
}
if (typeof global.TextDecoder === "undefined") {
    global.TextDecoder = TextDecoder;
}
