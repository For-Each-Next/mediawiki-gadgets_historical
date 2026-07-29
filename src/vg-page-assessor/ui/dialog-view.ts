/**
 * Builds the assessor dialog shell and exposes its status surface.
 */

import type { DialogState } from "#gadget/contracts/dialog.ts";
import { msg } from "#gadget/i18n/index.ts";
import * as html from "#shared/html";
import { buildAssessmentFieldset } from "#gadget/ui/assessment-form.ts";
import {
    type TemplateElement,
    buildButton,
    buildTextElement,
    requireElement,
} from "#gadget/ui/form-elements.ts";
import { buildNewPageListFieldset } from "#gadget/ui/registration-panel.ts";

/**
 * Renders the dialog form markup.
 */
export function renderDialogMarkup(
    state: DialogState,
    registerDefault: boolean,
): string {
    const heading = buildTextElement(
        "h2",
        { class: "avgp-heading cdx-title" },
        state.subjectTitle,
    );
    const header = html.createElement("header", { class: "avgp-header" }, [
        heading,
    ]);
    const form = html.createElement(
        "form",
        { class: "avgp-shell cdx-docs", method: "dialog" },
        [
            header,
            buildAssessmentFieldset(state),
            buildNewPageListFieldset(state, registerDefault),
            buildDialogActions(),
        ],
    );

    return html.renderTemplate(form);
}

/**
 * Shows dialog status text.
 */
export function setDialogStatus(
    root: HTMLElement,
    text: string,
    isError: boolean,
): void {
    const status = requireElement<HTMLElement>(root, "[data-avgp-status]");

    status.textContent = text;
    status.classList.toggle("avgp-status--error", isError);
    status.dataset.status = isError ? "error" : "default";
}

function buildDialogActions(): TemplateElement {
    const status = html.createElement("span", {
        class: "avgp-status",
        "data-avgp-status": "",
    });
    const cancel = buildButton(msg("dialog.cancel"), {
        class: "cdx-button",
        "data-avgp-cancel": "",
        type: "button",
    });
    const save = buildButton(msg("dialog.save"), {
        class: [
            "cdx-button",
            "cdx-button--action-progressive",
            "cdx-button--weight-primary",
        ].join(" "),
        "data-avgp-save": "",
        type: "button",
    });

    return html.createElement("div", { class: "avgp-actions" }, [
        status,
        cancel,
        save,
    ]);
}
