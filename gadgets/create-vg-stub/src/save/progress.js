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
 * @returns {object} Save progress state.
 */
export function createSaveProgress(
    title,
    actions = [],
    move = {},
    registration = {},
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
        });

    if (registration.enabled === true) {
        steps.push({
            id: "new-page-list",
            label: `Register new page: ${title}`,
            parts: [{ text: "Register new page: " }, { code: title }],
            status: "pending",
            targetPage: NEW_PAGE_LIST_TITLE,
        });
    }

    return {
        error: "",
        open: true,
        steps,
        title,
    };
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
            step.id === id
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
 * Renders or updates the save progress layer.
 *
 * @param {object} progress - Save progress state.
 * @param {Document} [documentRef] - Document implementation.
 * @returns {HTMLElement} Progress layer.
 */
export function renderSaveProgress(progress, documentRef = document) {
    let layer = documentRef.getElementById("create-vg-stub-save-progress");

    if (layer == null) {
        layer = documentRef.createElement("div");
        layer.id = "create-vg-stub-save-progress";
        const layerStyles = {
            alignItems: "center",
            background:
                "var(--background-color-backdrop-light, rgb(0 0 0 / 45%))",
            display: "flex",
            inset: "0",
            justifyContent: "center",
            position: "fixed",
            zIndex: "10000",
        };

        Object.assign(layer.style, layerStyles);
        documentRef.body.append(layer);
    }

    const statusLabels = {
        complete: "✅",
        failed: "❌",
        pending: "⏸️",
        running: "⏳",
        skipped: "⏭️",
    };
    const rows = progress.steps
        .reduce(
            (groups, step) => addStepToTargetGroup(groups, step, progress),
            [],
        )
        .map((group) => renderProgressGroup(group, statusLabels))
        .join("");
    const error = progress.error
        ? `<p style="color:var(--color-error,#b32424)">${escapeHtml(progress.error)}</p>`
        : "";
    const complete = progress.steps.every((step) =>
        ["complete", "skipped"].includes(step.status),
    );
    const title = complete ? "Article creation complete" : "Creating article";

    layer.innerHTML =
        '<div class="cdx-dialog create-vg-stub-save-progress-dialog" role="dialog" aria-modal="true" aria-labelledby="create-vg-stub-save-progress-title" style="background:var(--background-color-base,#fff);border:1px solid var(--border-color-base,#a2a9b1);box-shadow:var(--box-shadow-drop-medium,0 0.125em 0.5em rgb(0 0 0 / 30%));color:var(--color-base,#202122);display:flex;flex-direction:column;max-height:min(90vh,40em);max-width:min(90vw,40em);width:100%">' +
        '<header class="cdx-dialog__header" style="border-bottom:1px solid var(--border-color-subtle,#c8ccd1);padding:1em 1.5em">' +
        `<h2 class="cdx-dialog__title" id="create-vg-stub-save-progress-title" style="font-size:1.25em;font-weight:700;line-height:1.6;margin:0">${title}</h2>` +
        "</header>" +
        '<div class="cdx-dialog__body" style="overflow:auto;padding:1em 1.5em">' +
        `<div style="display:grid;gap:1em">${rows}</div>` +
        error +
        "</div>" +
        "</div>";

    return layer;
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
 * Renders one target-page progress group.
 *
 * @param {object} group - Target-page progress group.
 * @param {object} statusLabels - Status labels keyed by status.
 * @returns {string} Escaped group markup.
 */
function renderProgressGroup(group, statusLabels) {
    const rows = group.steps
        .map(
            (step) =>
                `<li data-status="${step.status}"><strong>${escapeHtml(statusLabels[step.status] || step.status)}</strong> ${renderStepParts(step)}</li>`,
        )
        .join("");

    return (
        '<section class="create-vg-stub-save-progress-group" style="border:1px solid var(--border-color-subtle,#c8ccd1);padding:0.75em 1em">' +
        `<h3 style="font-size:1em;font-weight:700;line-height:1.6;margin:0 0 0.5em">Target page: <code>${escapeHtml(group.targetPage)}</code></h3>` +
        `<ul style="display:grid;gap:0.5em;margin:0;padding-left:1.5em">${rows}</ul>` +
        "</section>"
    );
}

/**
 * Renders one progress step's semantic text fragments.
 *
 * @param {object} step - Progress step.
 * @returns {string} Escaped progress markup.
 */
function renderStepParts(step) {
    if (!Array.isArray(step.parts)) {
        return escapeHtml(step.label);
    }

    return step.parts
        .map((part) =>
            part.code == null
                ? escapeHtml(part.text || "")
                : `<code>${escapeHtml(part.code)}</code>`,
        )
        .join("");
}

/**
 * Escapes text inserted into progress markup.
 *
 * @param {*} value - Raw value.
 * @returns {string} Escaped HTML.
 */
function escapeHtml(value) {
    return String(value)
        .replace(/&/gu, "&amp;")
        .replace(/</gu, "&lt;")
        .replace(/>/gu, "&gt;")
        .replace(/"/gu, "&quot;")
        .replace(/'/gu, "&#039;");
}
