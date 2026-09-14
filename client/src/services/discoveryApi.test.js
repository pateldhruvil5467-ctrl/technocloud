import axios from "axios";

import { interpretDiscoveryQuery } from "./discoveryApi";
import { API_BASE_URL } from "./api";

jest.mock("axios");

describe("discoveryApi.interpretDiscoveryQuery", () => {
    afterEach(() => {
        jest.resetAllMocks();
    });

    test("posts the query to the correct endpoint with the expected body", async () => {
        axios.post.mockResolvedValue({
            data: { intent: { search: "warehouse" }, unsupported: [], source: "ai" },
        });

        const result = await interpretDiscoveryQuery("dark warehouse techno");

        expect(axios.post).toHaveBeenCalledWith(
            `${API_BASE_URL}/api/v1/discovery/interpret`,
            { query: "dark warehouse techno" },
            expect.any(Object)
        );
        expect(result).toEqual({ intent: { search: "warehouse" }, unsupported: [], source: "ai" });
    });

    test("forwards an AbortController signal when provided", async () => {
        axios.post.mockResolvedValue({ data: { intent: {}, unsupported: [], source: "ai" } });
        const controller = new AbortController();

        await interpretDiscoveryQuery("techno", { signal: controller.signal });

        const [, , config] = axios.post.mock.calls[0];
        expect(config.signal).toBe(controller.signal);
    });

    test("propagates a rejection from axios rather than swallowing it", async () => {
        axios.post.mockRejectedValue(new Error("Network Error"));

        await expect(interpretDiscoveryQuery("techno")).rejects.toThrow("Network Error");
    });
});
