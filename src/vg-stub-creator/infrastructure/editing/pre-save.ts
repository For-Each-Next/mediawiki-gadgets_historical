/**
 * Describes the pre-save module.
 *
 * Builds the pre-save checklist and runs its selected follow-up
 * actions.
 */

import { buildTemplateCall, buildTemplateText } from "../../../shared";
import { addEditSummarySuffix } from "./summary.ts";

type DynamicRecord = Record<string, any>;

const MAX_ACTION_ATTEMPTS = 3;

export const TALK_PAGE_BANNER = buildTemplateText(
    "WikiProject banner shell",
    [
        ["class", "stub"],
        ["1", buildTemplateCall("WikiProject Video games")],
    ],
    "block",
);
const UNASSESSED_TALK_PAGE_BANNER = buildTemplateText(
    "WikiProject banner shell",
    [
        ["class", "unassessed"],
        ["1", buildTemplateCall("WikiProject Video games")],
    ],
    "block",
);

/**
 * Builds the selectable pre-save action rows.
 *
 * @param selection - Current pre-save selection data.
 * @param selection.form - Submitted dialog form.
 * @param selection.title - Article title.
 * @param existingRedirectTitles - Titles that already redirect to the
 * article.
 * @returns Selectable action rows.
 */
export function buildPreSaveActions(
    selection: any,
    existingRedirectTitles: Array<DynamicRecord | string> = [],
): Array<any> {
    const form = selection.form || {};
    const title = normalizeTitle(selection.title);
    const finalTitle = normalizeTitle(selection.finalTitle) || title;
    const existingRows = createExistingTitleRows(existingRedirectTitles);
    const existingKeys = new Set(
        existingRows.filter((row) => row.exists).map((row) => row.key),
    );
    const actions = buildInitialPreSaveActions(form, title, finalTitle);

    for (const row of getPreSaveRedirectRows(form, title)) {
        actions.push(createRedirectAction(row, title, existingKeys));
    }

    for (const row of (form.categoryRows || []).filter(isPreSaveCategoryRow)) {
        actions.push(createCategoryAction(row));
    }

    actions.push(...buildPageEditActions(form));

    return actions;
}

/** Builds interwiki and talk-banner pre-save actions. */
function buildInitialPreSaveActions(form, title, finalTitle): Array<any> {
    const actions = [createTalkBannerAction(finalTitle)];
    const wikidataId = normalizeTitle(form.wikidataId);

    if (wikidataId !== "") {
        actions.unshift({
            displayLabel: `Connect to [[d:${wikidataId}]]`,
            id: "interwiki",
            label: `Connect ${title} to ${wikidataId}`,
            pageTitle: title,
            selected: true,
            type: "interwiki",
            wikidataId,
        });
    }

    return actions;
}

/** Creates the article talk-banner action. */
function createTalkBannerAction(title): any {
    const label = [
        "Add WikiProject Video games banner",
        " to Talk:",
        title,
        "",
    ].join("");

    return {
        displayLabel: `Tag banner on [[Talk:${title}]]`,
        id: "talk-banner",
        label,
        pageTitle: title,
        selected: true,
        type: "talk-banner",
    };
}

/** Builds staged page-edit actions from review-row collections. */
function buildPageEditActions(form): Array<any> {
    const collections = [
        form.categoryRows,
        form.redirectRows,
        form.navboxRows,
        form.stubTagRows,
    ];

    return collections
        .flatMap((rows) => rows || [])
        .filter(isPreSavePageEditRow)
        .map((row) => createPageEditAction(row.pendingEdit));
}

/**
 * Checks whether a category row should become a pre-save action.
 *
 * @param row - Category review row.
 * @returns Whether the category should be staged.
 */
function isPreSaveCategoryRow(row: any): boolean {
    return (
        row.enabled !== false &&
        row.pendingCreation != null &&
        normalizeTitle(row.category) !== ""
    );
}

/**
 * Checks whether a row has a staged page edit.
 *
 * @param row - Review row.
 * @returns Whether the row should become a page edit action.
 */
