/**
 * Builds edit summaries for generated video game stubs.
 */

const GAMEPAD_ICON = "\u{1F3AE}";

export const EDIT_SUMMARY_SUFFIX = [
    "[[:m:User:For Each ... Next/global",
    ".js/vg stub creator.js|",
    GAMEPAD_ICON,
    "]]",
].join("");


/**
 * Builds a generated-stub edit summary.
 *
 * @param metadata - Edit summary metadata.
 * @param metadata.displayName - Summary display title.
 * @param metadata.enwikiTitle - English Wikipedia page title.
 * @param metadata.proseSinographs - Prose length in
 * sinographs.
 * @param metadata.wikidataId - Wikidata entity ID.
 * @param metadata.year - Release year.
 * @returns Generated edit summary.
 */
export function buildEditSummary(metadata: any): string {
    const nameText = buildArticleCreationSummaryText(
        metadata.displayName,
        metadata.year,
    );
    const proseText = selectValue(
        nameText === "",
        function trueBranch() {
            return "";
        },
        function falseBranch() {
            return buildProseDetailText(
                buildProseCountText(metadata.proseSinographs),
            );
        },
    );
    const sourceText = nameText === "" ? "" : buildSourceDetailText(metadata);
    return addEditSummarySuffix(`${nameText}${proseText}${sourceText}`);
}


/**
 * Adds gadget attribution to an edit summary.
 *
 * @param summary - Edit summary text.
 * @returns Attributed edit summary.
 */
export function addEditSummarySuffix(summary: string): string {
    const text = String(summary || "").trim();

    return selectValue(
        text === "",
        function trueBranch() {
            return EDIT_SUMMARY_SUFFIX;
        },
        function falseBranch() {
            return `${text} ${EDIT_SUMMARY_SUFFIX}`;
        },
    );
}


/**
 * Builds the year link for an edit summary.
 *
 * @param year - Release year.
 * @returns Year summary text.
 */
function buildYearSummaryText(year: string): string {
    const value = String(year || "").trim();
    const match = value.match(/\b\d{4}\b/u);

    if (match == null) {
        return "";
    }

    return match[0];
}


/**
 * Builds the prose count text for an edit summary.
 *
 * @param count - Prose length in sinographs.
 * @returns Prose count text.
 */
function buildProseCountText(count: number): string {
    if (!Number.isFinite(count) || count <= 0) {
        return "";
    }

    return `${Math.round(count)} equivalent sinographs`;
}


/**
 * Builds prose-count detail text for an edit summary.
 *
 * @param proseCount - Prose-count fragment.
 * @returns Prose-count detail summary text.
 */
function buildProseDetailText(proseCount: string): string {
    const text = String(proseCount || "").trim();

    return text === "" ? "" : `, with ${text}`;
}


/**
 * Builds source-link detail text for an edit summary.
 *
 * @param metadata - Edit summary metadata.
 * @param metadata.enwikiTitle - English Wikipedia page title.
 * @param metadata.wikidataId - Wikidata entity ID.
 * @returns Source-link detail text.
 */
function buildSourceDetailText(metadata: any): string {
    const links = [
        buildEnwikiSummaryLink(metadata.enwikiTitle),
        buildWikidataSummaryLink(metadata.wikidataId),
    ].filter(Boolean);

    return selectValue(
        links.length === 0,
        function trueBranch() {
            return "";
        },
        function falseBranch() {
            return [
                "; also see ",
                links.map((link) => `"${link}"`).join(" and "),
                "",
            ].join("");
        },
    );
}


/**
 * Builds the article creation text for an edit summary.
 *
 * @param displayName - Summary display title.
 * @param year - Release year.
 * @returns Article creation summary text.
 */
function buildArticleCreationSummaryText(
    displayName: string,
    year: string,
): string {
    const label = String(displayName || "").trim();
    const yearText = buildYearSummaryText(year);

    if (label === "") {
        return "";
    }

    return [
        "create ",
        yearText === "" ? "" : `${yearText} `,
        "video game «",
        label,
        "»",
    ].join("");
}


/**
 * Builds an English Wikipedia summary link.
 *
 * @param title - English Wikipedia page title.
 * @returns Summary link, or an empty string.
 */
function buildEnwikiSummaryLink(title: string): string {
    const value = String(title || "").trim();

    return value === "" ? "" : `[[:w:en:${value}]]`;
}


/**
 * Builds a Wikidata summary link.
 *
 * @param id - Wikidata entity ID.
 * @returns Summary link, or an empty string.
 */
function buildWikidataSummaryLink(id: string): string {
    const value = String(id || "").trim();

    return value === "" ? "" : `[[:d:${value}]]`;
}


/**
 * Selects a lazily evaluated value for a condition.
 *
 * @param condition - Condition to evaluate.
 * @param trueBranch - Branch used when the condition is
 * true.
 * @param falseBranch - Branch used when the condition is
 * false.
 * @returns Value returned by the selected branch.
 */
function selectValue(
    condition: unknown,
    trueBranch: (...args: any[]) => any,
    falseBranch: (...args: any[]) => any,
): any {
    if (condition) {
        return trueBranch();
    }

    return falseBranch();
}
