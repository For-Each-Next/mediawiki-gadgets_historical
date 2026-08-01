/** Side-effect-free public wikEd Lite operations. */

export { formatWikitext } from "#gadget/domain/formatter.ts";
export { highlightWikitext } from "#gadget/domain/highlighter.ts";
export {
    buildReferencePreview,
    type ReferencePreview,
    type ReferencePreviewField,
    type ReferencePreviewRow,
} from "#gadget/domain/reference-preview.ts";
export type {
    FormatterOptions,
    FormatterResult,
} from "#gadget/domain/formatter.ts";