function isPreSavePageEditRow(row: any): boolean {
    return isPreSaveRowEnabled(row) && hasCompletePendingEdit(row.pendingEdit);
}

/** Checks whether a pre-save row is enabled. */
function isPreSaveRowEnabled(row: any): boolean {
    return row.enabled === undefined || row.enabled === true;
}

/** Checks whether a staged page edit has a title and text. */
function hasCompletePendingEdit(edit: any): boolean {
    return (
        Boolean(edit) &&
        normalizeTitle(edit.title).length > 0 &&
        String(edit.text || "").trim().length > 0
    );
}

/**
 * Creates a category pre-save action.
 *
 * @param row - Category review row.
 * @returns Category pre-save action.
 */
function createCategoryAction(row: any): any {
    const category = normalizeTitle(row.category);

    return {
        category,
        company: normalizeTitle(row.company),
        displayLabel: "Create category page",
        englishName: normalizeTitle(row.pendingCreation.englishName),
        id: `category:${category}`,
        label: `Create category: ${category}`,
        pageTitle: `Category:${category}`,
        selected: true,
        text: String(row.pendingCreation.text || ""),
        type: "category",
        wikidataId: normalizeTitle(row.pendingCreation.wikidataId),
    };
}

/**
 * Creates a generic staged page edit action.
 *
 * @param edit - Staged page edit.
 * @returns Page edit pre-save action.
 */
function createPageEditAction(edit: any): any {
    const title = normalizeTitle(edit.title);
    const create = edit.create === true;

    return {
        create,
        displayLabel: create ? "Create page" : "Edit page",
        ...selectValue(
            normalizeTitle(edit.englishName) === "",
            function trueBranch() {
                return {};
            },
            function falseBranch() {
                return {
                    englishName: normalizeTitle(edit.englishName),
                };
            },
        ),
        id: `page-edit:${title}`,
        label: `${create ? "Create" : "Edit"} page: ${title}`,
        pageTitle: title,
        selected: true,
        summary:
            normalizeTitle(edit.summary) ||
            `${create ? "Create" : "Update"} ${title}`,
        text: String(edit.text || ""),
        title,
        type: "page-edit",
    };
}

/**
 * Builds generated redirect review rows.
 *
 * @param form - Submitted dialog form.
 * @param articleTitle - Saved article title.
 * @param existingRedirectTitles - Existing page titles.
 * @returns Redirect review rows.
 */
export function buildRedirectRows(
    form: any,
    articleTitle: string,
    existingRedirectTitles: Array<any | string> = [],
): Array<any> {
    return buildRedirectRowsFromTitles(
        buildRedirectTitles(form, articleTitle),
        articleTitle,
        existingRedirectTitles,
    );
}

/**
 * Builds redirect review rows from entered title values.
 *
 * @param titles - Redirect candidate titles.
 * @param articleTitle - Saved article title.
 * @param existingRedirectTitles - Existing page titles.
 * @returns Redirect review rows.
 */
export function buildRedirectRowsFromTitles(
    titles: Array<string>,
    articleTitle: string,
    existingRedirectTitles: Array<any | string> = [],
): Array<any> {
    const existingRows = createExistingTitleRows(existingRedirectTitles);
    const targetKey = normalizeTitleKey(articleTitle);
    const seen = new Set();

    const context = { existingRows, seen, targetKey };
    const rows = titles.map(normalizeTitle).flatMap(function callback(title) {
        return normalizeRedirectReviewTitle(title, context);
    });

    return rows;
}

/** Normalizes one redirect candidate into a unique review row. */
function normalizeRedirectReviewTitle(title, context): Array<any> {
    const resolvedTitle = normalizeMixedChineseVariantTitle(title);
    const resolvedKey = normalizeTitleKey(resolvedTitle);

    if (
        resolvedKey === "" ||
        resolvedKey === context.targetKey ||
        context.seen.has(resolvedKey)
    ) {
        return [];
    }

    const existing = findExistingTitleRow(resolvedTitle, context.existingRows);
    const exists = existing?.exists === true;

    context.seen.add(resolvedKey);

    return [
        {
            enabled: !exists,
            exists,
            status: getExistenceStatus(exists),
            title: resolvedTitle,
        },
    ];
}

