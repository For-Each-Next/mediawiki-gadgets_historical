/* eslint-disable */

/**
 * Tests talk-page assessment helpers.
 */

import assert from "node:assert/strict";
import test from "node:test";

import {
    createDefaultAssessment,
    isEmptyImportanceOnlyChange,
    previewTalkPageTopSection,
    shouldRegisterByDefault,
    updateTalkPageAssessment,
    updateTalkPageTopSection,
} from "../src/assessment.js";

const projectConfig = {
    otherProjects: [
        {
            id: "fictionalCharacters",
            template: "WikiProject Fictional characters",
            aliases: ["虚构角色[專专][題题]", "虚构人物[專专][題题]"],
        },
        {
            id: "acg",
            template: "ACG專題",
            aliases: [
                "ACG[專专][題题]",
                "WPACG",
                "WikiProject ACG",
                "WikiProject Anime",
                "WikiProject Anime and manga",
                "WPANIME",
            ],
        },
        {
            id: "biography",
            template: "WikiProject Biography",
            aliases: [
                "[傳传][記记][專专][題题]",
                "WPBiography",
                "WikiProject [傳传][記记]",
                "人物[專专][題题]",
                "WikiProject Biographies",
            ],
        },
        {
            id: "company",
            template: "WikiProject Companies",
            aliases: ["公司[專专][題题]", "WikiProject 公司"],
        },
        {
            id: "films",
            template: "WikiProject Film",
            aliases: [
                "[電电]影[專专][題题]",
                "Film",
                "WPFilm",
                "WikiProject 电影",
                "WP Film",
            ],
        },
        {
            id: "music",
            template: "音樂專題",
            aliases: [
                "音[樂乐][專专][題题]",
                "WikiProject 音[樂乐]",
                "WikiProject Music",
                "WikiProject Songs",
                "歌曲[專专][題题]",
                "WikiProject Albums",
            ],
        },
    ],
    videoGames: {
        classParameter: "class",
        importanceParameter: "importance",
        taskForces: [
            {
                id: "pokemon",
                parameter: "pokemon",
            },
            {
                id: "nintendo",
                parameter: "nintendo",
            },
        ],
        template: "WikiProject Video games",
        aliases: [
            "[電电]子[遊游][戲戏][專专][題题]",
            "WPVG",
            "WikiProject Square Enix",
            "WikiProject Electronic games",
        ],
    },
};

/**
 * Builds expected shell output for tests.
 *
 * @param {string} className - Assessment class.
 * @param {Array<string>} banners - Nested banner calls.
 * @returns {string} Expected shell text.
 */
function expectedShell(className, banners) {
    return [
        `{{WikiProject banner shell|class=${className}|1=`,
        ...banners,
        "}}",
    ].join("\n");
}

test("builds default video game assessment banner", () => {
    assert.equal(
        updateTalkPageAssessment(
            "",
            createDefaultAssessment(projectConfig),
            projectConfig,
        ),
        `${expectedShell("Unassessed", ["{{WikiProject Video games|importance=}}"])}\n`,
    );
});

test("updates managed top banners and keeps existing discussion", () => {
    const assessment = createDefaultAssessment(projectConfig);

    assessment.className = "Stub";
    assessment.importance = "Low";
    assessment.maintenance.cover = true;
    assessment.maintenance.needsInfobox = true;
    assessment.maintenance.reassess = true;
    assessment.maintenance.screenshot = true;
    assessment.taskForces.pokemon = true;
    assessment.otherProjects.fictionalCharacters = true;

    assert.equal(
        updateTalkPageAssessment(
            "{{Template:WikiProject_Video_games|class=Start}}\n{{WikiProject Music}}\n\n== 旧讨论 ==\n内容",
            assessment,
            projectConfig,
        ),
        [
            expectedShell("Stub", [
                "{{WikiProject Video games|importance=Low|pokemon=yes|reassess=yes|needs-infobox=yes|cover=yes|screenshot=yes}}",
                "{{WikiProject Fictional characters}}",
            ]),
            "",
            "== 旧讨论 ==",
            "内容",
        ].join("\n"),
    );
});

test("previews only the top talk-page section", () => {
    const assessment = createDefaultAssessment(projectConfig);

    assert.equal(
        previewTalkPageTopSection(
            "== 讨论 ==\n内容",
            assessment,
            projectConfig,
        ),
        expectedShell("Unassessed", [
            "{{WikiProject Video games|importance=}}",
        ]),
    );
});

