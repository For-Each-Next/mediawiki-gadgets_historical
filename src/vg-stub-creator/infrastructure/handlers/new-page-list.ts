/**
 * Describes the new-page-list module.
 *
 * Registers newly created pages on the WikiProject Video games new-page
 * list.
 */

import { addEditSummarySuffix } from "#stub/editing/summary.ts";
import { msg } from "#stub/i18n";

export const NEW_PAGE_LIST_TITLE = "WikiProject:电子游戏/新进条目";
const MAX_EDIT_ATTEMPTS = 3;

interface NewPageRegistration {
    articleTitle: string;
    companyCategories: Array<string>;
    date: Date;
}

interface NewPageListEntry {
    article: string;
    categories: Array<string>;
    day: number;
    month: number;
    year: number;
}

/**
 * Handles register new page.
 *
 * Adds an article and its newly created company categories to the
 * current UTC date on the WikiProject new-page list.
 *
 * @param api - MediaWiki API client.
 * @param articleTitle - Created article title.
 * @param companyCategories - Category titles, with or
 * without namespace.
 * @param date - Registration date.
 * @returns Resolves after the list is updated.
 */
export async function registerNewPage(
    api: any,
    articleTitle: string,
    companyCategories: Array<string> = [],
    date: Date = new Date(),
): Promise<void> {
    for (let attempt = 0; attempt < MAX_EDIT_ATTEMPTS; attempt += 1) {
        try {
            await registerNewPageAttempt(api, {
                articleTitle,
                companyCategories,
                date,
            });
            return;
        } catch (error) {
            if (!isEditConflict(error) || attempt === MAX_EDIT_ATTEMPTS - 1) {
                throw error;
            }
        }
    }
}

/**
 * Runs one new-page-list registration attempt.
 *
 * @param api - MediaWiki API client.
 * @param entry - Input entry.
 */
async function registerNewPageAttempt(
    api: any,
    entry: NewPageRegistration,
): Promise<void> {
    const page = await fetchNewPageList(api);
    const text = addNewPageListEntry(
        page.text,
        entry.articleTitle,
        entry.companyCategories,
        entry.date,
    );

    if (text === page.text) {
        return;
    }

    await api.postWithToken("csrf", {
        action: "edit",
        basetimestamp: page.basetimestamp,
        nocreate: true,
        starttimestamp: page.starttimestamp,
        summary: addEditSummarySuffix(
            buildNewPageListSummary(
                entry.articleTitle,
                entry.companyCategories,
            ),
        ),
        text,
        title: NEW_PAGE_LIST_TITLE,
    });
}

/**
 * Builds the edit summary for a new-page-list registration.
 *
 * @param articleTitle - Created article title.
 * @param companyCategories - Category titles, with or
 * without
 * namespace.
 * @returns Edit summary.
 */
function buildNewPageListSummary(
    articleTitle: string,
    companyCategories: Array<string>,
): string {
    const categories = companyCategories
        .map(normalizeCategoryTitle)
        .filter(Boolean)
        .map((category) => `[[${category}]]`);
    const article = `[[${articleTitle}]]`;

    if (categories.length === 0) {
        return `register the new article "${article}"`;
    }

    const result =
        `register the new article "${article}" as well as ` +
        [
            "categor",
            categories.length === 1 ? "y" : "ies",
            " ",
            formatSummaryList(categories),
            "",
        ].join("");
    return result;
}

/**
 * Formats a linked title list for edit-summary prose.
 *
 * @param items - Summary list items.
 * @returns Comma-separated summary list.
 */
function formatSummaryList(items: Array<string>): string {
    if (items.length <= 2) {
        return items.join(" and ");
    }

    return `${items.slice(0, -1).join(", ")} and ${items.at(-1)}`;
}

/**
 * Builds updated new-page-list wikitext.
 *
 * @param text - Current list wikitext.
 * @param articleTitle - Article title to register.
 * @param companyCategories - Company category titles.
 * @param date - Registration date.
 * @returns Updated wikitext.
 */
export function addNewPageListEntry(
    text: string,
    articleTitle: string,
    companyCategories: Array<string> = [],
    date: Date = new Date(),
): string {
    const source = String(text || "");
    const entry = buildNewPageListEntry(articleTitle, companyCategories, date);
    const yearRange = findYearSection(source, entry.year);

    if (yearRange == null) {
        const updated = insertNewPageListYear(source, entry);

        return updated;
    }

    const section = source.slice(yearRange.contentStart, yearRange.end);
    const updatedSection = updateYearSection(section, entry);

    const updated =
        source.slice(0, yearRange.contentStart) +
        updatedSection +
        source.slice(yearRange.end);

    return updated;
}