/**
 * Gets unique localized aliases suitable for redirect pages.
 *
 * @param form - Submitted dialog form.
 * @param articleTitle - Saved article title.
 * @returns Redirect page titles.
 */
export function buildRedirectTitles(
    form: any,
    articleTitle: string,
): Array<string> {
    const targetKey = normalizeTitleKey(articleTitle);
    const names = [
        getOriginalName(form.originalName),
        form.englishName,
        ...getChineseNames(form),
    ];
    const seen = new Set();

    return names.map(normalizeTitle).filter(function callback(title) {
        const key = normalizeTitleKey(title);

        if (key === "" || key === targetKey || seen.has(key)) {
            return false;
        }

        seen.add(key);
        return true;
    });
}

/**
 * Gets rows to convert into pre-save redirect actions.
 *
 * @param form - Submitted dialog form.
 * @param articleTitle - Saved article title.
 * @returns Redirect rows.
 */
function getPreSaveRedirectRows(form: any, articleTitle: string): Array<any> {
    let rows = form.redirectRows;

    if (!Array.isArray(rows)) {
        rows = buildRedirectRows(form, articleTitle);
    }
    const targetKey = normalizeTitleKey(articleTitle);
    const seen = new Set();

    const context = { seen, targetKey };
    const normalized = rows.flatMap(function callback(row) {
        return normalizePreSaveRedirectRow(row, context);
    });

    return normalized;
}

/** Normalizes one row into a unique pre-save redirect row. */
function normalizePreSaveRedirectRow(row, context): Array<any> {
    const title = normalizeTitle(row.title ?? row.redirectTitle);
    const key = normalizeTitleKey(title);

    if (
        row.pendingEdit != null ||
        key === "" ||
        key === context.targetKey ||
        context.seen.has(key)
    ) {
        return [];
    }

    context.seen.add(key);

    return [
        {
            enabled: row.enabled !== false && row.selected !== false,
            exists: row.exists === true,
            title,
        },
    ];
}

/**
 * Creates a redirect pre-save action.
 *
 * @param row - Redirect review row.
 * @param title - Saved article title.
 * @param existingKeys - Existing redirect title keys.
 * @returns Redirect pre-save action.
 */
function createRedirectAction(
    row: any,
    title: string,
    existingKeys: Set<string>,
): any {
    const redirectTitle = normalizeTitle(row.title);
    const exists =
        row.exists === true ||
        existingKeys.has(normalizeTitleKey(redirectTitle));

    let displayLabel = `Redirect to [[${title}]]`;
    let label = `Redirect name: ${redirectTitle} to ${title}`;

    if (exists) {
        displayLabel = "Redirect page already exists";
        label = `Redirect: ${redirectTitle} (page exists)`;
    }

    return {
        displayLabel,
        id: `redirect:${redirectTitle}`,
        exists,
        label,
        pageTitle: redirectTitle,
        redirectTitle,
        selected: row.enabled !== false && !exists,
        targetTitle: title,
        type: "redirect",
    };
}

/**
 * Normalizes existing title matches into keyed rows.
 *
 * @param values - Existing title matches.
 * @returns Existing title rows.
 */
function createExistingTitleRows(values: Array<any | string>): Array<any> {
    return values.map(createExistingTitleRow);
}

/**
 * Normalizes one existing title match.
 *
 * @param value - Existing title match.
 * @returns Existing title row.
 */
function createExistingTitleRow(value: any | string): any {
    if (value != null && typeof value === "object") {
        const requestedTitle = normalizeTitle(value.requestedTitle);
        const title = normalizeTitle(value.title);

        return {
            exists: value.exists !== false,
            key: normalizeTitleKey(requestedTitle || title),
            requestedTitle,
            title,
        };
    }

    const title = normalizeTitle(value);

    return {
        exists: true,
        key: normalizeTitleKey(title),
        requestedTitle: title,
        title,
    };
}

/**
 * Finds an existing title match for the requested row.
 *
 * @param title - Requested title.
 * @param rows - Existing title rows.
 * @returns Existing title row.
 */