test("saves a preview containing an unmanaged lead template without duplicating it", () => {
    const source = "{{Translated page|ja|GENDA GiGO Entertainment}}";
    const assessment = createDefaultAssessment(projectConfig);

    assessment.taskForces.nintendo = true;
    assessment.otherProjects.company = true;

    const preview = previewTalkPageTopSection(
        source,
        assessment,
        projectConfig,
    );

    assert.equal(
        updateTalkPageTopSection(source, preview, projectConfig),
        [
            expectedShell("Unassessed", [
                "{{WikiProject Video games|importance=|nintendo=yes}}",
                "{{WikiProject Companies}}",
            ]),
            "",
            source,
            "",
        ].join("\n"),
    );
});

test("removes configured aliases and underscore variations", () => {
    const assessment = createDefaultAssessment(projectConfig);

    assert.equal(
        updateTalkPageAssessment(
            "{{电子游戏专题|class=B}}\n{{WikiProject_Music}}\n{{Other|kept=yes}}",
            assessment,
            projectConfig,
        ),
        `${expectedShell("Unassessed", ["{{WikiProject Video games|importance=}}"])}\n\n{{Other|kept=yes}}`,
    );
});

test("normalizes underscores and first-letter case", () => {
    const assessment = createDefaultAssessment(projectConfig);

    assert.equal(
        updateTalkPageAssessment(
            "{{wikiProject_Video_games|class=B}}\n{{wikiProject_Music}}\n{{Other|kept=yes}}",
            assessment,
            projectConfig,
        ),
        `${expectedShell("Unassessed", ["{{WikiProject Video games|importance=}}"])}\n\n{{Other|kept=yes}}`,
    );
});

test("matches actual video game redirects and Chinese variants", () => {
    const assessment = createDefaultAssessment(projectConfig);

    assert.equal(
        updateTalkPageAssessment(
            "{{Template:Wpvg|class=Start}}\n{{Template:WikiProject Square Enix}}\n{{Template:電子遊戲專題}}\n{{Other|kept=yes}}",
            assessment,
            projectConfig,
        ),
        `${expectedShell("Unassessed", ["{{WikiProject Video games|importance=}}"])}\n\n{{Other|kept=yes}}`,
    );
});

test("matches actual fictional character redirects", () => {
    const assessment = createDefaultAssessment(projectConfig);

    assessment.otherProjects.fictionalCharacters = true;

    assert.equal(
        updateTalkPageAssessment(
            "{{Template:虚构人物专题}}\n{{Other|kept=yes}}",
            assessment,
            projectConfig,
        ),
        [
            expectedShell("Unassessed", [
                "{{WikiProject Video games|importance=}}",
                "{{WikiProject Fictional characters}}",
            ]),
            "",
            "{{Other|kept=yes}}",
        ].join("\n"),
    );
});

test("matches actual film redirects and Chinese variants", () => {
    const assessment = createDefaultAssessment(projectConfig);

    assessment.otherProjects.films = true;

    assert.equal(
        updateTalkPageAssessment(
            "{{Template:WP Film}}\n{{Template:電影專題}}\n{{Other|kept=yes}}",
            assessment,
            projectConfig,
        ),
        [
            expectedShell("Unassessed", [
                "{{WikiProject Video games|importance=}}",
                "{{WikiProject Film}}",
            ]),
            "",
            "{{Other|kept=yes}}",
        ].join("\n"),
    );
});

test("matches actual ACG redirects and emits Chinese main template", () => {
    const assessment = createDefaultAssessment(projectConfig);

    assessment.otherProjects.acg = true;

    assert.equal(
        updateTalkPageAssessment(
            "{{Template:WikiProject Anime and Manga}}\n{{Template:ACG专题}}\n{{Other|kept=yes}}",
            assessment,
            projectConfig,
        ),
        [
            expectedShell("Unassessed", [
                "{{WikiProject Video games|importance=}}",
                "{{ACG專題}}",
            ]),
            "",
            "{{Other|kept=yes}}",
        ].join("\n"),
    );
});

test("matches actual biography redirects and Chinese variants", () => {
    const assessment = createDefaultAssessment(projectConfig);

    assessment.otherProjects.biography = true;

    assert.equal(
        updateTalkPageAssessment(
            "{{Template:Wpbiography}}\n{{Template:傳記專題}}\n{{Template:人物專題}}\n{{Other|kept=yes}}",
            assessment,
            projectConfig,
        ),
        [
            expectedShell("Unassessed", [
                "{{WikiProject Video games|importance=}}",
                "{{WikiProject Biography}}",
            ]),
            "",
            "{{Other|kept=yes}}",
        ].join("\n"),
    );
});

