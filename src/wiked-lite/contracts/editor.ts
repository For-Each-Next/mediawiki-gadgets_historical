/** Contracts between the wikEd Lite composition root and editor UI. */

import type { ActionNotifier } from "#shared/mediawiki/notifications";
import type { Logger } from "#shared/logging";

import type { HighlightOptions } from "#gadget/domain/highlighter.ts";
import type { FormatterSettings } from "#gadget/domain/formatter-settings.ts";

export interface EditorServices {
    findMissingLinks(source: string): Promise<{
        checkedTitles: Set<string>;
        linkClasses: string[];
        missingTitles: Set<string>;
    }>;
    getHighlightOptions(): HighlightOptions;
    isSectionEditing(): boolean;
    loadFormatterSettings(): FormatterSettings;
    loadNamespaces(): Promise<void>;
    loadPageSource(): Promise<string>;
    logger: Logger;
    notify: ActionNotifier;
    resolveRedirects(
        source: string,
        options: { includeTemplates: boolean },
    ): Promise<string>;
    saveFormatterSettings(settings: FormatterSettings): void;
}
