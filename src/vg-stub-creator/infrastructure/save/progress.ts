/**
 * Persists and renders article-save progress across navigation.
 */

import { NEW_PAGE_LIST_TITLE } from "#stub/handlers/new-page-list.ts";
import { msg, msgParts } from "#stub/i18n";

type MessageId = Parameters<typeof msgParts>[0];

export const SAVE_PROGRESS_STORAGE_KEY = "vg-stub-creator-save-progress";

/**
 * Builds progress rows for an article save and its follow-up actions.
 *
 * @param title - Submitted article title.
 * @param actions - Pre-save action rows.
 * @param move - Optional move action.
 * @param registration - Optional new-page-list action.
 * @param progressGroups - Checked pre-save progress
 * groups.
 * @returns Save progress state.
 */
export function createSaveProgress(
    title: string,
    actions: Array<any> = [],
    move: any = {},
    registration: any = {},
    progressGroups: Array<any> = [],
): any {
    const steps = [buildSaveProgressStep(title)];

    if (move.enabled === true) {
        steps.push(buildMoveProgressStep(title, move));
    }

    const checklistSteps = buildChecklistProgressSteps(progressGroups);

    if (checklistSteps.length > 0) {
        steps.push(...checklistSteps);
    } else {
        steps.push(...buildSelectedActionProgressSteps(actions, title));
        steps.push(...buildRegistrationProgressSteps(registration));
    }

    return {
        error: "",
        open: true,
        steps,
        title,
    };
}

/** Builds the primary article-save progress step. */
function buildSaveProgressStep(title: string): any {
    return {
        id: "save",
        label: msg("progress.savePage", { title }),
        parts: buildProgressParts("progress.savePage", {
            title: { code: title },
        }),
        status: "pending",
        targetPage: title,
    };
}

/** Builds an optional article-move progress step. */
function buildMoveProgressStep(title: string, move: any): any {
    return {
        id: "move",
        label: msg("progress.movePage", { title: move.to }),
        parts: buildProgressParts("progress.movePage", {
            title: { code: move.to },
        }),
        status: "pending",
        targetPage: title,
    };
}

/** Builds progress steps for selected follow-up actions. */
function buildSelectedActionProgressSteps(actions, title): Array<any> {
    return actions
        .filter((action) => action.selected)
        .flatMap(function callback(action) {
            const step = {
                id: action.id,
                label: action.label,
                parts: buildActionProgressParts(action, title),
                status: "pending",
                targetPage: getActionTargetPage(action, title),
            };

            return [step, ...buildBundledActionProgressSteps(action)];
        });
}

/** Builds the optional new-page-list registration progress step. */
function buildRegistrationProgressSteps(registration): Array<any> {
    if (registration.enabled !== true) {
        return [];
    }

    return [
        {
            id: "new-page-list",
            label: msg("progress.registerNewPage"),
            parts: [{ text: msg("progress.registerNewPage") }],
            status: "pending",
            targetPage: NEW_PAGE_LIST_TITLE,
        },
    ];
}

/**
 * Gets progress steps grouped by the wiki page they update.
 *
 * @param progress - Save progress state.
 * @returns Target-page progress groups.
 */
