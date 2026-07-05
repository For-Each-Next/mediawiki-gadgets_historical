/* eslint-disable */

/**
 * Persists and renders article-save progress across navigation.
 */

import { NEW_PAGE_LIST_TITLE } from "../handlers/new-page-list.js";

export const SAVE_PROGRESS_STORAGE_KEY = "create-vg-stub-save-progress";

/**
 * Builds progress rows for an article save and its follow-up actions.
 *
 * @param {string} title - Submitted article title.
 * @param {Array<object>} actions - Pre-save action rows.
 * @param {object} [move] - Optional move action.
 * @param {object} [registration] - Optional new-page-list action.
 * @param {Array<object>} [progressGroups] - Checked pre-save progress groups.
 * @returns {object} Save progress state.
 */
export function createSaveProgress(
    title,
    actions = [],
    move = {},
    registration = {},
    progressGroups = [],
) {
    const steps = [
        {
            id: "save",
            label: `Save page: ${title}`,
            parts: [{ text: "Save page: " }, { code: title }],
            status: "pending",
            targetPage: title,
        },
    ];

    if (move.enabled === true) {
        steps.push({
            id: "move",
            label: `Move page to ${move.to}`,
            parts: [{ text: "Move page to " }, { code: move.to }],
            status: "pending",
            targetPage: title,
        });
    }

    const checklistSteps = buildChecklistProgressSteps(progressGroups);

    if (checklistSteps.length > 0) {
        steps.push(...checklistSteps);
    } else {
        actions
            .filter((action) => action.selected)
            .forEach((action) => {
                steps.push({
                    id: action.id,
                    label: action.label,
                    parts: buildActionProgressParts(action, title),
                    status: "pending",
                    targetPage: getActionTargetPage(action, title),
                });
                steps.push(...buildBundledActionProgressSteps(action));
            });

        if (registration.enabled === true) {
            steps.push({
                id: "new-page-list",
                label: "Register on WikiProject new-page list",
                parts: [{ text: "Register on WikiProject new-page list" }],
                status: "pending",
                targetPage: NEW_PAGE_LIST_TITLE,
            });
        }
    }

    return {
        error: "",
        open: true,
        steps,
        title,
    };
}

/**
 * Gets progress steps grouped by the wiki page they update.
 *
 * @param {object} progress - Save progress state.
 * @returns {Array<object>} Target-page progress groups.
 */
export function getSaveProgressGroups(progress) {
    const groups = (progress?.steps || []).reduce(
        (groups, step) => addStepToTargetGroup(groups, step, progress),
        [],
    );

    return [
        ...groups.filter((group) => !isWikidataTargetPage(group.targetPage)),
        ...groups.filter((group) => isWikidataTargetPage(group.targetPage)),
    ];
}

/**
 * Checks whether all progress steps have finished.
 *
 * @param {object} progress - Save progress state.
 * @returns {boolean} Whether every step has a terminal status.
 */
export function isSaveProgressComplete(progress) {
    return (progress?.steps || []).every((step) =>
        ["complete", "failed", "skipped"].includes(step.status),
    );
}

/**
 * Finds the wiki page updated by a follow-up action.
 *
 * @param {object} action - Selected follow-up action.
 * @param {string} title - Submitted article title.
 * @returns {string} Target page title.
 */
function getActionTargetPage(action, title) {
    if (action.type === "interwiki") {
        return action.wikidataId ? `Wikidata:${action.wikidataId}` : title;
    }

    if (action.type === "redirect") {
        return action.pageTitle || action.redirectTitle || title;
    }

    if (action.type === "talk-banner") {
        return `Talk:${action.pageTitle || title}`;
    }

    if (action.type === "category") {
        return action.pageTitle || `Category:${action.category}`;
    }

    if (action.type === "page-edit") {
        return action.pageTitle || action.title || title;
    }

    return action.pageTitle || title;
}

/**
 * Builds semantic progress text for one follow-up action.
 *
 * @param {object} action - Selected follow-up action.
 * @param {string} title - Submitted article title.
 * @returns {Array<object>|undefined} Text and code fragments.
 */
function buildActionProgressParts(action, title) {
    if (action.type === "interwiki") {
        return [
            { text: "Connect " },
            { code: title },
            { text: " to " },
            { code: action.wikidataId },
        ];
    }

    if (action.type === "redirect") {
        return [
            { text: "Redirect name: " },
            { code: action.redirectTitle },
            { text: " to " },
            { code: title },
        ];
    }

    if (action.type === "talk-banner") {
        return [
            { text: "Add WikiProject Video games banner to " },
            { code: `Talk:${title}` },
        ];
    }

    if (action.type === "category") {
        return [
            { text: "Create category: " },
            { code: `Category:${action.category}` },
        ];
    }

    if (action.type === "page-edit") {
        return [
            { text: `${action.create ? "Create" : "Edit"} page: ` },
            { code: action.title },
        ];
    }

    return undefined;
}

/**
 * Updates one progress row.
 *
 * @param {object} progress - Save progress state.
 * @param {string} id - Progress row ID.
 * @param {string} status - New status.
 * @returns {object} Updated progress state.
 */
export function updateSaveProgress(progress, id, status) {
    return {
        ...progress,
        steps: progress.steps.map((step) =>
            step.id === id ||
            (id === "new-page-list" &&
                step.id?.endsWith(":register-new-page"))
                ? {
                      ...step,
                      status,
                  }
                : step,
        ),
    };
}

