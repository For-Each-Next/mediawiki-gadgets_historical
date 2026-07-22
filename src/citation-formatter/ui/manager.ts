/**
 * Second-run citation management dialog.
 */

import { manageCitations } from "#me/app/format.ts";
import {
    detectCitationLayout,
    findNameOverrideFields,
    hasCompactReferenceCalls,
    type NameOverrideField,
    type NameOverrideUpdate,
} from "#me/domain/manager.ts";
import type { CitationLayout } from "#me/domain/types.ts";
import type { editBox } from "#shared";

const HOST_ID = "citation-formatter-manager";
const FILTER_OPTIONS = [
    { label: "Unfilled", value: "unfilled" },
    { label: "Filled", value: "filled" },
    { label: "All", value: "all" },
];
const REFERENCE_STYLE_OPTIONS = [
    { label: "<ref>", value: "ref" },
    { label: "{{r}}", value: "r" },
];
const CITATION_LAYOUT_OPTIONS = [
    { label: "Inline", value: "inline" },
    { label: "Block (two-space indent)", value: "block" },
];
const REVIEW_ICON = {
    path: [
        "M14.7 2.3a1 1 0 0 1 1.4 0l1.6 1.6a",
        "1 1 0 0 1 0 1.4L7 16H3v-4zM5 12.8V",
        "14h1.2l8.4-8.4-1.2-1.2z",
    ].join(""),
};
type OverrideFilter = "all" | "filled" | "unfilled";
type ReferenceStyle = "r" | "ref";
let removeActiveManager: (() => void) | null = null;

interface VueModule {
    computed: (getter: () => unknown) => unknown;
    createMwApp: (component: unknown) => VueApp;
    defineComponent: (component: unknown) => unknown;
    ref: <T>(value: T) => { value: T };
}

interface VueApp {
    component: (name: string, component: unknown) => void;
    directive: (name: string, directive: unknown) => void;
    mount: (host: HTMLElement) => void;
    unmount: () => void;
}

interface CodexComponents {
    CdxButton: unknown;
    CdxDialog: unknown;
    CdxField: unknown;
    CdxIcon: unknown;
    CdxInfoChip: unknown;
    CdxRadio: unknown;
    CdxTextInput: unknown;
    CdxTooltip: unknown;
}

interface ResourceLoaderRequire {
    (module: "vue"): VueModule;
    (module: "@wikimedia/codex"): CodexComponents;
}

interface ManagerState {
    citationLayout: { value: CitationLayout };
    fields: { value: ReturnType<typeof findNameOverrideFields> };
    filter: { value: OverrideFilter };
    filteredFields: unknown;
    initiallyFilled: Set<string>;
    open: { value: boolean };
    reviewField: { value: NameOverrideField | null };
    reviewOpen: { value: boolean };
    referenceStyle: { value: ReferenceStyle };
    source: string;
}

/**
 * Opens citation override and temporary-call controls.
 *
 * @param editor - Active MediaWiki source editor.
 */
export async function openCitationManager(
    editor: editBox.EditBox,
): Promise<void> {
    removeActiveManager?.();
    const require = (await mw.loader.using([
        "vue",
        "@wikimedia/codex",
    ])) as ResourceLoaderRequire;
    mountCitationManager(editor, require);
}

/**
 * Mounts the citation manager in a temporary document host.
 *
 * @param editor - Active MediaWiki source editor.
 * @param require - ResourceLoader module resolver.
 */
function mountCitationManager(
    editor: editBox.EditBox,
    require: ResourceLoaderRequire,
): void {
    const Vue = require("vue");
    const Codex = require("@wikimedia/codex");
    const host = document.createElement("div");
    host.id = HOST_ID;
    document.documentElement.append(host);
    const cleanup = function cleanup(): void {
        application.unmount();
        host.remove();
        removeActiveManager = null;
    };
    const component = createManagerComponent(Vue, editor, cleanup);
    const application = Vue.createMwApp(component);
    registerCodexComponents(application, Codex);
    application.mount(host);
    removeActiveManager = cleanup;
}

