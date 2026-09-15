import React from "react";
import { render, screen, waitFor } from "@testing-library/react";
import userEvent from "@testing-library/user-event";
import { MemoryRouter } from "react-router-dom";
import axios from "axios";

import RegisterPage from "./RegisterPage";

jest.mock("axios");

function renderRegisterPage() {
    return render(
        <MemoryRouter initialEntries={["/register"]}>
            <RegisterPage />
        </MemoryRouter>
    );
}

async function fillRequiredFields() {
    await userEvent.type(screen.getByLabelText(/username/i), "newartist");
    await userEvent.type(screen.getByLabelText(/^email$/i), "newartist@example.com");
    await userEvent.type(screen.getByLabelText(/^password$/i), "TestPass123!");
}

beforeEach(() => {
    axios.post.mockResolvedValue({ data: {} });
});

afterEach(() => {
    jest.resetAllMocks();
});

describe("RegisterPage — account type selection (V5.2-A)", () => {
    it("defaults to Listener (USER) and submits accountType, not role", async () => {
        renderRegisterPage();
        await fillRequiredFields();

        expect(screen.getByRole("radio", { name: /listener/i })).toBeChecked();
        expect(screen.getByRole("radio", { name: /artist/i })).not.toBeChecked();

        await userEvent.click(screen.getByRole("button", { name: /create account/i }));

        await waitFor(() => expect(axios.post).toHaveBeenCalledTimes(1));

        const [, body] = axios.post.mock.calls[0];
        expect(body).toMatchObject({
            username: "newartist",
            email: "newartist@example.com",
            password: "TestPass123!",
            accountType: "USER",
        });
        expect(body).not.toHaveProperty("role");
    });

    it("submits accountType=ARTIST once the Artist option is selected", async () => {
        renderRegisterPage();
        await fillRequiredFields();

        await userEvent.click(screen.getByRole("radio", { name: /artist/i }));
        expect(screen.getByRole("radio", { name: /artist/i })).toBeChecked();

        await userEvent.click(screen.getByRole("button", { name: /create account/i }));

        await waitFor(() => expect(axios.post).toHaveBeenCalledTimes(1));

        const [, body] = axios.post.mock.calls[0];
        expect(body).toMatchObject({ accountType: "ARTIST" });
        expect(body).not.toHaveProperty("role");
    });

    it("explains what an Artist account unlocks", () => {
        renderRegisterPage();

        expect(screen.getByText(/artist studio/i)).toBeInTheDocument();
    });

    it("posts to the register endpoint and does not itself log the user in", async () => {
        renderRegisterPage();
        await fillRequiredFields();

        await userEvent.click(screen.getByRole("button", { name: /create account/i }));

        await waitFor(() => expect(axios.post).toHaveBeenCalledTimes(1));

        const [url] = axios.post.mock.calls[0];
        expect(url).toMatch(/\/api\/auth\/register$/);
        expect(sessionStorage.getItem("user")).toBeNull();
    });
});
