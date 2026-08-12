/** Composes the wikEd Lite browser runtime. */

import { createLogger, type Logger } from "#shared/logging";
import {
    createActionNotifier,
    type ActionNotifier,
} from "#shared/mediawiki/notifications";

import {
    applyWikiLinkRedirects,
    collectWikiLinkTitles,
    lookupWikiLinks,
} from "#gadget/adapters/mediawiki/wiki-links.ts";
import type { EditorServices } from "#gadget/contracts/editor.ts";
import { collectLinkHelperTitles } from "#gadget/domain/highlighter.ts";
import {
    createWikiNamespaceResolver,
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
        async loadNamespaces() {
            await namespaces.load(new mw.Api());
        },
        logger: uiLogger,
        notify,
        resolveRedirects: (source) =>
            resolveRedirects(source, namespaces, mediaWikiLogger),
    };
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
    namespaces: WikiNamespaceResolver,
    logger: Logger,
): Promise<string> {
    const api = new mw.Api();
    const namespaceState = await namespaces.load(api);
    if (!namespaceState.redirectsSafe) {
        logger.info("redirects.skipped", { reason: "unsafe-namespaces" });
        return source;
    }
    const titles = collectWikiLinkTitles(source);
    const stopTimer = logger.startTimer("redirects.lookup", {
        itemCount: titles.length,
    });
    try {
        const result = await lookupWikiLinks(api, titles);
        const updated = applyWikiLinkRedirects(
            source,
            result.redirects,
            namespaceState.source,
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
