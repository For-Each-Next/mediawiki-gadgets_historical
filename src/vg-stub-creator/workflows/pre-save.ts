import { planPreSaveExecution } from "#gadget/workflows/pre-save-plan.ts";
// eslint-disable-next-line max-len
import { assertUniqueSelectedActionIds } from "#gadget/domain/pre-save-action-identity.ts";
import { buildNavboxEditSummary } from "#gadget/domain/edit-summary.ts";
import { formatNamespaceTitle } from "#shared/wiki-titles";

type DynamicRecord = Record<string, any>;

interface PageEditCollection {
    articleTitle?: string;
    rows?: Array<{ pendingEdit: DynamicRecord }>;
}

export type PreSaveMessageFormatter = (
    id: PreSaveMessageId,
    values?: Record<string, string | number>,
) => string;

export type PreSaveMessageId =
    | "presave.connectTo"
    | "presave.createPage"
    | "presave.createPageSummary"
    | "presave.editPage"
    | "presave.tagBanner"
    | "presave.updatePageSummary"
    | "progress.addTalkBanner"
    | "progress.connectTo"
    | "progress.createCategory"
    | "progress.createPage"
    | "progress.editPage"
    | "review.createCategoryPage";

export interface PreSaveWritePorts {
    addTalkPageBanner(api: mw.Api, title: string): Promise<void>;
    connectWikidataSitelink(
        api: mw.Api,
        id: string,
        title: string,
    ): Promise<void>;
    createRedirect(api: mw.Api, from: string, to: string): Promise<void>;
    movePage(
        api: mw.Api,
        from: string,
        to: string,
        options: { leaveRedirect: boolean },
    ): Promise<void>;
    savePageEdit(api: mw.Api, action: any): Promise<void>;
}

