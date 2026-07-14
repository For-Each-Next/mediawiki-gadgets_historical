/* eslint-disable */

/**
 * Builds and updates talk-page assessment banner wikitext.
 */

export const CLASS_VALUES = [
    "Unassessed",
    "Stub",
    "Start",
    "C",
    "B",
    "SL",
    "List",
    "CL",
    "BL",
];
export const IMPORTANCE_VALUES = ["", "Low", "Mid", "High", "Top"];
const BANNER_SHELL_TEMPLATE = "WikiProject banner shell";
const BANNER_SHELL_ALIASES = [
    "WikiProject banner shell",
    "Multiple wikiprojects",
    "Multiple WikiProjects",
    "Multiple Wikiprojects",
    "PJBS",
    "WikiProject Banner Shell",
    "WikiProject Shell",
    "WikiProjectBanners",
    "WikiProjectBannerShell",
    "WPBannerShell",
    "WPBS",
    "Wpbs",
    "多[個个][專专][題题]",
    "通用[評评][級级]",
    "[專专][題题][橫横]幅",
    "[維维]基[專专][題题][橫横]幅",
];

/**
 * Creates initial form data for the assessment dialog.
 *
 * @param {object} projectConfig - Assessment project configuration.
 * @returns {object} Default assessment values.
 */
export function createDefaultAssessment(projectConfig) {
    return {
        className: "Unassessed",
        importance: "",
        maintenance: {
            cover: false,
            needsInfobox: false,
            reassess: false,
            screenshot: false,
        },
        otherProjects: Object.fromEntries(
            projectConfig.otherProjects.map((project) => [project.id, false]),
        ),
        taskForces: Object.fromEntries(
            projectConfig.videoGames.taskForces.map((taskForce) => [
                taskForce.id,
                false,
            ]),
        ),
    };
}

/**
 * Applies selected assessment banners to the top of a talk page.
 *
 * @param {string} text - Existing talk-page wikitext.
 * @param {object} assessment - Selected assessment values.
 * @param {object} projectConfig - Assessment project configuration.
 * @returns {string} Updated talk-page wikitext.
 */
export function updateTalkPageAssessment(text, assessment, projectConfig) {
    return replaceManagedTopTemplates(
        text,
        buildAssessmentBanners(assessment, projectConfig, text),
        projectConfig,
    );
}

/**
 * Applies manually edited assessment top-section text to a talk page.
 *
 * @param {string} text - Existing talk-page wikitext.
 * @param {string} topSection - Replacement top-section wikitext.
 * @param {object} projectConfig - Assessment project configuration.
 * @returns {string} Updated talk-page wikitext.
 */
export function updateTalkPageTopSection(text, topSection, projectConfig) {
    const source = String(text || "");
    const replacement = String(topSection || "").trim();
    const heading = /^=+/mu.exec(source);
    const remainder = heading == null ? "" : source.slice(heading.index);

    if (remainder === "") {
        return replacement === "" ? "" : `${replacement}\n`;
    }

    return replacement === "" ? remainder : `${replacement}\n\n${remainder}`;
}

/**
 * Replaces managed assessment templates while preserving other lead content.
 *
 * @param {string} text - Existing talk-page wikitext.
 * @param {string} banners - Replacement assessment banners.
 * @param {object} projectConfig - Assessment project configuration.
 * @returns {string} Updated talk-page wikitext.
 */
function replaceManagedTopTemplates(text, banners, projectConfig) {
    const source = String(text || "");
    const replacement = String(banners || "").trim();
    const cleaned = removeManagedTopTemplates(source, projectConfig).replace(
        /^\s+/u,
        "",
    );

    if (cleaned === "") {
        return `${replacement}\n`;
    }

    return `${replacement}\n\n${cleaned}`;
}

/**
 * Builds all selected assessment banner calls.
 *
 * @param {object} assessment - Selected assessment values.
 * @param {object} projectConfig - Assessment project configuration.
 * @returns {string} Assessment banner wikitext.
 */
export function buildAssessmentBanners(assessment, projectConfig, text = "") {
    const existingBanners = extractExistingShellBanners(text, projectConfig);
    const banners = [
        ...existingBanners.filter(
            (banner) => !isSelectedProjectBanner(banner, assessment, projectConfig),
        ),
        buildVideoGamesBanner(assessment, projectConfig.videoGames),
        ...projectConfig.otherProjects
            .filter((project) => assessment.otherProjects?.[project.id])
            .map(buildSimpleProjectBanner),
    ];

    return buildBannerShell(assessment.className, banners);
}

/**
 * Returns the top talk-page code after applying the assessment.
 *
 * @param {string} text - Existing talk-page wikitext.
 * @param {object} assessment - Selected assessment values.
 * @param {object} projectConfig - Assessment project configuration.
 * @returns {string} Previewed top-section wikitext.
 */
