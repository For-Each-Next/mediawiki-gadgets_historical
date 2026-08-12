/**
 * Composition root for the browser gadget.
 */

import {
    buildCs1CheckWikitext,
    requestCs1WikitextCheck,
    splitCs1CheckHtml,
} from "#gadget/adapters/mediawiki/cs1-check.ts";
import {
    fetchAvailableArchive,
    resolveSourceMetadata,
} from "#gadget/adapters/network/source-metadata.ts";
import {
    createTemplateDataObjectStorage,
    loadCitationTemplateData,
    type TemplateDataObjectStorage,
} from "#gadget/adapters/mediawiki/template-data.ts";
// eslint-disable-next-line max-len
import { resolveCitationWikiLink } from "#gadget/adapters/mediawiki/wiki-link.ts";
// eslint-disable-next-line max-len
import { createTemplateNameContextResolver } from "#gadget/adapters/mediawiki/namespaces.ts";
import * as citationEditor from "#gadget/ui/editor.ts";
import * as sourceManagerUi from "#gadget/ui/source-manager.ts";
import { createCs1ReviewWorkflow } from "#gadget/workflows/cs1-review.ts";
import { msg } from "#gadget/i18n/index.ts";
import { createLogger, type Logger, type StopTimer } from "#shared/logging";
import {
    createActionNotifier,
    type ActionNotifier,
} from "#shared/mediawiki/notifications";

const cs1Review = createCs1ReviewWorkflow({
    buildCheckWikitext: buildCs1CheckWikitext,
    requestCheck: requestCs1WikitextCheck,
    splitCheckHtml: splitCs1CheckHtml,
});

interface BrowserRuntime {
    finishLoading: StopTimer;
    logger: Logger;
    notifyAction: ActionNotifier;
}

/** Starts the composed Citation Formatter browser UI. */
export function start(): void {
    if (
        typeof mw === "undefined" ||
        typeof mw.loader?.using !== "function" ||
        !isWikitextPage()
    ) {
        return;
    }
    const logger = createLogger("citation-formatter");
    const runtime: BrowserRuntime = {
        finishLoading: logger.startTimer("startup"),
        logger,
        notifyAction: createActionNotifier("citation-formatter"),
    };
    mountWhenMediaWikiIsReady(runtime);
    mw.hook("ve.wikitextInteractive").add(function remount(): void {
        mountWhenMediaWikiIsReady(runtime);
    });
}

/** Loads the portlet API before mounting the editor command. */
function mountWhenMediaWikiIsReady(runtime: BrowserRuntime): void {
    if (!isWikitextPage()) {
        return;
    }
    void mw.loader
        .using("mediawiki.util")
        .then(function mount(): void {
            mountCitationFormatter(runtime);
            runtime.finishLoading({ outcome: "ready" });
        })
        .catch(function reportStartupFailure(error: unknown): void {
            runtime.finishLoading({ outcome: "failed" });
            runtime.logger.error("startup.failed", { error });
            const message =
                error instanceof Error ? error.message : String(error);
            runtime.notifyAction({
                key: "startup-failed",
                message: msg("tool.startupError", { error: message }),
                type: "error",
            });
        });
}

function isWikitextPage(): boolean {
    return mw.config.get("wgPageContentModel") === "wikitext";
}

function mountCitationFormatter(runtime: BrowserRuntime): void {
    const wikiId = String(
        mw.config.get("wgWikiID") ?? mw.config.get("wgDBname") ?? "",
    );
    const templateNames = createTemplateNameContextResolver(wikiId);
    const openCitationFormatterDialog =
        sourceManagerUi.createOpenCitationFormatterDialog({
            cs1Review,
            fetchAvailableArchive,
            loadCitationTemplateData(names) {
                return loadCitationTemplateData(names, {
                    api: new mw.Api(),
                    storage: getTemplateDataStorage(),
                    templateNameContext: templateNames.current(),
                    wikiId,
                });
            },
            loadTemplateNameContext() {
                if (wikiId === "enwiki" || wikiId === "zhwiki") {
                    return Promise.resolve(templateNames.current());
                }
                return templateNames.load(new mw.Api());
            },
            logger: runtime.logger.child("ui.source-manager"),
            notifyAction: runtime.notifyAction,
            resolveSourceMetadata,
            resolveWikiLink(value) {
                return resolveCitationWikiLink(value, new mw.Api());
            },
        });
    citationEditor.mountCitationFormatter(openCitationFormatterDialog, {
        logger: runtime.logger.child("ui.editor"),
        notifyAction: runtime.notifyAction,
    });
}

function getTemplateDataStorage(): TemplateDataObjectStorage | undefined {
    try {
        return createTemplateDataObjectStorage(globalThis.localStorage);
    } catch {
        return undefined;
    }
}
