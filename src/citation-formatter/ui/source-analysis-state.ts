/**
 * Reactive presentation state for citation-source consistency findings.
 */

import {
    analyzeCitationSources,
    type CitationSourceAnalysis,
    type SourceAnalysisCell,
    type SourceAnalysisFinding,
    type SourceAnalysisOccurrence,
    type SourceAnalysisReplacement,
} from "#gadget/domain/source-analysis.ts";
import type { ExistingSource } from "#gadget/domain/source-manager.ts";
import { msg, sourceAnalysisMessages } from "#gadget/i18n/index.ts";

export type SelectableSourceAnalysisOccurrence = SourceAnalysisOccurrence & {
    selected: boolean;
};

export interface EditableSourceAnalysisFinding extends Omit<
    SourceAnalysisFinding,
    "occurrences"
> {
    customReplacement: string;
    description: string;
    displayOrder: number;
    occurrences: SelectableSourceAnalysisOccurrence[];
    replacementChoice: string;
    title: string;
}

export interface EditableCitationSourceAnalysis extends Omit<
    CitationSourceAnalysis,
    "findings"
> {
    findings: EditableSourceAnalysisFinding[];
}

export interface AppliedAnalysisTarget {
    cell: SourceAnalysisReplacement["cell"];
    oldValue: string;
    parameter: string;
    replacement: string;
    rowIndex: number;
    sourceGroup: string;
    sourceId: string;
    sourceReferenceName: string;
    sourceTemplateStart: number;
}

export interface AppliedAnalysisFinding {
    changeId: number;
    finding: EditableSourceAnalysisFinding;
    targets: AppliedAnalysisTarget[];
}

export interface SelectedAnalysisFinding {
    finding: EditableSourceAnalysisFinding;
    replacements: SourceAnalysisReplacement[];
}

export interface AnalysisTab {
    appliedFindings: AppliedAnalysisFinding[];
    findings: EditableSourceAnalysisFinding[];
    label: string;
    name: SourceAnalysisCell;
}

interface SourceAnalysisState {
    analysisFindingOrder: { value: string[] };
    appliedAnalysisFindings: { value: AppliedAnalysisFinding[] };
    existingSources: { value: ExistingSource[] };
    sourceAnalysis: { value: EditableCitationSourceAnalysis };
}

/** Adds mutable replacement and selection state to a fresh analysis. */
export function createEditableSourceAnalysis(
    sources: ExistingSource[],
): EditableCitationSourceAnalysis {
    const analysis = analyzeCitationSources(sources, sourceAnalysisMessages);
    return {
        ...analysis,
        findings: analysis.findings.map(
            function makeFindingEditable(finding, displayOrder) {
                return {
                    ...finding,
                    description: getAnalysisFindingDescription(finding),
                    displayOrder,
                    occurrences: finding.occurrences.map(
                        function makeOccurrenceSelectable(occurrence) {
                            return { ...occurrence, selected: true };
                        },
                    ),
                    customReplacement: "",
                    replacementChoice: finding.suggestedValue,
                    title: finding.subject,
                };
            },
        ),
    };
}

/** Refreshes findings while retaining their stable display order. */
export function refreshSourceAnalysis(state: SourceAnalysisState): void {
    const analysis = createEditableSourceAnalysis(state.existingSources.value);
    for (const finding of analysis.findings) {
        if (!state.analysisFindingOrder.value.includes(finding.id)) {
            state.analysisFindingOrder.value.push(finding.id);
        }
        finding.displayOrder = state.analysisFindingOrder.value.indexOf(
            finding.id,
        );
    }
    state.sourceAnalysis.value = analysis;
}

/** Groups pending and applied consistency findings into UI tabs. */
export function buildAnalysisTabs(state: SourceAnalysisState): AnalysisTab[] {
    return [
        buildAnalysisTab(state, "value", msg("analysis.parameterValuesTab")),
        buildAnalysisTab(state, "alias", msg("analysis.referenceNamesTab")),
    ];
}

function buildAnalysisTab(
    state: SourceAnalysisState,
    name: SourceAnalysisCell,
    label: string,
): AnalysisTab {
    return {
        appliedFindings: state.appliedAnalysisFindings.value.filter((entry) =>
            isAnalysisFindingInTab(entry.finding, name),
        ),
        findings: state.sourceAnalysis.value.findings.filter((finding) =>
            isAnalysisFindingInTab(finding, name),
        ),
        label,
        name,
    };
}

export function isAnalysisFindingInTab(
    finding: EditableSourceAnalysisFinding,
    tab: SourceAnalysisCell,
): boolean {
    return (finding.category === "alias" ? "alias" : "value") === tab;
}

/** Gets the category text displayed below an analysis-case title. */
function getAnalysisFindingDescription(
    finding: SourceAnalysisFinding,
): string {
    if (finding.category === "publication") {
        return msg("analysis.publicationDescription");
    }
    if (finding.category === "publisher") {
        return msg("analysis.publisherDescription");
    }
    if (finding.category === "author") {
        return msg("analysis.authorDescription");
    }
    return finding.id.startsWith("alias:source-key\u0000")
        ? msg("analysis.sourceKeyDescription")
        : msg("analysis.hashAliasDescription");
}