export function previewTalkPageTopSection(text, assessment, projectConfig) {
    return getTopSection(
        updateTalkPageAssessment(text, assessment, projectConfig),
    );
}

/**
 * Returns the current lead section before the first heading.
 *
 * @param {string} text - Talk-page wikitext.
 * @returns {string} Lead-section source.
 */
export function getTalkPageTopSection(text) {
    return getTopSection(text);
}

/**
 * Checks whether a proposed lead change only adds an empty importance field.
 *
 * @param {string} oldTopSection - Existing top-section source.
 * @param {string} newTopSection - Proposed top-section source.
 * @returns {boolean} Whether the only effective change is |importance=.
 */
export function isEmptyImportanceOnlyChange(oldTopSection, newTopSection) {
    const oldText = String(oldTopSection || "").trim();
    const newText = String(newTopSection || "").trim();

    return (
        oldText !== newText &&
        removeEmptyImportanceParameters(oldText) ===
            removeEmptyImportanceParameters(newText)
    );
}

/**
 * Gets whether new-page-list registration should be checked by default.
 *
 * @param {number} namespaceNumber - Current page namespace number.
 * @param {string} title - Current normalized page title.
 * @returns {boolean} Whether registration should default to checked.
 */
export function shouldRegisterByDefault(namespaceNumber, title) {
    return namespaceNumber === 0 || !String(title || "").includes("/");
}

/**
 * Builds the associated talk-page title for any subject page.
 *
 * @param {mw.Title} title - Current MediaWiki title object.
 * @returns {string} Talk-page prefixed title.
 */
export function getTalkPageTitle(title) {
    if (title.getNamespaceId() % 2 === 1) {
        return title.getPrefixedText();
    }

    return new mw.Title(
        title.getMainText(),
        title.getNamespaceId() + 1,
    ).getPrefixedText();
}

/**
 * Builds the subject-page title for registration.
 *
 * @param {mw.Title} title - Current MediaWiki title object.
 * @returns {string} Subject page title.
 */
export function getSubjectPageTitle(title) {
    if (title.getNamespaceId() % 2 === 0) {
        return title.getPrefixedText();
    }

    return new mw.Title(
        title.getMainText(),
        title.getNamespaceId() - 1,
    ).getPrefixedText();
}

/**
 * Removes the configured managed project banners from the page top.
 *
 * @param {string} text - Existing page text.
 * @param {object} projectConfig - Assessment project configuration.
 * @returns {string} Text without managed top banners.
 */
function removeManagedTopTemplates(text, projectConfig) {
    const patterns = buildManagedTemplatePatterns(projectConfig);
    let offset = 0;
    let next = readLeadingTemplate(text, offset);

    while (
        next != null &&
        patterns.some((pattern) =>
            pattern.test(normalizeTemplateName(next.name)),
        )
    ) {
        offset = next.end;
        next = readLeadingTemplate(text, offset);
    }

    return text.slice(offset);
}

/**
 * Builds normalized template-name patterns for managed banners.
 *
 * @param {object} projectConfig - Assessment project configuration.
 * @returns {Array<RegExp>} Normalized template name patterns.
 */
function buildManagedTemplatePatterns(projectConfig) {
    return [
        ...BANNER_SHELL_ALIASES,
        ...[projectConfig.videoGames, ...projectConfig.otherProjects].flatMap(
            (project) => [project.template, ...(project.aliases || [])],
        ),
    ].map(buildTemplatePattern);
}

/**
 * Builds one template-name matcher.
 *
 * @param {string} name - Literal template name or simple alias regex.
 * @returns {RegExp} Template-name pattern.
 */
function buildTemplatePattern(name) {
    const pattern = normalizeTemplateName(name)
        .split(/(\[[^\]]+\])/u)
        .map((part) => (part.startsWith("[") ? part : escapeRegExp(part)))
        .join("");

    return new RegExp(`^${pattern}$`, "iu");
}

/**
 * Normalizes template names for redirect and whitespace-tolerant matching.
 *
 * @param {string} name - Raw transcluded template name.
 * @returns {string} Normalized template key.
 */
function normalizeTemplateName(name) {
    return String(name || "")
        .trim()
        .replace(/^(?:Template|模板):/iu, "")
        .replace(/_/gu, " ")
        .replace(/\s+/gu, " ")
        .toLowerCase();
}

/**
 * Escapes a literal string for RegExp source.
 *
 * @param {string} value - Literal pattern segment.
 * @returns {string} Escaped pattern segment.
 */
function escapeRegExp(value) {
    return value.replace(/[\\^$.*+?()[\]{}|]/gu, "\\$&");
}

/**
 * Reads one top-level leading template call.
 *
 * @param {string} text - Source wikitext.
 * @param {number} start - Starting offset.
 * @returns {object|null} Template token details.
 */