function findExistingTitleRow(
    title: string,
    rows: Array<any>,
): any | undefined {
    return rows.find((item) => item.key === normalizeTitleKey(title));
}

const CHINESE_VARIANT_PAIRS: [string, string][] = [
    ["萨", "薩"],
    ["游", "遊"],
    ["戏", "戲"],
    ["发", "發"],
    ["开", "開"],
    ["电", "電"],
    ["软", "軟"],
    ["体", "體"],
    ["国", "國"],
    ["产", "產"],
    ["华", "華"],
    ["门", "門"],
    ["风", "風"],
    ["龙", "龍"],
    ["马", "馬"],
    ["鸟", "鳥"],
    ["鱼", "魚"],
    ["台", "臺"],
    ["众", "眾"],
    ["网", "網"],
    ["与", "與"],
    ["云", "雲"],
    ["专", "專"],
    ["业", "業"],
];
const SIMPLIFIED_TO_TRADITIONAL = new Map(CHINESE_VARIANT_PAIRS);
const TRADITIONAL_TO_SIMPLIFIED = new Map(
    CHINESE_VARIANT_PAIRS.map(function callback([simplified, traditional]) {
        return [traditional, simplified];
    }),
);

/**
 * Builds unique titles to check, including both pure Chinese variants.
 *
 * @param titles - Requested titles.
 * @returns Titles to query.
 */
export function getRedirectTitleCheckTitles(
    titles: Array<string>,
): Array<string> {
    const seen = new Set();
    const values = [];

    for (const title of titles.map(normalizeTitle)) {
        for (const value of getRedirectTitleCheckVariants(title)) {
            const key = normalizeTitleKey(value);

            if (key === "" || seen.has(key)) {
                continue;
            }

            seen.add(key);
            values.push(value);
        }
    }

    return values;
}

/**
 * Gets the requested title plus pure simplified and traditional forms.
 *
 * @param title - Requested title.
 * @returns Candidate titles.
 */
function getRedirectTitleCheckVariants(title: string): Array<string> {
    return [
        title,
        convertChineseVariantTitle(title, "simplified"),
        convertChineseVariantTitle(title, "traditional"),
    ];
}

/**
 * Handles normalize mixed chinese variant title.
 *
 * Normalizes mixed Chinese variant title text to the first detected
 * style.
 *
 * @param title - Requested title.
 * @returns Normalized title.
 *
 */
function normalizeMixedChineseVariantTitle(title: string): string {
    const style = getFirstChineseVariantStyle(title);

    return style == null ? title : convertChineseVariantTitle(title, style);
}

/**
 * Gets the first variant-specific style used in a title.
 *
 * @param title - Requested title.
 * @returns Variant style.
 */
function getFirstChineseVariantStyle(title: string): string | undefined {
    for (const char of Array.from(title)) {
        if (SIMPLIFIED_TO_TRADITIONAL.has(char)) {
            return "simplified";
        }

        if (TRADITIONAL_TO_SIMPLIFIED.has(char)) {
            return "traditional";
        }
    }

    return undefined;
}

/**
 * Converts known Chinese variant pairs in a title.
 *
 * @param title - Requested title.
 * @param style - Target variant style.
 * @returns Converted title.
 */
function convertChineseVariantTitle(title: string, style: string): string {
    const table = selectValue(
        style === "simplified",
        function trueBranch() {
            return TRADITIONAL_TO_SIMPLIFIED;
        },
        function falseBranch() {
            return SIMPLIFIED_TO_TRADITIONAL;
        },
    );

    return Array.from(title)
        .map((char) => table.get(char) || char)
        .join("");
}

/**
 * Gets the compact existence status.
 *
 * @param exists - Whether the page exists.
 * @returns Status text.
 */
function getExistenceStatus(exists: boolean): string {
    return exists ? "Exists" : "Missing";
}

/**
 * Gets entered Chinese localized names.
 *
 * @param form - Submitted dialog form.
 * @returns Chinese name values.
 */
