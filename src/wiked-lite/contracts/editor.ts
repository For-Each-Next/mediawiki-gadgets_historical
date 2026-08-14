/** Contracts between the wikEd Lite composition root and editor UI. */

import type { ActionNotifier } from "#shared/mediawiki/notifications";
import type { Logger } from "#shared/logging";

import type { HighlightOptions } from "#gadget/domain/highlighter.ts";
import type { FormatterSettings } from "#gadget/domain/formatter-settings.ts";

export interface EditorServices {
    findMissingLinks(source: string): Promise<{
        linkClasses: string[];
        titles: Set<string>;
    }>;
    getHighlightOptions(): HighlightOptions;
    loadFormatterSettings(): FormatterSettings;
    loadNamespaces(): Promise<void>;
    logger: Logger;
    notify: ActionNotifier;
    resolveRedirects(source: string): Promise<string>;
    saveFormatterSettings(settings: FormatterSettings): void;
}