function readLeadingTemplate(text, start) {
    let index = skipWhitespace(text, start);

    if (!text.startsWith("{{", index)) {
        return null;
    }

    const end = findTemplateEnd(text, index);

    if (end === -1) {
        return null;
    }

    return {
        end,
        source: text.slice(index, end),
        start: index,
        name: text
            .slice(index + 2, end - 2)
            .split("|")[0]
            .trim(),
    };
}

/**
 * Extracts existing WPBS nested banners for preservation.
 *
 * @param {string} text - Existing talk-page source.
 * @param {object} projectConfig - Assessment project configuration.
 * @returns {Array<string>} Existing nested banner calls.
 */
function extractExistingShellBanners(text, projectConfig) {
    const leading = readLeadingTemplate(String(text || ""), 0);

    if (
        leading == null ||
        !buildBannerShellPatterns().some((pattern) =>
            pattern.test(normalizeTemplateName(leading.name)),
        )
    ) {
        return [];
    }

    return readNestedBannersFromShell(leading.source).filter((banner) => {
        const name = readLeadingTemplate(banner, 0)?.name;

        return name != null && !isBannerShellName(name);
    });
}

/**
 * Reads nested banner template calls from a banner shell.
 *
 * @param {string} shell - Banner-shell source.
 * @returns {Array<string>} Nested template calls.
 */
function readNestedBannersFromShell(shell) {
    const inner = extractBannerShellBannerBody(shell);
    const banners = [];
    let offset = 0;
    let next = readLeadingTemplate(inner, offset);

    while (next != null) {
        banners.push(next.source.trim());
        offset = next.end;
        next = readLeadingTemplate(inner, offset);
    }

    return banners;
}

/**
 * Extracts the WPBS nested banner body.
 *
 * @param {string} shell - Banner-shell source.
 * @returns {string} Body source.
 */
function extractBannerShellBannerBody(shell) {
    const parts = splitTemplateParts(shell);
    const parameters = parts.slice(1);
    const explicitBody = parameters.find(isBannerShellBodyParameter);

    if (explicitBody != null) {
        return explicitBody.slice(findTopLevelEquals(explicitBody) + 1).trim();
    }

    return parameters.filter(isPositionalParameter).join("\n").trim();
}

/**
 * Checks whether a template parameter is the banner-shell |1= body.
 *
 * @param {string} parameter - Raw template parameter source.
 * @returns {boolean} Whether it is the body parameter.
 */
function isBannerShellBodyParameter(parameter) {
    const equals = findTopLevelEquals(parameter);

    return equals !== -1 && parameter.slice(0, equals).trim() === "1";
}

/**
 * Checks whether a template parameter is positional at top level.
 *
 * @param {string} parameter - Raw template parameter source.
 * @returns {boolean} Whether it is positional.
 */
function isPositionalParameter(parameter) {
    return findTopLevelEquals(parameter) === -1 && parameter.trim() !== "";
}

/**
 * Splits a template source into top-level pipe-separated parts.
 *
 * @param {string} template - Template source including braces.
 * @returns {Array<string>} Top-level template parts.
 */
function splitTemplateParts(template) {
    const inner = String(template || "").slice(2, -2);
    const parts = [];
    let depth = 0;
    let start = 0;

    for (let index = 0; index < inner.length; index += 1) {
        const pair = inner.slice(index, index + 2);

        if (pair === "{{") {
            depth += 1;
            index += 1;
        } else if (pair === "}}") {
            depth -= 1;
            index += 1;
        } else if (inner[index] === "|" && depth === 0) {
            parts.push(inner.slice(start, index));
            start = index + 1;
        }
    }

    parts.push(inner.slice(start));

    return parts;
}

/**
 * Finds the first top-level equals sign in template parameter source.
 *
 * @param {string} parameter - Template parameter source.
 * @returns {number} Equals offset, or -1.
 */
function findTopLevelEquals(parameter) {
    let depth = 0;

    for (let index = 0; index < parameter.length; index += 1) {
        const pair = parameter.slice(index, index + 2);

        if (pair === "{{") {
            depth += 1;
            index += 1;
        } else if (pair === "}}") {
            depth -= 1;
            index += 1;
        } else if (parameter[index] === "=" && depth === 0) {
            return index;
        }
    }

    return -1;
}

/**
 * Checks whether a preserved banner should be replaced by the selected output.
 *
 * @param {string} banner - Existing banner source.
 * @param {object} assessment - Selected assessment.
 * @param {object} projectConfig - Project configuration.
 * @returns {boolean} Whether this selected project will be rebuilt.
 */