function getChineseNames(form: any): Array<string> {
    return [
        ...(form.localizedNames || [])
            .filter(isChineseNameRow)
            .map((row) => row.name),
        ...(form.officialNames || [])
            .filter(isChineseNameRow)
            .map((row) => row.name),
        ...(form.commonNames || [])
            .filter(isChineseNameRow)
            .map((row) => row.name),
    ];
}

/**
 * Removes a compact language prefix from an original title.
 *
 * @param value - Original title field value.
 * @returns Original title without its language prefix.
 */
function getOriginalName(value: any): string {
    return normalizeTitle(value).replace(
        /^[a-z]{2,3}(?:-[a-z0-9]+)*:\s*/iu,
        "",
    );
}

/**
 * Fetches redirect candidate title existence and conversion matches.
 *
 * @param api - MediaWiki API client.
 * @param titles - Redirect candidate titles.
 * @returns Page title matches.
 */
export async function fetchExistingPageTitles(
    api: any,
    titles: Array<string>,
): Promise<Array<any>> {
    if (titles.length === 0) {
        return [];
    }

    const data = await api.get({
        action: "query",
        converttitles: "1",
        titles: titles.join("|"),
    });
    const { conversionMap, existingKeys } = getExistingTitleContext(data);
    const context = { conversionMap, existingKeys };
    const normalizedTitles = titles.map(normalizeTitle);
    const matches = normalizedTitles.flatMap(function callback(title) {
        return createExistingPageTitleMatch(title, context);
    });

    return matches;
}

/** Extracts normalized title lookup collections. */
function getExistingTitleContext(data): any {
    const converted = data?.query?.converted || [];
    const conversionMap = new Map<string, string>(
        converted.map(function callback(item) {
            const from = normalizeTitleKey(item.from);
            const pair = [from, normalizeTitle(item.to)];
            return pair as [string, string];
        }),
    );
    const pages = Object.values(data?.query?.pages || {}) as any[];
    const existingKeys = new Set(
        pages
            .filter((page) => page.missing == null)
            .map((page) => normalizeTitleKey(page.title)),
    );

    return { conversionMap, existingKeys };
}

/** Creates an existing or converted page-title match. */
function createExistingPageTitleMatch(title, context): Array<any> {
    const requestedKey = normalizeTitleKey(title);
    const convertedTitle = context.conversionMap.get(requestedKey) || title;
    const exists = context.existingKeys.has(normalizeTitleKey(convertedTitle));
    const converted =
        normalizeTitleKey(convertedTitle) !== normalizeTitleKey(title);

    if (!exists && !converted) {
        return [];
    }

    return [{ exists, requestedTitle: title, title: convertedTitle }];
}

/**
 * Runs selected follow-up actions in order.
 *
 * @param actions - Action rows.
 * @param options - Execution options.
 * @param options.api - MediaWiki API client.
 * @param options.move - Optional page move settings.
 * @param options.move.enabled - Whether to move the page.
 * @param options.move.leaveRedirect - Whether to leave a
 * redirect.
 * @param options.move.to - Destination page title.
 * @param options.onMoveComplete - Successful move
 * callback.
 * @param options.onMoveStart - Move start callback.
 * @param options.onActionComplete - Action success
 * callback.
 * @param options.onActionFailed - Action failure callback.
 * @param options.onActionRetry - Action retry callback.
 * @param options.onActionSkipped - Action skipped
 * callback.
 * @param options.onActionStart - Action start callback.
 * @param options.onBeforeWikidataActions - Pre-Wikidata
 * hook.
 * @param options.saveCategory - Generic category save
 * handler.
 * @param options.saveCompanyCategory - Company category
 * save
 * handler.
 * @param options.wikidataApi - Wikidata API client.
 * @param options.title - Saved article title.
 * @returns Completed action rows and final title.
 */
