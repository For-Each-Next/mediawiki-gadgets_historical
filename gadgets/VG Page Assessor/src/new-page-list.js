/* eslint-disable */

/**
 * Prepares and saves WikiProject Video games new-page-list registrations.
 */

import { loggedApiGet, loggedPostWithToken, logStep } from "./logger.js";

export const NEW_PAGE_LIST_TITLE = "WikiProject:电子游戏/新进条目";

const SUMMARY_SOURCE_LINK =
    "[[:m:User:For Each ... Next/global.js/vg page assessor.js|🍄]]";
const DATE_LINE_PATTERN = /^\* (\d{1,2})月(\d{1,2})日 -\s*(.*)$/u;
const SUBGROUP_PATTERN = /^\*:\s*([^：:]+)[：:]\s*(.*)$/u;
const GROUP_ORDER = ["draft", "category", "template", "file", "other"];
const GROUP_LABELS = {
    category: "分類",
    draft: "草稿",
    file: "檔案",
    other: "雜頁",
    template: "模板",
};

/**
 * Fetches the current new-page list with edit-conflict timestamps.
 *
 * @param {object} api - MediaWiki API client.
 * @returns {Promise<object>} List page state.
 */
export async function fetchNewPageList(api) {
    logStep("fetchNewPageList start", { title: NEW_PAGE_LIST_TITLE });
    const response = await loggedApiGet(api, "fetchNewPageList", {
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

    const result = {
        basetimestamp: revision.timestamp,
        starttimestamp: response.curtimestamp,
        text:
            revision.slots?.main?.content ??
            revision.slots?.main?.["*"] ??
            revision["*"] ??
            "",
    };

    logStep("fetchNewPageList done", {
        textLength: result.text.length,
        title: NEW_PAGE_LIST_TITLE,
    });

    return result;
}

/**
 * Builds registration state and proposed new-page-list text.
 *
 * @param {object} options - Registration options.
 * @param {string} options.text - Current list text.
 * @param {string} options.title - Title to list.
 * @param {number} options.namespaceNumber - Subject namespace number.
 * @param {Date} options.creationDate - UTC creation date used for ordering.
 * @param {Map<string, Date>} [options.creationTimes] - Known title creation times.
 * @returns {object} Prepared registration details.
 */
export function prepareNewPageListRegistration({
    text,
    title,
    namespaceNumber,
    creationDate,
    creationTimes = new Map(),
}) {
    logStep("prepareNewPageListRegistration start", {
        creationDate: creationDate?.toISOString?.(),
        namespaceNumber,
        title,
    });
    const source = String(text || "");
    const years = parseYearSections(source);
    const earliestDate = findEarliestRetainedDate(years);
    const existing = findRegisteredEntry(years, title);

    if (earliestDate != null && startOfUtcDay(creationDate) < earliestDate) {
        const result = {
            alreadyRegistered: existing != null,
            eligible: false,
            earliestDate,
            existing,
            proposedText: source,
            changed: false,
        };

        logStep("prepareNewPageListRegistration done: not eligible", {
            earliestDate: earliestDate.toISOString(),
            existing,
            title,
        });

        return result;
    }

    if (existing != null) {
        const result = {
            alreadyRegistered: true,
            eligible: true,
            earliestDate,
            existing,
            proposedText: source,
            changed: false,
        };

        logStep("prepareNewPageListRegistration done: already registered", {
            existing,
            title,
        });

        return result;
    }

    const group = getNamespaceGroup(namespaceNumber);
    const proposedText = addEntry(source, {
        creationDate,
        creationTimes,
        group,
        title,
    });

    const result = {
        alreadyRegistered: false,
        changed: proposedText !== source,
        earliestDate,
        eligible: true,
        existing: null,
        proposedText,
    };

    logStep("prepareNewPageListRegistration done", {
        changed: result.changed,
        earliestDate: earliestDate?.toISOString?.(),
        group,
        title,
    });

    return result;
}

/**
 * Gets titles already listed on the target UTC date.
 *
 * @param {string} text - New-page-list source.
 * @param {Date} date - Target creation date.
 * @returns {Array<string>} Listed titles.
 */
export function getTitlesForDate(text, date) {
    logStep("getTitlesForDate start", {
        date: date?.toISOString?.(),
    });
    const year = date.getUTCFullYear();
    const month = date.getUTCMonth();
    const day = date.getUTCDate();
    const section = parseYearSections(String(text || "")).find(
        (item) => item.year === year,
    );
    const block = section?.blocks.find(
        (item) =>
            item.date.getUTCMonth() === month &&
            item.date.getUTCDate() === day,
    );

    if (block == null) {
        logStep("getTitlesForDate done: no block");
        return [];
    }

    const titles = [
        ...block.entries,
        ...Object.values(block.groups).flatMap((group) => group.entries),
    ].map(extractVgcTitle);

    logStep("getTitlesForDate done", { titles });

    return titles;
}

/**
 * Saves a previously prepared new-page-list update.
 *
 * @param {object} api - MediaWiki API client.
 * @param {object} page - Original list page state.
 * @param {string} proposedText - Prepared replacement text.
 * @param {string} summary - Edit summary.
 * @returns {Promise<void>} Resolves after save.
 */
export async function savePreparedNewPageList(
    api,
    page,
    proposedText,
    summary,
) {
    logStep("savePreparedNewPageList start", {
        summary,
        title: NEW_PAGE_LIST_TITLE,
    });
    await loggedPostWithToken(api, "savePreparedNewPageList", "csrf", {
        action: "edit",
        basetimestamp: page.basetimestamp,
        nocreate: true,
        starttimestamp: page.starttimestamp,
        summary,
        text: proposedText,
        title: NEW_PAGE_LIST_TITLE,
    });
    logStep("savePreparedNewPageList done", {
        title: NEW_PAGE_LIST_TITLE,
    });
}

/**
 * Builds an edit summary for registration.
 *
 * @param {string} title - Registered title.
 * @param {Date} creationDate - Page creation date.
 * @returns {string} Edit summary.
 */
export function buildNewPageListSummary(title, creationDate) {
    return `Add [[${title}]] to the ${formatEnglishDate(creationDate)} entry ${SUMMARY_SOURCE_LINK}`;
}

/**
 * Builds before/after source snippets around the changed line range.
 *
 * @param {string} oldText - Current source.
 * @param {string} newText - Proposed source.
 * @param {number} contextLines - Number of surrounding unchanged lines.
 * @returns {object} Before/after snippets.
 */
export function buildLineComparison(oldText, newText, contextLines = 1) {
    const oldLines = String(oldText || "").split("\n");
    const newLines = String(newText || "").split("\n");
    const prefix = countCommonPrefix(oldLines, newLines);
    const suffix = countCommonSuffix(oldLines, newLines, prefix);

    if (oldText === newText) {
        return {
            after: "No changes.",
            before: "No changes.",
        };
    }

    return {
        after: sliceChangedLines(newLines, prefix, suffix, contextLines),
        before: sliceChangedLines(oldLines, prefix, suffix, contextLines),
    };
}

/**
 * Parses year sections and date blocks.
 *
 * @param {string} text - New-page-list source.
 * @returns {Array<object>} Parsed year sections.
 */
function parseYearSections(text) {
    const headings = [
        ...String(text || "").matchAll(/^== (\d{4})年 ==\s*$/gmu),
    ];

    return headings.map((heading, index) => {
        const contentStart = heading.index + heading[0].length;
        const end = headings[index + 1]?.index ?? text.length;

        return {
            blocks: parseDateBlocks(
                text.slice(contentStart, end),
                Number(heading[1]),
            ),
            contentStart,
            end,
            year: Number(heading[1]),
        };
    });
}

/**
 * Parses date blocks within one year.
 *
 * @param {string} section - Year-section body.
 * @param {number} year - Year number.
 * @returns {Array<object>} Date blocks.
 */
function parseDateBlocks(section, year) {
    const lines = section.split("\n");
    const blocks = [];
    let current = null;

    lines.forEach((line) => {
        const dateMatch = line.match(DATE_LINE_PATTERN);

        if (dateMatch != null) {
            current = {
                date: new Date(
                    Date.UTC(
                        year,
                        Number(dateMatch[1]) - 1,
                        Number(dateMatch[2]),
                    ),
                ),
                entries: parseEntries(dateMatch[3]),
                groups: {},
                title: line,
            };
            blocks.push(current);
            return;
        }

        const subgroupMatch = line.match(SUBGROUP_PATTERN);

        if (current == null || subgroupMatch == null) {
            return;
        }

        const group = normalizeGroupLabel(subgroupMatch[1]);

        if (group != null) {
            current.groups[group] = {
                entries: parseEntries(subgroupMatch[2]),
                label: subgroupMatch[1].trim(),
            };
        }
    });

    return blocks;
}

/**
 * Adds an entry into the correct date and group.
 *
 * @param {string} text - Current list source.
 * @param {object} entry - Entry details.
 * @returns {string} Updated text.
 */
function addEntry(text, entry) {
    const year = entry.creationDate.getUTCFullYear();
    const month = entry.creationDate.getUTCMonth() + 1;
    const day = entry.creationDate.getUTCDate();
    const yearRange = findYearRange(text, year);
    const rendered = buildVgcCall(entry.title);

    if (yearRange == null) {
        return insertYearSection(
            text,
            year,
            buildDateBlock(month, day, entry.group, [rendered]),
        );
    }

    const section = text.slice(yearRange.contentStart, yearRange.end);
    const updatedSection = updateYearSection(section, {
        ...entry,
        day,
        month,
        rendered,
    });

    return (
        text.slice(0, yearRange.contentStart) +
        updatedSection +
        text.slice(yearRange.end)
    );
}

/**
 * Updates one year section.
 *
 * @param {string} section - Year-section body.
 * @param {object} entry - Entry details.
 * @returns {string} Updated section.
 */
function updateYearSection(section, entry) {
    const lines = section.split("\n");
    const targetIndex = lines.findIndex((line) => {
        const match = line.match(DATE_LINE_PATTERN);

        return (
            match != null &&
            Number(match[1]) === entry.month &&
            Number(match[2]) === entry.day
        );
    });

    if (targetIndex !== -1) {
        updateExistingDateBlock(lines, targetIndex, entry);
        return lines.join("\n");
    }

    const insertAt = lines.findIndex((line) => {
        const match = line.match(DATE_LINE_PATTERN);

        return (
            match != null &&
            (Number(match[1]) < entry.month ||
                (Number(match[1]) === entry.month &&
                    Number(match[2]) < entry.day))
        );
    });
    const block = buildDateBlock(entry.month, entry.day, entry.group, [
        entry.rendered,
    ]).split("\n");
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
 * Updates an existing date block.
 *
 * @param {Array<string>} lines - Section lines.
 * @param {number} dateIndex - Date-line index.
 * @param {object} entry - Entry details.
 * @returns {void}
 */
function updateExistingDateBlock(lines, dateIndex, entry) {
    const blockEnd = findDateBlockEnd(lines, dateIndex);
    const blocks = readDateSubgroups(lines, dateIndex, blockEnd);

    if (entry.group == null) {
        const match = lines[dateIndex].match(DATE_LINE_PATTERN);
        const entries = addAndSortEntries(
            parseEntries(match?.[3] || ""),
            entry.rendered,
            entry.creationTimes,
        );

        lines[dateIndex] =
            `* ${entry.month}月${entry.day}日 - ${entries.join("、")}`;
        return;
    }

    blocks[entry.group] = addAndSortEntries(
        blocks[entry.group] || [],
        entry.rendered,
        entry.creationTimes,
    );

    const subgroupLines = GROUP_ORDER.filter(
        (group) => (blocks[group] || []).length > 0,
    ).map((group) => `*:${GROUP_LABELS[group]}：${blocks[group].join("、")}`);

    lines.splice(dateIndex + 1, blockEnd - dateIndex - 1, ...subgroupLines);
}

/**
 * Reads continuation rows for one date.
 *
 * @param {Array<string>} lines - Year-section lines.
 * @param {number} dateIndex - Date-line index.
 * @param {number} blockEnd - End index.
 * @returns {object} Group entries.
 */
function readDateSubgroups(lines, dateIndex, blockEnd) {
    const blocks = {};

    lines.slice(dateIndex + 1, blockEnd).forEach((line) => {
        const match = line.match(SUBGROUP_PATTERN);
        const group = match == null ? null : normalizeGroupLabel(match[1]);

        if (group != null) {
            blocks[group] = parseEntries(match[2]);
        }
    });

    return blocks;
}

/**
 * Sorts entries when creation times are known.
 *
 * @param {Array<string>} entries - Existing entries.
 * @param {string} added - Added entry.
 * @param {Map<string, Date>} creationTimes - Known creation times.
 * @returns {Array<string>} Updated entries.
 */
function addAndSortEntries(entries, added, creationTimes) {
    const unique = [...entries, added].filter(
        (entry, index, array) => array.indexOf(entry) === index,
    );

    return unique.sort((left, right) => {
        const leftDate = creationTimes.get(extractVgcTitle(left));
        const rightDate = creationTimes.get(extractVgcTitle(right));

        if (leftDate == null && rightDate == null) {
            return 0;
        }

        if (leftDate == null) {
            return 1;
        }

        if (rightDate == null) {
            return -1;
        }

        return leftDate - rightDate;
    });
}

/**
 * Finds registration entry details.
 *
 * @param {Array<object>} years - Parsed years.
 * @param {string} title - Page title.
 * @returns {object|null} Existing registration.
 */
function findRegisteredEntry(years, title) {
    const normalized = normalizeTitle(title);

    for (const year of years) {
        for (const block of year.blocks) {
            const allEntries = [
                ...block.entries,
                ...Object.values(block.groups).flatMap(
                    (group) => group.entries,
                ),
            ];
            const found = allEntries.find(
                (entry) =>
                    normalizeTitle(extractVgcTitle(entry)) === normalized,
            );

            if (found != null) {
                return {
                    date: block.date,
                    listedTitle: extractVgcTitle(found),
                };
            }
        }
    }

    return null;
}

/**
 * Finds the earliest date currently retained in the list.
 *
 * @param {Array<object>} years - Parsed years.
 * @returns {Date|null} Earliest UTC date.
 */
function findEarliestRetainedDate(years) {
    const dates = years.flatMap((year) =>
        year.blocks.map((block) => block.date),
    );

    if (dates.length === 0) {
        return null;
    }

    return new Date(Math.min(...dates.map((date) => date.getTime())));
}

/**
 * Finds a year section range.
 *
 * @param {string} text - Source text.
 * @param {number} year - Year.
 * @returns {object|null} Content range.
 */
function findYearRange(text, year) {
    return (
        parseYearSections(text).find((section) => section.year === year) ||
        null
    );
}

/**
 * Inserts a new year section.
 *
 * @param {string} text - Current text.
 * @param {number} year - Year.
 * @param {string} block - Initial block.
 * @returns {string} Updated text.
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
 * Builds a date block.
 *
 * @param {number} month - Month.
 * @param {number} day - Day.
 * @param {string|null} group - Namespace group.
 * @param {Array<string>} entries - Rendered entries.
 * @returns {string} Date block.
 */
function buildDateBlock(month, day, group, entries) {
    if (group == null) {
        return `* ${month}月${day}日 - ${entries.join("、")}`;
    }

    return [
        `* ${month}月${day}日 - `,
        `*:${GROUP_LABELS[group]}：${entries.join("、")}`,
    ].join("\n");
}

/**
 * Gets the end index for one date block.
 *
 * @param {Array<string>} lines - Lines.
 * @param {number} dateIndex - Date-line index.
 * @returns {number} End index.
 */
function findDateBlockEnd(lines, dateIndex) {
    const nextDateIndex = lines.findIndex((line, index) => {
        if (index <= dateIndex) {
            return false;
        }

        return DATE_LINE_PATTERN.test(line) || !SUBGROUP_PATTERN.test(line);
    });

    return nextDateIndex === -1 ? lines.length : nextDateIndex;
}

/**
 * Parses vgc entries from a list line.
 *
 * @param {string} text - Entry source.
 * @returns {Array<string>} Entry calls.
 */
function parseEntries(text) {
    return String(text || "")
        .split("、")
        .map((entry) => entry.trim())
        .filter(Boolean);
}

/**
 * Maps a subgroup label to its canonical group.
 *
 * @param {string} label - Existing label.
 * @returns {string|null} Group name.
 */
function normalizeGroupLabel(label) {
    const value = String(label || "").trim();

    if (value === "草稿") {
        return "draft";
    }

    if (/分[類类]/u.test(value)) {
        return "category";
    }

    if (/[檔档]案|文件/u.test(value)) {
        return "file";
    }

    if (value === "模板") {
        return "template";
    }

    if (/[雜杂][頁页]/u.test(value)) {
        return "other";
    }

    return null;
}

/**
 * Gets the list subgroup for a namespace.
 *
 * @param {number} namespaceNumber - Namespace number.
 * @returns {string|null} Subgroup, or null for articles.
 */
function getNamespaceGroup(namespaceNumber) {
    if (namespaceNumber === 0) {
        return null;
    }

    if (namespaceNumber === 118) {
        return "draft";
    }

    if (namespaceNumber === 14) {
        return "category";
    }

    if (namespaceNumber === 6) {
        return "file";
    }

    if (namespaceNumber === 10 || namespaceNumber === 828) {
        return "template";
    }

    return "other";
}

/**
 * Formats a UTC date for edit summaries.
 *
 * @param {Date} date - Date.
 * @returns {string} Month/day text.
 */
function formatEnglishDate(date) {
    return new Intl.DateTimeFormat("en", {
        day: "numeric",
        month: "long",
        timeZone: "UTC",
    }).format(date);
}

/**
 * Builds a vgc template call.
 *
 * @param {string} title - Page title.
 * @returns {string} Template call.
 */
function buildVgcCall(title) {
    return `{{vgc|${title}}}`;
}

/**
 * Extracts a title from a vgc call.
 *
 * @param {string} entry - Entry source.
 * @returns {string} Title.
 */
function extractVgcTitle(entry) {
    const match = String(entry || "").match(
        /\{\{\s*vgc\s*\|\s*([^|}]+).*?\}\}/iu,
    );

    return (match?.[1] || entry).trim();
}

/**
 * Normalizes titles for matching.
 *
 * @param {string} title - Page title.
 * @returns {string} Normalized key.
 */
function normalizeTitle(title) {
    return String(title || "")
        .replace(/_/gu, " ")
        .trim()
        .toLowerCase();
}

/**
 * Starts a date at UTC midnight.
 *
 * @param {Date} date - Date.
 * @returns {Date} UTC date.
 */
function startOfUtcDay(date) {
    return new Date(
        Date.UTC(date.getUTCFullYear(), date.getUTCMonth(), date.getUTCDate()),
    );
}

/**
 * Counts common prefix lines.
 *
 * @param {Array<string>} left - Left lines.
 * @param {Array<string>} right - Right lines.
 * @returns {number} Prefix count.
 */
function countCommonPrefix(left, right) {
    let index = 0;

    while (
        index < left.length &&
        index < right.length &&
        left[index] === right[index]
    ) {
        index += 1;
    }

    return index;
}

/**
 * Counts common suffix lines.
 *
 * @param {Array<string>} left - Left lines.
 * @param {Array<string>} right - Right lines.
 * @param {number} prefix - Common prefix count.
 * @returns {number} Suffix count.
 */
function countCommonSuffix(left, right, prefix) {
    let count = 0;

    while (
        count < left.length - prefix &&
        count < right.length - prefix &&
        left[left.length - count - 1] === right[right.length - count - 1]
    ) {
        count += 1;
    }

    return count;
}

/**
 * Slices lines around a changed range.
 *
 * @param {Array<string>} lines - Source lines.
 * @param {number} prefix - Common prefix line count.
 * @param {number} suffix - Common suffix line count.
 * @param {number} contextLines - Surrounding unchanged line count.
 * @returns {string} Source snippet.
 */
function sliceChangedLines(lines, prefix, suffix, contextLines) {
    const changeEnd = lines.length - suffix;
    const start = Math.max(0, prefix - contextLines);
    const end = Math.min(lines.length, changeEnd + contextLines);

    return lines.slice(start, end).join("\n");
}