/**
 * Inserts a new year section for a registration.
 *
 * @param source - Source text.
 * @param entry - Input entry.
 * @returns Result when the function
 *   inserts a new year section for a registration.
 */
function insertNewPageListYear(
    source: string,
    entry: NewPageListEntry,
): string {
    const block = buildDateBlock(
        entry.month,
        entry.day,
        entry.article,
        entry.categories,
    );
    const updated = insertYearSection(source, entry.year, block);

    return updated;
}

/**
 * Builds normalized registration entry values.
 *
 * @param articleTitle - Article title value.
 * @param companyCategories - Company categories value.
 * @param date - Date value.
 * @returns Normalized registration entry values.
 */
function buildNewPageListEntry(
    articleTitle: string,
    companyCategories: Array<string>,
    date: Date,
): NewPageListEntry {
    const entry = {
        article: buildVgcCall(articleTitle),
        categories: companyCategories
            .map(normalizeCategoryTitle)
            .filter(Boolean)
            .map(buildVgcCall),
        day: date.getUTCDate(),
        month: date.getUTCMonth() + 1,
        year: date.getUTCFullYear(),
    };

    return entry;
}

/**
 * Fetches current list text and edit-conflict timestamps.
 *
 * @param api - MediaWiki API client.
 * @returns Page text and timestamps.
 */
async function fetchNewPageList(api: any): Promise<any> {
    const response = await api.get({
        action: "query",
        curtimestamp: true,
        formatversion: "2",
        prop: "revisions",
        rvprop: "content|timestamp",
        rvslots: "main",
        titles: NEW_PAGE_LIST_TITLE,
    });
    const pages = response?.query?.pages || [];
    const page = Array.isArray(pages) ? pages[0] : Object.values(pages)[0];
    const revision = page?.revisions?.[0];

    if (page == null || page.missing != null || revision == null) {
        throw new Error(
            msg("errors.unableRead", { title: NEW_PAGE_LIST_TITLE }),
        );
    }

    const result = {
        basetimestamp: revision.timestamp,
        starttimestamp: response.curtimestamp,
        text:
            revision.slots?.main?.content ??
            revision.slots?.main?.["*"] ??
            revision["*"] ??
            "",
    };
    return result;
}

/**
 * Updates or inserts one date block inside a year section.
 *
 * @param section - Year-section body.
 * @param entry - Date block entry.
 * @param entry.month - UTC month.
 * @param entry.day - UTC day.
 * @param entry.article - Article template call.
 * @param entry.categories - Category template calls.
 * @returns Updated section body.
 */
function updateYearSection(section: string, entry: NewPageListEntry): string {
    const lines = section.split("\n");
    const datePattern = /^\* (\d{1,2})月(\d{1,2})日 - (.*)$/u;
    const targetIndex = findDateLine(lines, datePattern, entry);

    if (targetIndex !== -1) {
        appendUnique(lines, targetIndex, entry.article);
        appendCategories(lines, targetIndex, entry.categories);
        return lines.join("\n");
    }

    const insertAt = findDateInsertIndex(lines, datePattern, entry);
    const block = buildDateBlock(
        entry.month,
        entry.day,
        entry.article,
        entry.categories,
    ).split("\n");
    const fallbackIndex = findTrailingBlankLines(lines);

    lines.splice(insertAt === -1 ? fallbackIndex : insertAt, 0, ...block);
    return lines.join("\n");
}

/**
 * Finds a matching date line.
 *
 * @param lines - Lines value.
 * @param pattern - Pattern value.
 * @param entry - Input entry.
 * @returns A matching date line.
 */
function findDateLine(
    lines: Array<string>,
    pattern: RegExp,
    entry: NewPageListEntry,
): number {
    const result = lines.findIndex(function callback(line) {
        const match = line.match(pattern);
        const result =
            match != null &&
            Number(match[1]) === entry.month &&
            Number(match[2]) === entry.day;
        return result;
    });
    return result;
}

/**
 * Finds the descending-date insertion point.
 *
 * @param lines - Lines value.
 * @param pattern - Pattern value.
 * @param entry - Input entry.
 * @returns The descending-date insertion point.
 */
function findDateInsertIndex(
    lines: Array<string>,
    pattern: RegExp,
    entry: NewPageListEntry,
): number {
    const result = lines.findIndex(function callback(line) {
        const match = line.match(pattern);
        const result =
            match != null &&
            (Number(match[1]) < entry.month ||
                (Number(match[1]) === entry.month &&
                    Number(match[2]) < entry.day));
        return result;
    });
    return result;
}

/**
 * Finds the first trailing blank line.
 *
 * @param lines - Lines value.
 * @returns The first trailing blank line.
 */
