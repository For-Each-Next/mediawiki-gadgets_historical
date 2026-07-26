/**
 * Source-editor command for citation formatting and source management.
 */

import { editBox } from "#shared";
import { openSourceManager } from "#me/ui/source-manager.ts";
import { addManagerStyles } from "#me/ui/styles.ts";

const LINK_ID = "ca-citation-formatter";
const FLOATING_BUTTON_ID = "citation-formatter-quick-launch";

/**
 * Adds the unified citation command on MediaWiki edit pages.
 */
export function mountCitationFormatter(): void {
    if (typeof mw === "undefined") {
        return;
    }
    const editor = editBox.getEditBox();
    if (editor == null) {
        return;
    }
    addManagerStyles();
    mountCitationToolLink(editor);
    mountFloatingCitationButton(editor);
}

/** Adds the citation formatter and source-manager command once. */
function mountCitationToolLink(editor: editBox.EditBox): void {
    if (document.getElementById(LINK_ID) != null) {
        return;
    }
    const label = "Citation formatter";
    const tooltip = "Format citations and insert or edit citation sources";
    const link =
        addCitationLink("p-cactions", label, LINK_ID, tooltip) ||
        addCitationLink("p-tb", label, LINK_ID, tooltip);
    addToolClickHandler(link, editor);
}

/** Adds a persistent bottom-right launcher once. */
function mountFloatingCitationButton(editor: editBox.EditBox): void {
    if (document.getElementById(FLOATING_BUTTON_ID) != null) {
        return;
    }
    const button = document.createElement("button");
    button.id = FLOATING_BUTTON_ID;
    button.className = "cf-quick-launch";
    button.type = "button";
    button.textContent = "Cite";
    button.title = "Open Citation formatter";
    button.setAttribute("aria-label", "Open Citation formatter");
    addToolClickHandler(button, editor);
    (document.body || document.documentElement).append(button);
}

/** Opens the unified citation dialog from one launcher. */
function addToolClickHandler(
    launcher: HTMLElement | null,
    editor: editBox.EditBox,
): void {
    const openOnClick = function openOnClick(event: Event): void {
        event.preventDefault();
        if (event.currentTarget instanceof HTMLElement) {
            event.currentTarget.focus({ preventScroll: true });
        }
        void openSourceManager(editor).catch(notifyToolFailure);
    };
    launcher?.addEventListener("click", openOnClick);
}

/**
 * Reports a unified citation-tool startup failure.
 *
 * @param error - Rejected startup value.
 */
function notifyToolFailure(error: unknown): void {
    const message = error instanceof Error ? error.message : String(error);
    mw.notify(`Citation formatter failed: ${message}`, { type: "error" });
}

/**
 * Adds the command to one MediaWiki portlet.
 *
 * @param portlet - Portlet identifier.
 * @returns Added command link.
 */
function addCitationLink(
    portlet: string,
    label: string,
    id: string,
    tooltip: string,
): HTMLElement | null {
    const result = mw.util.addPortletLink(portlet, "#", label, id, tooltip);
    return result;
}
