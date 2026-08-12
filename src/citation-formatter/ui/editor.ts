/**
 * Source-editor command for citation formatting and source management.
 */

import * as editBox from "#shared/edit-box";
import { msg } from "#gadget/i18n/index.ts";
import type * as sourceManager from "#gadget/ui/source-manager.ts";
import { installCitationFormatterStyles } from "#gadget/ui/styles.ts";

const LINK_ID = "ca-citation-formatter";
const LINK_ICON = "article";
const FLOATING_LAUNCHER_ID = "citation-formatter-quick-launch";

/**
 * Adds the unified citation command on MediaWiki edit pages.
 *
 * @param openCitationFormatterDialog - Dialog-opening callback.
 */
export function mountCitationFormatter(
    openCitationFormatterDialog: sourceManager.OpenCitationFormatterDialog,
): void {
    if (
        typeof mw === "undefined" ||
        mw.config.get("wgPageContentModel") !== "wikitext"
    ) {
        return;
    }
    const editor = editBox.getEditBox();
    if (editor == null) {
        return;
    }
    installCitationFormatterStyles();
    mountCitationToolLink(openCitationFormatterDialog);
    mountFloatingCitationLauncher(openCitationFormatterDialog);
}

/**
 * Adds the Citation Formatter command to a MediaWiki portlet once.
 *
 * @param openCitationFormatterDialog - Dialog-opening callback.
 */
function mountCitationToolLink(
    openCitationFormatterDialog: sourceManager.OpenCitationFormatterDialog,
): void {
    if (document.getElementById(LINK_ID) != null) {
        return;
    }
    const link = addCitationLink("p-cactions") || addCitationLink("p-tb");
    addToolClickHandler(link, openCitationFormatterDialog);
}

/**
 * Adds the localized persistent citation launcher.
 *
 * @param openCitationFormatterDialog - Dialog-opening callback.
 */
function mountFloatingCitationLauncher(
    openCitationFormatterDialog: sourceManager.OpenCitationFormatterDialog,
): void {
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
    addToolClickHandler(launcher, openCitationFormatterDialog);
    (document.body || document.documentElement).append(launcher);
}

/**
 * Opens the formatter from an action-style portlet link.
 *
 * @param launcher - Launcher value.
 * @param openCitationFormatterDialog - Dialog-opening callback.
 */
function addToolClickHandler(
    launcher: HTMLElement | null,
    openCitationFormatterDialog: sourceManager.OpenCitationFormatterDialog,
): void {
    const openOnClick = function openOnClick(event: Event): void {
        event.preventDefault();
        if (event.currentTarget instanceof HTMLElement) {
            event.currentTarget.focus({ preventScroll: true });
        }
        const editor = editBox.getEditBox();
        if (editor == null) {
            void mw.notify(msg("tool.editorUnavailable"), { type: "error" });
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
    void mw.notify(msg("tool.startupError", { error: message }), {
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
    const addPortletLink = mw.util.addPortletLink as unknown as (
        portletId: string,
        options: {
            href: string;
            icon: string;
            id: string;
            text: string;
            tooltip: string;
        },
    ) => HTMLElement | null;
    const item = addPortletLink(portlet, {
        href: "#",
        icon: LINK_ICON,
        id: LINK_ID,
        text: msg("tool.name"),
        tooltip: msg("tool.description"),
    });
    const anchor =
        item?.matches("a") === true ? item : item?.querySelector("a");
    const launcher = anchor instanceof HTMLElement ? anchor : item;
    launcher?.setAttribute("role", "button");
    return launcher;
}
