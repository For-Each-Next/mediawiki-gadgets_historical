/**
 * Mounts the assessor UI in supported MediaWiki pages.
 */

import type { PageAssessorRuntime } from "#gadget/contracts/dialog.ts";
import {
    ASSESSMENT_DIALOG_STYLES,
    createAssessmentDialogComponent,
} from "#gadget/ui/dialogs/assessment-dialog.ts";
import * as Comparison from "#gadget/ui/components/wikitext-comparison.ts";
import {
    LOADING_DIALOG_STYLES,
    createLoadingDialogComponent,
} from "#gadget/ui/dialogs/loading-dialog.ts";
import {
    type ResourceLoaderRequire,
    type VueApp,
    registerPageAssessorComponents,
} from "#gadget/ui/codex.ts";
import { msg } from "#gadget/i18n/index.ts";

const HOST_ID = "avgp-dialog-host";
const STYLE_ID = "avgp-styles";

let activeDialogCleanup: (() => void) | null = null;
let dialogGeneration = 0;
let runtime: PageAssessorRuntime | null = null;

/**
 * Starts the dialog UI with composed workflow dependencies.
 *
 * @param dependencies - Dependencies value.
 */
export function startPageAssessor(dependencies: PageAssessorRuntime): void {
    if (runtime != null) {
        return;
    }

    runtime = dependencies;
    void mw.loader.using(
        ["mediawiki.api", "mediawiki.Title", "mediawiki.util"],
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

    logStep("init start", { dbName, namespaceNumber, pageName });
    if (dbName !== "zhwiki" || namespaceNumber < 0) {
        logStep("init skipped");
        return;
    }

    installDialogStyles();
    addToolboxLink();
}

function addToolboxLink(): void {
    logStep("init adding toolbox link");
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
    const generation = ++dialogGeneration;
    const assessorRuntime = getRuntime();
    const api = new mw.Api();
    const pageName = mw.config.get("wgPageName");
    const currentTitle = mw.Title.newFromText(pageName);

    logStep("openDialog start");
    if (currentTitle == null) {
        throw new Error(`Unable to resolve the current page: ${pageName}`);
    }

    const statePromise = assessorRuntime.loadDialogState(api, currentTitle);
    const require = await loadVueAndCodex();
    if (generation !== dialogGeneration) {
        return;
    }

    activeDialogCleanup?.();
    mountLoadingDialog(require);
    let state: Awaited<ReturnType<PageAssessorRuntime["loadDialogState"]>>;
    try {
        state = await statePromise;
    } catch (error) {
        if (generation !== dialogGeneration) {
            return;
        }
        activeDialogCleanup?.();
        throw error;
    }
    if (generation !== dialogGeneration) {
        return;
    }
    activeDialogCleanup?.();
    mountAssessmentDialog(require, state, assessorRuntime);
    logStep("openDialog shown");
}

async function loadVueAndCodex(): Promise<ResourceLoaderRequire> {
    return (await mw.loader.using([
        "vue",
        "@wikimedia/codex",
        "mediawiki.diff.styles",
    ])) as ResourceLoaderRequire;
}

function mountLoadingDialog(require: ResourceLoaderRequire): void {
    const Vue = require("vue");
    const Codex = require("@wikimedia/codex");
    const host = document.createElement("div");
    let application: VueApp | null = null;
    let cleaned = false;
    host.id = HOST_ID;
    document.documentElement.append(host);
    function cleanup(): void {
        if (cleaned) {
            return;
        }
        cleaned = true;
        application?.unmount();
        host.remove();
        if (activeDialogCleanup === cleanup) {
            activeDialogCleanup = null;
        }
    }
    function cancelLoading(): void {
        dialogGeneration += 1;
        cleanup();
    }
    application = Vue.createMwApp(
        createLoadingDialogComponent(Vue, cancelLoading),
    );
    registerPageAssessorComponents(application, Codex);
    application.mount(host);
    activeDialogCleanup = cleanup;
}

function mountAssessmentDialog(
    require: ResourceLoaderRequire,
    state: Awaited<ReturnType<PageAssessorRuntime["loadDialogState"]>>,
    assessorRuntime: PageAssessorRuntime,
): void {
    const Vue = require("vue");
    const Codex = require("@wikimedia/codex");
    const host = document.createElement("div");
    let application: VueApp | null = null;
    let cleaned = false;

    host.id = HOST_ID;
    document.documentElement.append(host);

    function cleanup(): void {
        if (cleaned) {
            return;
        }
        cleaned = true;
        application?.unmount();
        host.remove();
        if (activeDialogCleanup === cleanup) {
            activeDialogCleanup = null;
        }
    }

    const component = createAssessmentDialogComponent(Vue, {
        currentNamespace: mw.config.get("wgNamespaceNumber"),
        onClose: cleanup,
        onSaved: refreshPage,
        runtime: assessorRuntime,
        state,
    });
    application = Vue.createMwApp(component);
    registerPageAssessorComponents(application, Codex);
    application.mount(host);
    activeDialogCleanup = cleanup;
}

function refreshPage(): void {
    location.reload();
}

function installDialogStyles(): void {
    if (document.getElementById(STYLE_ID) != null) {
        logStep("addStyles skipped: already present");
        return;
    }

    const style = document.createElement("style");

    style.id = STYLE_ID;
    style.textContent = [
        ASSESSMENT_DIALOG_STYLES,
        LOADING_DIALOG_STYLES,
        Comparison.WIKITEXT_COMPARISON_STYLES,
    ].join("\n");
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