function findTrailingBlankLines(lines: Array<string>): number {
    const index = lines.findIndex(function callback(line, lineIndex) {
        const blankTail = lines
            .slice(lineIndex)
            .every((remaining) => remaining.trim() === "");
        return lineIndex > 0 && line.trim() === "" && blankTail;
    });

    return index === -1 ? lines.length : index;
}

/**
 * Appends an article call when it is not already present.
 *
 * @param lines - Section lines.
 * @param index - Date-line index.
 * @param value - Template call.
 * @returns Result when the function
 *   appends an article call when it is not already
 *   present.
 */
function appendUnique(
    lines: Array<string>,
    index: number,
    value: string,
): void {
    if (lines[index].includes(value)) {
        return;
    }

    const separator = / -\s*$/u.test(lines[index]) ? "" : "、";

    lines[index] += `${separator}${value}`;
}

/**
 * Adds company categories to the date's category continuation line.
 *
 * @param lines - Section lines.
 * @param dateIndex - Date-line index.
 * @param categories - Category template calls.
 * @returns Result when the function
 *   adds company categories to the date's category
 *   continuation line.
 */
function appendCategories(
    lines: Array<string>,
    dateIndex: number,
    categories: Array<string>,
): void {
    if (categories.length === 0) {
        return;
    }

    const nextDateIndex = lines.findIndex(function callback(line, index) {
        return index > dateIndex && /^\* \d{1,2}月\d{1,2}日 - /u.test(line);
    });
    const blockEnd = nextDateIndex === -1 ? lines.length : nextDateIndex;
    const categoryIndex = lines.findIndex(function callback(line, index) {
        const result =
            index > dateIndex &&
            index < blockEnd &&
            /^\*:\s*分類：/u.test(line);
        return result;
    });

    if (categoryIndex === -1) {
        lines.splice(dateIndex + 1, 0, `*:分類：${categories.join("、")}`);
        return;
    }

    categories.forEach(function callback(category) {
        return appendUnique(lines, categoryIndex, category);
    });
}

/**
 * Builds a complete date block.
 *
 * @param month - UTC month.
 * @param day - UTC day.
 * @param article - Article template call.
 * @param categories - Category template calls.
 * @returns Date block wikitext.
 */
function buildDateBlock(
    month: number,
    day: number,
    article: string,
    categories: Array<string>,
): string {
    const result = [
        `* ${month}月${day}日 - ${article}`,
        ...selectValue(
            categories.length === 0,
            function trueBranch() {
                return [];
            },
            function falseBranch() {
                return [`*:分類：${categories.join("、")}`];
            },
        ),
    ].join("\n");
    return result;
}

/**
 * Finds a year section and its content range.
 *
 * @param text - Page wikitext.
 * @param year - UTC year.
 * @returns Section content range.
 */
function findYearSection(text: string, year: number): any | null {
    const heading = new RegExp(`^== ${year}年 ==\\s*$`, "mu");
    const match = heading.exec(text);

    if (match == null) {
        return null;
    }

    const contentStart = match.index + match[0].length;
    const nextHeading = /^== .+ ==\s*$/gmu;
    nextHeading.lastIndex = contentStart;
    const next = nextHeading.exec(text);

    const result = {
        contentStart,
        end: next?.index ?? text.length,
    };
    return result;
}

/**
 * Inserts a new year section before the first existing year section.
 *
 * @param text - Page wikitext.
 * @param year - UTC year.
 * @param block - Initial date block.
 * @returns Updated page wikitext.
 */
function insertYearSection(text: string, year: number, block: string): string {
    const firstYear = /^== \d{4}年 ==\s*$/mu.exec(text);
    const section = `== ${year}年 ==\n${block}\n\n`;

    if (firstYear == null) {
        return `${text.replace(/\s*$/u, "")}\n\n${section}`;
    }

    return (
        text.slice(0, firstYear.index) + section + text.slice(firstYear.index)
    );
}

/**
 * Builds a vgc template call.
 *
 * @param title - Page title.
 * @returns Template call.
 */
function buildVgcCall(title: string): string {
    return `{{vgc|${String(title || "").trim()}}}`;
}

/**
 * Adds the Category namespace when absent.
 *
 * @param category - Category title.
 * @returns Namespaced category title.
 */
function normalizeCategoryTitle(category: string): string {
    const title = String(category || "").trim();

    if (title === "") {
        return "";
    }

    return /^(?:Category|分類):/iu.test(title) ? title : `Category:${title}`;
}

/**
 * Checks whether a failed API edit should be retried.
 *
 * @param error - MediaWiki API rejection.
 * @returns Whether the error is an edit conflict.
 */
function isEditConflict(error: any): boolean {
    const result =
        error === "editconflict" ||
        error?.code === "editconflict" ||
        error?.error?.code === "editconflict";
    return result;
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
