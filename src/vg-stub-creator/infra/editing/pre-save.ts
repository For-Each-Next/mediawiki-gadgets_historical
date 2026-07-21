import { addEditSummarySuffix } from "#me/infra/editing/summary.ts";
import { msg } from "#me/i18n/index.ts";
import { wikitext } from "#shared";
const { buildTemplateCall, buildTemplateText } = wikitext;

type DynamicRecord = Record<string, any>;

export interface PageLookupApi {
    get(params: Record<string, string>): PromiseLike<any>;
}

const MAX_ACTION_ATTEMPTS = 3;

const videoGamesBanner = buildTemplateCall("WikiProject Video games");
export const TALK_PAGE_BANNER = buildTemplateText(
    "WikiProject banner shell",
    [
        ["class", "stub"],
        ["1", videoGamesBanner],
    ],
    "block",
);
const unassessedBannerParams: Parameters<typeof buildTemplateText>[1] = [
    ["class", "unassessed"],
    ["1", buildTemplateCall("WikiProject Video games")],
];
const UNASSESSED_TALK_PAGE_BANNER = buildTemplateText(
    "WikiProject banner shell",
    unassessedBannerParams,
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
    const existingKeyValues = existingRows
        .filter((row) => row.exists)
        .map((row) => row.key);
    const existingKeys = new Set(existingKeyValues);
    const actions = buildInitialPreSaveActions(form, title, finalTitle);

    for (const row of getPreSaveRedirectRows(form, title)) {
        const redirectActionResult = createRedirectAction(
            row,
            title,
            existingKeys,
        );
        actions.push(redirectActionResult);
    }

    for (const row of (form.categoryRows || []).filter(isPreSaveCategoryRow)) {
        const categoryActionResult = createCategoryAction(row);
        actions.push(categoryActionResult);
    }

    const pageEditActionsResult = buildPageEditActions(form);
    actions.push(...pageEditActionsResult);

    return actions;
}

/**
 * Builds interwiki and talk-banner pre-save actions.
 *
 * @param form - Form values.
 * @param title - Page title.
 * @param finalTitle - Final title value.
 * @returns Interwiki and talk-banner pre-save actions.
 */
function buildInitialPreSaveActions(
    form: { wikidataId: unknown },
    title: string,
    finalTitle: string,
): Array<unknown> {
    const actions = [createTalkBannerAction(finalTitle)];
    const wikidataId = normalizeTitle(form.wikidataId);

    if (wikidataId !== "") {
        const message = {
            displayLabel: msg("presave.connectTo", {
                target: `d:${wikidataId}`,
            }),
            id: "interwiki",
            label: msg("progress.connectTo", {
                target: wikidataId,
                title,
            }),
            pageTitle: title,
            selected: true,
            type: "interwiki",
            wikidataId,
        };
        actions.unshift(message);
    }

    return actions;
}

/**
 * Creates the article talk-banner action.
 *
 * @param title - Page title.
 * @returns The article talk-banner action.
 */
function createTalkBannerAction(title: unknown): unknown {
    const talkTitle = `Talk:${title}`;

    const result = {
        displayLabel: msg("presave.tagBanner", { title: talkTitle }),
        id: "talk-banner",
        label: msg("progress.addTalkBanner", { title: talkTitle }),
        pageTitle: title,
        selected: true,
        type: "talk-banner",
    };
    return result;
}

/**
 * Builds staged page-edit actions from review-row collections.
 *
 * @param form - Form values.
 * @returns Staged page-edit actions from review-row collections.
 */
function buildPageEditActions(form: {
    categoryRows: Array<{ pendingEdit: DynamicRecord }>;
    redirectRows: Array<{ pendingEdit: DynamicRecord }>;
    navboxRows: Array<{ pendingEdit: DynamicRecord }>;
    stubTagRows: Array<{ pendingEdit: DynamicRecord }>;
}): Array<unknown> {
    const collections = [
        form.categoryRows,
        form.redirectRows,
        form.navboxRows,
        form.stubTagRows,
    ];

    const mapCallbackB = (row: any) => createPageEditAction(row.pendingEdit);
    const result = collections
        .flatMap((rows) => rows || [])
        .filter(isPreSavePageEditRow)
        .map(mapCallbackB);
    return result;
}

/**
 * Checks whether a category row should become a pre-save action.
 *
 * @param row - Category review row.
 * @returns Whether the category should be staged.
 */
