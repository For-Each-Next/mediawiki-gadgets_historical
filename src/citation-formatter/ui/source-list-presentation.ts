/**
 * Filtering and table presentation for existing citation sources.
 */

import {
    filterExistingSources,
    type ExistingSource,
    type SourceSection,
} from "#gadget/domain/source-manager.ts";
import { getCanonicalTemplateName } from "#gadget/domain/templates.ts";
import { msg, type MessageId } from "#gadget/i18n/index.ts";
import type { VueModule } from "#gadget/ui/codex.ts";

const UNUSED_SOURCE_SECTION_ID = "unused";

export interface SourceSectionSelector {
    label: string;
    level: number;
    menuItems: Array<{
        label: string;
        sectionId: string;
        value: string;
    }>;
    selected: string;
}

export interface SourceTableRow {
    actions: string;
    details: string;
    group: string;
    id: string;
    reference: string;
    source: string;
    titleLanguage: string;
    usageCount: number;
}

interface SourceListDerivedInputs {
    existingSourceQuery: { value: string };
    existingSourceSections: { value: SourceSection[] };
    existingSources: { value: ExistingSource[] };
    sourceSectionPath: { value: string[] };
}

export interface SourceListDerivedState {
    basedOnSourceOptions: {
        readonly value: Array<{
            label: string;
            supportingText: string;
            value: string;
        }>;
    };
    filteredExistingSources: { readonly value: ExistingSource[] };
    keywordFilterLabel: { readonly value: string };
    nonCs1Sources: { readonly value: ExistingSource[] };
    sectionFilterLabel: { readonly value: string };
    sourceSectionSelectors: {
        readonly value: SourceSectionSelector[];
    };
    sourceTableRows: { readonly value: SourceTableRow[] };
}

/** Builds filtering and choice values for the existing-source list. */
// eslint-disable-next-line max-lines-per-function
export function createSourceListDerivedState(
    Vue: VueModule,
    state: SourceListDerivedInputs,
): SourceListDerivedState {
    function getFilteredExistingSources(): ExistingSource[] {
        const selectedSection = state.sourceSectionPath.value.at(-1) ?? "";
        return filterExistingSources(
            state.existingSources.value,
            state.existingSourceQuery.value,
            selectedSection,
        );
    }
    const filteredExistingSources = Vue.computed(getFilteredExistingSources);
    function formatFilterLabel(label: MessageId, applied: boolean): string {
        const text = msg(label);
        return applied
            ? msg("lookup.appliedFilterLabel", {
                  count: filteredExistingSources.value.length,
                  label: text,
              })
            : text;
    }
    function getBasedOnSourceOptions(): Array<{
        label: string;
        supportingText: string;
        value: string;
    }> {
        return state.existingSources.value
            .filter(function isStandardSource(source) {
                return source.status !== "non-standard";
            })
            .map(function toOption(source) {
                const name = source.referenceName || msg("common.unnamed");
                const title =
                    source.title || source.url || msg("common.untitledSource");
                return {
                    label: name,
                    supportingText: title,
                    value: source.id,
                };
            });
    }
    function getKeywordFilterLabel(): string {
        return formatFilterLabel(
            "lookup.filterKeyword",
            state.existingSourceQuery.value.trim() !== "",
        );
    }
    function getNonCs1Sources(): ExistingSource[] {
        return state.existingSources.value.filter(
            function isNonStandardSource(source) {
                return source.status === "non-standard";
            },
        );
    }
    function getSelectors(): SourceSectionSelector[] {
        return buildSourceSectionSelectors(
            state.existingSourceSections.value,
            state.sourceSectionPath.value,
            state.existingSources.value,
        );
    }
    function getSectionFilterLabel(): string {
        return formatFilterLabel(
            "lookup.filterSection",
            state.sourceSectionPath.value.length > 0,
        );
    }
    function getSourceTableRows(): SourceTableRow[] {
        return filteredExistingSources.value.map(toSourceTableRow);
    }
    return {
        basedOnSourceOptions: Vue.computed(getBasedOnSourceOptions),
        filteredExistingSources,
        keywordFilterLabel: Vue.computed(getKeywordFilterLabel),
        nonCs1Sources: Vue.computed(getNonCs1Sources),
        sectionFilterLabel: Vue.computed(getSectionFilterLabel),
        sourceSectionSelectors: Vue.computed(getSelectors),
        sourceTableRows: Vue.computed(getSourceTableRows),
    };
}

