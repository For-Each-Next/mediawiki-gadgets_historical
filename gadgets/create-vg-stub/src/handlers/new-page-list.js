/* eslint-disable */

/**
 * Registers newly created pages on the WikiProject Video games new-page list.
 */

import { addEditSummarySuffix } from "../editing/summary.js";

export const NEW_PAGE_LIST_TITLE = "WikiProject:电子游戏/新进条目";
const MAX_EDIT_ATTEMPTS = 3;

/**
 * Adds an article and its newly created company categories to the current UTC
 * date on the WikiProject new-page list.
 *
 * @param {object} api - MediaWiki API client.
 * @param {string} articleTitle - Created article title.
 * @param {Array<string>} [companyCategories] - Category titles, with or without namespace.
 * @param {Date} [date] - Registration date.
 * @returns {Promise<void>} Resolves after the list is updated.
 */
export async function registerNewPage(
    api,
    articleTitle,
    companyCategories = [],
    date = new Date(),
) {
    for (let attempt = 0; attempt < MAX_EDIT_ATTEMPTS; attempt += 1) {
        const page = await fetchNewPageList(api);
        const text = addNewPageListEntry(
            page.text,
            articleTitle,
            companyCategories,
            date,
        );

        if (text === page.text) {
            return;
        }

        try {
            await api.postWithToken("csrf", {
                action: "edit",
                basetimestamp: page.basetimestamp,
                nocreate: true,
                starttimestamp: page.starttimestamp,
                summary: addEditSummarySuffix(
                    `Register '${articleTitle}' the new page`,
                ),
                text,
                title: NEW_PAGE_LIST_TITLE,
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
 * Builds updated new-page-list wikitext.
 *
 * @param {string} text - Current list wikitext.
 * @param {string} articleTitle - Article title to register.
 * @param {Array<string>} [companyCategories] - Company category titles.
 * @param {Date} [date] - Registration date.
 * @returns {string} Updated wikitext.
 */
export function addNewPageListEntry(
    text,
    articleTitle,
    companyCategories = [],
    date = new Date(),
) {
    const source = String(text || "");
    const year = date.getUTCFullYear();
    const month = date.getUTCMonth() + 1;
    const day = date.getUTCDate();
    const article = buildVgcCall(articleTitle);
    const categories = companyCategories
        .map(normalizeCategoryTitle)
        .filter(Boolean)
        .map(buildVgcCall);
    const yearRange = findYearSection(source, year);

    if (yearRange == null) {
        return insertYearSection(
            source,
            year,
            buildDateBlock(month, day, article, categories),
        );
    }

    const section = source.slice(yearRange.contentStart, yearRange.end);
    const updatedSection = updateYearSection(
        section,
        month,
        day,
        article,
        categories,
    );

    return (
        source.slice(0, yearRange.contentStart) +
        updatedSection +
        source.slice(yearRange.end)
    );
}

/**
 * Fetches current list text and edit-conflict timestamps.
 *
 * @param {object} api - MediaWiki API client.
 * @returns {Promise<object>} Page text and timestamps.
 */
async function fetchNewPageList(api) {
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
        throw new Error(`Unable to read ${NEW_PAGE_LIST_TITLE}.`);
    }

    return {
        basetimestamp: revision.timestamp,
        starttimestamp: response.curtimestamp,
        text:
            revision.slots?.main?.content ??
            revision.slots?.main?.["*"] ??
            revision["*"] ??
            "",
    };
}

/**
 * Updates or inserts one date block inside a year section.
 *
 * @param {string} section - Year-section body.
 * @param {number} month - UTC month.
 * @param {number} day - UTC day.
 * @param {string} article - Article template call.
 * @param {Array<string>} categories - Category template calls.
 * @returns {string} Updated section body.
 */
function updateYearSection(section, month, day, article, categories) {
    const lines = section.split("\n");
    const datePattern = /^\* (\d{1,2})月(\d{1,2})日 - (.*)$/u;
    const targetIndex = lines.findIndex((line) => {
        const match = line.match(datePattern);

        return (
            match != null &&
            Number(match[1]) === month &&
            Number(match[2]) === day
        );
    });

    if (targetIndex !== -1) {
        appendUnique(lines, targetIndex, article);
        appendCategories(lines, targetIndex, categories);
        return lines.join("\n");
    }

    const insertAt = lines.findIndex((line) => {
        const match = line.match(datePattern);

        return (
            match != null &&
            (Number(match[1]) < month ||
                (Number(match[1]) === month && Number(match[2]) < day))
        );
    });
    const block = buildDateBlock(month, day, article, categories).split("\n");
    const trailingWhitespaceIndex = lines.findIndex(
        (line, index) =>
            index > 0 &&
            line.trim() === "" &&
            lines.slice(index).every((remaining) => remaining.trim() === ""),
    );
    const fallbackIndex =
        trailingWhitespaceIndex === -1
            ? lines.length
            : trailingWhitespaceIndex;

    lines.splice(insertAt === -1 ? fallbackIndex : insertAt, 0, ...block);
    return lines.join("\n");
}

/**
 * Appends an article call when it is not already present.
 *
 * @param {Array<string>} lines - Section lines.
 * @param {number} index - Date-line index.
 * @param {string} value - Template call.
 * @returns {void}
 */
function appendUnique(lines, index, value) {
    if (lines[index].includes(value)) {
        return;
    }

    const separator = / -\s*$/u.test(lines[index]) ? "" : "、";

    lines[index] += `${separator}${value}`;
}

/**
 * Adds company categories to the date's category continuation line.
 *
 * @param {Array<string>} lines - Section lines.
 * @param {number} dateIndex - Date-line index.
 * @param {Array<string>} categories - Category template calls.
 * @returns {void}
 */
function appendCategories(lines, dateIndex, categories) {
    if (categories.length === 0) {
        return;
    }

    const nextDateIndex = lines.findIndex(
        (line, index) =>
            index > dateIndex && /^\* \d{1,2}月\d{1,2}日 - /u.test(line),
    );
    const blockEnd = nextDateIndex === -1 ? lines.length : nextDateIndex;
    const categoryIndex = lines.findIndex(
        (line, index) =>
            index > dateIndex &&
            index < blockEnd &&
            /^\*:\s*分類：/u.test(line),
    );

    if (categoryIndex === -1) {
        lines.splice(dateIndex + 1, 0, `*:分類：${categories.join("、")}`);
        return;
    }

    categories.forEach((category) =>
        appendUnique(lines, categoryIndex, category),
    );
}

/**
 * Builds a complete date block.
 *
 * @param {number} month - UTC month.
 * @param {number} day - UTC day.
 * @param {string} article - Article template call.
 * @param {Array<string>} categories - Category template calls.
 * @returns {string} Date block wikitext.
 */
function buildDateBlock(month, day, article, categories) {
    return [
        `* ${month}月${day}日 - ${article}`,
        ...(categories.length === 0
            ? []
            : [`*:分類：${categories.join("、")}`]),
    ].join("\n");
}

/**
 * Finds a year section and its content range.
 *
 * @param {string} text - Page wikitext.
 * @param {number} year - UTC year.
 * @returns {object|null} Section content range.
 */
function findYearSection(text, year) {
    const heading = new RegExp(`^== ${year}年 ==\\s*$`, "mu");
    const match = heading.exec(text);

    if (match == null) {
        return null;
    }

    const contentStart = match.index + match[0].length;
    const nextHeading = /^== .+ ==\s*$/gmu;
    nextHeading.lastIndex = contentStart;
    const next = nextHeading.exec(text);

    return {
        contentStart,
        end: next?.index ?? text.length,
    };
}

/**
 * Inserts a new year section before the first existing year section.
 *
 * @param {string} text - Page wikitext.
 * @param {number} year - UTC year.
 * @param {string} block - Initial date block.
 * @returns {string} Updated page wikitext.
 */
function insertYearSection(text, year, block) {
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
 * @param {string} title - Page title.
 * @returns {string} Template call.
 */
function buildVgcCall(title) {
    return `{{vgc|${String(title || "").trim()}}}`;
}

/**
 * Adds the Category namespace when absent.
 *
 * @param {string} category - Category title.
 * @returns {string} Namespaced category title.
 */
function normalizeCategoryTitle(category) {
    const title = String(category || "").trim();

    if (title === "") {
        return "";
    }

    return /^(?:Category|分類):/iu.test(title) ? title : `Category:${title}`;
}

/**
 * Checks whether a failed API edit should be retried.
 *
 * @param {*} error - MediaWiki API rejection.
 * @returns {boolean} Whether the error is an edit conflict.
 */
function isEditConflict(error) {
    return (
        error === "editconflict" ||
        error?.code === "editconflict" ||
        error?.error?.code === "editconflict"
    );
}
