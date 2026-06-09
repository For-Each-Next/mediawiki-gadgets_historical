/* eslint-disable */

/**
 * Persists and renders article-save progress across navigation.
 */

export const SAVE_PROGRESS_STORAGE_KEY = "create-vg-stub-save-progress";

/**
 * Builds progress rows for an article save and its follow-up actions.
 *
 * @param {string} title - Submitted article title.
 * @param {Array<object>} actions - Pre-save action rows.
 * @param {object} [move] - Optional move action.
 * @returns {object} Save progress state.
 */
export function createSaveProgress(title, actions = [], move = {}) {
  const steps = [
    {
      id: "save",
      label: `Save page: ${title}`,
      status: "pending",
    },
  ];

  if (move.enabled === true) {
    steps.push({
      id: "move",
      label: `Move page to ${move.to}`,
      status: "pending",
    });
  }

  actions
    .filter((action) => action.selected)
    .forEach((action) => {
      steps.push({
        id: action.id,
        label: action.label,
        status: "pending",
      });
    });

  return {
    error: "",
    open: true,
    steps,
    title,
  };
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
    Object.assign(layer.style, {
      alignItems: "center",
      background: "rgb(0 0 0 / 45%)",
      display: "flex",
      inset: "0",
      justifyContent: "center",
      position: "fixed",
      zIndex: "10000",
    });
    documentRef.body.append(layer);
  }

  const statusLabels = {
    complete: "Done",
    failed: "Failed",
    pending: "Waiting",
    running: "Working",
    skipped: "Skipped",
  };
  const rows = progress.steps
    .map(
      (step) =>
        `<li data-status="${step.status}"><strong>${escapeHtml(statusLabels[step.status] || step.status)}</strong> ${escapeHtml(step.label)}</li>`,
    )
    .join("");
  const error = progress.error
    ? `<p style="color:#b32424">${escapeHtml(progress.error)}</p>`
    : "";
  const complete = progress.steps.every((step) =>
    ["complete", "skipped"].includes(step.status),
  );
  const closeButton = complete
    ? '<button type="button" data-action="close" style="float:right">Close</button>'
    : "";

  layer.innerHTML =
    '<div style="background:#fff;border-radius:4px;box-shadow:0 2px 8px rgb(0 0 0 / 30%);max-width:min(90vw,640px);padding:24px;width:100%">' +
    closeButton +
    `<h2>${complete ? "Article creation complete" : "Creating article"}</h2>` +
    `<ol style="display:grid;gap:8px;padding-left:24px">${rows}</ol>` +
    error +
    "</div>";

  layer.querySelector('[data-action="close"]')?.addEventListener("click", () => {
    sessionStorage.removeItem(SAVE_PROGRESS_STORAGE_KEY);
    layer.remove();
  });

  return layer;
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
