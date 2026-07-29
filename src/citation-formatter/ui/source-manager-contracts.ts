/**
 * Public configuration and injected ports for the source-manager UI.
 */

import type { Cs1ReviewWorkflow } from "#gadget/contracts/cs1-review.ts";
import type { CitationLayout } from "#gadget/domain/types.ts";
import type * as editBox from "#shared/edit-box";

export type ReferenceStyle = "r" | "ref";

export interface SourceManagerOptions {
    citationLayout?: CitationLayout;
    referenceStyle?: ReferenceStyle;
}

export interface SourceArchiveMetadata {
    archiveDate: string;
    archiveUrl: string;
}

export interface ResolvedSourceMetadata extends SourceArchiveMetadata {
    archiveError: string;
    citeTemplate: string;
    metadataError: string;
    originalUrl: string;
}

export interface SourceManagerDependencies {
    cs1Review: Cs1ReviewWorkflow;
    fetchAvailableArchive: (
        originalUrl: string,
    ) => Promise<SourceArchiveMetadata | null>;
    resolveSourceMetadata: (
        sourceInput: string,
        archiveSeed: SourceArchiveMetadata | null,
    ) => Promise<ResolvedSourceMetadata>;
    resolveWikiLink: (value: string) => Promise<string>;
}

export type OpenCitationFormatterDialog = (
    editor: editBox.EditBox,
    options?: SourceManagerOptions,
) => Promise<void>;
