/**
 * Describes the new-page-list module.
 *
 * Prepares and saves WikiProject Video games new-page-list
 * registrations.
 */

import {
    loggedApiGet,
    loggedPostWithToken,
    logStep,
} from "#me/infra/logger.ts";

export const NEW_PAGE_LIST_TITLE = "WikiProject:电子游戏/新进条目";

const SUMMARY_SOURCE_LINK = [
    "[[:m:User:For Each ... Next/global.js",
    "/vg page assessor.js|🍄]]",
].join("");
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
const NAMESPACE = {
    category: 14,
    draft: 118,
    file: 6,
    main: 0,
    module: 828,
    template: 10,
};

/**
 * Fetches the current new-page list with edit-conflict timestamps.
 *
 * @param api - MediaWiki API client.
 * @returns List page state.
 */
export async function fetchNewPageList(api: mw.Api): Promise<any> {
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
    const result = parseNewPageListResponse(response);

    logStep("fetchNewPageList done", {
        textLength: result.text.length,
        title: NEW_PAGE_LIST_TITLE,
    });

    return result;
}

/**
 * Parses new-page-list text and edit timestamps.
 *
 * @param response - Fetch response.
 * @returns New-page-list text and edit timestamps.
 */
function parseNewPageListResponse(response: any): any {
    const pages = response?.query?.pages || [];
    const page = Array.isArray(pages) ? pages[0] : Object.values(pages)[0];
    const revision = page?.revisions?.[0];

    if (page == null || page.missing != null || revision == null) {
        throw new Error(`Unable to read ${NEW_PAGE_LIST_TITLE}.`);
    }

    const primaryContent =
        revision.slots?.main?.content ?? revision.slots?.main?.["*"];
    const text = primaryContent ?? revision["*"] ?? "";
    const result = {
        basetimestamp: revision.timestamp,
        starttimestamp: response.curtimestamp,
        text,
    };

    return result;
}

/**
 * Builds registration state and proposed new-page-list text.
 *
 * @param options - Registration options.
 * @param options.text - Current list text.
 * @param options.title - Title to list.
 * @param options.namespaceNumber - Subject namespace number.
 * @param options.creationDate - UTC creation date used for
 * ordering.
 * @param options.creationTimes - Known title
 * creation
 * times.
 * @returns Prepared registration details.
 */
export function prepareNewPageListRegistration({
    text,
    title,
    namespaceNumber,
    creationDate,
    creationTimes = new Map(),
}: {
    text: string;
    title: string;
    namespaceNumber: number;
    creationDate: Date;
    creationTimes?: Map<string, Date>;
}): any {
    const creationTimestamp = creationDate?.toISOString?.();
    logStep("prepareNewPageListRegistration start", {
        creationDate: creationTimestamp,
        namespaceNumber,
        title,
    });
    const context = createRegistrationContext({
        creationDate,
        creationTimes,
        namespaceNumber,
        text,
        title,
    });
    const result = prepareRegistrationResult(context);

    return result;
}

/**
 * Stores parsed source state needed to prepare a registration.
 */
interface RegistrationContext {
    creationDate: Date;
    creationTimes: Map<string, Date>;
    namespaceNumber: number;
    text: string;
    title: string;
    source: string;
    earliestDate: Date | null;
    existing: { date: Date; listedTitle: string } | null;
}

/**
 * Parses source state needed to prepare a registration.
 *
 * @param options - Initial registration values.
 * @returns Parsed registration context.
 */
function createRegistrationContext(
    options: Omit<RegistrationContext, "earliestDate" | "existing" | "source">,
): RegistrationContext {
    const source = String(options.text || "");
    const years = parseYearSections(source);
    const earliestDate = findEarliestRetainedDate(years);
    const existing = findRegisteredEntry(years, options.title);

    return { ...options, earliestDate, existing, source };
}

/**
 * Selects the registration result for parsed list state.
 *
 * @param context - Operation context.
 * @returns The registration result for parsed list state.
 */
function prepareRegistrationResult(context: RegistrationContext): unknown {
    const { creationDate, earliestDate, existing } = context;

    if (!isRegistrationDateEligible(creationDate, earliestDate)) {
        const result = buildIneligibleRegistration(context);

        return result;
    }

    if (existing != null) {
        const result = buildExistingRegistration(context);

        return result;
    }

    const result = buildNewRegistration(context);

    return result;
}

/**
 * Builds registration state for a newly listed page.
 *
 * @param options - Operation options.
 * @returns Registration state for a newly listed page.
 */
