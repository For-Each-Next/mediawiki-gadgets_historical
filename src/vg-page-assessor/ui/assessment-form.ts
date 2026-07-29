/**
 * Renders, reads, and refreshes the assessment portion of the dialog.
 */

import projectConfig from "#gadget/config/project-config.ts";
import type { DialogState } from "#gadget/contracts/dialog.ts";
import {
    CLASS_VALUES,
    IMPORTANCE_VALUES,
    getTalkPageTopSection,
    previewTalkPageTopSection,
} from "#gadget/domain/assessment.ts";
import type {
    Assessment,
    AssessmentClass,
    AssessmentImportance,
    AssessmentMaintenance,
    SelectionMap,
} from "#gadget/domain/types.ts";
import { msg } from "#gadget/i18n/index.ts";
import * as html from "#shared/html";
import {
    MAINTENANCE_OPTIONS,
    OTHER_PROJECT_OPTIONS,
    TASK_FORCE_OPTIONS,
} from "#gadget/ui/assessment-options.ts";
import { buildEditSummary } from "#gadget/ui/assessment-summary.ts";
import {
    type TemplateAttributes,
    type TemplateElement,
    type TemplateNode,
    buildFieldControl,
    buildInputId,
    buildPlainLabel,
    buildSourceField,
    buildTextElement,
    buildTextInputField,
    requireElement,
} from "#gadget/ui/form-elements.ts";

interface CheckboxItem {
    readonly id: string;
    readonly label: string;
}

export type AssessmentUiLogger = (step: string, details?: unknown) => void;

/**
 * Builds the assessment controls and source preview.
 */
export function buildAssessmentFieldset(state: DialogState): TemplateElement {
    const controls = buildAssessmentControls();
    const sources = buildAssessmentSources();
    const grid = html.createElement("div", { class: "avgp-assessment-grid" }, [
        controls,
        sources,
    ]);
    const legend = buildTextElement(
        "legend",
        { class: "avgp-fieldset-title" },
        msg("dialog.assessment"),
    );
    const summary = buildTextInputField({
        className: "avgp-summary cdx-field",
        id: "avgp-edit-summary",
        label: msg("dialog.editSummary"),
        name: "summary",
        value: buildEditSummary(state.assessment),
    });

    return html.createElement("fieldset", { class: "avgp-fieldset" }, [
        legend,
        grid,
        summary,
    ]);
}

/**
 * Reads form values into assessment state.
 */
export function readAssessment(
    root: HTMLElement,
    assessment: Assessment,
    logStep: AssessmentUiLogger,
): void {
    assessment.className = readAssessmentClass(root);
    assessment.importance = readAssessmentImportance(root);
    assessment.maintenance = readMaintenance(root);
    assessment.taskForces = readCheckedMap(root, "taskForce");
    assessment.otherProjects = readCheckedMap(root, "otherProject");
    logStep("readAssessment", assessment);
}

/**
 * Refreshes the proposed source unless it was manually edited.
 */
export function updateAssessmentPreview(
    root: HTMLElement,
    state: DialogState,
    logStep: AssessmentUiLogger,
): void {
    if (state.previewDirty) {
        logStep("updateAssessmentPreview skipped: dirty");
        return;
    }

    const preview = requireElement<HTMLTextAreaElement>(
        root,
        "[data-avgp-preview]",
    );
    preview.value = previewTalkPageTopSection(
        state.page.text,
        state.assessment,
        projectConfig,
    );
    logStep("updateAssessmentPreview done", {
        length: preview.value.length,
    });
}

/**
 * Refreshes the current talk-page source.
 */
export function updateTalkSource(
    root: HTMLElement,
    state: DialogState,
    logStep: AssessmentUiLogger,
): void {
    const currentSource = requireElement<HTMLTextAreaElement>(
        root,
        "[data-avgp-current-source]",
    );
    currentSource.value = getTalkPageTopSection(state.page.text);
    logStep("updateTalkDiff done", {
        length: currentSource.value.length,
    });
}

/**
 * Refreshes the edit summary unless it was manually edited.
 */
export function updateAssessmentSummary(
    root: HTMLElement,
    state: DialogState,
    logStep: AssessmentUiLogger,
): void {
    if (state.summaryDirty) {
        logStep("updateAssessmentSummary skipped: dirty");
        return;
    }

    const summaryInput = requireElement<HTMLInputElement>(
        root,
        "[name='summary']",
    );
    summaryInput.value = buildEditSummary(state.assessment);
    logStep("updateAssessmentSummary done", {
        summary: summaryInput.value,
    });
}

function buildAssessmentControls(): TemplateElement {
    const children = [
        buildRadioSection(
            msg("dialog.class"),
            "className",
            CLASS_VALUES,
            "Unassessed",
        ),
        buildRadioSection(
            msg("dialog.importance"),
            "importance",
            IMPORTANCE_VALUES,
            "",
        ),
        buildCheckboxSection(
            msg("dialog.taskForces"),
            "taskForce",
            TASK_FORCE_OPTIONS,
        ),
        buildCheckboxSection(
            msg("dialog.maintenance"),
            "maintenance",
            MAINTENANCE_OPTIONS,
        ),
        buildCheckboxSection(
            msg("dialog.otherProjects"),
            "otherProject",
            OTHER_PROJECT_OPTIONS,
        ),
    ];

    return html.createElement(
        "section",
        {
            "aria-label": msg("dialog.assessmentControls"),
            class: "avgp-controls",
        },
        children,
    );
}