export function getSaveProgressGroups(progress: any): Array<any> {
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
 * @param progress - Save progress state.
 * @returns Whether every step has a terminal status.
 */
export function isSaveProgressComplete(progress: any): boolean {
    return (progress?.steps || []).every(function callback(step) {
        return ["complete", "failed", "skipped"].includes(step.status);
    });
}

/**
 * Finds the wiki page updated by a follow-up action.
 *
 * @param action - Selected follow-up action.
 * @param title - Submitted article title.
 * @returns Target page title.
 */
function getActionTargetPage(action: any, title: string): string {
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
 * @param action - Selected follow-up action.
 * @param title - Submitted article title.
 * @returns Text and code fragments.
 */
function buildActionProgressParts(
    action: any,
    title: string,
): Array<any> | undefined {
    if (action.type === "interwiki") {
        return buildConnectionProgressParts(title, action.wikidataId);
    }

    if (action.type === "redirect") {
        return buildRedirectProgressParts(action, title);
    }

    if (action.type === "talk-banner") {
        return buildTalkBannerProgressParts(title);
    }

    if (action.type === "category") {
        return buildCategoryProgressParts(action);
    }

    if (action.type === "page-edit") {
        return buildPageEditProgressParts(action);
    }

    return undefined;
}

/** Builds connection progress fragments. */
function buildConnectionProgressParts(title, wikidataId): Array<any> {
    return buildProgressParts("progress.connectTo", {
        target: { code: wikidataId },
        title: { code: title },
    });
}

/** Builds redirect progress fragments. */
function buildRedirectProgressParts(action, title): Array<any> {
    return buildProgressParts("progress.redirectTo", {
        redirect: { code: action.redirectTitle },
        title: { code: title },
    });
}

/** Builds talk-banner progress fragments. */
function buildTalkBannerProgressParts(title): Array<any> {
    return buildProgressParts("progress.addTalkBanner", {
        title: { code: `Talk:${title}` },
    });
}

/** Builds category progress fragments. */
function buildCategoryProgressParts(action): Array<any> {
    return buildProgressParts("progress.createCategory", {
        title: { code: `Category:${action.category}` },
    });
}

/** Builds page-edit progress fragments. */
function buildPageEditProgressParts(action): Array<any> {
    const id = action.create ? "progress.createPage" : "progress.editPage";
    return buildProgressParts(id, {
        title: { code: action.title },
    });
}

/** Converts translated message parts to progress display fragments. */
function buildProgressParts(
    id: MessageId,
    values: Record<string, any>,
): Array<any> {
    return msgParts<any>(id, values).map(function callback(part) {
        return typeof part === "string" ? { text: part } : part;
    });
}

/**
 * Updates one progress row.
 *
 * @param progress - Save progress state.
 * @param id - Progress row ID.
 * @param status - New status.
 * @returns Updated progress state.
 */
export function updateSaveProgress(
    progress: any,
    id: string,
    status: string,
): any {
    return {
        ...progress,
        steps: progress.steps.map(function callback(step) {
            return selectValue(
                step.id === id ||
                    (id === "new-page-list" &&
                        step.id?.endsWith(":register-new-page")),
                function trueBranch() {
                    return {
                        ...step,
                        status,
                    };
                },
                function falseBranch() {
                    return step;
                },
            );
        }),
    };
}

/**
 * Stores progress in session storage.
 *
 * @param progress - Save progress state.
 * @param storage - Session storage implementation.
 * @returns */
export function storeSaveProgress(
    progress: any,
    storage: Storage = sessionStorage,
): void {
    storage.setItem(SAVE_PROGRESS_STORAGE_KEY, JSON.stringify(progress));
}

/**
 * Reads stored progress.
 *
 * @param storage - Session storage implementation.
 * @returns Stored save progress.
 */
export function readSaveProgress(
    storage: Storage = sessionStorage,
): any | undefined {
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
 * @param groups - Checked pre-save groups.
 * @returns Progress rows.
 */
function buildChecklistProgressSteps(groups: Array<any>): Array<any> {
    if (!Array.isArray(groups)) {
        return [];
    }

    return groups.flatMap(function callback(group) {
        const targetPage = normalizeActionText(group?.title);

        if (targetPage === "" || !Array.isArray(group?.rows)) {
            return [];
        }

        return group.rows.flatMap(function callback(row) {
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
 * @param row - Checked pre-save row.
 * @returns Progress step ID.
 */
function getChecklistProgressStepId(row: any): string {
    if (row?.type === "registration") {
        return "new-page-list";
    }

    return normalizeActionText(row?.key || row?.id);
}

/**
 * Builds progress rows for work bundled inside one selected action.
 *
 * @param action - Selected follow-up action.
 * @returns Bundled progress rows.
 */
function buildBundledActionProgressSteps(action: any): Array<any> {
    if (
        action.type !== "category" ||
        normalizeActionText(action.company) === ""
    ) {
        return [];
    }

    const categoryTitle =
        action.pageTitle || `Category:${normalizeActionText(action.category)}`;
    const steps = [buildBundledTalkProgressStep(action, categoryTitle)];
    const wikidataId = normalizeActionText(action.wikidataId);
    const englishName = normalizeActionText(action.englishName);

    steps.push(
        ...buildBundledWikidataProgressSteps({
            action,
            categoryTitle,
            englishName,
            wikidataId,
        }),
    );

    return steps;
}

/** Builds a bundled category talk-banner progress step. */
function buildBundledTalkProgressStep(action, categoryTitle): any {
    const title = `Category talk:${normalizeActionText(action.category)}`;
    return {
        id: `${action.id}:talk-banner`,
        label: msg("progress.addTalkBanner", { title }),
        parts: buildProgressParts("progress.addTalkBanner", {
            title: { code: title },
        }),
        status: "pending",
        targetPage: categoryTitle,
    };
}

/** Builds bundled category Wikidata progress steps. */
function buildBundledWikidataProgressSteps(options): Array<any> {
    if (options.wikidataId !== "") {
        return [
            {
                id: `${options.action.id}:wikidata`,
                label: buildWikidataProgressLabel(options),
                parts: buildProgressParts("progress.connectTo", {
                    target: { code: options.wikidataId },
                    title: { code: options.categoryTitle },
                }),
                status: "pending",
                targetPage: options.categoryTitle,
            },
        ];
    }
    if (options.englishName !== "") {
        return [
            {
                id: `${options.action.id}:wikidata`,
                label: msg("progress.connectCategory"),
                parts: [{ text: msg("progress.connectCategory") }],
                status: "pending",
                targetPage: options.categoryTitle,
            },
        ];
    }

    return [];
}

/** Builds the category Wikidata action label. */
function buildWikidataProgressLabel(options): string {
    return msg("progress.connectTo", {
        target: options.wikidataId,
        title: options.categoryTitle,
    });
}

/**
 * Adds a progress step to its target-page group.
 *
 * @param groups - Existing target-page groups.
 * @param step - Progress step.
 * @param progress - Save progress state.
 * @returns Updated target-page groups.
 */
function addStepToTargetGroup(
    groups: Array<any>,
    step: any,
    progress: any,
): Array<any> {
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
 * @param targetPage - Progress group target page.
 * @returns Whether the group targets Wikidata.
 */
function isWikidataTargetPage(targetPage: string): boolean {
    return normalizeActionText(targetPage).startsWith("Wikidata:");
}

/**
 * Handles get stored step target page.
 *
 * Infers target pages for progress stored before target pages were
 * persisted.
 *
 * @param step - Stored progress step.
 * @param progress - Save progress state.
 * @returns Target page title.
 *
 */
function getStoredStepTargetPage(step: any, progress: any): string {
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
 * @param value - Raw action field.
 * @returns Trimmed text.
 */
function normalizeActionText(value: unknown): string {
    return String(value || "").trim();
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