/**
 * Creates the citation-manager Vue component.
 *
 * @param Vue - Loaded Vue module.
 * @param editor - Active MediaWiki source editor.
 * @param cleanup - Dialog cleanup callback.
 * @returns Vue component definition.
 */
function createManagerComponent(
    Vue: VueModule,
    editor: editBox.EditBox,
    cleanup: () => void,
): unknown {
    const setup = createManagerSetup(Vue, editor, cleanup);
    const component = Vue.defineComponent({
        name: "CitationFormatterManager",
        setup,
        template: MANAGER_TEMPLATE,
    });
    return component;
}

/**
 * Creates the citation-manager setup callback.
 *
 * @param Vue - Loaded Vue module.
 * @param editor - Active MediaWiki source editor.
 * @param cleanup - Dialog cleanup callback.
 * @returns Vue setup callback.
 */
function createManagerSetup(
    Vue: VueModule,
    editor: editBox.EditBox,
    cleanup: () => void,
): () => Record<string, unknown> {
    const setup = function setup(): Record<string, unknown> {
        const state = createManagerState(Vue, editor);
        const actions = createManagerActions({
            cleanup,
            editor,
            ...state,
        });
        const reviewActions = createReviewActions(state);
        function countFilter(value: OverrideFilter): number {
            const result = filterFields(
                state.fields.value,
                value,
                state.initiallyFilled,
            );
            return result.length;
        }
        // noinspection JSUnusedGlobalSymbols -- Vue template bindings.
        const result = {
            countFilter,
            citationLayoutOptions: CITATION_LAYOUT_OPTIONS,
            filterOptions: FILTER_OPTIONS,
            referenceStyleOptions: REFERENCE_STYLE_OPTIONS,
            reviewIcon: REVIEW_ICON,
            ...actions,
            ...reviewActions,
            ...state,
        };
        return result;
    };
    return setup;
}

/**
 * Creates reactive state for the citation manager.
 *
 * @param Vue - Loaded Vue module.
 * @param editor - Active MediaWiki source editor.
 * @returns Reactive manager state.
 */
function createManagerState(
    Vue: VueModule,
    editor: editBox.EditBox,
): ManagerState {
    const source = editor.read();
    const enteredFields = findNameOverrideFields(source);
    const fields = Vue.ref(enteredFields);
    const filter = Vue.ref<OverrideFilter>("unfilled");
    const initiallyFilledKeys = fields.value
        .filter(isFieldFilled)
        .map(getFieldKey);
    const initiallyFilled = new Set(initiallyFilledKeys);
    const compactReferences = hasCompactReferenceCalls(source);
    const referenceStyle: ReferenceStyle = compactReferences ? "r" : "ref";
    const computedCallback = function getFilteredFields() {
        return filterFields(fields.value, filter.value, initiallyFilled);
    };
    const result = {
        citationLayout: Vue.ref(detectCitationLayout(source)),
        fields,
        filter,
        filteredFields: Vue.computed(computedCallback),
        initiallyFilled,
        open: Vue.ref(true),
        reviewField: Vue.ref<NameOverrideField | null>(null),
        reviewOpen: Vue.ref(false),
        referenceStyle: Vue.ref(referenceStyle),
        source,
    };
    return result;
}

/**
 * Creates actions for reviewing individual name overrides.
 *
 * @param state - Reactive manager state.
 * @returns Review actions exposed to the template.
 */
function createReviewActions(state: ManagerState): Record<string, unknown> {
    function reviewIndividually(field: NameOverrideField): void {
        state.reviewField.value = field;
        state.reviewOpen.value = true;
    }
    function setBulkOverride(field: NameOverrideField, value: string): void {
        field.override = value;
        for (const occurrence of field.occurrences) {
            occurrence.override = value;
        }
    }
    function finishReview(): void {
        synchronizeFieldOverride(state.reviewField.value);
        state.reviewOpen.value = false;
    }
    function onReviewOpenChange(value: boolean): void {
        if (!value) {
            synchronizeFieldOverride(state.reviewField.value);
        }
    }
    // noinspection JSUnusedGlobalSymbols -- Vue template bindings.
    const result = {
        finishReview,
        onReviewOpenChange,
        reviewIndividually,
        setBulkOverride,
    };
    return result;
}

