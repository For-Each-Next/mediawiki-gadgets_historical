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
import * as citationEditor from "#gadget/ui/editor.ts";
import * as sourceManagerUi from "#gadget/ui/source-manager.ts";
import { createCs1ReviewWorkflow } from "#gadget/workflows/cs1-review.ts";

const cs1Review = createCs1ReviewWorkflow({
    buildCheckWikitext: buildCs1CheckWikitext,
    requestCheck: requestCs1WikitextCheck,
    splitCheckHtml: splitCs1CheckHtml,
});
const openCitationFormatterDialog =
    sourceManagerUi.createOpenCitationFormatterDialog({
        cs1Review,
        fetchAvailableArchive,
        loadCitationTemplateData(names) {
            return loadCitationTemplateData(names, {
                api: new mw.Api(),
                storage: getTemplateDataStorage(),
                wikiId: String(mw.config.get("wgDBname") ?? ""),
            });
        },
        resolveSourceMetadata,
        resolveWikiLink(value) {
            return resolveCitationWikiLink(value, new mw.Api());
        },
        startExecutionTimer,
    });

/** Starts the composed Citation Formatter browser UI. */
export function start(): void {
    citationEditor.mountCitationFormatter(openCitationFormatterDialog);
}

function getTemplateDataStorage(): TemplateDataObjectStorage | undefined {
    try {
        return createTemplateDataObjectStorage(globalThis.localStorage);
    } catch {
        return undefined;
    }
}
