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
 * @param projectConfig - Assessment project configuration.
 * @returns Default assessment values.
 */
export function createDefaultAssessment(projectConfig: any): any {
    const otherProjectEntries = projectConfig.otherProjects.map(
        function callback(project: { id: string }) {
            return [project.id, false];
        },
    );
    const taskForceEntries = projectConfig.videoGames.taskForces.map(
        function callback(taskForce: { id: unknown }) {
            return [taskForce.id, false];
        },
    );
    const result = {
        className: "Unassessed",
        importance: "",
        maintenance: {
            cover: false,
            needsInfobox: false,
            reassess: false,
            screenshot: false,
        },
        otherProjects: Object.fromEntries(otherProjectEntries),
        taskForces: Object.fromEntries(taskForceEntries),
    };
    return result;
}

/**
 * Applies selected assessment banners to the top of a talk page.
 *
 * @param text - Existing talk-page wikitext.
 * @param assessment - Selected assessment values.
 * @param projectConfig - Assessment project configuration.
 * @returns Updated talk-page wikitext.
 */
export function updateTalkPageAssessment(
    text: string,
    assessment: any,
    projectConfig: any,
): string {
    const banners = buildAssessmentBanners(assessment, projectConfig, text);
    const result = replaceManagedTopTemplates(text, banners, projectConfig);
    return result;
}

/**
 * Applies manually edited assessment top-section text to a talk page.
 *
 * @param text - Existing talk-page wikitext.
 * @param topSection - Replacement top-section wikitext.
 * @returns Updated talk-page wikitext.
 */