test("matches actual company redirects and Chinese variants", () => {
    const assessment = createDefaultAssessment(projectConfig);

    assessment.otherProjects.company = true;

    assert.equal(
        updateTalkPageAssessment(
            "{{Template:公司專題}}\n{{Template:WikiProject 公司}}\n{{Other|kept=yes}}",
            assessment,
            projectConfig,
        ),
        [
            expectedShell("Unassessed", [
                "{{WikiProject Video games|importance=}}",
                "{{WikiProject Companies}}",
            ]),
            "",
            "{{Other|kept=yes}}",
        ].join("\n"),
    );
});

test("matches actual music redirects and emits Chinese main template", () => {
    const assessment = createDefaultAssessment(projectConfig);

    assessment.otherProjects.music = true;

    assert.equal(
        updateTalkPageAssessment(
            "{{Template:WikiProject Songs}}\n{{Template:音乐专题}}\n{{Other|kept=yes}}",
            assessment,
            projectConfig,
        ),
        [
            expectedShell("Unassessed", [
                "{{WikiProject Video games|importance=}}",
                "{{音樂專題}}",
            ]),
            "",
            "{{Other|kept=yes}}",
        ].join("\n"),
    );
});

test("replaces an existing banner shell alias", () => {
    const assessment = createDefaultAssessment(projectConfig);

    assessment.className = "Start";

    assert.equal(
        updateTalkPageAssessment(
            "{{WikiProject_banner_shell|class=B|1=\n{{WikiProject Video games|importance=}}\n}}\n\n== 讨论 ==",
            assessment,
            projectConfig,
        ),
        `${expectedShell("Start", ["{{WikiProject Video games|importance=}}"])}\n\n== 讨论 ==`,
    );
});

test("preserves unselected existing banners inside banner shell", () => {
    const assessment = createDefaultAssessment(projectConfig);

    assert.equal(
        updateTalkPageAssessment(
            [
                "{{WikiProject banner shell|class=Start|1=",
                "{{WikiProject Video games |importance=Low}}",
                "{{WikiProject Companies |class= |importance=low}}",
                "{{WikiProject France |class= |importance=low}}",
                "}}",
            ].join("\n"),
            assessment,
            projectConfig,
        ),
        [
            "{{WikiProject banner shell|class=Unassessed|1=",
            "{{WikiProject Companies |class= |importance=low}}",
            "{{WikiProject France |class= |importance=low}}",
            "{{WikiProject Video games|importance=}}",
            "}}\n",
        ].join("\n"),
    );
});

test("preserves unselected banners in positional banner shell body", () => {
    const assessment = createDefaultAssessment(projectConfig);

    assert.equal(
        updateTalkPageAssessment(
            [
                "{{WikiProject banner shell|class=Start|",
                "{{WikiProject Aviation|importance=Low}}",
                "}}",
                "{{ITNtalk|2026年|7月10日|oldid1=93390515}}",
            ].join("\n"),
            assessment,
            projectConfig,
        ),
        [
            "{{WikiProject banner shell|class=Unassessed|1=",
            "{{WikiProject Aviation|importance=Low}}",
            "{{WikiProject Video games|importance=}}",
            "}}",
            "",
            "{{ITNtalk|2026年|7月10日|oldid1=93390515}}",
        ].join("\n"),
    );
});

test("recognizes Chinese banner shell aliases", () => {
    const assessment = createDefaultAssessment(projectConfig);

    assessment.className = "C";

    assert.equal(
        updateTalkPageAssessment(
            "{{多個專題|class=B|1=\n{{WikiProject Video games}}\n}}\n\n== 讨论 ==",
            assessment,
            projectConfig,
        ),
        `${expectedShell("C", ["{{WikiProject Video games|importance=}}"])}\n\n== 讨论 ==`,
    );
});

test("detects empty-importance-only changes", () => {
    assert.equal(
        isEmptyImportanceOnlyChange(
            "{{WikiProject banner shell|class=Unassessed|1=\n{{WikiProject Video games}}\n}}",
            "{{WikiProject banner shell|class=Unassessed|1=\n{{WikiProject Video games|importance=}}\n}}",
        ),
        true,
    );
});

test("defaults registration off for non-article subpages only", () => {
    assert.equal(shouldRegisterByDefault(0, "Article/Subpage"), true);
    assert.equal(shouldRegisterByDefault(10, "Template:Example"), true);
    assert.equal(shouldRegisterByDefault(10, "Template:Example/doc"), false);
});