function isPreSaveCategoryRow(row: any): boolean {
    const result =
        row.enabled !== false &&
        row.pendingCreation != null &&
        normalizeTitle(row.category) !== "";
    return result;
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

/**
 * Checks whether a pre-save row is enabled.
 *
 * @param row - Row values.
 * @returns Whether a pre-save row is enabled.
 */
function isPreSaveRowEnabled(row: any): boolean {
    return row.enabled === undefined || row.enabled === true;
}

/**
 * Checks whether a staged page edit has a title and text.
 *
 * @param edit - Edit value.
 * @returns Whether a staged page edit has a title and text.
 */
function hasCompletePendingEdit(edit: any): boolean {
    const result =
        Boolean(edit) &&
        normalizeTitle(edit.title).length > 0 &&
        String(edit.text || "").trim().length > 0;
    return result;
}

/**
 * Creates a category pre-save action.
 *
 * @param row - Category review row.
 * @returns Category pre-save action.
 */
function createCategoryAction(row: any): any {
    const category = normalizeTitle(row.category);

    const result = {
        category,
        company: normalizeTitle(row.company),
        displayLabel: msg("review.createCategoryPage"),
        englishName: normalizeTitle(row.pendingCreation.englishName),
        id: `category:${category}`,
        label: msg("progress.createCategory", { title: category }),
        pageTitle: `Category:${category}`,
        selected: true,
        text: String(row.pendingCreation.text || ""),
        type: "category",
        wikidataId: normalizeTitle(row.pendingCreation.wikidataId),
    };
    return result;
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
    const englishName = normalizeTitle(edit.englishName);
    let displayLabel = msg("presave.editPage");
    if (create) {
        displayLabel = msg("presave.createPage");
    }

    const result = {
        create,
        displayLabel,
        ...(englishName === "" ? {} : { englishName }),
        id: `page-edit:${title}`,
        label: msg(create ? "progress.createPage" : "progress.editPage", {
            title,
        }),
        pageTitle: title,
        selected: true,
        summary: getPageEditSummary(edit, title, create),
        text: String(edit.text || ""),
        title,
        type: "page-edit",
    };
    return result;
}

/**
 * Gets the staged page edit summary.
 *
 * @param edit - Edit value.
 * @param title - Page title.
 * @param create - Create value.
 * @returns The staged page edit summary.
 */
function getPageEditSummary(
    edit: any,
    title: string,
    create: boolean,
): string {
    const result =
        normalizeTitle(edit.summary) ||
        msg(
            create ? "presave.createPageSummary" : "presave.updatePageSummary",
            { title },
        );
    return result;
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
    const redirectTitlesResult = buildRedirectTitles(form, articleTitle);
    const result = buildRedirectRowsFromTitles(
        redirectTitlesResult,
        articleTitle,
        existingRedirectTitles,
    );
    return result;
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
    const seen = new Set<string>();

    const context = { existingRows, seen, targetKey };
    const flatMapCallbackB = function callback(title: string) {
        return normalizeRedirectReviewTitle(title, context);
    };
    const rows = titles.map(normalizeTitle).flatMap(flatMapCallbackB);

    return rows;
}

/**
 * Normalizes one redirect candidate into a unique review row.
 *
 * @param title - Page title.
 * @param context - Operation context.
 * @returns One redirect candidate into a unique review row.
 */
function normalizeRedirectReviewTitle(
    title: string,
    context: {
        existingRows: DynamicRecord[];
        seen: Set<string>;
        targetKey: string;
    },
): Array<unknown> {
    const resolvedTitle = normalizeTitle(title);
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

    const result = [
        {
            enabled: !exists,
            exists,
            status: getExistenceStatus(exists),
            title: resolvedTitle,
        },
    ];
    return result;
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
    const seen = new Set<string>();

    const filterCallback = function callback(title: string) {
        const key = normalizeTitleKey(title);

        if (key === "" || key === targetKey || seen.has(key)) {
            return false;
        }

        seen.add(key);
        return true;
    };
    const result = names.map(normalizeTitle).filter(filterCallback);
    return result;
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
    const seen = new Set<string>();

    const context = { seen, targetKey };
    const flatMapCallbackA = function callback(row: {
        title: string;
        redirectTitle: string;
        pendingEdit: DynamicRecord | null;
        enabled: boolean;
        selected: boolean;
        exists: boolean;
    }) {
        return normalizePreSaveRedirectRow(row, context);
    };
    const normalized = rows.flatMap(flatMapCallbackA);

    return normalized;
}

/**
 * Normalizes one row into a unique pre-save redirect row.
 *
 * @param row - Row values.
 * @param context - Operation context.
 * @returns One row into a unique pre-save redirect row.
 */
function normalizePreSaveRedirectRow(
    row: {
        title: string;
        redirectTitle: string;
        pendingEdit: DynamicRecord | null;
        enabled: boolean;
        selected: boolean;
        exists: boolean;
    },
    context: { seen: Set<string>; targetKey: string },
): Array<unknown> {
    const title = normalizeTitle(row.title ?? row.redirectTitle);
    const key = normalizeTitleKey(title);

    if (row.pendingEdit != null || key === "" || key === context.targetKey) {
        return [];
    }

    if (context.seen.has(key)) {
        return [];
    }

    context.seen.add(key);

    const result = [
        {
            enabled: row.enabled !== false && row.selected !== false,
            exists: row.exists === true,
            title,
        },
    ];
    return result;
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
    let exists = row.exists === true;

    if (!exists) {
        const redirectKey = normalizeTitleKey(redirectTitle);
        exists = existingKeys.has(redirectKey);
    }

    let displayLabel = `Redirect to [[${title}]]`;
    let label = `Redirect name: ${redirectTitle} to ${title}`;

    if (exists) {
        displayLabel = "Redirect page already exists";
        label = `Redirect: ${redirectTitle} (page exists)`;
    }

    const result = {
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
    return result;
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

        const result = {
            exists: value.exists !== false,
            key: normalizeTitleKey(requestedTitle || title),
            requestedTitle,
            title,
        };
        return result;
    }

    const title = normalizeTitle(value);

    const result = {
        exists: true,
        key: normalizeTitleKey(title),
        requestedTitle: title,
        title,
    };
    return result;
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
    const findCallback = (item: any) => item.key === normalizeTitleKey(title);
    return rows.find(findCallback);
}

/**
 * Builds unique normalized titles for MediaWiki conversion and lookup.
 *
 * @param titles - Requested titles.
 * @returns Titles to query.
 */
export function getRedirectTitleCheckTitles(
    titles: Array<string>,
): Array<string> {
    const seen = new Set();
    const values = [];

    for (const value of titles.map(normalizeTitle)) {
        const key = normalizeTitleKey(value);

        if (key === "" || seen.has(key)) {
            continue;
        }

        seen.add(key);
        values.push(value);
    }

    return values;
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
    const localizedNames: Array<{ name: string }> = form.localizedNames || [];
    const officialNames: Array<{ name: string }> = form.officialNames || [];
    const commonNames: Array<{ name: string }> = form.commonNames || [];
    const result = [
        ...localizedNames.filter(isChineseNameRow).map((row) => row.name),
        ...officialNames.filter(isChineseNameRow).map((row) => row.name),
        ...commonNames.filter(isChineseNameRow).map((row) => row.name),
    ];
    return result;
}

/**
 * Removes a compact language prefix from an original title.
 *
 * @param value - Original title field value.
 * @returns Original title without its language prefix.
 */
function getOriginalName(value: any): string {
    const result = normalizeTitle(value).replace(
        /^[a-z]{2,3}(?:-[a-z0-9]+)*:\s*/iu,
        "",
    );
    return result;
}

/**
 * Fetches redirect candidate title existence and conversion matches.
 *
 * @param api - MediaWiki API client.
 * @param titles - Redirect candidate titles.
 * @returns Page title matches.
 */
export async function fetchExistingPageTitles(
    api: PageLookupApi,
    titles: Array<string>,
): Promise<Array<any>> {
    if (titles.length === 0) {
        return [];
    }

    const joinedTextA = {
        action: "query",
        converttitles: "1",
        titles: titles.join("|"),
    };
    const data = await api.get(joinedTextA);
    const { conversionMap, existingKeys } = getExistingTitleContext(data);
    const context = { conversionMap, existingKeys };
    const normalizedTitles = titles.map(normalizeTitle);
    const flatMapCallback = function callback(title: string) {
        return createExistingPageTitleMatch(title, context);
    };
    const matches = normalizedTitles.flatMap(flatMapCallback);

    return matches;
}

/**
 * Extracts normalized title lookup collections.
 *
 * @param data - Input data.
 * @returns Result when the function
 *   extracts normalized title lookup collections.
 */
function getExistingTitleContext(data: {
    query: {
        converted: Array<{ from: string; to: string }>;
        pages: Record<string, { missing?: string; title: string }>;
    };
}): { conversionMap: Map<string, string>; existingKeys: Set<string> } {
    const converted = data?.query?.converted || [];
    const mapCallbackA = function callback(item: {
        from: string;
        to: string;
    }) {
        const from = normalizeTitleKey(item.from);
        const pair = [from, normalizeTitle(item.to)];
        return pair as [string, string];
    };
    const conversionEntries = converted.map(mapCallbackA);
    const conversionMap = new Map<string, string>(conversionEntries);
    const pages = Object.values(data?.query?.pages || {}) as any[];
    const mapCallback = (page: any) => normalizeTitleKey(page.title);
    const existingKeyValues = pages
        .filter((page) => page.missing == null)
        .map(mapCallback);
    const existingKeys = new Set(existingKeyValues);

    return { conversionMap, existingKeys };
}

/**
 * Creates an existing or converted page-title match.
 *
 * @param title - Page title.
 * @param context - Operation context.
 * @returns An existing or converted page-title match.
 */
function createExistingPageTitleMatch(
    title: string,
    context: {
        conversionMap: Map<string, string>;
        existingKeys: Set<string>;
    },
): Array<unknown> {
    const requestedKey = normalizeTitleKey(title);
    const convertedTitle = context.conversionMap.get(requestedKey) || title;
    const titleKeyResult = normalizeTitleKey(convertedTitle);
    const exists = context.existingKeys.has(titleKeyResult);
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

    const result = {
        completed,
        failed,
        title: finalTitle,
    };
    return result;
}

/**
 * Describes one selectable action performed after saving an article.
 */
interface SelectedAction {
    id: string;
    selected: boolean;
    type: string;
    category?: string;
    company?: string;
    englishName?: string;
    redirectTitle?: string;
    text?: string;
    wikidataId?: string;
}

/**
 * Carries shared state while selected actions execute.
 */
interface SelectedActionContext {
    completed: SelectedAction[];
    failed: SelectedAction[];
    finalTitle: string;
    options: SelectedActionOptions;
}

interface SelectedActionOptions {
    api: mw.Api;
    move: { leaveRedirect: boolean };
    onActionComplete?: (action: SelectedAction) => void;
    onActionFailed?: (action: SelectedAction, error?: unknown) => void;
    onActionProgressFailed?: () => void;
    onActionSkipped?: (action: SelectedAction) => void;
    onActionStart?: (action: SelectedAction) => void;
    onBeforeWikidataActions?: (result: {
        completed: SelectedAction[];
        failed: SelectedAction[];
        title: string;
    }) => Promise<void> | void;
    saveCategory?: CategorySaveHandler;
    saveCompanyCategory?: CategorySaveHandler;
}

type CategorySaveHandler = (
    category: string,
    text: string,
    englishName: string,
    options: { onProgress: (operation: string, status: string) => void },
) => Promise<void>;

/**
 * Runs the optional page move before follow-up actions.
 *
 * @param from - From value.
 * @param to - To value.
 * @param enabled - Enabled value.
 * @param options - Operation options.
 */
async function runSelectedMove(
    from: string,
    to: string,
    enabled: boolean,
    options: SelectedActionOptions & {
        onMoveStart?: (title: string) => void;
        onMoveComplete?: (title: string) => void;
    },
): Promise<void> {
    if (!enabled) {
        return;
    }

    options.onMoveStart?.(to);
    await movePage(options.api, from, to, {
        leaveRedirect: options.move.leaveRedirect,
    });
    options.onMoveComplete?.(to);
}

/**
 * Runs one selected action phase.
 *
 * @param phase - Phase value.
 * @param context - Operation context.
 */
async function runSelectedActionPhase(
    phase: { type: string; actions: SelectedAction[] },
    context: SelectedActionContext,
): Promise<void> {
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

/**
 * Runs one selected action row and records its result.
 *
 * @param action - Action value.
 * @param context - Operation context.
 */
async function runSelectedActionRow(
    action: SelectedAction,
    context: SelectedActionContext,
): Promise<void> {
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

/**
 * Checks whether a redirect points to its own final title.
 *
 * @param action - Action value.
 * @param finalTitle - Final title value.
 * @returns Whether a redirect points to its own final title.
 */
function isRedirectToFinalTitle(
    action: SelectedAction,
    finalTitle: string,
): boolean {
    const result =
        action.type === "redirect" &&
        normalizeTitleKey(action.redirectTitle) ===
            normalizeTitleKey(finalTitle);
    return result;
}

/**
 * Records a completed selected action.
 *
 * @param action - Action value.
 * @param context - Operation context.
 */
function completeSelectedAction(
    action: SelectedAction,
    context: SelectedActionContext,
): void {
    action.selected = false;
    context.completed.push(action);
    context.options.onActionComplete?.(action);
}

/**
 * Records a failed selected action.
 *
 * @param action - Action value.
 * @param error - Caught error.
 * @param progress - Progress value.
 * @param context - Operation context.
 */
function failSelectedAction(
    action: SelectedAction,
    error: unknown,
    progress: { failureHandled: boolean },
    context: SelectedActionContext,
): void {
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

    const result = [
        {
            actions: localActions,
            type: "local",
        },
        {
            actions: wikidataActions,
            type: "wikidata",
        },
    ];
    return result;
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

/**
 * Runs a generic or company category action.
 *
 * @param action - Action value.
 * @param options - Operation options.
 */
async function runCategoryAction(
    action: SelectedAction,
    options: SelectedActionOptions,
): Promise<void> {
    let save = options.saveCompanyCategory;

    if (normalizeTitle(action.company) === "") {
        save = options.saveCategory;
    }

    if (save == null) {
        const message = msg("errors.categorySaveUnavailable");
        throw new Error(message);
    }

    const saveArgument = {
        onProgress(operation: string, status: string) {
            reportCategoryActionProgress(action, operation, status, options);
        },
    };
    await save(action.category, action.text, action.englishName, saveArgument);
}

/**
 * Reports progress for work bundled into a category action.
 *
 * @param action - Action value.
 * @param operation - Operation value.
 * @param status - Status value.
 * @param options - Operation options.
 */
function reportCategoryActionProgress(
    action: SelectedAction,
    operation: string,
    status: string,
    options: SelectedActionOptions,
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
    let lastError: unknown;

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
    const summaryLink = buildWikidataSummaryLink(title);
    const wikidataSummaryLinkResult = `see '${summaryLink}'`;
    const params = {
        action: "wbsetsitelink",
        id: wikidataId,
        linksite: "zhwiki",
        linktitle: title,
        summary: addEditSummarySuffix(wikidataSummaryLinkResult),
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

    const joinedText = [
        "tagging the {{[[Template:WikiProje",
        "ct Video games|WikiProject Video g",
        "ames]]}} banner",
    ].join("");
    const params = {
        action: "edit",
        appendtext: `${text === "" ? "" : "\n\n"}${banner}`,
        summary: addEditSummarySuffix(joinedText),
        title,
    };

    await api.postWithToken("csrf", params);
}

/**
 * Fetches the current talk-page wikitext.
 *
 * @param api - MediaWiki API client.
 * @param title - Page title.
 * @returns The current talk-page wikitext.
 */
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
 */
function getTalkPageBanner(title: string): string {
    const titleResult = normalizeTitle(title);
    const matchesPattern = /^Category:/iu.test(titleResult);
    const result = selectValue(
        matchesPattern,
        function trueBranch() {
            return UNASSESSED_TALK_PAGE_BANNER;
        },
        function falseBranch() {
            return TALK_PAGE_BANNER;
        },
    );
    return result;
}

/**
 * Gets the canonical talk-page title for an article or category.
 *
 * @param title - Subject-page title.
 * @returns Talk-page title.
 */
function getTalkPageTitle(title: string): string {
    const categoryMatch = normalizeTitle(title).match(/^Category:(.+)$/iu);

    const selectValueCallback = function trueBranch() {
        return `Talk:${normalizeTitle(title)}`;
    };
    const result = selectValue(
        categoryMatch == null,
        selectValueCallback,
        function falseBranch() {
            return `Category talk:${categoryMatch[1]}`;
        },
    );
    return result;
}

/**
 * Normalizes title whitespace.
 *
 * @param value - Raw title value.
 * @returns Normalized title.
 */
function normalizeTitle(value: any): string {
    const result = String(value || "")
        .trim()
        .replace(/_/gu, " ");
    return result;
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

    if (hasChineseMarket) {
        return true;
    }

    const title = normalizeTitle(row.name);
    return /\p{Script=Han}/u.test(title);
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
