const {
    normalizeIntent,
    createFallbackIntent,
} = require("../../services/searchIntent");

describe("searchIntent.normalizeIntent", () => {
    test("accepts a valid structured search intent", () => {
        const result = normalizeIntent({
            genre: "Techno",
            subgenre: "Industrial",
            isMix: true,
            sort: "newest",
            search: "dark warehouse",
        });

        expect(result.valid).toBe(true);

        expect(result.intent).toEqual({
            genre: "Techno",
            subgenre: "Industrial",
            isMix: true,
            sort: "newest",
            search: "dark warehouse",
        });

        expect(result.unsupported).toEqual([]);
    });

    test("accepts an intent with only search", () => {
        const result = normalizeIntent({
            search: "dark industrial techno",
        });

        expect(result.valid).toBe(true);

        expect(result.intent).toEqual({
            search: "dark industrial techno",
        });

        expect(result.unsupported).toEqual([]);
    });

    test("ignores null optional fields", () => {
        const result = normalizeIntent({
            genre: null,
            subgenre: null,
            isMix: null,
            sort: null,
            search: null,
        });

        expect(result.valid).toBe(true);
        expect(result.intent).toEqual({});
        expect(result.unsupported).toEqual([]);
    });

    test("trims surrounding whitespace from strings", () => {
        const result = normalizeIntent({
            genre: "  Techno  ",
            subgenre: " Industrial ",
            search: "  dark warehouse  ",
        });

        expect(result.intent).toEqual({
            genre: "Techno",
            subgenre: "Industrial",
            search: "dark warehouse",
        });
    });

    test.each([
        "newest",
        "oldest",
        "title_asc",
        "title_desc",
    ])("accepts valid sort value: %s", (sort) => {
        const result = normalizeIntent({ sort });

        expect(result.intent.sort).toBe(sort);
        expect(result.unsupported).toEqual([]);
    });

    test("rejects an invalid sort value", () => {
        const result = normalizeIntent({
            sort: "random",
        });

        expect(result.intent).toEqual({});
        expect(result.unsupported).toContain("sort");
    });

    test("rejects non-boolean isMix values", () => {
        const result = normalizeIntent({
            isMix: "true",
        });

        expect(result.intent).toEqual({});
        expect(result.unsupported).toContain("isMix");
    });

    test("rejects array values for string fields", () => {
        const result = normalizeIntent({
            genre: ["Techno", "House"],
            search: ["dark", "warehouse"],
        });

        expect(result.intent).toEqual({});
        expect(result.unsupported).toContain("genre");
        expect(result.unsupported).toContain("search");
    });

    test("rejects object values for string fields", () => {
        const result = normalizeIntent({
            genre: {
                $ne: "Techno",
            },
            search: {
                $regex: ".*",
            },
        });

        expect(result.intent).toEqual({});
        expect(result.unsupported).toContain("genre");
        expect(result.unsupported).toContain("search");
    });

    test("rejects empty strings", () => {
        const result = normalizeIntent({
            genre: "",
            subgenre: "   ",
            search: "",
        });

        expect(result.intent).toEqual({});

        expect(result.unsupported).toContain("genre");
        expect(result.unsupported).toContain("subgenre");
        expect(result.unsupported).toContain("search");
    });

    test("rejects strings exceeding the maximum filter length", () => {
        const longGenre = "a".repeat(101);

        const result = normalizeIntent({
            genre: longGenre,
        });

        expect(result.intent).toEqual({});
        expect(result.unsupported).toContain("genre");
    });

    test("rejects strings exceeding the maximum search length", () => {
        const longSearch = "a".repeat(101);

        const result = normalizeIntent({
            search: longSearch,
        });

        expect(result.intent).toEqual({});
        expect(result.unsupported).toContain("search");
    });

    test("never accepts visibility from AI output", () => {
        const result = normalizeIntent({
            genre: "Techno",
            visibility: "draft",
        });

        expect(result.intent).toEqual({
            genre: "Techno",
        });

        expect(result.unsupported).toContain("visibility");
        expect(result.intent.visibility).toBeUndefined();
    });

    test("never accepts artistId from AI output", () => {
        const result = normalizeIntent({
            genre: "Techno",
            artistId: "507f1f77bcf86cd799439011",
        });

        expect(result.intent).toEqual({
            genre: "Techno",
        });

        expect(result.unsupported).toContain("artistId");
        expect(result.intent.artistId).toBeUndefined();
    });

    test("rejects Mongo-style operator fields", () => {
        const result = normalizeIntent({
            genre: "Techno",
            $where: "this.visibility === 'draft'",
            $or: [
                {
                    visibility: "draft",
                },
            ],
        });

        expect(result.intent).toEqual({
            genre: "Techno",
        });

        expect(result.unsupported).toContain("$where");
        expect(result.unsupported).toContain("$or");
    });

    test("rejects arbitrary fields returned by the AI", () => {
        const result = normalizeIntent({
            genre: "Techno",
            password: "secret",
            uploadedBy: "admin",
            userId: "123",
            mongoFilter: {
                visibility: "draft",
            },
        });

        expect(result.intent).toEqual({
            genre: "Techno",
        });

        expect(result.unsupported).toEqual(
            expect.arrayContaining([
                "password",
                "uploadedBy",
                "userId",
                "mongoFilter",
            ])
        );
    });

    test("deduplicates unsupported fields", () => {
        const result = normalizeIntent({
            genre: ["Techno"],
            visibility: "draft",
            artistId: {
                $ne: null,
            },
        });

        expect(result.unsupported).toEqual(
            expect.arrayContaining([
                "genre",
                "visibility",
                "artistId",
            ])
        );

        expect(
            new Set(result.unsupported).size
        ).toBe(result.unsupported.length);
    });

    test("handles null as malformed AI output", () => {
        const result = normalizeIntent(null);

        expect(result).toEqual({
            intent: {},
            unsupported: [],
            valid: false,
        });
    });

    test("handles arrays as malformed AI output", () => {
        const result = normalizeIntent([
            {
                genre: "Techno",
            },
        ]);

        expect(result).toEqual({
            intent: {},
            unsupported: [],
            valid: false,
        });
    });

    test("handles primitive values as malformed AI output", () => {
        expect(normalizeIntent("Techno").valid).toBe(false);
        expect(normalizeIntent(123).valid).toBe(false);
        expect(normalizeIntent(true).valid).toBe(false);
    });
});

describe("searchIntent.createFallbackIntent", () => {
    test("creates a plain-text search fallback", () => {
        const result = createFallbackIntent(
            "dark industrial techno"
        );

        expect(result).toEqual({
            search: "dark industrial techno",
        });
    });

    test("trims the fallback query", () => {
        const result = createFallbackIntent(
            "   dark warehouse techno   "
        );

        expect(result).toEqual({
            search: "dark warehouse techno",
        });
    });

    test("caps the fallback query at 100 characters", () => {
        const longQuery = "a".repeat(101);

        const result = createFallbackIntent(longQuery);

        expect(result).toEqual({
            search: "",
        });
    });

    test("handles an empty fallback query", () => {
        expect(createFallbackIntent("")).toEqual({
            search: "",
        });
    });

    test("handles whitespace-only fallback query", () => {
        expect(createFallbackIntent("     ")).toEqual({
            search: "",
        });
    });
});