function buildAssessmentSources(): TemplateElement {
    const preview = buildSourceField({
        id: "avgp-preview-source",
        label: msg("dialog.readySource"),
        textareaAttributes: { "data-avgp-preview": "" },
    });
    const current = buildSourceField({
        id: "avgp-current-source",
        label: msg("dialog.currentSource"),
        textareaAttributes: {
            "data-avgp-current-source": "",
            readonly: "",
        },
    });

    return html.createElement(
        "section",
        {
            "aria-label": msg("dialog.leadPreview"),
            class: "avgp-source",
        },
        [preview, current],
    );
}

function buildRadioSection(
    label: string,
    name: string,
    values: ReadonlyArray<string>,
    selected: string,
): TemplateElement {
    const radios = values.map(function buildOption(value) {
        return buildRadio(name, value, selected);
    });
    return buildControlSection(label, "avgp-button-group", radios);
}

function buildRadio(
    name: string,
    value: string,
    selected: string,
): TemplateElement {
    const id = buildInputId(name, value || "empty");
    const input = html.createElement(
        "input",
        buildRadioInputAttributes(name, value, selected, id),
    );
    const icon = html.createElement("span", { class: "cdx-radio__icon" });
    const inputLabel = buildTextElement(
        "label",
        { class: "cdx-radio__label", for: id },
        value === "" ? msg("common.empty") : value,
    );
    const wrapper = html.createElement(
        "div",
        { class: "cdx-radio__wrapper" },
        [input, icon, inputLabel],
    );

    return html.createElement("div", { class: "cdx-radio" }, [wrapper]);
}

function buildRadioInputAttributes(
    name: string,
    value: string,
    selected: string,
    id: string,
): TemplateAttributes {
    return {
        class: "cdx-radio__input",
        id,
        name,
        type: "radio",
        value,
        ...(value === selected ? { checked: "" } : {}),
    };
}

function buildCheckboxSection(
    label: string,
    name: string,
    items: ReadonlyArray<CheckboxItem>,
): TemplateElement {
    const checkboxes = items.map(function buildItem(item) {
        return buildCheckbox(name, item);
    });
    return buildControlSection(label, "avgp-check-grid", checkboxes);
}

function buildCheckbox(name: string, item: CheckboxItem): TemplateElement {
    const id = buildInputId(name, item.id);
    const input = html.createElement("input", {
        class: "cdx-checkbox__input",
        id,
        name,
        type: "checkbox",
        value: item.id,
    });
    const icon = html.createElement("span", { class: "cdx-checkbox__icon" });
    const label = buildCheckboxLabel(id, item.label);
    const wrapper = html.createElement(
        "div",
        { class: "cdx-checkbox__wrapper" },
        [input, icon, label],
    );

    return html.createElement(
        "div",
        { class: "cdx-checkbox cdx-checkbox--inline" },
        [wrapper],
    );
}

function buildCheckboxLabel(id: string, label: string): TemplateElement {
    const labelText = buildTextElement(
        "span",
        { class: "cdx-label__label__text" },
        label,
    );
    const inputLabel = html.createElement(
        "label",
        { class: "cdx-label__label", for: id },
        [labelText],
    );

    return html.createElement(
        "div",
        { class: "cdx-checkbox__label cdx-label" },
        [inputLabel],
    );
}

function buildControlSection(
    label: string,
    controlClass: string,
    controls: Array<TemplateNode>,
): TemplateElement {
    const legend = html.createElement("legend", { class: "cdx-label" }, [
        buildPlainLabel(label),
    ]);
    const group = html.createElement("div", { class: controlClass }, controls);

    return html.createElement(
        "fieldset",
        { class: "cdx-field avgp-section" },
        [legend, buildFieldControl([group])],
    );
}

function readMaintenance(root: HTMLElement): AssessmentMaintenance {
    const selected = readCheckedMap(root, "maintenance");

    return {
        cover: selected.cover,
        needsInfobox: selected.needsInfobox,
        reassess: selected.reassess,
        screenshot: selected.screenshot,
    };
}

function readAssessmentClass(root: HTMLElement): AssessmentClass {
    const input = requireElement<HTMLInputElement>(
        root,
        "[name='className']:checked",
    );

    if (!CLASS_VALUES.some((candidate) => candidate === input.value)) {
        throw new Error(`Unsupported assessment class: ${input.value}`);
    }

    return input.value as AssessmentClass;
}

function readAssessmentImportance(root: HTMLElement): AssessmentImportance {
    const input = requireElement<HTMLInputElement>(
        root,
        "[name='importance']:checked",
    );

    if (!IMPORTANCE_VALUES.some((candidate) => candidate === input.value)) {
        throw new Error(`Unsupported assessment importance: ${input.value}`);
    }

    return input.value as AssessmentImportance;
}

function readCheckedMap(root: HTMLElement, name: string): SelectionMap {
    const entries = [
        ...root.querySelectorAll<HTMLInputElement>(`[name='${name}']`),
    ].map(function buildEntry(input): [string, boolean] {
        return [input.value, input.checked];
    });
    return Object.fromEntries(entries);
}