/**
 * Stores progress in session storage.
 *
 * @param {object} progress - Save progress state.
 * @param {Storage} [storage] - Session storage implementation.
 * @returns {void}
 */
export function storeSaveProgress(progress, storage = sessionStorage) {
    storage.setItem(SAVE_PROGRESS_STORAGE_KEY, JSON.stringify(progress));
}

/**
 * Reads stored progress.
 *
 * @param {Storage} [storage] - Session storage implementation.
 * @returns {object|undefined} Stored save progress.
 */
export function readSaveProgress(storage = sessionStorage) {
    const item = storage.getItem(SAVE_PROGRESS_STORAGE_KEY);

    if (item == null) {
        return undefined;
    }

    try {
        return JSON.parse(item);
    } catch (_error) {
        storage.removeItem(SAVE_PROGRESS_STORAGE_KEY);
        return undefined;
    }
}

/**
 * Builds progress rows from checked pre-save groups.
 *
 * @param {Array<object>} groups - Checked pre-save groups.
 * @returns {Array<object>} Progress rows.
 */
function buildChecklistProgressSteps(groups) {
    if (!Array.isArray(groups)) {
        return [];
    }

    return groups.flatMap((group) => {
        const targetPage = normalizeActionText(group?.title);

        if (targetPage === "" || !Array.isArray(group?.rows)) {
            return [];
        }

        return group.rows.flatMap((row) => {
            const id = getChecklistProgressStepId(row);
            const label = normalizeActionText(row?.label);

            if (id === "" || label === "") {
                return [];
            }

            return [
                {
                    id,
                    label,
                    parts: [{ text: label }],
                    status: "pending",
                    targetPage,
                },
            ];
        });
    });
}

/**
 * Gets the progress ID for one checked pre-save row.
 *
 * @param {object} row - Checked pre-save row.
 * @returns {string} Progress step ID.
 */
function getChecklistProgressStepId(row) {
    if (row?.type === "registration") {
        return "new-page-list";
    }

    return normalizeActionText(row?.key || row?.id);
}

/**
 * Builds progress rows for work bundled inside one selected action.
 *
 * @param {object} action - Selected follow-up action.
 * @returns {Array<object>} Bundled progress rows.
 */
function buildBundledActionProgressSteps(action) {
    if (
        action.type !== "category" ||
        normalizeActionText(action.company) === ""
    ) {
        return [];
    }

    const categoryTitle =
        action.pageTitle ||
        `Category:${normalizeActionText(action.category)}`;
    const steps = [];
    const wikidataId = normalizeActionText(action.wikidataId);
    const englishName = normalizeActionText(action.englishName);

    steps.push({
        id: `${action.id}:talk-banner`,
        label: `Add WikiProject Video games banner to Category talk:${normalizeActionText(action.category)}`,
        parts: [
            { text: "Add WikiProject Video games banner to " },
            { code: `Category talk:${normalizeActionText(action.category)}` },
        ],
        status: "pending",
        targetPage: categoryTitle,
    });

    if (wikidataId !== "") {
        steps.push({
            id: `${action.id}:wikidata`,
            label: `Connect ${categoryTitle} to ${wikidataId}`,
            parts: [
                { text: "Connect " },
                { code: categoryTitle },
                { text: " to " },
                { code: wikidataId },
            ],
            status: "pending",
            targetPage: categoryTitle,
        });
    } else if (englishName !== "") {
        steps.push({
            id: `${action.id}:wikidata`,
            label: "Connect matching Wikidata category item",
            parts: [{ text: "Connect matching Wikidata category item" }],
            status: "pending",
            targetPage: categoryTitle,
        });
    }

    return steps;
}

/**
 * Adds a progress step to its target-page group.
 *
 * @param {Array<object>} groups - Existing target-page groups.
 * @param {object} step - Progress step.
 * @param {object} progress - Save progress state.
 * @returns {Array<object>} Updated target-page groups.
 */
function addStepToTargetGroup(groups, step, progress) {
    const targetPage =
        step.targetPage || getStoredStepTargetPage(step, progress);
    const group = groups.find((item) => item.targetPage === targetPage);

    if (group == null) {
        groups.push({
            steps: [step],
            targetPage,
        });
    } else {
        group.steps.push(step);
    }

    return groups;
}

/**
 * Checks whether a progress group targets Wikidata.
 *
 * @param {string} targetPage - Progress group target page.
 * @returns {boolean} Whether the group targets Wikidata.
 */
function isWikidataTargetPage(targetPage) {
    return normalizeActionText(targetPage).startsWith("Wikidata:");
}

/**
 * Infers target pages for progress stored before target pages were persisted.
 *
 * @param {object} step - Stored progress step.
 * @param {object} progress - Save progress state.
 * @returns {string} Target page title.
 */
function getStoredStepTargetPage(step, progress) {
    if (step.id === "new-page-list") {
        return NEW_PAGE_LIST_TITLE;
    }

    if (step.id === "talk-banner") {
        return `Talk:${progress.title}`;
    }

    if (step.id?.startsWith("category:")) {
        return `Category:${step.id.slice("category:".length)}`;
    }

    if (step.id?.startsWith("redirect:")) {
        return step.id.slice("redirect:".length);
    }

    if (step.id?.startsWith("page-edit:")) {
        return step.id.slice("page-edit:".length);
    }

    return progress.title;
}

/**
 * Normalizes action text values.
 *
 * @param {unknown} value - Raw action field.
 * @returns {string} Trimmed text.
 */
function normalizeActionText(value) {
    return String(value || "").trim();
}