export async function runSelectedActions(
    actions: Array<any>,
    options: any,
): Promise<any> {
    const completed = [];
    const failed = [];
    const originalTitle = normalizeTitle(options.title);
    const moveTitle = normalizeTitle(options.move?.to);
    const shouldMove =
        options.move?.enabled === true &&
        moveTitle !== "" &&
        normalizeTitleKey(moveTitle) !== normalizeTitleKey(originalTitle);
    const finalTitle = shouldMove ? moveTitle : originalTitle;

    await runSelectedMove(originalTitle, finalTitle, shouldMove, options);

    for (const phase of getSelectedActionPhases(actions)) {
        await runSelectedActionPhase(phase, {
            completed,
            failed,
            finalTitle,
            options,
        });
    }

    return {
        completed,
        failed,
        title: finalTitle,
    };
}

/** Runs the optional page move before follow-up actions. */
async function runSelectedMove(from, to, enabled, options): Promise<void> {
    if (!enabled) {
        return;
    }

    options.onMoveStart?.(to);
    await movePage(options.api, from, to, {
        leaveRedirect: options.move.leaveRedirect,
    });
    options.onMoveComplete?.(to);
}

/** Runs one selected action phase. */
async function runSelectedActionPhase(phase, context): Promise<void> {
    if (phase.type === "wikidata") {
        await context.options.onBeforeWikidataActions?.({
            completed: context.completed,
            failed: context.failed,
            title: context.finalTitle,
        });
    }

    for (const action of phase.actions) {
        await runSelectedActionRow(action, context);
    }
}

/** Runs one selected action row and records its result. */
async function runSelectedActionRow(action, context): Promise<void> {
    if (isRedirectToFinalTitle(action, context.finalTitle)) {
        action.selected = false;
        context.options.onActionSkipped?.(action);
        return;
    }

    context.options.onActionStart?.(action);
    const progress = { failureHandled: false };

    try {
        await runSelectedActionWithRetry(action, {
            ...context.options,
            onActionProgressFailed() {
                progress.failureHandled = true;
            },
            title: context.finalTitle,
        });
        completeSelectedAction(action, context);
    } catch (error) {
        failSelectedAction(action, error, progress, context);
    }
}

/** Checks whether a redirect points to its own final title. */
function isRedirectToFinalTitle(action, finalTitle): boolean {
    return (
        action.type === "redirect" &&
        normalizeTitleKey(action.redirectTitle) ===
            normalizeTitleKey(finalTitle)
    );
}

/** Records a completed selected action. */
function completeSelectedAction(action, context): void {
    action.selected = false;
    context.completed.push(action);
    context.options.onActionComplete?.(action);
}

/** Records a failed selected action. */
function failSelectedAction(action, error, progress, context): void {
    action.selected = false;
    context.failed.push(action);
    if (!progress.failureHandled) {
        context.options.onActionFailed?.(action, error);
    }
}

/**
 * Gets selected actions grouped by the execution phases.
 *
 * @param actions - Action rows.
 * @returns Selected action phases.
 */
function getSelectedActionPhases(actions: Array<any>): Array<any> {
    const selected = actions.filter((item) => item.selected);
    const localActions = selected.filter(
        (action) => action.type !== "interwiki",
    );
    const wikidataActions = selected.filter(
        (action) => action.type === "interwiki",
    );

    return [
        {
            actions: localActions,
            type: "local",
        },
        {
            actions: wikidataActions,
            type: "wikidata",
        },
    ];
}

/**
 * Moves the saved article before running follow-up edits.
 *
 * @param api - MediaWiki API client.
 * @param from - Current page title.
 * @param to - Destination page title.
 * @param options - Move options.
 * @param options.leaveRedirect - Whether to leave a redirect.
 * @returns Resolves after the page is moved.
 */
export async function movePage(
    api: any,
    from: string,
    to: string,
    options: any,
): Promise<void> {
    const params: Record<string, any> = {
        action: "move",
        from,
        reason: addEditSummarySuffix(`Rename to [[${to}]]`),
        to,
    };

    if (!options.leaveRedirect) {
        params.noredirect = true;
    }

    await api.postWithToken("csrf", params);
}

/**
 * Runs one selected follow-up action.
 *
 * @param action - Action row.
 * @param options - Execution options.
 * @param options.api - MediaWiki API client.
 * @param options.wikidataApi - Wikidata API client.
 * @param options.title - Saved article title.
 * @returns Resolves after the action succeeds.
 */