function isSelectedProjectBanner(banner, assessment, projectConfig) {
    const name = readLeadingTemplate(banner, 0)?.name;

    if (name == null) {
        return false;
    }

    if (matchesProject(name, projectConfig.videoGames)) {
        return true;
    }

    return projectConfig.otherProjects.some(
        (project) =>
            assessment.otherProjects?.[project.id] && matchesProject(name, project),
    );
}

/**
 * Checks whether a template name matches a project config.
 *
 * @param {string} name - Template name.
 * @param {object} project - Project config.
 * @returns {boolean} Whether it matches.
 */
function matchesProject(name, project) {
    return [project.template, ...(project.aliases || [])]
        .map(buildTemplatePattern)
        .some((pattern) => pattern.test(normalizeTemplateName(name)));
}

/**
 * Checks whether a template is a banner shell alias.
 *
 * @param {string} name - Template name.
 * @returns {boolean} Whether it is WPBS.
 */
function isBannerShellName(name) {
    return buildBannerShellPatterns().some((pattern) =>
        pattern.test(normalizeTemplateName(name)),
    );
}

/**
 * Builds shell alias matchers.
 *
 * @returns {Array<RegExp>} Shell matchers.
 */
function buildBannerShellPatterns() {
    return BANNER_SHELL_ALIASES.map(buildTemplatePattern);
}

/**
 * Finds the end offset of a template call.
 *
 * @param {string} text - Source wikitext.
 * @param {number} start - Template start offset.
 * @returns {number} End offset after the closing braces, or -1.
 */
function findTemplateEnd(text, start) {
    let depth = 0;

    for (let index = start; index < text.length - 1; index += 1) {
        const pair = text.slice(index, index + 2);

        if (pair === "{{") {
            depth += 1;
            index += 1;
        } else if (pair === "}}") {
            depth -= 1;
            index += 1;

            if (depth === 0) {
                return index + 1;
            }
        }
    }

    return -1;
}

/**
 * Skips whitespace from a source offset.
 *
 * @param {string} text - Source text.
 * @param {number} start - Starting offset.
 * @returns {number} First non-whitespace offset.
 */
function skipWhitespace(text, start) {
    let index = start;

    while (/\s/u.test(text[index] || "")) {
        index += 1;
    }

    return index;
}

/**
 * Builds the WikiProject Video games banner.
 *
 * @param {object} assessment - Selected assessment values.
 * @param {object} config - Video games project configuration.
 * @returns {string} Video games banner call.
 */
function buildVideoGamesBanner(assessment, config) {
    const params = [
        `|${config.importanceParameter}=${assessment.importance || ""}`,
    ];

    config.taskForces
        .filter((taskForce) => assessment.taskForces?.[taskForce.id])
        .forEach((taskForce) => params.push(`|${taskForce.parameter}=yes`));

    getSelectedMaintenanceParams(assessment).forEach((param) => {
        params.push(`|${param}=yes`);
    });

    return `{{${config.template}${params.join("")}}}`;
}

/**
 * Gets selected maintenance banner parameters.
 *
 * @param {object} assessment - Selected assessment values.
 * @returns {Array<string>} Maintenance parameter names.
 */
function getSelectedMaintenanceParams(assessment) {
    return [
        ["reassess", assessment.maintenance?.reassess],
        ["needs-infobox", assessment.maintenance?.needsInfobox],
        ["cover", assessment.maintenance?.cover],
        ["screenshot", assessment.maintenance?.screenshot],
    ]
        .filter(([, selected]) => selected)
        .map(([param]) => param);
}

/**
 * Builds a simple selected WikiProject banner.
 *
 * @param {object} project - WikiProject configuration.
 * @returns {string} Template call.
 */
function buildSimpleProjectBanner(project) {
    return `{{${project.template}}}`;
}

/**
 * Builds the shell that carries shared assessment class.
 *
 * @param {string} className - Selected assessment class.
 * @param {Array<string>} banners - Nested WikiProject banner calls.
 * @returns {string} Banner shell wikitext.
 */
function buildBannerShell(className, banners) {
    return [
        `{{${BANNER_SHELL_TEMPLATE}|class=${className || "Unassessed"}|1=`,
        ...banners,
        "}}",
    ].join("\n");
}

/**
 * Extracts the leading talk-page section before the first heading.
 *
 * @param {string} text - Talk-page wikitext.
 * @returns {string} Top-section wikitext.
 */
function getTopSection(text) {
    const heading = /^=+/mu.exec(text);

    return (heading == null ? text : text.slice(0, heading.index)).trimEnd();
}

/**
 * Removes empty importance parameters for no-op detection.
 *
 * @param {string} text - Source text.
 * @returns {string} Source without empty importance fields.
 */
function removeEmptyImportanceParameters(text) {
    return String(text || "")
        .replace(/\|\s*importance\s*=\s*(?=[|}\n])/giu, "")
        .replace(/[ \t]+$/gmu, "")
        .trim();
}
