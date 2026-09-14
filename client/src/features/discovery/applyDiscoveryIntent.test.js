import { applyDiscoveryIntent } from "./applyDiscoveryIntent";

const EMPTY_PATCH = { search: "", genre: "", subgenre: "", isMix: "", sort: "" };

describe("applyDiscoveryIntent", () => {
    test("maps every supported field to its URL param equivalent", () => {
        expect(
            applyDiscoveryIntent({
                genre: "Techno",
                subgenre: "Industrial",
                isMix: true,
                sort: "title_asc",
                search: "dark warehouse",
            })
        ).toEqual({
            search: "dark warehouse",
            genre: "Techno",
            subgenre: "Industrial",
            isMix: "true",
            sort: "title_asc",
        });
    });

    test("maps isMix: false distinctly from an absent isMix", () => {
        expect(applyDiscoveryIntent({ isMix: false }).isMix).toBe("false");
        expect(applyDiscoveryIntent({}).isMix).toBe("");
    });

    test("clears fields absent from the intent instead of leaving them stale", () => {
        // This is the "replace, don't merge" behavior — a fresh AI
        // interpretation must not leave a previously-selected genre
        // sitting alongside a newly-interpreted subgenre.
        expect(applyDiscoveryIntent({ genre: "Techno" })).toEqual({
            ...EMPTY_PATCH,
            genre: "Techno",
        });
    });

    test("ignores protected/unsupported fields even if present on the intent object", () => {
        const patch = applyDiscoveryIntent({
            genre: "Techno",
            visibility: "draft",
            artistId: "507f1f77bcf86cd799439011",
            userId: "abc",
            uploadedBy: "someone",
            $where: "this.x",
            $or: [{ visibility: "draft" }],
        });

        expect(patch).toEqual({ ...EMPTY_PATCH, genre: "Techno" });
        expect(patch.visibility).toBeUndefined();
        expect(patch.artistId).toBeUndefined();
        expect(patch.userId).toBeUndefined();
        expect(patch.uploadedBy).toBeUndefined();
        expect(patch.$where).toBeUndefined();
        expect(patch.$or).toBeUndefined();
    });

    test("rejects an unrecognized sort value", () => {
        expect(applyDiscoveryIntent({ sort: "popularity" }).sort).toBe("");
    });

    test("accepts every real sort value", () => {
        for (const sort of ["newest", "oldest", "title_asc", "title_desc"]) {
            expect(applyDiscoveryIntent({ sort }).sort).toBe(sort);
        }
    });

    test("rejects a non-boolean isMix value", () => {
        expect(applyDiscoveryIntent({ isMix: "true" }).isMix).toBe("");
        expect(applyDiscoveryIntent({ isMix: 1 }).isMix).toBe("");
    });

    test("rejects non-string values for text fields", () => {
        expect(applyDiscoveryIntent({ genre: ["Techno"] }).genre).toBe("");
        expect(applyDiscoveryIntent({ search: { $regex: ".*" } }).search).toBe("");
    });

    test("trims whitespace from string fields", () => {
        expect(applyDiscoveryIntent({ genre: "  Techno  " }).genre).toBe("Techno");
    });

    test("treats a whitespace-only field the same as an absent one", () => {
        expect(applyDiscoveryIntent({ genre: "   " }).genre).toBe("");
    });

    test("handles null, undefined, and non-object input safely", () => {
        expect(applyDiscoveryIntent(null)).toEqual(EMPTY_PATCH);
        expect(applyDiscoveryIntent(undefined)).toEqual(EMPTY_PATCH);
        expect(applyDiscoveryIntent("not an object")).toEqual(EMPTY_PATCH);
        expect(applyDiscoveryIntent(42)).toEqual(EMPTY_PATCH);
        expect(applyDiscoveryIntent([])).toEqual(EMPTY_PATCH);
    });
});