export function updateTalkPageTopSection(
    text: string,
    topSection: string,
): string {
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
 * Handles replace managed top templates.
 *
 * Replaces managed assessment templates while preserving other lead
 * content.
 *
 * @param text - Existing talk-page wikitext.
 * @param banners - Replacement assessment banners.
 * @param projectConfig - Assessment project configuration.
 * @returns Updated talk-page wikitext.
 */
function replaceManagedTopTemplates(
    text: string,
    banners: string,
    projectConfig: any,
): string {
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
 * @param assessment - Selected assessment values.
 * @param projectConfig - Assessment project configuration.
 * @param text - Existing talk-page wikitext.
 * @returns Assessment banner wikitext.
 */
export function buildAssessmentBanners(
    assessment: any,
    projectConfig: any,
    text = "",
): string {
    const existingBanners = extractExistingShellBanners(text);
    const preservedBanners = [];

    for (const banner of existingBanners) {
        const selected = isSelectedProjectBanner(
            banner,
            assessment,
            projectConfig,
        );

        if (!selected) {
            preservedBanners.push(banner);
        }
    }

    const videoGamesBanner = buildVideoGamesBanner(
        assessment,
        projectConfig.videoGames,
    );
    const selectedProjects = [];

    for (const project of projectConfig.otherProjects) {
        if (assessment.otherProjects?.[project.id]) {
            selectedProjects.push(project);
        }
    }

    const otherProjectBanners = [];

    for (const project of selectedProjects) {
        const banner = buildSimpleProjectBanner(project);
        otherProjectBanners.push(banner);
    }

    const banners = [
        ...preservedBanners,
        videoGamesBanner,
        ...otherProjectBanners,
    ];

    return buildBannerShell(assessment.className, banners);
}

/**
 * Returns the top talk-page code after applying the assessment.
 *
 * @param text - Existing talk-page wikitext.
 * @param assessment - Selected assessment values.
 * @param projectConfig - Assessment project configuration.
 * @returns Previewed top-section wikitext.
 */
export function previewTalkPageTopSection(
    text: string,
    assessment: any,
    projectConfig: any,
): string {
    const updatedText = updateTalkPageAssessment(
        text,
        assessment,
        projectConfig,
    );
    const result = getTopSection(updatedText);
    return result;
}

/**
 * Returns the current lead section before the first heading.
 *
 * @param text - Talk-page wikitext.
 * @returns Lead-section source.
 */
export function getTalkPageTopSection(text: string): string {
    return getTopSection(text);
}

/**
 * Handles is empty importance only change.
 *
 * Checks whether a proposed lead change only adds an empty importance
 * field.
 *
 * @param oldTopSection - Existing top-section source.
 * @param newTopSection - Proposed top-section source.
 * @returns Whether the only effective change is |importance=.
 */
export function isEmptyImportanceOnlyChange(
    oldTopSection: string,
    newTopSection: string,
): boolean {
    const oldText = String(oldTopSection || "").trim();
    const newText = String(newTopSection || "").trim();

    const result =
        oldText !== newText &&
        removeEmptyImportanceParameters(oldText) ===
            removeEmptyImportanceParameters(newText);
    return result;
}

/**
 * Gets whether new-page-list registration should be checked by default.
 *
 * @param namespaceNumber - Current page namespace number.
 * @param title - Current normalized page title.
 * @returns Whether registration should default to checked.
 */
export function shouldRegisterByDefault(
    namespaceNumber: number,
    title: string,
): boolean {
    return namespaceNumber === 0 || !String(title || "").includes("/");
}

/**
 * Builds the associated talk-page title for any subject page.
 *
 * @param title - Current MediaWiki title object.
 * @returns Talk-page prefixed title.
 */
export function getTalkPageTitle(title: mw.Title): string {
    if (title.getNamespaceId() % 2 === 1) {
        return title.getPrefixedText();
    }

    const mainText = title.getMainText();
    const namespaceId = title.getNamespaceId() + 1;
    const talkTitle = new mw.Title(mainText, namespaceId);
    const result = talkTitle.getPrefixedText();
    return result;
}

/**
 * Builds the subject-page title for registration.
 *
 * @param title - Current MediaWiki title object.
 * @returns Subject page title.
 */
export function getSubjectPageTitle(title: mw.Title): string {
    if (title.getNamespaceId() % 2 === 0) {
        return title.getPrefixedText();
    }

    const mainText = title.getMainText();
    const namespaceId = title.getNamespaceId() - 1;
    const subjectTitle = new mw.Title(mainText, namespaceId);
    const result = subjectTitle.getPrefixedText();
    return result;
}

/**
 * Removes the configured managed project banners from the page top.
 *
 * @param text - Existing page text.
 * @param projectConfig - Assessment project configuration.
 * @returns Text without managed top banners.
 */
function removeManagedTopTemplates(text: string, projectConfig: any): string {
    const patterns = buildManagedTemplatePatterns(projectConfig);
    let offset = 0;
    let next = readLeadingTemplate(text, offset);

    while (next != null && isManagedTemplate(next.name, patterns)) {
        offset = next.end;
        next = readLeadingTemplate(text, offset);
    }

    return text.slice(offset);
}

/**
 * Checks whether a template name matches the managed patterns.
 *
 * @param name - Template name.
 * @param patterns - Managed template patterns.
 * @returns Whether the template is managed.
 */
function isManagedTemplate(name: string, patterns: Array<RegExp>): boolean {
    const normalizedName = normalizeTemplateName(name);
    return matchesAnyPattern(patterns, normalizedName);
}

/**
 * Builds normalized template-name patterns for managed banners.
 *
 * @param projectConfig - Assessment project configuration.
 * @returns Normalized template name patterns.
 */
function buildManagedTemplatePatterns(projectConfig: any): Array<RegExp> {
    const result = [
        ...BANNER_SHELL_ALIASES,
        ...[projectConfig.videoGames, ...projectConfig.otherProjects].flatMap(
            (project) => [project.template, ...(project.aliases || [])],
        ),
    ].map(buildTemplatePattern);
    return result;
}

/**
 * Builds one template-name matcher.
 *
 * @param name - Literal template name or simple alias regex.
 * @returns Template-name pattern.
 */
function buildTemplatePattern(name: string): RegExp {
    const normalizedName = normalizeTemplateName(name);
    const parts = normalizedName.split(/(\[[^\]]+\])/u);
    const patternParts = [];

    for (const part of parts) {
        let patternPart = part;

        if (!part.startsWith("[")) {
            patternPart = escapeRegExp(part);
        }

        patternParts.push(patternPart);
    }

    const pattern = patternParts.join("");

    return new RegExp(`^${pattern}$`, "iu");
}

/**
 * Handles normalize template name.
 *
 * Normalizes template names for redirect and whitespace-tolerant
 * matching.
 *
 * @param name - Raw transcluded template name.
 * @returns Normalized template key.
 */
function normalizeTemplateName(name: string): string {
    const result = String(name || "")
        .trim()
        .replace(/^(?:Template|模板):/iu, "")
        .replace(/_/gu, " ")
        .replace(/\s+/gu, " ")
        .toLowerCase();
    return result;
}

/**
 * Escapes a literal string for RegExp source.
 *
 * @param value - Literal pattern segment.
 * @returns Escaped pattern segment.
 */
function escapeRegExp(value: string): string {
    return value.replace(/[\\^$.*+?()[\]{}|]/gu, "\\$&");
}

/**
 * Reads one top-level leading template call.
 *
 * @param text - Source wikitext.
 * @param start - Starting offset.
 * @returns Template token details.
 */
function readLeadingTemplate(text: string, start: number): any | null {
    const index = skipWhitespace(text, start);

    if (!text.startsWith("{{", index)) {
        return null;
    }

    const end = findTemplateEnd(text, index);

    if (end === -1) {
        return null;
    }

    const result = {
        end,
        source: text.slice(index, end),
        start: index,
        name: text
            .slice(index + 2, end - 2)
            .split("|")[0]
            .trim(),
    };
    return result;
}

/**
 * Extracts existing WPBS nested banners for preservation.
 *
 * @param text - Existing talk-page source.
 * @returns Existing nested banner calls.
 */
function extractExistingShellBanners(text: string): Array<string> {
    const source = String(text || "");
    const leading = readLeadingTemplate(source, 0);

    if (leading == null) {
        return [];
    }

    const normalizedName = normalizeTemplateName(leading.name);
    const patterns = buildBannerShellPatterns();
    const isBannerShell = matchesAnyPattern(patterns, normalizedName);

    if (!isBannerShell) {
        return [];
    }

    const nestedBanners = readNestedBannersFromShell(leading.source);
    const result = [];

    for (const banner of nestedBanners) {
        const name = readLeadingTemplate(banner, 0)?.name;

        if (name != null && !isBannerShellName(name)) {
            result.push(banner);
        }
    }

    return result;
}

/**
 * Reads nested banner template calls from a banner shell.
 *
 * @param shell - Banner-shell source.
 * @returns Nested template calls.
 */
function readNestedBannersFromShell(shell: string): Array<string> {
    const inner = extractBannerShellBannerBody(shell);
    const banners = [];
    let offset = 0;
    let next = readLeadingTemplate(inner, offset);

    while (next != null) {
        const banner = next.source.trim();
        banners.push(banner);
        offset = next.end;
        next = readLeadingTemplate(inner, offset);
    }

    return banners;
}

/**
 * Extracts the WPBS nested banner body.
 *
 * @param shell - Banner-shell source.
 * @returns Body source.
 */
function extractBannerShellBannerBody(shell: string): string {
    const parts = splitTemplateParts(shell);
    const parameters = parts.slice(1);
    const explicitBody = parameters.find(isBannerShellBodyParameter);

    if (explicitBody != null) {
        const equals = findTopLevelEquals(explicitBody);
        return explicitBody.slice(equals + 1).trim();
    }

    return parameters.filter(isPositionalParameter).join("\n").trim();
}

/**
 * Checks whether a template parameter is the banner-shell |1= body.
 *
 * @param parameter - Raw template parameter source.
 * @returns Whether it is the body parameter.
 */
function isBannerShellBodyParameter(parameter: string): boolean {
    const equals = findTopLevelEquals(parameter);

    return equals !== -1 && parameter.slice(0, equals).trim() === "1";
}

/**
 * Checks whether a template parameter is positional at top level.
 *
 * @param parameter - Raw template parameter source.
 * @returns Whether it is positional.
 */
function isPositionalParameter(parameter: string): boolean {
    return findTopLevelEquals(parameter) === -1 && parameter.trim() !== "";
}

/**
 * Splits a template source into top-level pipe-separated parts.
 *
 * @param template - Template source including braces.
 * @returns Top-level template parts.
 */
function splitTemplateParts(template: string): Array<string> {
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
            const part = inner.slice(start, index);
            parts.push(part);
            start = index + 1;
        }
    }

    const lastPart = inner.slice(start);
    parts.push(lastPart);

    return parts;
}