async function runSelectedAction(action: any, options: any): Promise<void> {
    if (action.type === "interwiki") {
        await connectWikidataSitelink(
            options.wikidataApi || options.api,
            action.wikidataId,
            options.title,
        );
        return;
    }

    if (action.type === "redirect") {
        await createRedirect(options.api, action.redirectTitle, options.title);
        return;
    }

    if (action.type === "talk-banner") {
        await addTalkPageBanner(options.api, options.title);
        return;
    }

    if (action.type === "category") {
        await runCategoryAction(action, options);
        return;
    }

    if (action.type === "page-edit") {
        await savePageEdit(options.api, action);
    }
}

/** Runs a generic or company category action. */
async function runCategoryAction(action, options): Promise<void> {
    let save = options.saveCompanyCategory;

    if (normalizeTitle(action.company) === "") {
        save = options.saveCategory;
    }

    if (save == null) {
        throw new Error("Category save handler is unavailable.");
    }

    await save(action.category, action.text, action.englishName, {
        onProgress(operation, status) {
            reportCategoryActionProgress(action, operation, status, options);
        },
    });
}

/** Reports progress for work bundled into a category action. */
function reportCategoryActionProgress(
    action,
    operation,
    status,
    options,
): void {
    const progressAction = {
        ...action,
        id: operation === "create" ? action.id : `${action.id}:${operation}`,
    };

    if (status === "running") {
        options.onActionStart?.(progressAction);
    } else if (status === "complete") {
        options.onActionComplete?.(progressAction);
    } else if (status === "failed") {
        options.onActionProgressFailed?.();
        options.onActionFailed?.(progressAction);
    }
}

/**
 * Runs one selected follow-up action with bounded retries.
 *
 * @param action - Action row.
 * @param options - Execution options.
 * @returns Resolves after the action succeeds.
 */
async function runSelectedActionWithRetry(
    action: any,
    options: any,
): Promise<void> {
    let lastError;

    for (let attempt = 1; attempt <= MAX_ACTION_ATTEMPTS; attempt += 1) {
        try {
            await runSelectedAction(action, options);
            return;
        } catch (error) {
            lastError = error;

            if (attempt < MAX_ACTION_ATTEMPTS) {
                options.onActionRetry?.(action, error, attempt);
            }
        }
    }

    throw lastError;
}

/**
 * Saves a staged page edit.
 *
 * @param api - MediaWiki API client.
 * @param action - Page edit action.
 * @returns Resolves after the page is saved.
 */
async function savePageEdit(api: any, action: any): Promise<void> {
    const params: Record<string, any> = {
        action: "edit",
        summary: addEditSummarySuffix(action.summary),
        text: action.text,
        title: action.title,
    };

    if (action.create) {
        params.createonly = true;
    }

    await api.postWithToken("csrf", params);
}

/**
 * Connects the saved Chinese Wikipedia page to a Wikidata item.
 *
 * @param api - MediaWiki API client.
 * @param wikidataId - Wikidata entity ID.
 * @param title - Chinese Wikipedia article title.
 * @returns Resolves after the sitelink is saved.
 */
export async function connectWikidataSitelink(
    api: any,
    wikidataId: string,
    title: string,
): Promise<void> {
    const params = {
        action: "wbsetsitelink",
        id: wikidataId,
        linksite: "zhwiki",
        linktitle: title,
        summary: addEditSummarySuffix(
            `see '${buildWikidataSummaryLink(title)}'`,
        ),
    };

    await api.postWithToken("csrf", params);
}

/**
 * Builds a summary link to the connected Chinese Wikipedia page.
 *
 * @param title - Chinese Wikipedia page title.
 * @returns Wikitext link suitable for a Wikidata edit summary.
 */
function buildWikidataSummaryLink(title: string): string {
    return `[[w:zh:${title}]]`;
}

/**
 * Creates one redirect without overwriting an existing page.
 *
 * @param api - MediaWiki API client.
 * @param redirectTitle - Redirect page title.
 * @param targetTitle - Redirect target.
 * @returns Resolves after the redirect is created.
 */
