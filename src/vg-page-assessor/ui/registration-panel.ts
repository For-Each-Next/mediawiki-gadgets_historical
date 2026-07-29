/**
 * Renders and refreshes new-page-list registration controls.
 */

import type { DialogState } from "#gadget/contracts/dialog.ts";
import { shouldRegisterByDefault } from "#gadget/domain/assessment.ts";
import {
    buildLineComparison,
    buildNewPageListSummary,
} from "#gadget/domain/new-page-list.ts";
import type { RegistrationResult } from "#gadget/domain/types.ts";
import { interfaceLocale, msg } from "#gadget/i18n/index.ts";
import * as html from "#shared/html";
import {
    type TemplateAttributes,
    type TemplateElement,
    buildComparisonField,
    buildFieldControl,
    buildTextElement,
    buildTextInputField,
    requireElement,
    updateComparisonTextarea,
} from "#gadget/ui/form-elements.ts";

export type RegistrationUiLogger = (step: string, details?: unknown) => void;

/**
 * Builds the new-page-list registration controls and preview.
 */
export function buildNewPageListFieldset(
    state: DialogState,
    registerDefault: boolean,
): TemplateElement {
    const legend = buildTextElement(
        "legend",
        { class: "avgp-fieldset-title" },
        msg("dialog.newPageList"),
    );

    return html.createElement("fieldset", { class: "avgp-fieldset" }, [
        legend,
        buildRegistrationControl(state, registerDefault),
        buildRegistrationComparison(),
        buildRegistrationSummary(state),
    ]);
}

/**
 * Refreshes registration controls after background loading.
 */
export function refreshRegistrationControls(
    root: HTMLElement,
    state: DialogState,
    currentNamespace: number,
    logStep: RegistrationUiLogger,
): void {
    const registration = state.registration;

    if (registration == null) {
        return;
    }

    const registerDefault =
        shouldRegisterByDefault(currentNamespace, state.subjectTitle) &&
        registration.eligible &&
        !registration.alreadyRegistered;
    const container = requireElement<HTMLElement>(
        root,
        "[data-avgp-register-container]",
    );
    const checkbox = buildRegistrationCheckbox(state, registerDefault);

    html.replaceElementContent(container, html.renderTemplate(checkbox));
    updateRegistrationPreview(root, state, logStep);
}

/**
 * Updates the new-page-list preview.
 */
export function updateRegistrationPreview(
    root: HTMLElement,
    state: DialogState,
    logStep: RegistrationUiLogger,
): void {
    const checkbox = root.querySelector<HTMLInputElement>("[name='register']");
    const shouldRegister = isRegistrationCheckboxSelected(checkbox);
    const canPreview = canShowRegistrationPreview(state);
    const previewRoot = requireElement<HTMLElement>(
        root,
        "[data-avgp-list-preview]",
    );
    const summaryRoot = requireElement<HTMLElement>(
        root,
        ".avgp-list-summary",
    );

    previewRoot.hidden = !canPreview;
    summaryRoot.hidden = !canPreview;

    if (!canPreview) {
        clearRegistrationPreview(root, state, logStep);
        return;
    }

    const comparison = buildRegistrationPreviewComparison(
        state,
        shouldRegister,
    );
    updateComparisonTextarea(
        root,
        "[data-avgp-list-before]",
        comparison.before,
    );
    updateComparisonTextarea(root, "[data-avgp-list-after]", comparison.after);
    logRegistrationPreview(root, shouldRegister, logStep);
}

/**
 * Checks whether the registration checkbox is active and selected.
 */
export function isRegistrationCheckboxSelected(
    checkbox: HTMLInputElement | null,
): boolean {
    return checkbox?.checked === true && !checkbox.disabled;
}

/**
 * Builds the default new-page-list edit summary.
 */
function buildRegistrationDefaultSummary(state: {
    subjectInfo: { listedTitle: string; creationDate: Date };
    subjectTitle: string;
}): string {
    const title = state.subjectInfo.listedTitle || state.subjectTitle;
    return buildNewPageListSummary(title, state.subjectInfo.creationDate);
}

function buildRegistrationControl(
    state: DialogState,
    registerDefault: boolean,
): TemplateElement {
    const checkbox = buildRegistrationCheckbox(state, registerDefault);
    const container = html.createElement(
        "div",
        { "data-avgp-register-container": "" },
        [checkbox],
    );

    return html.createElement("div", { class: "cdx-field avgp-section" }, [
        buildFieldControl([container]),
    ]);
}

function buildRegistrationComparison(): TemplateElement {
    const before = buildListComparisonField("before", "removed");
    const after = buildListComparisonField("after", "added");
    const compareGrid = html.createElement(
        "div",
        { class: "avgp-compare-grid" },
        [before, after],
    );

    return html.createElement(
        "div",
        {
            class: "cdx-field avgp-section avgp-list-preview",
            "data-avgp-list-preview": "",
            hidden: "",
        },
        [buildFieldControl([compareGrid])],
    );
}

function buildListComparisonField(
    position: "after" | "before",
    tone: string,
): TemplateElement {
    return buildComparisonField({
        id: `avgp-list-${position}`,
        label: msg(position === "before" ? "dialog.before" : "dialog.after"),
        textareaAttributes: {
            [`data-avgp-list-${position}`]: "",
            readonly: "",
        },
        tone,
    });
}

