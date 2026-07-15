/**
 * Real saved draft used by cross-part regression tests.
 */

export const wheelWorldEntry = {
    data: {
        input: {
            enwikiTitle: "Wheel World",
            registerNewPage: true,
            stubTagRows: [
                createStubTagRow("Windows-videogame-stub", false),
                createStubTagRow("videogame-stub", false),
                createStubTagRow("PlayStation-stub", false),
                createStubTagRow("Xbox-stub", false),
                createStubTagRow("adventure-videogame-stub", true),
                createStubTagRow("racing-videogame-stub", true),
                {
                    enabled: true,
                    originalEnabled: false,
                    originalStubTag: "",
                    status: "",
                    stubTag: "",
                },
            ],
            localizedNames: [],
            pageName: "Wheel World",
            englishName: "Wheel World",
            openCriticRecommendSourceUrl:
                "https://opencritic.com/game/18726/-",
            developers: "[[Messhof]]",
            publishers: "[[安纳布尔纳互动]]",
            platforms:
                "[[Windows]]; [[Linux]]; [[PlayStation 5]]; " +
                "[[Xbox Series X/S]]",
            year: "2025年",
            genres: "[[冒险游戏|冒险]]; [[竞速游戏|竞速]]",
            metacriticScoreSourceUrl:
                "https://www.metacritic.com/game/wheel-world/",
            metacriticScore: "PC:71",
            openCriticRecommend: "65",
        },
        patches: {
            categories: [
                {
                    source: { company: "Messhof" },
                    enabled: false,
                },
                {
                    source: { manual: true },
                    enabled: true,
                },
            ],
            citations: [],
            navboxes: [],
            noteTa: [],
        },
        version: 1,
    },
    id: 0,
    metadata: {
        page: "Wheel World",
        savedAt: "2026/7/15 16:28:24",
        temporary: true,
    },
};

/**
 * Creates an unchanged generated stub-tag row.
 *
 * @param stubTag - Generated stub template name.
 * @param enabled - Whether the generated row is enabled.
 * @returns Stored stub-tag row.
 */
function createStubTagRow(stubTag: string, enabled: boolean) {
    return {
        enabled,
        originalEnabled: enabled,
        originalStubTag: stubTag,
        status: "",
        stubTag,
    };
}
