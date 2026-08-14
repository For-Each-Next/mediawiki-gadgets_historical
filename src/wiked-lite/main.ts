/** Composes the wikEd Lite browser runtime. */

import { createLogger, type Logger } from "#shared/logging";
import {
    createActionNotifier,
    type ActionNotifier,
} from "#shared/mediawiki/notifications";

import {
    applyTemplateRedirects,
    applyWikiLinkRedirects,
    collectTemplateTitles,
    collectWikiLinkTitles,
    lookupWikiLinks,
} from "#gadget/adapters/mediawiki/wiki-links.ts";
import {
    createFormatterSettingsStore,
    type FormatterSettingsStore,
} from "#gadget/adapters/storage/formatter-settings.ts";
import * as pageSource from "#gadget/adapters/mediawiki/page-source.ts";
import type { EditorServices } from "#gadget/contracts/editor.ts";
import { collectLinkHelperTitles } from "#gadget/domain/highlighter.ts";
import {
    createWikiNamespaceResolver,
    type WikiNamespaceState,
    type WikiNamespaceResolver,
} from "#gadget/adapters/mediawiki/namespaces.ts";
import { startEditorIntegration } from "#gadget/ui/editor.ts";

/** Starts editor discovery and the formatter portlet action. */
export function start(): void {
    const logger = createLogger("wiked-lite");
    const notify = createActionNotifier("wiked-lite");
    const databaseName = String(
        mw.config.get("wgWikiID") ?? mw.config.get("wgDBname") ?? "",
    );
    const mediaWikiLogger = logger.child("mediawiki");
    const namespaces = createWikiNamespaceResolver(
        databaseName,
        mediaWikiLogger.child("namespaces"),
    );
    startEditorIntegration(
        createEditorServices(
            databaseName,
            namespaces,
            mediaWikiLogger,
            logger.child("ui"),
            notify,
        ),
    );
}

function createEditorServices(
    databaseName: string,
    namespaces: WikiNamespaceResolver,
    mediaWikiLogger: Logger,
    uiLogger: Logger,
    notify: ActionNotifier,
): EditorServices {
    const formatterSettings: FormatterSettingsStore =
        createFormatterSettingsStore();
    return {
        findMissingLinks: (source) =>
            findMissingLinks(
                source,
                databaseName,
                namespaces,
                mediaWikiLogger,
            ),
        getHighlightOptions() {
            return {
                databaseName,
                linkHelpers: databaseName === "zhwiki",
                namespaceSource: namespaces.current().source,
            };
        },
        isSectionEditing,
        loadFormatterSettings: formatterSettings.load,
        async loadNamespaces() {
            await namespaces.load(new mw.Api());
        },
        logger: uiLogger,
        loadPageSource: () => loadCurrentPageSource(mediaWikiLogger),
        notify,
        resolveRedirects: (source, options) =>
            resolveRedirects(source, options, namespaces, mediaWikiLogger),
        saveFormatterSettings: formatterSettings.save,
    };
}

function isSectionEditing(): boolean {
    if (mw.config.get("wgEditMessage") === "editingsection") {
        return true;
    }
    const section = document.querySelector<HTMLInputElement>(
        'input[name="wpSection"]',
    );
    return section != null && section.value !== "";
}

async function loadCurrentPageSource(logger: Logger): Promise<string> {
    const revisionId = Number(mw.config.get("wgCurRevisionId"));
    const stopTimer = logger.startTimer("page-source.load", { revisionId });
    try {
        const source = await pageSource.loadPageRevisionSource(
            new mw.Api(),
            revisionId,
        );
        stopTimer({ characterCount: source.length });
        return source;
    } catch (error) {
        logger.warn("page-source.load.failed", { error, revisionId });
        stopTimer({ outcome: "failed" });
        throw error;
    }
}

async function findMissingLinks(
    source: string,
    databaseName: string,
    namespaces: WikiNamespaceResolver,
    logger: Logger,
): Promise<{
    linkClasses: string[];
    titles: Set<string>;
}> {
    const titles = collectWikiLinkTitles(source);
    if (databaseName === "zhwiki") {
        titles.push(
            ...collectLinkHelperTitles(source, namespaces.current().source),
        );
    }
    const uniqueTitles = [...new Set(titles)];
    const stopTimer = logger.startTimer("links.lookup", {
        itemCount: uniqueTitles.length,
    });
    try {
        const result = await lookupWikiLinks(new mw.Api(), uniqueTitles);
        stopTimer({ missingCount: result.missing.size });
        return {
            linkClasses: result.missingLinkClasses,
            titles: result.missing,
        };
    } catch (error) {
        logger.warn("links.lookup.failed", {
            error,
            itemCount: uniqueTitles.length,
        });
        stopTimer({ outcome: "failed" });
        throw error;
    }
}

async function resolveRedirects(
    source: string,
    options: { includeTemplates: boolean },
    namespaces: WikiNamespaceResolver,
    logger: Logger,
): Promise<string> {
    const api = new mw.Api();
    const state = await namespaces.load(api);
    if (!state.redirectsSafe) {
        logger.info("redirects.skipped", { reason: "unsafe-namespaces" });
        return source;
    }
    const includeTemplates = allowTemplateRedirects(
        options.includeTemplates,
        state,
        logger,
    );
    const titles = collectRedirectTitles(source, includeTemplates, state);
    const stopTimer = logger.startTimer("redirects.lookup", {
        itemCount: titles.length,
    });
    try {
        const result = await lookupWikiLinks(api, titles);
        const updated = applyRedirects(
            source,
            result.redirects,
            state,
            includeTemplates,
        );
        stopTimer({ redirectCount: result.redirects.size });
        return updated;
    } catch (error) {
        logger.warn("redirects.lookup.failed", {
            error,
            itemCount: titles.length,
        });
        stopTimer({ outcome: "failed" });
        throw error;
    }
}

function allowTemplateRedirects(
    requested: boolean,
    state: WikiNamespaceState,
    logger: Logger,
): boolean {
    if (requested && !state.templateRedirectsSafe) {
        logger.info("redirects.templates.skipped", {
            reason: "unsafe-magic-words",
        });
    }
    return requested && state.templateRedirectsSafe;
}

function collectRedirectTitles(
    source: string,
    includeTemplates: boolean,
    state: WikiNamespaceState,
): string[] {
    const titles = collectWikiLinkTitles(source);
    if (includeTemplates) {
        titles.push(
            ...collectTemplateTitles(
                source,
                state.source,
                state.templateMagicWords,
            ),
        );
    }
    return [...new Set(titles)];
}

function applyRedirects(
    source: string,
    redirects: ReadonlyMap<string, string>,
    state: WikiNamespaceState,
    includeTemplates: boolean,
): string {
    const linksUpdated = applyWikiLinkRedirects(
        source,
        redirects,
        state.source,
    );
    return includeTemplates
        ? applyTemplateRedirects(
              linksUpdated,
              redirects,
              state.source,
              state.templateMagicWords,
          )
        : linksUpdated;
}