function buildRegistrationSummary(state: DialogState): TemplateElement {
    return buildTextInputField({
        className: "avgp-list-summary cdx-field",
        id: "avgp-list-summary",
        label: msg("dialog.editSummary"),
        name: "listSummary",
        value: buildRegistrationDefaultSummary(state),
    });
}

function buildRegistrationCheckbox(
    state: DialogState,
    checked: boolean,
): TemplateElement {
    if (state.registrationLoading) {
        return buildProgressIndicator(msg("registration.loading"));
    }

    const disabled = isRegistrationDisabled(state);
    const input = html.createElement(
        "input",
        buildRegistrationInputAttributes(checked, disabled),
    );
    const icon = html.createElement("span", {
        class: "cdx-checkbox__icon",
    });
    const label = buildRegistrationLabel(
        getRegistrationLabel(
            state.registration,
            state.subjectInfo.creationDate,
        ),
    );
    const wrapper = html.createElement(
        "div",
        { class: "cdx-checkbox__wrapper" },
        [input, icon, label],
    );

    return html.createElement("div", { class: "cdx-checkbox" }, [wrapper]);
}

function isRegistrationDisabled(state: DialogState): boolean {
    return (
        state.registrationLoading ||
        state.registration == null ||
        !state.registration.eligible ||
        state.registration.alreadyRegistered
    );
}

function buildRegistrationInputAttributes(
    checked: boolean,
    disabled: boolean,
): TemplateAttributes {
    const attributes: TemplateAttributes = {
        class: "cdx-checkbox__input",
        id: "avgp-register",
        name: "register",
        type: "checkbox",
        value: "register",
    };

    if (checked) {
        attributes.checked = "";
    }
    if (disabled) {
        attributes.disabled = "";
    }

    return attributes;
}

function buildRegistrationLabel(label: string): TemplateElement {
    const labelText = buildTextElement(
        "span",
        { class: "cdx-label__label__text" },
        label,
    );
    const inputLabel = html.createElement(
        "label",
        { class: "cdx-label__label", for: "avgp-register" },
        [labelText],
    );

    return html.createElement(
        "div",
        { class: "cdx-checkbox__label cdx-label" },
        [inputLabel],
    );
}

function buildProgressIndicator(label: string): TemplateElement {
    const progress = html.createElement("progress", {
        "aria-label": label,
        class: "cdx-progress-indicator__indicator",
    });
    const status = buildTextElement(
        "span",
        { class: "cdx-progress-indicator__label" },
        label,
    );

    return html.createElement(
        "div",
        {
            "aria-live": "polite",
            class: "cdx-progress-indicator avgp-register-loading",
            role: "status",
        },
        [progress, status],
    );
}

function getRegistrationLabel(
    registration: RegistrationResult | null,
    creationDate: Date,
): string {
    if (registration == null) {
        return msg("registration.loading");
    }

    const created = msg("registration.createdOn", {
        date: formatInterfaceDate(creationDate),
    });

    if (!registration.eligible) {
        return msg("registration.ineligible", { created });
    }

    if (
        registration.existing?.date != null &&
        registration.existing.listedTitle
    ) {
        return msg("registration.existing", {
            date: formatInterfaceDate(registration.existing.date),
            title: registration.existing.listedTitle,
        });
    }

    if (registration.alreadyRegistered) {
        return msg("registration.alreadyRegistered");
    }

    return msg("registration.register", { created });
}

function formatInterfaceDate(date: Date): string {
    return new Intl.DateTimeFormat(interfaceLocale, {
        day: "numeric",
        month: "long",
        timeZone: "UTC",
    }).format(date);
}

function canShowRegistrationPreview(state: DialogState): boolean {
    return (
        !state.registrationLoading &&
        state.registration?.eligible === true &&
        !state.registration.alreadyRegistered
    );
}

function clearRegistrationPreview(
    root: HTMLElement,
    state: DialogState,
    logStep: RegistrationUiLogger,
): void {
    updateComparisonTextarea(root, "[data-avgp-list-before]", "");
    updateComparisonTextarea(root, "[data-avgp-list-after]", "");
    logStep("updateRegistrationPreview hidden", {
        registration: summarizeRegistration(state.registration),
    });
}

function buildRegistrationPreviewComparison(
    state: DialogState,
    shouldRegister: boolean,
): { after: string; before: string } {
    const registration = state.registration;
    const newPageList = state.newPageList;

    if (
        !shouldRegister ||
        registration == null ||
        newPageList == null ||
        !registration.changed
    ) {
        return { after: "No changes.", before: "No changes." };
    }

    return buildLineComparison(newPageList.text, registration.proposedText, 1);
}

function logRegistrationPreview(
    root: HTMLElement,
    shouldRegister: boolean,
    logStep: RegistrationUiLogger,
): void {
    const after = requireElement<HTMLTextAreaElement>(
        root,
        "[data-avgp-list-after]",
    );
    const before = requireElement<HTMLTextAreaElement>(
        root,
        "[data-avgp-list-before]",
    );

    logStep("updateRegistrationPreview done", {
        afterLength: after.value.length,
        beforeLength: before.value.length,
        shouldRegister,
    });
}

function summarizeRegistration(
    registration: RegistrationResult | null,
): Record<string, unknown> {
    return {
        alreadyRegistered: registration?.alreadyRegistered,
        changed: registration?.changed,
        earliestDate: registration?.earliestDate?.toISOString(),
        eligible: registration?.eligible,
        existing: registration?.existing,
        proposedLength: registration?.proposedText?.length,
    };
}