function buildNewRegistration(options: RegistrationContext): unknown {
    const group = getNamespaceGroup(options.namespaceNumber);
    const proposedText = addEntry(options.source, {
        creationDate: options.creationDate,
        creationTimes: options.creationTimes,
        group,
        title: options.title,
    });
    const result = {
        alreadyRegistered: false,
        changed: proposedText !== options.source,
        earliestDate: options.earliestDate,
        eligible: true,
        existing: null,
        proposedText,
    };

    const earliestTimestamp = options.earliestDate?.toISOString?.();
    logStep("prepareNewPageListRegistration done", {
        changed: result.changed,
        earliestDate: earliestTimestamp,
        group,
        title: options.title,
    });

    return result;
}

/**
 * Checks whether a creation date is retained by the list.
 *
 * @param creationDate - Creation date value.
 * @param earliestDate - Earliest date value.
 * @returns Whether a creation date is retained by the list.
 */
function isRegistrationDateEligible(
    creationDate: Date,
    earliestDate: Date | null,
): boolean {
    return earliestDate == null || startOfUtcDay(creationDate) >= earliestDate;
}

/**
 * Builds state for a page older than retained list dates.
 *
 * @param options - Operation options.
 * @returns State for a page older than retained list dates.
 */
function buildIneligibleRegistration(options: RegistrationContext) {
    const result = {
        alreadyRegistered: options.existing != null,
        changed: false,
        earliestDate: options.earliestDate,
        eligible: false,
        existing: options.existing,
        proposedText: options.source,
    };

    const earliestTimestamp = options.earliestDate.toISOString();
    logStep("prepareNewPageListRegistration done: not eligible", {
        earliestDate: earliestTimestamp,
        existing: options.existing,
        title: options.title,
    });

    return result;
}

/**
 * Builds registration state for an already listed page.
 *
 * @param options - Operation options.
 * @returns Registration state for an already listed page.
 */
function buildExistingRegistration(options: RegistrationContext) {
    const result = {
        alreadyRegistered: true,
        changed: false,
        earliestDate: options.earliestDate,
        eligible: true,
        existing: options.existing,
        proposedText: options.source,
    };
    const message = [
        "prepareNewPageListRegistration don",
        "e: already registered",
    ].join("");

    logStep(message, {
        existing: options.existing,
        title: options.title,
    });

    return result;
}

/**
 * Gets titles already listed on the target UTC date.
 *
 * @param text - New-page-list source.
 * @param date - Target creation date.
 * @returns Listed titles.
 */
export function getTitlesForDate(text: string, date: Date): Array<string> {
    const timestamp = date?.toISOString?.();
    logStep("getTitlesForDate start", {
        date: timestamp,
    });
    const year = date.getUTCFullYear();
    const month = date.getUTCMonth();
    const day = date.getUTCDate();
    const source = String(text || "");
    const section = parseYearSections(source).find(
        (item) => item.year === year,
    );
    let block;

    for (
        let index = 0;
        index < (section?.blocks.length || 0) && block == null;
        index += 1
    ) {
        const candidate = section.blocks[index];
        const candidateMonth = candidate.date.getUTCMonth();
        const candidateDay = candidate.date.getUTCDate();

        if (candidateMonth === month && candidateDay === day) {
            block = candidate;
        }
    }

    if (block == null) {
        logStep("getTitlesForDate done: no block");
        return [];
    }

    const titles = [
        ...block.entries,
        ...(Object.values(block.groups) as any[]).flatMap(
            (group) => group.entries,
        ),
    ].map(extractVgcTitle);

    logStep("getTitlesForDate done", { titles });

    return titles;
}

/**
 * Saves a previously prepared new-page-list update.
 *
 * @param api - MediaWiki API client.
 * @param page - Original list page state.
 * @param proposedText - Prepared replacement text.
 * @param summary - Edit summary.
 * @returns Resolves after save.
 */
