/** Dialog stories exercised by the browser layout checks. */

export const UI_LOCALES = ["en", "zh-Hans", "zh-Hant"] as const;

export const UI_VIEWPORTS = {
    mobile: { height: 844, width: 390 },
    narrow: { height: 1024, width: 768 },
    wide: { height: 1000, width: 1440 },
} as const;

export type UiGadget =
    | "citation-formatter"
    | "vg-page-assessor"
    | "vg-stub-creator"
    | "wiked-lite";

export interface UiStory {
    dialog: string;
    gadget: UiGadget;
    id: string;
    variant?: string;
}

export const UI_STORIES: readonly UiStory[] = [
    citation("citation-main-add", "main", "add"),
    citation("citation-main-view", "main", "view"),
    citation("citation-main-tools", "main", "tools"),
    citation("citation-draft", "draft"),
    citation("citation-parameter-alias", "parameter-alias"),
    citation("citation-tool-analysis", "tool", "analysis"),
    citation("citation-tool-cs1", "tool", "cs1"),
    citation("citation-tool-non-cs1", "tool", "non-cs1"),
    citation("citation-close-confirmation", "close-confirmation"),
    assessor("assessor-assessment", "assessment"),
    assessor("assessor-loading", "loading"),
    stub("stub-main-metadata", "main", "metadata"),
    stub("stub-main-titles", "main", "titles"),
    stub("stub-main-text", "main", "text"),
    stub("stub-main-references", "main", "references"),
    stub("stub-main-review", "main", "review"),
    stub("stub-pre-save", "pre-save"),
    stub("stub-company-category", "company-category"),
    stub("stub-category-view", "category-view"),
    stub("stub-page-edit", "page-edit"),
    stub("stub-move", "move"),
    stub("stub-preview", "preview"),
    stub("stub-history", "history"),
    stub("stub-history-json", "history-json"),
    wiked("wiked-formatter", "formatter"),
] as const;

function citation(id: string, dialog: string, variant?: string): UiStory {
    return { dialog, gadget: "citation-formatter", id, variant };
}

function assessor(id: string, dialog: string): UiStory {
    return { dialog, gadget: "vg-page-assessor", id };
}

function stub(id: string, dialog: string, variant?: string): UiStory {
    return { dialog, gadget: "vg-stub-creator", id, variant };
}

function wiked(id: string, dialog: string): UiStory {
    return { dialog, gadget: "wiked-lite", id };
}
