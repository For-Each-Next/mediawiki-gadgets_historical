/** Composes the wikEd Lite browser runtime. */

import {
    applyWikiLinkRedirects,
    collectWikiLinkTitles,
    lookupWikiLinks,
} from "#gadget/infra/wiki-links.ts";
import {
    createWikiNamespaceResolver,
    type WikiNamespaceResolver,
} from "#gadget/infra/namespaces.ts";
import {
    startEditorIntegration,
    type EditorServices,
} from "#gadget/ui/editor.ts";

/** Starts editor discovery and the formatter portlet action. */
export function start(): void {
    const databaseName = String(
        mw.config.get("wgWikiID") ?? mw.config.get("wgDBname") ?? "",
    );
    const namespaces = createWikiNamespaceResolver(databaseName);
    startEditorIntegration(createEditorServices(databaseName, namespaces));
}

function createEditorServices(
    databaseName: string,
    namespaces: WikiNamespaceResolver,
): EditorServices {
    return {
        findMissingLinks,
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
        resolveRedirects: (source) => resolveRedirects(source, namespaces),
    };
}

async function findMissingLinks(source: string): Promise<{
    linkClasses: string[];
    titles: Set<string>;
}> {
    const result = await lookupWikiLinks(
        new mw.Api(),
        collectWikiLinkTitles(source),
    );
    return {
        linkClasses: result.missingLinkClasses,
        titles: result.missing,
    };
}

async function resolveRedirects(
    source: string,
    namespaces: WikiNamespaceResolver,
): Promise<string> {
    const api = new mw.Api();
    const namespaceState = await namespaces.load(api);
    if (!namespaceState.redirectsSafe) {
        return source;
    }
    const result = await lookupWikiLinks(api, collectWikiLinkTitles(source));
    return applyWikiLinkRedirects(
        source,
        result.redirects,
        namespaceState.source,
    );
}