export async function savePreparedNewPageList(
    api: mw.Api,
    page: any,
    proposedText: string,
    summary: string,
): Promise<void> {
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
 * @param title - Registered title.
 * @param creationDate - Page creation date.
 * @returns Edit summary.
 */
export function buildNewPageListSummary(
    title: string,
    creationDate: Date,
): string {
    const result = [
        "Add [[",
        title,
        "]] to the ",
        formatEnglishDate(creationDate),
        " entry ",
        SUMMARY_SOURCE_LINK,
        "",
    ].join("");
    return result;
}

/**
 * Builds before/after source snippets around the changed line range.
 *
 * @param oldText - Current source.
 * @param newText - Proposed source.
 * @param contextLines - Number of surrounding unchanged lines.
 * @returns Before/after snippets.
 */
export function buildLineComparison(
    oldText: string,
    newText: string,
    contextLines: number = 1,
): any {
    const oldLines = String(oldText || "").split("\n");
    const newLines = String(newText || "").split("\n");
    const prefix = countCommonPrefix(oldLines, newLines);
    const suffix = countCommonSuffix(oldLines, newLines, prefix);

    if (oldText === newText) {
        const result = {
            after: "No changes.",
            before: "No changes.",
        };
        return result;
    }

    const result = {
        after: sliceChangedLines(newLines, prefix, suffix, contextLines),
        before: sliceChangedLines(oldLines, prefix, suffix, contextLines),
    };
    return result;
}

/**
 * Parses year sections and date blocks.
 *
 * @param text - New-page-list source.
 * @returns Parsed year sections.
 */
function parseYearSections(text: string): Array<any> {
    const headings = [
        ...String(text || "").matchAll(/^== (\d{4})年 ==\s*$/gmu),
    ];

    const result = [];

    for (let index = 0; index < headings.length; index += 1) {
        const heading = headings[index];
        const contentStart = heading.index + heading[0].length;
        const end = headings[index + 1]?.index ?? text.length;
        const section = text.slice(contentStart, end);
        const year = Number(heading[1]);
        const blocks = parseDateBlocks(section, year);

        const yearSection = {
            blocks,
            contentStart,
            end,
            year,
        };
        result.push(yearSection);
    }

    return result;
}

/**
 * Parses date blocks within one year.
 *
 * @param section - Year-section body.
 * @param year - Year number.
 * @returns Date blocks.
 */
function parseDateBlocks(section: string, year: number): Array<any> {
    const lines = section.split("\n");
    const blocks = [];

    for (const line of lines) {
        const dateBlock = parseDateBlockLine(line, year);

        if (dateBlock != null) {
            blocks.push(dateBlock);
        } else {
            const subgroupMatch = line.match(SUBGROUP_PATTERN);
            const currentBlock = blocks.at(-1);

            if (currentBlock != null && subgroupMatch != null) {
                const group = normalizeGroupLabel(subgroupMatch[1]);

                if (group != null) {
                    const entries = parseEntries(subgroupMatch[2]);
                    const label = subgroupMatch[1].trim();
                    currentBlock.groups[group] = { entries, label };
                }
            }
        }
    }

    return blocks;
}

/**
 * Parses a date heading line into a mutable date block.
 *
 * @param line - Line value.
 * @param year - Year value.
 * @returns A date heading line into a mutable date block.
 */
function parseDateBlockLine(line: string, year: number): any | null {
    const match = line.match(DATE_LINE_PATTERN);

    if (match == null) {
        return null;
    }

    const month = Number(match[1]) - 1;
    const day = Number(match[2]);
    const timestamp = Date.UTC(year, month, day);
    const result = {
        date: new Date(timestamp),
        entries: parseEntries(match[3]),
        groups: {},
        title: line,
    };
    return result;
}

/**
 * Adds an entry into the correct date and group.
 *
 * @param text - Current list source.
 * @param entry - Entry details.
 * @returns Updated text.
 */
function addEntry(text: string, entry: any): string {
    const year = entry.creationDate.getUTCFullYear();
    const month = entry.creationDate.getUTCMonth() + 1;
    const day = entry.creationDate.getUTCDate();
    const yearRange = findYearRange(text, year);
    const rendered = buildVgcCall(entry.title);

    if (yearRange == null) {
        const block = buildDateBlock(month, day, entry.group, [rendered]);
        const result = insertYearSection(text, year, block);
        return result;
    }

    const section = text.slice(yearRange.contentStart, yearRange.end);
    const updatedSection = updateYearSection(section, {
        ...entry,
        day,
        month,
        rendered,
    });

    const result =
        text.slice(0, yearRange.contentStart) +
        updatedSection +
        text.slice(yearRange.end);
    return result;
}

/**
 * Updates one year section.
 *
 * @param section - Year-section body.
 * @param entry - Entry details.
 * @returns Updated section.
 */
function updateYearSection(section: string, entry: any): string {
    const lines = section.split("\n");
    const targetIndex = findMatchingDateLine(lines, entry);

    if (targetIndex !== -1) {
        updateExistingDateBlock(lines, targetIndex, entry);
        return lines.join("\n");
    }

    const insertAt = findDateBlockInsertIndex(lines, entry);
    const block = buildDateBlock(entry.month, entry.day, entry.group, [
        entry.rendered,
    ]).split("\n");
    const fallbackIndex = findTrailingWhitespaceIndex(lines);

    lines.splice(insertAt === -1 ? fallbackIndex : insertAt, 0, ...block);
    return lines.join("\n");
}

/**
 * Finds the existing date line for a new entry.
 *
 * @param lines - Lines value.
 * @param entry - Input entry.
 * @returns The existing date line for a new entry.
 */
function findMatchingDateLine(lines: Array<string>, entry: any): number {
    let result = -1;

    for (let index = 0; index < lines.length && result === -1; index += 1) {
        const match = lines[index].match(DATE_LINE_PATTERN);

        if (match != null) {
            const month = Number(match[1]);
            const day = Number(match[2]);

            if (month === entry.month && day === entry.day) {
                result = index;
            }
        }
    }

    return result;
}

/**
 * Finds the descending-date insertion point for a new block.
 *
 * @param lines - Lines value.
 * @param entry - Input entry.
 * @returns The descending-date insertion point for a new block.
 */
function findDateBlockInsertIndex(lines: Array<string>, entry: any): number {
    let result = -1;

    for (let index = 0; index < lines.length && result === -1; index += 1) {
        const match = lines[index].match(DATE_LINE_PATTERN);

        if (match != null) {
            const month = Number(match[1]);
            const day = Number(match[2]);
            const earlierMonth = month < entry.month;
            const sameMonth = month === entry.month;
            const earlierDay = day < entry.day;

            if (earlierMonth || (sameMonth && earlierDay)) {
                result = index;
            }
        }
    }

    return result;
}

/**
 * Finds trailing blank lines, or the end of the section.
 *
 * @param lines - Lines value.
 * @returns Trailing blank lines, or the end of the section.
 */
function findTrailingWhitespaceIndex(lines: Array<string>): number {
    let index = -1;

    for (
        let lineIndex = 1;
        lineIndex < lines.length && index === -1;
        lineIndex += 1
    ) {
        const lineIsBlank = lines[lineIndex].trim() === "";
        let remainingBlank = lineIsBlank;

        for (
            let remainingIndex = lineIndex + 1;
            remainingIndex < lines.length && remainingBlank;
            remainingIndex += 1
        ) {
            remainingBlank = lines[remainingIndex].trim() === "";
        }

        if (remainingBlank) {
            index = lineIndex;
        }
    }

    return index === -1 ? lines.length : index;
}

/**
 * Updates an existing date block.
 *
 * @param lines - Section lines.
 * @param dateIndex - Date-line index.
 * @param entry - Entry details.
 * @returns Result when the function
 *   updates an existing date block.
 */
function updateExistingDateBlock(
    lines: Array<string>,
    dateIndex: number,
    entry: any,
): void {
    const blockEnd = findDateBlockEnd(lines, dateIndex);
    const blocks = readDateSubgroups(lines, dateIndex, blockEnd);

    if (entry.group == null) {
        const match = lines[dateIndex].match(DATE_LINE_PATTERN);
        const parsedEntries = parseEntries(match?.[3] || "");
        const entries = addAndSortEntries(
            parsedEntries,
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

    const populatedGroups = [];

    for (const group of GROUP_ORDER) {
        if ((blocks[group] || []).length > 0) {
            populatedGroups.push(group);
        }
    }

    const subgroupLines = [];

    for (const group of populatedGroups) {
        const entries = blocks[group].join("、");
        subgroupLines.push(`*:${GROUP_LABELS[group]}：${entries}`);
    }

    lines.splice(dateIndex + 1, blockEnd - dateIndex - 1, ...subgroupLines);
}

/**
 * Reads continuation rows for one date.
 *
 * @param lines - Year-section lines.
 * @param dateIndex - Date-line index.
 * @param blockEnd - End index.
 * @returns Group entries.
 */
function readDateSubgroups(
    lines: Array<string>,
    dateIndex: number,
    blockEnd: number,
): any {
    const blocks = {};

    const subgroupLines = lines.slice(dateIndex + 1, blockEnd);

    for (const line of subgroupLines) {
        const match = line.match(SUBGROUP_PATTERN);
        const group = match == null ? null : normalizeGroupLabel(match[1]);

        if (group != null) {
            blocks[group] = parseEntries(match[2]);
        }
    }

    return blocks;
}

/**
 * Sorts entries when creation times are known.
 *
 * @param entries - Existing entries.
 * @param added - Added entry.
 * @param creationTimes - Known creation times.
 * @returns Updated entries.
 */
function addAndSortEntries(
    entries: Array<string>,
    added: string,
    creationTimes: Map<string, Date>,
): Array<string> {
    const allEntries = [...entries, added];
    const unique = [];

    for (let index = 0; index < allEntries.length; index += 1) {
        const entry = allEntries[index];

        if (allEntries.indexOf(entry) === index) {
            unique.push(entry);
        }
    }

    const compareEntries = compareEntriesByCreationTime.bind(
        null,
        creationTimes,
    );
    const result = unique.sort(compareEntries);
    return result;
}

/**
 * Compares two entries by known creation time.
 *
 * @param creationTimes - Known creation times.
 * @param left - Left entry.
 * @param right - Right entry.
 * @returns Sort order.
 */
function compareEntriesByCreationTime(
    creationTimes: Map<string, Date>,
    left: string,
    right: string,
): number {
    const leftTitle = extractVgcTitle(left);
    const rightTitle = extractVgcTitle(right);
    const leftDate = creationTimes.get(leftTitle);
    const rightDate = creationTimes.get(rightTitle);

    if (leftDate == null && rightDate == null) {
        return 0;
    }

    if (leftDate == null) {
        return 1;
    }

    if (rightDate == null) {
        return -1;
    }

    return leftDate.getTime() - rightDate.getTime();
}

/**
 * Finds registration entry details.
 *
 * @param years - Parsed years.
 * @param title - Page title.
 * @returns Existing registration.
 */
function findRegisteredEntry(years: Array<any>, title: string): any | null {
    const normalized = normalizeTitle(title);

    for (const year of years) {
        for (const block of year.blocks) {
            const allEntries = [
                ...block.entries,
                ...(Object.values(block.groups) as any[]).flatMap(
                    (group) => group.entries,
                ),
            ];
            let found;

            for (
                let index = 0;
                index < allEntries.length && found == null;
                index += 1
            ) {
                const entry = allEntries[index];
                const entryTitle = extractVgcTitle(entry);
                const normalizedEntry = normalizeTitle(entryTitle);

                if (normalizedEntry === normalized) {
                    found = entry;
                }
            }

            if (found != null) {
                const result = {
                    date: block.date,
                    listedTitle: extractVgcTitle(found),
                };
                return result;
            }
        }
    }

    return null;
}

/**
 * Finds the earliest date currently retained in the list.
 *
 * @param years - Parsed years.
 * @returns Earliest UTC date.
 */
function findEarliestRetainedDate(
    years: Array<{ blocks: Array<{ date: Date }> }>,
): Date | null {
    const dates = [];

    for (const year of years) {
        for (const block of year.blocks) {
            dates.push(block.date);
        }
    }

    if (dates.length === 0) {
        return null;
    }

    const timestamps = [];

    for (const date of dates) {
        const timestamp = date.getTime();
        timestamps.push(timestamp);
    }

    const earliestTimestamp = Math.min(...timestamps);
    return new Date(earliestTimestamp);
}

/**
 * Finds a year section range.
 *
 * @param text - Source text.
 * @param year - Year.
 * @returns Content range.
 */
function findYearRange(text: string, year: number): any | null {
    const result =
        parseYearSections(text).find((section) => section.year === year) ||
        null;
    return result;
}

/**
 * Inserts a new year section.
 *
 * @param text - Current text.
 * @param year - Year.
 * @param block - Initial block.
 * @returns Updated text.
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
 * Builds a date block.
 *
 * @param month - Month.
 * @param day - Day.
 * @param group - Namespace group.
 * @param entries - Rendered entries.
 * @returns Date block.
 */
function buildDateBlock(
    month: number,
    day: number,
    group: string | null,
    entries: Array<string>,
): string {
    if (group == null) {
        return `* ${month}月${day}日 - ${entries.join("、")}`;
    }

    const result = [
        `* ${month}月${day}日 - `,
        `*:${GROUP_LABELS[group]}：${entries.join("、")}`,
    ].join("\n");
    return result;
}

/**
 * Gets the end index for one date block.
 *
 * @param lines - Lines.
 * @param dateIndex - Date-line index.
 * @returns End index.
 */
function findDateBlockEnd(lines: Array<string>, dateIndex: number): number {
    let nextDateIndex = -1;

    for (
        let index = dateIndex + 1;
        index < lines.length && nextDateIndex === -1;
        index += 1
    ) {
        const isDate = DATE_LINE_PATTERN.test(lines[index]);
        const isSubgroup = SUBGROUP_PATTERN.test(lines[index]);

        if (isDate || !isSubgroup) {
            nextDateIndex = index;
        }
    }

    return nextDateIndex === -1 ? lines.length : nextDateIndex;
}

/**
 * Parses vgc entries from a list line.
 *
 * @param text - Entry source.
 * @returns Entry calls.
 */
function parseEntries(text: string): Array<string> {
    const values = String(text || "").split("、");
    const trimmedValues = [];

    for (const value of values) {
        const trimmedValue = value.trim();
        trimmedValues.push(trimmedValue);
    }

    const result = [];

    for (const value of trimmedValues) {
        if (value !== "") {
            result.push(value);
        }
    }

    return result;
}

/**
 * Maps a subgroup label to its canonical group.
 *
 * @param label - Existing label.
 * @returns Group name.
 */
function normalizeGroupLabel(label: string): string | null {
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
 * @param namespaceNumber - Namespace number.
 * @returns Subgroup, or null for articles.
 */
function getNamespaceGroup(namespaceNumber: number): string | null {
    if (namespaceNumber === NAMESPACE.main) {
        return null;
    }

    if (namespaceNumber === NAMESPACE.draft) {
        return "draft";
    }

    if (namespaceNumber === NAMESPACE.category) {
        return "category";
    }

    if (namespaceNumber === NAMESPACE.file) {
        return "file";
    }

    if (
        namespaceNumber === NAMESPACE.template ||
        namespaceNumber === NAMESPACE.module
    ) {
        return "template";
    }

    return "other";
}

/**
 * Formats a UTC date for edit summaries.
 *
 * @param date - Date.
 * @returns Month/day text.
 */
function formatEnglishDate(date: Date): string {
    const result = new Intl.DateTimeFormat("en", {
        day: "numeric",
        month: "long",
        timeZone: "UTC",
    }).format(date);
    return result;
}

/**
 * Builds a vgc template call.
 *
 * @param title - Page title.
 * @returns Template call.
 */
function buildVgcCall(title: string): string {
    return `{{vgc|${title}}}`;
}

/**
 * Extracts a title from a vgc call.
 *
 * @param entry - Entry source.
 * @returns Title.
 */
function extractVgcTitle(entry: string): string {
    const match = String(entry || "").match(
        /\{\{\s*vgc\s*\|\s*([^|}]+).*?\}\}/iu,
    );

    return (match?.[1] || entry).trim();
}

/**
 * Normalizes titles for matching.
 *
 * @param title - Page title.
 * @returns Normalized key.
 */
function normalizeTitle(title: string): string {
    const result = String(title || "")
        .replace(/_/gu, " ")
        .trim()
        .toLowerCase();
    return result;
}

/**
 * Starts a date at UTC midnight.
 *
 * @param date - Date.
 * @returns UTC date.
 */
function startOfUtcDay(date: Date): Date {
    const year = date.getUTCFullYear();
    const month = date.getUTCMonth();
    const day = date.getUTCDate();
    const timestamp = Date.UTC(year, month, day);
    const result = new Date(timestamp);
    return result;
}

/**
 * Counts common prefix lines.
 *
 * @param left - Left lines.
 * @param right - Right lines.
 * @returns Prefix count.
 */
function countCommonPrefix(left: Array<string>, right: Array<string>): number {
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
 * @param left - Left lines.
 * @param right - Right lines.
 * @param prefix - Common prefix count.
 * @returns Suffix count.
 */
function countCommonSuffix(
    left: Array<string>,
    right: Array<string>,
    prefix: number,
): number {
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
 * @param lines - Source lines.
 * @param prefix - Common prefix line count.
 * @param suffix - Common suffix line count.
 * @param contextLines - Surrounding unchanged line count.
 * @returns Source snippet.
 */
function sliceChangedLines(
    lines: Array<string>,
    prefix: number,
    suffix: number,
    contextLines: number,
): string {
    const changeEnd = lines.length - suffix;
    const start = Math.max(0, prefix - contextLines);
    const end = Math.min(lines.length, changeEnd + contextLines);

    return lines.slice(start, end).join("\n");
}