/** Projects citation definitions into the Codex Table columns. */
function toSourceTableRow(source: ExistingSource): SourceTableRow {
    return {
        actions: "",
        details:
            source.status === "non-standard"
                ? msg("lookup.nonStandard")
                : getCanonicalTemplateName(source.draft.template),
        group: source.group,
        id: source.id,
        reference: source.referenceName || msg("common.unnamed"),
        source: source.title || source.url || msg("common.untitledSource"),
        titleLanguage: source.titleLanguage,
        usageCount: source.usageCount,
    };
}

/** Builds one combobox for each selected section hierarchy level. */
export function buildSourceSectionSelectors(
    sections: SourceSection[],
    path: string[],
    sources: ExistingSource[],
): SourceSectionSelector[] {
    const selectors: SourceSectionSelector[] = [];
    let parentId = "";
    for (let level = 0; level <= path.length; level += 1) {
        let children = sections.filter(
            (section) => section.parentId === parentId,
        );
        if (children.length === 0) {
            break;
        }
        if (hasLeadingSourceSection(parentId, sources)) {
            children = [
                buildLeadingSourceSection(parentId, level),
                ...children,
            ];
        }
        const selected = path[level] ?? "";
        selectors.push(buildSourceSectionSelector(children, level, selected));
        if (
            selected === "" ||
            !children.some((section) => section.id === selected)
        ) {
            break;
        }
        if (selected.endsWith(".0")) {
            break;
        }
        parentId = selected;
    }
    return selectors;
}

/** Checks whether a selected heading has citations in its own lead. */
function hasLeadingSourceSection(
    parentId: string,
    sources: ExistingSource[],
): boolean {
    if (
        parentId === "" ||
        parentId === "0" ||
        parentId === UNUSED_SOURCE_SECTION_ID
    ) {
        return false;
    }
    return sources.some((source) => source.sectionIds.includes(parentId));
}

/** Creates the `.0` option for a selected heading's own lead. */
function buildLeadingSourceSection(
    parentId: string,
    level: number,
): SourceSection {
    const title =
        level === 1
            ? msg("sections.sectionLead")
            : msg("sections.subsectionLead");
    const id = `${parentId}.0`;
    return {
        depth: level,
        id,
        parentId,
        start: -1,
        title,
    };
}

/** Builds the choices for one section-filter hierarchy level. */
function buildSourceSectionSelector(
    sections: SourceSection[],
    level: number,
    selected: string,
): SourceSectionSelector {
    const allLabel =
        level === 0
            ? msg("sections.allSections")
            : msg("sections.allSubsections");
    const sectionOptions = sections.map(function toOption(section) {
        const label = formatSourceSectionOption(section);
        return {
            label,
            sectionId: section.id,
            value: label,
        };
    });
    const allOption = {
        label: allLabel,
        sectionId: "",
        value: allLabel,
    };
    return {
        label:
            level === 0 ? msg("sections.section") : msg("sections.subsection"),
        level,
        menuItems: [allOption, ...sectionOptions],
        selected:
            sectionOptions.find((option) => option.sectionId === selected)
                ?.label ?? allLabel,
    };
}

/** Formats structural section data for the localized filter menu. */
function formatSourceSectionOption(section: SourceSection): string {
    if (section.id === UNUSED_SOURCE_SECTION_ID) {
        return msg("sections.unusedReferences");
    }
    const title = section.id === "0" ? msg("sections.lead") : section.title;
    return `§ ${section.id} ${title}`.trim();
}
