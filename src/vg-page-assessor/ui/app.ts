/**
 * Mounts the assessor UI in supported MediaWiki pages.
 */

import type { PageAssessorRuntime } from "#gadget/contracts/dialog.ts";
import {
    createAssessmentDialog,
    loadRegistrationPanel,
} from "#gadget/ui/dialog-controller.ts";
import { setDialogStatus } from "#gadget/ui/dialog-view.ts";
import { msg } from "#gadget/i18n/index.ts";

const DIALOG_CSS = __ASSESS_VG_PAGE_DIALOG_CSS__;

let runtime: PageAssessorRuntime | null = null;

/**
 * Starts the dialog UI with composed workflow dependencies.
 */
export function startPageAssessor(dependencies: PageAssessorRuntime): void {
    if (runtime != null) {
        return;
    }

    runtime = dependencies;
    void mw.loader.using(
        ["codex-styles", "mediawiki.api", "mediawiki.Title", "mediawiki.util"],
        init,
    );
}

/**
 * Mounts the toolbox action after MediaWiki is ready.
 */
function init(): void {
    const dbName = mw.config.get("wgDBname");
    const namespaceNumber = mw.config.get("wgNamespaceNumber");
    const pageName = mw.config.get("wgPageName");
    logStep("init start", {
        dbName,
        namespaceNumber,
        pageName,
    });

    if (dbName !== "zhwiki" || namespaceNumber < 0) {
        logStep("init skipped");
        return;
    }

    addStyles();
    logStep("init adding toolbox link");
    addToolboxLink();
}

function addToolboxLink(): void {
    const link = mw.util.addPortletLink(
        "p-tb",
        "#",
        msg("tool.name"),
        "t-assess-vg-page",
    );
    link?.addEventListener("click", handleToolboxClick);
}

function handleToolboxClick(event: Event): void {
    event.preventDefault();
    logStep("toolbox link clicked");
    openDialog().catch(handleOpenDialogError);
}

function handleOpenDialogError(error: unknown): void {
    logStep("openDialog failed", { error });
    void mw.notify(getErrorMessage(error), { type: "error" });
}

async function openDialog(): Promise<void> {
    logStep("openDialog start");
    const assessorRuntime = getRuntime();
    const api = new mw.Api();
    const pageName = mw.config.get("wgPageName");
    const currentTitle = mw.Title.newFromText(pageName);

    if (currentTitle == null) {
        throw new Error(`Unable to resolve the current page: ${pageName}`);
    }

    const state = await assessorRuntime.loadDialogState(api, currentTitle);
    const dialog = createAssessmentDialog(state, assessorRuntime);

    document.body.append(dialog);
    dialog.showModal();
    logStep("openDialog shown");

    const handleError = handleRegistrationLoadError.bind(
        null,
        dialog,
        assessorRuntime,
    );
    loadRegistrationPanel(dialog, state, assessorRuntime).catch(handleError);
}

function handleRegistrationLoadError(
    dialog: HTMLDialogElement,
    assessorRuntime: PageAssessorRuntime,
    error: unknown,
): void {
    assessorRuntime.logStep("loadNewPageListState failed", { error });
    const message = getErrorMessage(error);

    setDialogStatus(dialog, message, true);
    assessorRuntime.logStep("status updated", {
        isError: true,
        text: message,
    });
}

function addStyles(): void {
    if (document.getElementById("avgp-styles") != null) {
        logStep("addStyles skipped: already present");
        return;
    }

    const style = document.createElement("style");

    style.id = "avgp-styles";
    style.textContent = DIALOG_CSS;
    document.head.append(style);
    logStep("addStyles done");
}

function getRuntime(): PageAssessorRuntime {
    if (runtime == null) {
        throw new Error("Page assessor UI has not been composed.");
    }

    return runtime;
}

function getErrorMessage(error: unknown): string {
    return error instanceof Error ? error.message : String(error);
}

function logStep(step: string, details?: unknown): void {
    getRuntime().logStep(step, details);
}