/**
 * Creates the manager's apply and close actions.
 *
 * @param context - Manager state and editor dependencies.
 * @returns Manager actions exposed to the template.
 */
function createManagerActions(context: {
    cleanup: () => void;
    citationLayout: { value: CitationLayout };
    editor: editBox.EditBox;
    fields: { value: ReturnType<typeof findNameOverrideFields> };
    open: { value: boolean };
    referenceStyle: { value: ReferenceStyle };
    source: string;
}): Record<string, unknown> {
    const close = function close(): void {
        context.open.value = false;
    };
    const apply = function apply(): void {
        const updates = buildNameOverrideUpdates(context.fields.value);
        const text = manageCitations(
            context.source,
            updates,
            context.referenceStyle.value === "r",
            context.citationLayout.value,
        );
        context.editor.write(text);
        context.editor.focus();
        mw.notify("Citation management changes applied.", {
            type: "success",
        });
        close();
    };
    function onOpenChange(value: boolean): void {
        if (!value) {
            queueMicrotask(context.cleanup);
        }
    }
    return { apply, close, onOpenChange };
}

/**
 * Expands grouped manager fields into occurrence-specific updates.
 *
 * @param fields - Editable grouped override fields.
 * @returns Override updates for every citation occurrence.
 */
function buildNameOverrideUpdates(
    fields: ReturnType<typeof findNameOverrideFields>,
): NameOverrideUpdate[] {
    const updates = [];
    for (const field of fields) {
        for (const occurrence of field.occurrences) {
            updates.push({
                ids: [occurrence.id],
                override: occurrence.override,
            });
        }
    }
    return updates;
}

/**
 * Filters override fields by their initially populated state.
 *
 * @param fields - Available override fields.
 * @param filter - Selected population filter.
 * @param initiallyFilled - Keys populated when the dialog opened.
 * @returns Fields matching the selected filter.
 */
function filterFields(
    fields: ReturnType<typeof findNameOverrideFields>,
    filter: OverrideFilter,
    initiallyFilled: Set<string>,
): ReturnType<typeof findNameOverrideFields> {
    if (filter === "all") {
        return fields;
    }
    const filled = filter === "filled";
    const filterCallback = function matchesFilter(field: NameOverrideField) {
        const key = getFieldKey(field);
        return initiallyFilled.has(key) === filled;
    };
    const result = fields.filter(filterCallback);
    return result;
}

/**
 * Builds a stable key for one grouped override field.
 *
 * @param field - Grouped override field.
 * @returns Stable occurrence key.
 */
function getFieldKey(field: NameOverrideField): string {
    return field.ids.join("|");
}

/**
 * Checks whether every occurrence has an override.
 *
 * @param field - Grouped override field.
 * @returns Whether every occurrence is populated.
 */
function isFieldFilled(field: NameOverrideField): boolean {
    const everyCallback = (
        occurrence: NameOverrideField["occurrences"][number],
    ) => occurrence.override.trim() !== "";
    const result = field.occurrences.every(everyCallback);
    return result;
}

/**
 * Synchronizes a grouped value after individual review.
 *
 * @param field - Reviewed override field, when selected.
 */
function synchronizeFieldOverride(field: NameOverrideField | null): void {
    if (field == null) {
        return;
    }
    const overrideValues = field.occurrences.map(
        (occurrence) => occurrence.override,
    );
    const values = new Set(overrideValues);
    field.override = values.size === 1 ? [...values][0] : "";
}

/**
 * Registers the Codex components used by the manager template.
 *
 * @param app - Citation-manager Vue application.
 * @param Codex - Loaded Codex component module.
 */