export async function createRedirect(
    api: any,
    redirectTitle: string,
    targetTitle: string,
): Promise<void> {
    const params = {
        action: "edit",
        createonly: true,
        summary: addEditSummarySuffix(
            `redirect "${redirectTitle}" to "[[${targetTitle}]]"`,
        ),
        text: `#REDIRECT [[${targetTitle}]]`,
        title: redirectTitle,
    };

    await api.postWithToken("csrf", params);
}

/**
 * Adds the video game project banner when it is not already present.
 *
 * @param api - MediaWiki API client.
 * @param articleTitle - Article title.
 * @returns Resolves after the talk page is updated.
 */
export async function addTalkPageBanner(
    api: any,
    articleTitle: string,
): Promise<void> {
    const title = getTalkPageTitle(articleTitle);
    const banner = getTalkPageBanner(articleTitle);
    const text = await fetchTalkPageText(api, title);

    if (/WikiProject\s+Video games/iu.test(text)) {
        return;
    }

    const params = {
        action: "edit",
        appendtext: `${text === "" ? "" : "\n\n"}${banner}`,
        summary: addEditSummarySuffix(
            [
                "tagging the {{[[Template:WikiProje",
                "ct Video games|WikiProject Video g",
                "ames]]}} banner",
            ].join(""),
        ),
        title,
    };

    await api.postWithToken("csrf", params);
}

/** Fetches the current talk-page wikitext. */
async function fetchTalkPageText(api: any, title: string): Promise<string> {
    const data = await api.get({
        action: "query",
        prop: "revisions",
        rvprop: "content",
        rvslots: "main",
        titles: title,
    });
    const page: any = Object.values(data?.query?.pages || {})[0];
    const text =
        page?.revisions?.[0]?.slots?.main?.content ||
        page?.revisions?.[0]?.["*"] ||
        "";

    return text;
}

/**
 * Handles get talk page banner.
 *
 * Builds the project banner with an assessment appropriate to the
 * subject.
 *
 * @param title - Subject-page title.
 * @returns Talk-page banner wikitext.
 *
 */
function getTalkPageBanner(title: string): string {
    return selectValue(
        /^Category:/iu.test(normalizeTitle(title)),
        function trueBranch() {
            return UNASSESSED_TALK_PAGE_BANNER;
        },
        function falseBranch() {
            return TALK_PAGE_BANNER;
        },
    );
}

/**
 * Gets the canonical talk-page title for an article or category.
 *
 * @param title - Subject-page title.
 * @returns Talk-page title.
 */
function getTalkPageTitle(title: string): string {
    const categoryMatch = normalizeTitle(title).match(/^Category:(.+)$/iu);

    return selectValue(
        categoryMatch == null,
        function trueBranch() {
            return `Talk:${normalizeTitle(title)}`;
        },
        function falseBranch() {
            return `Category talk:${categoryMatch[1]}`;
        },
    );
}

/**
 * Normalizes title whitespace.
 *
 * @param value - Raw title value.
 * @returns Normalized title.
 */
function normalizeTitle(value: any): string {
    return String(value || "")
        .trim()
        .replace(/_/gu, " ");
}

/**
 * Builds a case-insensitive key for title comparison.
 *
 * @param value - Raw title value.
 * @returns Comparison key.
 */
function normalizeTitleKey(value: any): string {
    return normalizeTitle(value).toLocaleLowerCase();
}

/**
 * Checks whether a localized name row represents a Chinese name.
 *
 * @param row - Localized name row.
 * @returns Whether the row is a Chinese-name redirect
 * candidate.
 */
function isChineseNameRow(row: any): boolean {
    const hasChineseMarket = ["hans", "hant", "cn", "tw", "hk"].some(
        (market) => row[market] === true,
    );

    return (
        hasChineseMarket || /\p{Script=Han}/u.test(normalizeTitle(row.name))
    );
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
    condition: boolean,
    trueBranch: (...args: any[]) => any,
    falseBranch: (...args: any[]) => any,
): any {
    if (condition) {
        return trueBranch();
    }

    return falseBranch();
}