export interface PageLookupApi {
    get(params: Record<string, string>): PromiseLike<any>;
}

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
    formatMessage: PreSaveMessageFormatter = fallbackMessage,
): Array<any> {
    const form = selection.form || {};
    const title = normalizeTitle(selection.title);
    const finalTitle = normalizeTitle(selection.finalTitle) || title;
    const existingRows = createExistingTitleRows(existingRedirectTitles);
    const existingKeyValues = existingRows
        .filter((row) => row.exists)
        .map((row) => row.key);
    const existingKeys = new Set(existingKeyValues);
    const actions = buildInitialPreSaveActions(
        form,
        title,
        finalTitle,
        formatMessage,
    );

    for (const row of getPreSaveRedirectRows(form, title)) {
        const redirectActionResult = createRedirectAction(
            row,
            title,
            existingKeys,
        );
        actions.push(redirectActionResult);
    }

    for (const row of (form.categoryRows || []).filter(isPreSaveCategoryRow)) {
        const categoryActionResult = createCategoryAction(row, formatMessage);
        actions.push(categoryActionResult);
    }

    const pageEditActionsResult = buildPageEditActions(
        form,
        finalTitle,
        formatMessage,
    );
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
    formatMessage: PreSaveMessageFormatter,
): Array<unknown> {
    const actions = [createTalkBannerAction(finalTitle, formatMessage)];
    const wikidataId = normalizeTitle(form.wikidataId);

    if (wikidataId !== "") {
        const message = {
            displayLabel: formatMessage("presave.connectTo", {
                target: `d:${wikidataId}`,
            }),
            id: "interwiki",
            label: formatMessage("progress.connectTo", {
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
function createTalkBannerAction(
    title: unknown,
    formatMessage: PreSaveMessageFormatter,
): unknown {
    const talkTitle = formatNamespaceTitle(String(title ?? ""), "zhwiki", 1);

    const result = {
        displayLabel: formatMessage("presave.tagBanner", { title: talkTitle }),
        id: "talk-banner",
        label: formatMessage("progress.addTalkBanner", { title: talkTitle }),
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
 * @param finalTitle - Final linked article title.
 * @param formatMessage - Pre-save message formatter.
 * @returns Staged page-edit actions from review-row collections.
 */
function buildPageEditActions(
    form: {
        categoryRows: Array<{ pendingEdit: DynamicRecord }>;
        redirectRows: Array<{ pendingEdit: DynamicRecord }>;
        navboxRows: Array<{ pendingEdit: DynamicRecord }>;
        stubTagRows: Array<{ pendingEdit: DynamicRecord }>;
    },
    finalTitle: string,
    formatMessage: PreSaveMessageFormatter,
): Array<unknown> {
    const collections: PageEditCollection[] = [
        { rows: form.categoryRows },
        { rows: form.redirectRows },
        { articleTitle: finalTitle, rows: form.navboxRows },
        { rows: form.stubTagRows },
    ];

    const flatMapCallback = function callback(collection: PageEditCollection) {
        const mapCallback = function callback(row: {
            pendingEdit: DynamicRecord;
        }) {
            return createPageEditAction(
                row.pendingEdit,
                formatMessage,
                collection.articleTitle,
            );
        };
        return (collection.rows || [])
            .filter(isPreSavePageEditRow)
            .map(mapCallback);
    };
    const result = collections.flatMap(flatMapCallback);
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
function createCategoryAction(
    row: any,
    formatMessage: PreSaveMessageFormatter,
): any {
    const category = normalizeTitle(row.category);

    const result = {
        category,
        company: normalizeTitle(row.company),
        displayLabel: formatMessage("review.createCategoryPage"),
        englishName: normalizeTitle(row.pendingCreation.englishName),
        id: `category:${category}`,
        label: formatMessage("progress.createCategory", { title: category }),
        pageTitle: formatNamespaceTitle(category, "zhwiki", 14),
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
 * @param formatMessage - Pre-save message formatter.
 * @param articleTitle - Final linked article title for navbox edits.
 * @returns Page edit pre-save action.
 */
function createPageEditAction(
    edit: any,
    formatMessage: PreSaveMessageFormatter,
    articleTitle?: string,
): any {
    const title = normalizeTitle(edit.title);
    const create = edit.create === true;
    const englishName = normalizeTitle(edit.englishName);
    let displayLabel = formatMessage("presave.editPage");
    if (create) {
        displayLabel = formatMessage("presave.createPage");
    }

    const result = {
        create,
        displayLabel,
        ...(englishName === "" ? {} : { englishName }),
        id: `page-edit:${title}`,
        label: formatMessage(
            create ? "progress.createPage" : "progress.editPage",
            {
                title,
            },
        ),
        pageTitle: title,
        selected: true,
        summary:
            articleTitle == null
                ? getPageEditSummary(edit, title, create, formatMessage)
                : buildNavboxEditSummary(edit, articleTitle),
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
    formatMessage: PreSaveMessageFormatter,
): string {
    const result =
        normalizeTitle(edit.summary) ||
        formatMessage(
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
    options: any & {
        categoryUnavailableMessage?: string;
        writes: PreSaveWritePorts;
    },
): Promise<any> {
    assertUniqueSelectedActionIds(actions);
    const completed: SelectedAction[] = [...(options.confirmedActions ?? [])];
    const failed: SelectedAction[] = [];
    const originalTitle = normalizeTitle(options.title);
    const plan = planPreSaveExecution(
        actions as SelectedAction[],
        originalTitle,
        options.move,
    );

    await runSelectedMove(
        originalTitle,
        plan.finalTitle,
        plan.shouldMove,
        options,
    );

    for (const phase of plan.phases) {
        await runSelectedActionPhase(phase, {
            completed,
            failed,
            finalTitle: plan.finalTitle,
            options,
        });
    }

    const result = {
        completed,
        failed,
        title: plan.finalTitle,
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
    categoryUnavailableMessage?: string;
    confirmedActions?: SelectedAction[];
    move: { leaveRedirect: boolean };
    onActionComplete?: (action: SelectedAction) => void;
    onActionFailed?: (action: SelectedAction, error?: unknown) => void;
    onActionSkipped?: (action: SelectedAction) => void;
    onActionStart?: (action: SelectedAction) => void;
    onBeforeWikidataActions?: (result: {
        completed: SelectedAction[];
        failed: SelectedAction[];
        title: string;
    }) => Promise<void> | void;
    onBundledActionProgress?: (
        action: SelectedAction,
        status: "complete" | "failed" | "running",
    ) => void;
    saveCategory?: CategorySaveHandler;
    saveCompanyCategory?: CategorySaveHandler;
    writes: PreSaveWritePorts;
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
        onMoveFailed?: (title: string, error: unknown) => void;
    },
): Promise<void> {
    if (!enabled) {
        return;
    }

    options.onMoveStart?.(to);
    try {
        await options.writes.movePage(options.api, from, to, {
            leaveRedirect: options.move.leaveRedirect,
        });
        options.onMoveComplete?.(to);
    } catch (error) {
        options.onMoveFailed?.(to, error);
        throw error;
    }
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

    try {
        await runSelectedAction(action, {
            ...context.options,
            title: context.finalTitle,
        });
        completeSelectedAction(action, context);
    } catch (error) {
        failSelectedAction(action, error, context);
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
 * @param context - Operation context.
 */
function failSelectedAction(
    action: SelectedAction,
    error: unknown,
    context: SelectedActionContext,
): void {
    action.selected = false;
    context.failed.push(action);
    context.options.onActionFailed?.(action, error);
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
        await options.writes.connectWikidataSitelink(
            options.wikidataApi || options.api,
            action.wikidataId,
            options.title,
        );
        return;
    }

    if (action.type === "redirect") {
        await options.writes.createRedirect(
            options.api,
            action.redirectTitle,
            options.title,
        );
        return;
    }

    if (action.type === "talk-banner") {
        await options.writes.addTalkPageBanner(options.api, options.title);
        return;
    }

    if (action.type === "category") {
        await runCategoryAction(action, options);
        return;
    }

    if (action.type === "page-edit") {
        await options.writes.savePageEdit(options.api, action);
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
        const message =
            options.categoryUnavailableMessage ||
            "Category save handler is unavailable.";
        throw new Error(message);
    }

    const saveArgument = {
        onProgress(operation: string, status: string) {
            reportCategoryActionProgress(action, operation, status, options);
        },
    };
    await save(
        action.category ?? "",
        action.text ?? "",
        action.englishName ?? "",
        saveArgument,
    );
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
    // The parent category owns creation plus every bundled write.
    // Its lifecycle is completed or failed by runSelectedActionRow.
    if (operation === "create") {
        return;
    }

    const progressAction = {
        ...action,
        id: `${action.id}:${operation}`,
    };

    if (["complete", "failed", "running"].includes(status)) {
        options.onBundledActionProgress?.(
            progressAction,
            status as "complete" | "failed" | "running",
        );
    }
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

function fallbackMessage(
    id: PreSaveMessageId,
    values: Record<string, string | number> = {},
): string {
    return Object.entries(values).reduce<string>(
        (text, [key, value]) => text.replace(`{${key}}`, String(value)),
        String(id),
    );
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
