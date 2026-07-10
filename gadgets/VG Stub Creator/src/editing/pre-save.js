/* eslint-disable */

/**
 * Builds the pre-save checklist and runs its selected follow-up actions.
 */

import { buildTemplateCall, buildTemplateText } from "../shared/utils.js";
import { addEditSummarySuffix } from "./summary.js";

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
 * @param {object} selection - Current pre-save selection data.
 * @param {object} selection.form - Submitted dialog form.
 * @param {string} selection.title - Article title.
 * @returns {Array<object>} Selectable action rows.
 */
export function buildPreSaveActions(selection, existingRedirectTitles = []) {
    const form = selection.form || {};
    const title = normalizeTitle(selection.title);
    const finalTitle = normalizeTitle(selection.finalTitle) || title;
    const existingRows = createExistingTitleRows(existingRedirectTitles);
    const existingKeys = new Set(
        existingRows.filter((row) => row.exists).map((row) => row.key),
    );
    const actions = [];

    if (normalizeTitle(form.wikidataId) !== "") {
        const wikidataId = normalizeTitle(form.wikidataId);

        actions.push({
            displayLabel: `Connect to [[d:${wikidataId}]]`,
            id: "interwiki",
            label: `Connect ${title} to ${wikidataId}`,
            pageTitle: title,
            selected: true,
            type: "interwiki",
            wikidataId,
        });
    }

    for (const row of getPreSaveRedirectRows(form, title)) {
        actions.push(createRedirectAction(row, title, existingKeys));
    }

    actions.push({
        displayLabel: `Tag banner on [[Talk:${finalTitle}]]`,
        id: "talk-banner",
        label: `Add WikiProject Video games banner to Talk:${finalTitle}`,
        pageTitle: finalTitle,
        selected: true,
        type: "talk-banner",
    });

    for (const row of (form.categoryRows || []).filter(isPreSaveCategoryRow)) {
        actions.push(createCategoryAction(row));
    }

    for (const row of (form.categoryRows || []).filter(isPreSavePageEditRow)) {
        actions.push(createPageEditAction(row.pendingEdit));
    }

    for (const row of (form.redirectRows || []).filter(isPreSavePageEditRow)) {
        actions.push(createPageEditAction(row.pendingEdit));
    }

    for (const row of (form.navboxRows || []).filter(isPreSavePageEditRow)) {
        actions.push(createPageEditAction(row.pendingEdit));
    }

    for (const row of (form.stubTagRows || []).filter(isPreSavePageEditRow)) {
        actions.push(createPageEditAction(row.pendingEdit));
    }

    return actions;
}

/**
 * Checks whether a category row should become a pre-save action.
 *
 * @param {object} row - Category review row.
 * @returns {boolean} Whether the category should be staged.
 */
function isPreSaveCategoryRow(row) {
    return (
        row.enabled !== false &&
        row.pendingCreation != null &&
        normalizeTitle(row.category) !== ""
    );
}

/**
 * Checks whether a row has a staged page edit.
 *
 * @param {object} row - Review row.
 * @returns {boolean} Whether the row should become a page edit action.
 */
function isPreSavePageEditRow(row) {
    return (
        row.enabled !== false &&
        row.pendingEdit != null &&
        normalizeTitle(row.pendingEdit.title) !== "" &&
        String(row.pendingEdit.text || "").trim() !== ""
    );
}

/**
 * Creates a category pre-save action.
 *
 * @param {object} row - Category review row.
 * @returns {object} Category pre-save action.
 */
