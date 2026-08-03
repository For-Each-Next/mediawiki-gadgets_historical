/**
 * Side-effect-free composition root for the browser gadget.
 */

import {
    buildCs1CheckWikitext,
    requestCs1WikitextCheck,
    splitCs1CheckHtml,
} from "#gadget/infra/cs1-check.ts";
import {
    fetchAvailableArchive,
    resolveSourceMetadata,
} from "#gadget/infra/source-metadata.ts";
import { startExecutionTimer } from "#gadget/infra/logger.ts";
import {
    createTemplateDataObjectStorage,
    loadCitationTemplateData,
    type TemplateDataObjectStorage,
} from "#gadget/infra/template-data.ts";
import { resolveCitationWikiLink } from "#gadget/infra/wiki-link.ts";
// eslint-disable-next-line max-len
import { createTemplateNameContextResolver } from "#gadget/infra/namespaces.ts";
import * as citationEditor from "#gadget/ui/editor.ts";
import * as sourceManagerUi from "#gadget/ui/source-manager.ts";
import { createCs1ReviewWorkflow } from "#gadget/workflows/cs1-review.ts";

const cs1Review = createCs1ReviewWorkflow({
    buildCheckWikitext: buildCs1CheckWikitext,
    requestCheck: requestCs1WikitextCheck,
    splitCheckHtml: splitCs1CheckHtml,
});
/** Starts the composed Citation Formatter browser UI. */
export function start(): void {
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
            resolveSourceMetadata,
            resolveWikiLink(value) {
                return resolveCitationWikiLink(value, new mw.Api());
            },
            startExecutionTimer,
        });
    citationEditor.mountCitationFormatter(openCitationFormatterDialog);
}

function getTemplateDataStorage(): TemplateDataObjectStorage | undefined {
    try {
        return createTemplateDataObjectStorage(globalThis.localStorage);
    } catch {
        return undefined;
    }
}
