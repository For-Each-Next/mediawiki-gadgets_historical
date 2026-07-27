/**
 * Source-editor command for citation formatting and source management.
 */

import { editBox } from "#shared";
import { msg } from "#me/i18n/index.ts";
import { openCitationFormatterDialog } from "#me/ui/source-manager.ts";
import { installCitationFormatterStyles } from "#me/ui/styles.ts";

const LINK_ID = "ca-citation-formatter";
const FLOATING_LAUNCHER_ID = "citation-formatter-quick-launch";

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
    installCitationFormatterStyles();
    mountCitationToolLink();
    mountFloatingCitationLauncher();
}

/** Adds the Citation Formatter command to a MediaWiki portlet once. */
function mountCitationToolLink(): void {
    if (document.getElementById(LINK_ID) != null) {
        return;
    }
    const link = addCitationLink("p-cactions") || addCitationLink("p-tb");
    addToolClickHandler(link);
}

/** Adds the localized persistent citation launcher. */
function mountFloatingCitationLauncher(): void {
    if (document.getElementById(FLOATING_LAUNCHER_ID) != null) {
        return;
    }
    const launcher = document.createElement("button");
    launcher.id = FLOATING_LAUNCHER_ID;
    launcher.className = "cf-citation-launcher";
    launcher.type = "button";
    launcher.textContent = msg("tool.quickLaunch");
    launcher.title = msg("tool.open");
    launcher.setAttribute("aria-label", msg("tool.open"));
    addToolClickHandler(launcher);
    (document.body || document.documentElement).append(launcher);
}

/** Opens the formatter from an action-style portlet link. */
function addToolClickHandler(launcher: HTMLElement | null): void {
    const openOnClick = function openOnClick(event: Event): void {
        event.preventDefault();
        if (event.currentTarget instanceof HTMLElement) {
            event.currentTarget.focus({ preventScroll: true });
        }
        const editor = editBox.getEditBox();
        if (editor == null) {
            mw.notify(msg("tool.editorUnavailable"), { type: "error" });
            return;
        }
        void openCitationFormatterDialog(editor).catch(notifyToolFailure);
    };
    launcher?.addEventListener("click", openOnClick);
    if (launcher != null && !(launcher instanceof HTMLButtonElement)) {
        launcher.addEventListener("keydown", function openOnSpace(event) {
            if (event.key === " ") {
                openOnClick(event);
            }
        });
    }
}

/**
 * Reports a unified citation-tool startup failure.
 *
 * @param error - Rejected startup value.
 */
function notifyToolFailure(error: unknown): void {
    const message = error instanceof Error ? error.message : String(error);
    mw.notify(msg("tool.startupError", { error: message }), {
        type: "error",
    });
}

/**
 * Adds the command to one MediaWiki portlet.
 *
 * @param portlet - Portlet identifier.
 * @returns The actionable anchor added to the portlet.
 */
function addCitationLink(portlet: string): HTMLElement | null {
    const item = mw.util.addPortletLink(
        portlet,
        "#",
        msg("tool.name"),
        LINK_ID,
        msg("tool.description"),
    );
    const anchor =
        item?.matches("a") === true ? item : item?.querySelector("a");
    const launcher = anchor instanceof HTMLElement ? anchor : item;
    launcher?.setAttribute("role", "button");
    return launcher;
}
