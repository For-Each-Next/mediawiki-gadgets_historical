/**
 * Applies resolved source metadata to editable citation drafts.
 */

import {
    createManualSourceDraft,
    parseSourceDraft,
    type ParsedSourceInput,
    type SourceDraft,
} from "#gadget/domain/source-manager.ts";
import { msg } from "#gadget/i18n/index.ts";
import type {
    ResolvedSourceMetadata,
    SourceArchiveMetadata,
} from "#gadget/ui/source-manager-contracts.ts";

/** Creates an archive seed only when the entered source is archived. */
export function createArchiveSeed(
    parsed: ParsedSourceInput,
): SourceArchiveMetadata | null {
    return parsed.archiveUrl === ""
        ? null
        : {
              archiveDate: parsed.archiveDate,
              archiveUrl: parsed.archiveUrl,
          };
}

/** Formats the fallback warning after metadata resolution fails. */
export function formatMetadataFailure(
    error: unknown,
    formatError: (error: unknown) => string,
): string {
    return [
        msg("lookup.metadataUnavailable", { error: formatError(error) }),
        msg("lookup.manualFallback"),
    ].join(" ");
}

/** Builds an editable fallback after an unexpected lookup failure. */
export function createLookupFallbackDraft(
    parsed: ParsedSourceInput,
): SourceDraft {
    if (parsed.originalUrl !== "") {
        return parseSourceDraft(`{{Cite web | url = ${parsed.originalUrl}}}`);
    }
    return createManualSourceDraft("cite web");
}

/** Applies resolved URL and archive values to editable rows. */
export function applyResolvedMetadata(
    draft: SourceDraft,
    metadata: ResolvedSourceMetadata,
    liveOriginal: boolean,
): void {
    if (metadata.originalUrl !== "") {
        setSourceDraftValue(draft, "url", metadata.originalUrl);
    }
    setSourceDraftValue(draft, "archive-url", metadata.archiveUrl);
    setSourceDraftValue(draft, "archive-date", metadata.archiveDate);
    if (metadata.archiveUrl !== "" && liveOriginal) {
        setSourceDraftValue(draft, "url-status", "live");
    }
}

/** Builds non-blocking service warnings for an editable draft. */
export function buildMetadataWarnings(
    metadata: Pick<ResolvedSourceMetadata, "archiveError" | "metadataError">,
): string[] {
    const warnings: string[] = [];
    if (metadata.metadataError !== "") {
        warnings.push(
            msg("lookup.metadataUnavailable", {
                error: metadata.metadataError,
            }),
        );
    }
    if (metadata.archiveError !== "") {
        warnings.push(
            msg("lookup.archiveUnavailable", {
                error: metadata.archiveError,
            }),
        );
    }
    return warnings;
}

/** Assigns a draft parameter while retaining a seeded empty row. */
export function setSourceDraftValue(
    draft: SourceDraft,
    name: string,
    value: string,
): void {
    const row = draft.rows.find((candidate) => candidate.name === name);
    if (row != null) {
        row.value = value;
        return;
    }
    draft.rows.push({ alias: "", directive: "", main: false, name, value });
}