function registerCodexComponents(app: VueApp, Codex: CodexComponents): void {
    app.component("CdxButton", Codex.CdxButton);
    app.component("CdxDialog", Codex.CdxDialog);
    app.component("CdxField", Codex.CdxField);
    app.component("CdxIcon", Codex.CdxIcon);
    app.component("CdxInfoChip", Codex.CdxInfoChip);
    app.component("CdxRadio", Codex.CdxRadio);
    app.component("CdxTextInput", Codex.CdxTextInput);
    app.directive("tooltip", Codex.CdxTooltip);
}

const MANAGER_TEMPLATE = `
<cdx-dialog
    v-model:open="open"
    class="cf-manager"
    title="Citation formatter"
    @update:open="onOpenChange"
>
    <section>
        <h3>Reference-name overrides</h3>
        <cdx-field
            v-if="fields.length > 0"
            class="cf-manager__filter"
            :is-fieldset="true"
            :hide-label="true"
        >
            <template #label>Filter reference-name overrides</template>
            <cdx-radio
                v-for="option in filterOptions"
                :key="option.value"
                v-model="filter"
                name="citation-override-filter"
                :input-value="option.value"
                :inline="true"
            >
                {{ option.label }} ({{ countFilter( option.value ) }})
            </cdx-radio>
        </cdx-field>
        <p v-if="fields.length === 0" class="cf-manager__empty">
            No editable name fields found.
        </p>
        <div v-else class="cf-manager__overrides">
            <div
                v-for="field in filteredFields"
                :key="field.ids.join( '|' )"
                class="cf-manager__row"
            >
                <cdx-field>
                    <template #label>
                        {{ field.displayValue }}
                    </template>
                    <template #help-text>
                        <cdx-info-chip
                            v-for="item in field.usageItems"
                            :key="item.label"
                            status="subtle"
                        >
                            {{ item.label }} {{ item.count }}
                        </cdx-info-chip>
                        <cdx-button
                            v-tooltip="'Check each use'"
                            weight="quiet"
                            aria-label="Check each use"
                            @click="reviewIndividually( field )"
                        >
                            <cdx-icon :icon="reviewIcon" />
                        </cdx-button>
                    </template>
                    <cdx-text-input
                        :model-value="field.override"
                        placeholder="Romanization"
                        @update:model-value="setBulkOverride( field, $event )"
                    />
                </cdx-field>
            </div>
        </div>
    </section>
    <section>
        <h3>Formatting style</h3>
        <cdx-field :is-fieldset="true">
            <template #label>Reference calls</template>
            <cdx-radio
                v-for="option in referenceStyleOptions"
                :key="option.value"
                v-model="referenceStyle"
                name="citation-reference-style"
                :input-value="option.value"
                :inline="true"
            >
                {{ option.label }}
            </cdx-radio>
        </cdx-field>
        <cdx-field :is-fieldset="true">
            <template #label>Citation templates</template>
            <cdx-radio
                v-for="option in citationLayoutOptions"
                :key="option.value"
                v-model="citationLayout"
                name="citation-template-layout"
                :input-value="option.value"
                :inline="true"
            >
                {{ option.label }}
            </cdx-radio>
        </cdx-field>
    </section>
    <template #footer>
        <cdx-button @click="close">Cancel</cdx-button>
        <cdx-button
            action="progressive"
            weight="primary"
            @click="apply"
        >
            Apply
        </cdx-button>
    </template>
</cdx-dialog>
<cdx-dialog
    v-model:open="reviewOpen"
    :title="reviewField ? 'Review ' + reviewField.displayValue : 'Review'"
    @update:open="onReviewOpenChange"
>
    <div v-if="reviewField" class="cf-manager__review-fields">
        <cdx-field
            v-for="occurrence in reviewField.occurrences"
            :key="occurrence.id"
        >
            <template #label>
                {{ occurrence.template }} · {{ occurrence.parameter }}
            </template>
            <template #description>
                {{ occurrence.source }}
            </template>
            <cdx-text-input
                v-model="occurrence.override"
                :placeholder="reviewField.displayValue"
            />
        </cdx-field>
    </div>
    <template #footer>
        <cdx-button
            action="progressive"
            weight="primary"
            @click="finishReview"
        >
            Done
        </cdx-button>
    </template>
</cdx-dialog>
`;