/**
 * Finds the first top-level equals sign in template parameter source.
 *
 * @param parameter - Template parameter source.
 * @returns Equals offset, or -1.
 */
function findTopLevelEquals(parameter: string): number {
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
 * Handles is selected project banner.
 *
 * Checks whether a preserved banner should be replaced by the selected
 * output.
 *
 * @param banner - Existing banner source.
 * @param assessment - Selected assessment.
 * @param projectConfig - Project configuration.
 * @returns Whether this selected project will be rebuilt.
 */
function isSelectedProjectBanner(
    banner: string,
    assessment: any,
    projectConfig: any,
): boolean {
    const name = readLeadingTemplate(banner, 0)?.name;

    if (name == null) {
        return false;
    }

    if (matchesProject(name, projectConfig.videoGames)) {
        return true;
    }

    let result = false;

    for (
        let index = 0;
        index < projectConfig.otherProjects.length && !result;
        index += 1
    ) {
        const project = projectConfig.otherProjects[index];

        if (assessment.otherProjects?.[project.id]) {
            result = matchesProject(name, project);
        }
    }

    return result;
}

/**
 * Checks whether a template name matches a project config.
 *
 * @param name - Template name.
 * @param project - Project config.
 * @returns Whether it matches.
 */
function matchesProject(name: string, project: any): boolean {
    const normalizedName = normalizeTemplateName(name);
    const patterns = [project.template, ...(project.aliases || [])].map(
        buildTemplatePattern,
    );
    const result = matchesAnyPattern(patterns, normalizedName);
    return result;
}

/**
 * Checks whether a template is a banner shell alias.
 *
 * @param name - Template name.
 * @returns Whether it is WPBS.
 */
function isBannerShellName(name: string): boolean {
    const normalizedName = normalizeTemplateName(name);
    const patterns = buildBannerShellPatterns();
    const result = matchesAnyPattern(patterns, normalizedName);
    return result;
}

/**
 * Checks whether any pattern matches a normalized template name.
 *
 * @param patterns - Template-name patterns.
 * @param normalizedName - Normalized template name.
 * @returns Whether any pattern matches.
 */
function matchesAnyPattern(
    patterns: Array<RegExp>,
    normalizedName: string,
): boolean {
    let result = false;

    for (let index = 0; index < patterns.length && !result; index += 1) {
        result = patterns[index].test(normalizedName);
    }

    return result;
}

/**
 * Builds shell alias matchers.
 *
 * @returns Shell matchers.
 */
function buildBannerShellPatterns(): Array<RegExp> {
    return BANNER_SHELL_ALIASES.map(buildTemplatePattern);
}

/**
 * Finds the end offset of a template call.
 *
 * @param text - Source wikitext.
 * @param start - Template start offset.
 * @returns End offset after the closing braces, or -1.
 */
function findTemplateEnd(text: string, start: number): number {
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
 * @param text - Source text.
 * @param start - Starting offset.
 * @returns First non-whitespace offset.
 */
function skipWhitespace(text: string, start: number): number {
    let index = start;

    while (/\s/u.test(text[index] || "")) {
        index += 1;
    }

    return index;
}

/**
 * Builds the WikiProject Video games banner.
 *
 * @param assessment - Selected assessment values.
 * @param config - Video games project configuration.
 * @returns Video games banner call.
 */
function buildVideoGamesBanner(assessment: any, config: any): string {
    const params = [
        [
            "|",
            config.importanceParameter,
            "=",
            assessment.importance || "",
            "",
        ].join(""),
    ];

    const selectedTaskForces = [];

    for (const taskForce of config.taskForces) {
        if (assessment.taskForces?.[taskForce.id]) {
            selectedTaskForces.push(taskForce);
        }
    }

    for (const taskForce of selectedTaskForces) {
        params.push(`|${taskForce.parameter}=yes`);
    }

    const maintenanceParams = getSelectedMaintenanceParams(assessment);

    for (const param of maintenanceParams) {
        params.push(`|${param}=yes`);
    }

    return `{{${config.template}${params.join("")}}}`;
}

/**
 * Gets selected maintenance banner parameters.
 *
 * @param assessment - Selected assessment values.
 * @returns Maintenance parameter names.
 */
function getSelectedMaintenanceParams(assessment: any): Array<string> {
    const result = [
        ["reassess", assessment.maintenance?.reassess],
        ["needs-infobox", assessment.maintenance?.needsInfobox],
        ["cover", assessment.maintenance?.cover],
        ["screenshot", assessment.maintenance?.screenshot],
    ]
        .filter(([, selected]) => selected)
        .map(([param]) => param);
    return result;
}

/**
 * Builds a simple selected WikiProject banner.
 *
 * @param project - WikiProject configuration.
 * @returns Template call.
 */
function buildSimpleProjectBanner(project: any): string {
    return `{{${project.template}}}`;
}

/**
 * Builds the shell that carries shared assessment class.
 *
 * @param className - Selected assessment class.
 * @param banners - Nested WikiProject banner calls.
 * @returns Banner shell wikitext.
 */
function buildBannerShell(className: string, banners: Array<string>): string {
    const result = [
        [
            "{{",
            BANNER_SHELL_TEMPLATE,
            "|class=",
            className || "Unassessed",
            "|1=",
        ].join(""),
        ...banners,
        "}}",
    ].join("\n");
    return result;
}

/**
 * Extracts the leading talk-page section before the first heading.
 *
 * @param text - Talk-page wikitext.
 * @returns Top-section wikitext.
 */
function getTopSection(text: string): string {
    const heading = /^=+/mu.exec(text);

    return (heading == null ? text : text.slice(0, heading.index)).trimEnd();
}

/**
 * Removes empty importance parameters for no-op detection.
 *
 * @param text - Source text.
 * @returns Source without empty importance fields.
 */
function removeEmptyImportanceParameters(text: string): string {
    const result = String(text || "")
        .replace(/\|\s*importance\s*=\s*(?=[|}\n])/giu, "")
        .replace(/[ \t]+$/gmu, "")
        .trim();
    return result;
}