function createCategoryAction(row) {
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
 * @param {object} edit - Staged page edit.
 * @returns {object} Page edit pre-save action.
 */
function createPageEditAction(edit) {
    const title = normalizeTitle(edit.title);
    const create = edit.create === true;

    return {
        create,
        displayLabel: create ? "Create page" : "Edit page",
        ...(normalizeTitle(edit.englishName) === ""
            ? {}
            : {
                  englishName: normalizeTitle(edit.englishName),
              }),
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
 * Builds the default title fix for an English-titled article.
 *
 * @param {object} form - Submitted dialog form.
 * @param {string} articleTitle - Current article title.
 * @returns {object} Default page move settings.
 */
export function buildTitleFix(form, articleTitle) {
    const title = normalizeTitle(articleTitle);
    const chineseTitle = buildChineseRedirectTitles(form, title)[0] || "";
    const enabled = isEnglishTitle(title) && chineseTitle !== "";

    return {
        enabled,
        to: enabled ? chineseTitle : title,
    };
}

/**
 * Builds generated redirect review rows.
 *
 * @param {object} form - Submitted dialog form.
 * @param {string} articleTitle - Saved article title.
 * @param {Array<string>} existingRedirectTitles - Existing page titles.
 * @returns {Array<object>} Redirect review rows.
 */
export function buildRedirectRows(
    form,
    articleTitle,
    existingRedirectTitles = [],
) {
    return buildRedirectRowsFromTitles(
        buildRedirectTitles(form, articleTitle),
        articleTitle,
        existingRedirectTitles,
    );
}

/**
 * Builds redirect review rows from entered title values.
 *
 * @param {Array<string>} titles - Redirect candidate titles.
 * @param {string} articleTitle - Saved article title.
 * @param {Array<string>} existingRedirectTitles - Existing page titles.
 * @returns {Array<object>} Redirect review rows.
 */
export function buildRedirectRowsFromTitles(
    titles,
    articleTitle,
    existingRedirectTitles = [],
) {
    const existingRows = createExistingTitleRows(existingRedirectTitles);
    const targetKey = normalizeTitleKey(articleTitle);
    const seen = new Set();

    return titles.map(normalizeTitle).flatMap(normalizeRedirectReviewTitle);

    function normalizeRedirectReviewTitle(title) {
        const normalizedTitle = normalizeMixedChineseVariantTitle(title);
        const key = normalizeTitleKey(normalizedTitle);

        if (key === "") {
            return [];
        }

        const existing = findExistingTitleRow(normalizedTitle, existingRows);
        const exists = existing?.exists === true;
        const resolvedTitle = normalizedTitle;
        const resolvedKey = normalizeTitleKey(resolvedTitle);

        if (resolvedKey === targetKey || seen.has(resolvedKey)) {
            return [];
        }

        seen.add(resolvedKey);

        return [
            {
                enabled: !exists,
                exists,
                status: getExistenceStatus(exists),
                title: resolvedTitle,
            },
        ];
    }
}

/**
 * Gets unique localized aliases suitable for redirect pages.
 *
 * @param {object} form - Submitted dialog form.
 * @param {string} articleTitle - Saved article title.
 * @returns {Array<string>} Redirect page titles.
 */
export function buildRedirectTitles(form, articleTitle) {
    const targetKey = normalizeTitleKey(articleTitle);
    const names = [
        getOriginalName(form.originalName),
        form.englishName,
        ...getChineseNames(form),
    ];
    const seen = new Set();

    return names.map(normalizeTitle).filter((title) => {
        const key = normalizeTitleKey(title);

        if (key === "" || key === targetKey || seen.has(key)) {
            return false;
        }

        seen.add(key);
        return true;
    });
}

/**
 * Gets unique Chinese aliases suitable for a page move.
 *
 * @param {object} form - Submitted dialog form.
 * @param {string} articleTitle - Saved article title.
 * @returns {Array<string>} Chinese page titles.
 */
function buildChineseRedirectTitles(form, articleTitle) {
    const targetKey = normalizeTitleKey(articleTitle);
    const seen = new Set();

    return getChineseNames(form)
        .map(normalizeTitle)
        .filter((title) => {
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
 * @param {object} form - Submitted dialog form.
 * @param {string} articleTitle - Saved article title.
 * @returns {Array<object>} Redirect rows.
 */
function getPreSaveRedirectRows(form, articleTitle) {
    const rows = Array.isArray(form.redirectRows)
        ? form.redirectRows
        : buildRedirectRows(form, articleTitle);
    const targetKey = normalizeTitleKey(articleTitle);
    const seen = new Set();

    return rows.flatMap(normalizePreSaveRedirectRow);

    function normalizePreSaveRedirectRow(row) {
        const title = normalizeTitle(row.title ?? row.redirectTitle);
        const key = normalizeTitleKey(title);

        if (
            row.pendingEdit != null ||
            key === "" ||
            key === targetKey ||
            seen.has(key)
        ) {
            return [];
        }

        seen.add(key);
        return [
            {
                enabled: row.enabled !== false && row.selected !== false,
                exists: row.exists === true,
                title,
            },
        ];
    }
}

/**
 * Creates a redirect pre-save action.
 *
 * @param {object} row - Redirect review row.
 * @param {string} title - Saved article title.
 * @param {Set<string>} existingKeys - Existing redirect title keys.
 * @returns {object} Redirect pre-save action.
 */
function createRedirectAction(row, title, existingKeys) {
    const redirectTitle = normalizeTitle(row.title);
    const exists =
        row.exists === true ||
        existingKeys.has(normalizeTitleKey(redirectTitle));

    return {
        displayLabel: exists
            ? "Redirect page already exists"
            : `Redirect to [[${title}]]`,
        id: `redirect:${redirectTitle}`,
        exists,
        label: exists
            ? `Redirect: ${redirectTitle} (page already exists)`
            : `Redirect name: ${redirectTitle} to ${title}`,
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
 * @param {Array<object|string>} values - Existing title matches.
 * @returns {Array<object>} Existing title rows.
 */
function createExistingTitleRows(values) {
    return values.map(createExistingTitleRow);
}

/**
 * Normalizes one existing title match.
 *
 * @param {object|string} value - Existing title match.
 * @returns {object} Existing title row.
 */
function createExistingTitleRow(value) {
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
 * @param {string} title - Requested title.
 * @param {Array<object>} rows - Existing title rows.
 * @returns {object|undefined} Existing title row.
 */
function findExistingTitleRow(title, rows) {
    return rows.find((item) => item.key === normalizeTitleKey(title));
}

const CHINESE_VARIANT_PAIRS = [
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
    CHINESE_VARIANT_PAIRS.map(([simplified, traditional]) => [
        traditional,
        simplified,
    ]),
);

/**
 * Builds unique titles to check, including both pure Chinese variants.
 *
 * @param {Array<string>} titles - Requested titles.
 * @returns {Array<string>} Titles to query.
 */
export function getRedirectTitleCheckTitles(titles) {
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
 * @param {string} title - Requested title.
 * @returns {Array<string>} Candidate titles.
 */
function getRedirectTitleCheckVariants(title) {
    return [
        title,
        convertChineseVariantTitle(title, "simplified"),
        convertChineseVariantTitle(title, "traditional"),
    ];
}

/**
 * Normalizes mixed Chinese variant title text to the first detected style.
 *
 * @param {string} title - Requested title.
 * @returns {string} Normalized title.
 */
function normalizeMixedChineseVariantTitle(title) {
    const style = getFirstChineseVariantStyle(title);

    return style == null ? title : convertChineseVariantTitle(title, style);
}

/**
 * Gets the first variant-specific style used in a title.
 *
 * @param {string} title - Requested title.
 * @returns {string|undefined} Variant style.
 */
function getFirstChineseVariantStyle(title) {
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
 * @param {string} title - Requested title.
 * @param {string} style - Target variant style.
 * @returns {string} Converted title.
 */
function convertChineseVariantTitle(title, style) {
    const table =
        style === "simplified"
            ? TRADITIONAL_TO_SIMPLIFIED
            : SIMPLIFIED_TO_TRADITIONAL;

    return Array.from(title)
        .map((char) => table.get(char) || char)
        .join("");
}

/**
 * Gets the compact existence status.
 *
 * @param {boolean} exists - Whether the page exists.
 * @returns {string} Status text.
 */
function getExistenceStatus(exists) {
    return exists ? "Exists" : "Missing";
}

/**
 * Gets entered Chinese localized names.
 *
 * @param {object} form - Submitted dialog form.
 * @returns {Array<string>} Chinese name values.
 */
function getChineseNames(form) {
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
 * @param {*} value - Original title field value.
 * @returns {string} Original title without its language prefix.
 */
function getOriginalName(value) {
    return normalizeTitle(value).replace(
        /^[a-z]{2,3}(?:-[a-z0-9]+)*:\s*/iu,
        "",
    );
}

/**
 * Fetches redirect candidate title existence and conversion matches.
 *
 * @param {object} api - MediaWiki API client.
 * @param {Array<string>} titles - Redirect candidate titles.
 * @returns {Promise<Array<object>>} Page title matches.
 */
export async function fetchExistingPageTitles(api, titles) {
    if (titles.length === 0) {
        return [];
    }

    const data = await api.get({
        action: "query",
        converttitles: "1",
        titles: titles.join("|"),
    });
    const conversionMap = new Map(
        (data?.query?.converted || []).map((item) => [
            normalizeTitleKey(item.from),
            normalizeTitle(item.to),
        ]),
    );
    const existingKeys = new Set(
        Object.values(data?.query?.pages || {})
            .filter((page) => page.missing == null)
            .map((page) => normalizeTitleKey(page.title)),
    );

    return titles.map(normalizeTitle).flatMap(createExistingPageTitleMatch);

    function createExistingPageTitleMatch(title) {
        const convertedTitle =
            conversionMap.get(normalizeTitleKey(title)) || title;
        const exists = existingKeys.has(normalizeTitleKey(convertedTitle));
        const converted =
            normalizeTitleKey(convertedTitle) !== normalizeTitleKey(title);

        if (!exists && !converted) {
            return [];
        }

        return [
            {
                exists,
                requestedTitle: title,
                title: convertedTitle,
            },
        ];
    }
}

/**
 * Runs selected follow-up actions in order.
 *
 * @param {Array<object>} actions - Action rows.
 * @param {object} options - Execution options.
 * @param {object} options.api - MediaWiki API client.
 * @param {object} [options.move] - Optional page move settings.
 * @param {boolean} options.move.enabled - Whether to move the page.
 * @param {boolean} options.move.leaveRedirect - Whether to leave a redirect.
 * @param {string} options.move.to - Destination page title.
 * @param {Function} [options.onMoveComplete] - Successful move callback.
 * @param {Function} [options.onMoveStart] - Move start callback.
 * @param {Function} [options.onActionComplete] - Action success callback.
 * @param {Function} [options.onActionFailed] - Action failure callback.
 * @param {Function} [options.onActionRetry] - Action retry callback.
 * @param {Function} [options.onActionSkipped] - Action skipped callback.
 * @param {Function} [options.onActionStart] - Action start callback.
 * @param {Function} [options.onBeforeWikidataActions] - Pre-Wikidata hook.
 * @param {Function} [options.saveCategory] - Generic category save handler.
 * @param {Function} [options.saveCompanyCategory] - Company category save handler.
 * @param {object} [options.wikidataApi] - Wikidata API client.
 * @param {string} options.title - Saved article title.
 * @returns {Promise<object>} Completed action rows and final title.
 */
export async function runSelectedActions(actions, options) {
    const completed = [];
    const failed = [];
    const originalTitle = normalizeTitle(options.title);
    const moveTitle = normalizeTitle(options.move?.to);
    const shouldMove =
        options.move?.enabled === true &&
        moveTitle !== "" &&
        normalizeTitleKey(moveTitle) !== normalizeTitleKey(originalTitle);
    const finalTitle = shouldMove ? moveTitle : originalTitle;

    if (shouldMove) {
        options.onMoveStart?.(finalTitle);
        await movePage(options.api, originalTitle, finalTitle, {
            leaveRedirect: options.move.leaveRedirect,
        });
        options.onMoveComplete?.(finalTitle);
    }

    for (const phase of getSelectedActionPhases(actions)) {
        if (phase.type === "wikidata") {
            await options.onBeforeWikidataActions?.({
                completed,
                failed,
                title: finalTitle,
            });
        }

        for (const action of phase.actions) {
            let progressFailureHandled = false;

            if (
                action.type === "redirect" &&
                normalizeTitleKey(action.redirectTitle) ===
                    normalizeTitleKey(finalTitle)
            ) {
                action.selected = false;
                options.onActionSkipped?.(action);
                continue;
            }

            options.onActionStart?.(action);
            try {
                await runSelectedActionWithRetry(action, {
                    ...options,
                    onActionProgressFailed() {
                        progressFailureHandled = true;
                    },
                    title: finalTitle,
                });
                action.selected = false;
                completed.push(action);
                options.onActionComplete?.(action);
            } catch (error) {
                action.selected = false;
                failed.push(action);
                if (!progressFailureHandled) {
                    options.onActionFailed?.(action, error);
                }
            }
        }
    }

    return {
        completed,
        failed,
        title: finalTitle,
    };
}

/**
 * Gets selected actions grouped by the execution phases.
 *
 * @param {Array<object>} actions - Action rows.
 * @returns {Array<object>} Selected action phases.
 */
function getSelectedActionPhases(actions) {
    const selected = actions.filter((item) => item.selected);
    const localActions = selected.filter((action) => action.type !== "interwiki");
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
 * @param {object} api - MediaWiki API client.
 * @param {string} from - Current page title.
 * @param {string} to - Destination page title.
 * @param {object} options - Move options.
 * @param {boolean} options.leaveRedirect - Whether to leave a redirect.
 * @returns {Promise<void>} Resolves after the page is moved.
 */
export async function movePage(api, from, to, options) {
    const params = {
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
 * @param {object} action - Action row.
 * @param {object} options - Execution options.
 * @param {object} options.api - MediaWiki API client.
 * @param {object} [options.wikidataApi] - Wikidata API client.
 * @param {string} options.title - Saved article title.
 * @returns {Promise<void>} Resolves after the action succeeds.
 */
async function runSelectedAction(action, options) {
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
        const save =
            normalizeTitle(action.company) === ""
                ? options.saveCategory
                : options.saveCompanyCategory;

        if (save == null) {
            throw new Error("Category save handler is unavailable.");
        }

        await save(action.category, action.text, action.englishName, {
            onProgress(operation, status) {
                const progressAction = {
                    ...action,
                    id:
                        operation === "create"
                            ? action.id
                            : `${action.id}:${operation}`,
                };

                if (status === "running") {
                    options.onActionStart?.(progressAction);
                } else if (status === "complete") {
                    options.onActionComplete?.(progressAction);
                } else if (status === "failed") {
                    options.onActionProgressFailed?.();
                    options.onActionFailed?.(progressAction);
                }
            },
        });
        return;
    }

    if (action.type === "page-edit") {
        await savePageEdit(options.api, action);
    }
}

/**
 * Runs one selected follow-up action with bounded retries.
 *
 * @param {object} action - Action row.
 * @param {object} options - Execution options.
 * @returns {Promise<void>} Resolves after the action succeeds.
 */
async function runSelectedActionWithRetry(action, options) {
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
 * @param {object} api - MediaWiki API client.
 * @param {object} action - Page edit action.
 * @returns {Promise<void>} Resolves after the page is saved.
 */
async function savePageEdit(api, action) {
    const params = {
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
 * @param {object} api - MediaWiki API client.
 * @param {string} wikidataId - Wikidata entity ID.
 * @param {string} title - Chinese Wikipedia article title.
 * @returns {Promise<void>} Resolves after the sitelink is saved.
 */
export async function connectWikidataSitelink(api, wikidataId, title) {
    const params = {
        action: "wbsetsitelink",
        id: wikidataId,
        linksite: "zhwiki",
        linktitle: title,
        summary: addEditSummarySuffix(`see '${buildWikidataSummaryLink(title)}'`),
    };

    await api.postWithToken("csrf", params);
}

/**
 * Builds a summary link to the connected Chinese Wikipedia page.
 *
 * @param {string} title - Chinese Wikipedia page title.
 * @returns {string} Wikitext link suitable for a Wikidata edit summary.
 */
function buildWikidataSummaryLink(title) {
    return `[[w:zh:${title}]]`;
}

/**
 * Creates one redirect without overwriting an existing page.
 *
 * @param {object} api - MediaWiki API client.
 * @param {string} redirectTitle - Redirect page title.
 * @param {string} targetTitle - Redirect target.
 * @returns {Promise<void>} Resolves after the redirect is created.
 */
export async function createRedirect(api, redirectTitle, targetTitle) {
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
 * @param {object} api - MediaWiki API client.
 * @param {string} articleTitle - Article title.
 * @returns {Promise<void>} Resolves after the talk page is updated.
 */
export async function addTalkPageBanner(api, articleTitle) {
    const title = getTalkPageTitle(articleTitle);
    const banner = getTalkPageBanner(articleTitle);
    const data = await api.get({
        action: "query",
        prop: "revisions",
        rvprop: "content",
        rvslots: "main",
        titles: title,
    });
    const page = Object.values(data?.query?.pages || {})[0];
    const text =
        page?.revisions?.[0]?.slots?.main?.content ||
        page?.revisions?.[0]?.["*"] ||
        "";

    if (/WikiProject\s+Video games/iu.test(text)) {
        return;
    }

    const params = {
        action: "edit",
        appendtext: `${text === "" ? "" : "\n\n"}${banner}`,
        summary: addEditSummarySuffix(
            "tagging the {{[[Template:WikiProject Video games|WikiProject Video games]]}} banner",
        ),
        title,
    };

    await api.postWithToken("csrf", params);
}

/**
 * Builds the project banner with an assessment appropriate to the subject.
 *
 * @param {string} title - Subject-page title.
 * @returns {string} Talk-page banner wikitext.
 */
function getTalkPageBanner(title) {
    return /^Category:/iu.test(normalizeTitle(title))
        ? UNASSESSED_TALK_PAGE_BANNER
        : TALK_PAGE_BANNER;
}

/**
 * Gets the canonical talk-page title for an article or category.
 *
 * @param {string} title - Subject-page title.
 * @returns {string} Talk-page title.
 */
function getTalkPageTitle(title) {
    const categoryMatch = normalizeTitle(title).match(/^Category:(.+)$/iu);

    return categoryMatch == null
        ? `Talk:${normalizeTitle(title)}`
        : `Category talk:${categoryMatch[1]}`;
}

/**
 * Normalizes title whitespace.
 *
 * @param {*} value - Raw title value.
 * @returns {string} Normalized title.
 */
function normalizeTitle(value) {
    return String(value || "")
        .trim()
        .replace(/_/gu, " ");
}

/**
 * Builds a case-insensitive key for title comparison.
 *
 * @param {*} value - Raw title value.
 * @returns {string} Comparison key.
 */
function normalizeTitleKey(value) {
    return normalizeTitle(value).toLocaleLowerCase();
}

/**
 * Checks whether a localized name row represents a Chinese name.
 *
 * @param {object} row - Localized name row.
 * @returns {boolean} Whether the row is a Chinese-name redirect candidate.
 */
function isChineseNameRow(row) {
    const hasChineseMarket = ["hans", "hant", "cn", "tw", "hk"].some(
        (market) => row[market] === true,
    );

    return (
        hasChineseMarket || /\p{Script=Han}/u.test(normalizeTitle(row.name))
    );
}

/**
 * Checks whether a title uses Latin text without Han characters.
 *
 * @param {string} title - Article title.
 * @returns {boolean} Whether the title appears to be English.
 */
function isEnglishTitle(title) {
    return /\p{Script=Latin}/u.test(title) && !/\p{Script=Han}/u.test(title);
}
