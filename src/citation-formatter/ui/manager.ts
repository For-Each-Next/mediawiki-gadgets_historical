/**
 * Second-run citation management dialog.
 */

import { manageCitations } from "#me/app/format.ts";
import {
    findNameOverrideFields,
    hasCompactReferenceCalls,
    type NameOverrideField,
} from "#me/domain/manager.ts";
import type { editBox } from "#shared";

const HOST_ID = "citation-formatter-manager";
const FILTER_OPTIONS = [
    { label: "Unfilled", value: "unfilled" },
    { label: "Filled", value: "filled" },
    { label: "All", value: "all" },
];
const REVIEW_ICON = {
    path: [
        "M14.7 2.3a1 1 0 0 1 1.4 0l1.6 1.6a",
        "1 1 0 0 1 0 1.4L7 16H3v-4zM5 12.8V",
        "14h1.2l8.4-8.4-1.2-1.2z",
    ].join(""),
};
type OverrideFilter = "all" | "filled" | "unfilled";
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
    CdxCheckbox: unknown;
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
    compact: { value: boolean };
    fields: { value: ReturnType<typeof findNameOverrideFields> };
    filter: { value: OverrideFilter };
    filteredFields: unknown;
    initiallyFilled: Set<string>;
    open: { value: boolean };
    reviewField: { value: NameOverrideField | null };
    reviewOpen: { value: boolean };
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

function createManagerComponent(
    Vue: VueModule,
    editor: editBox.EditBox,
    cleanup: () => void,
): unknown {
    const component = Vue.defineComponent({
        name: "CitationFormatterManager",
        setup: createManagerSetup(Vue, editor, cleanup),
        template: MANAGER_TEMPLATE,
    });
    return component;
}

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
            filterOptions: FILTER_OPTIONS,
            reviewIcon: REVIEW_ICON,
            ...actions,
            ...reviewActions,
            ...state,
        };
        return result;
    };
    return setup;
}

function createManagerState(
    Vue: VueModule,
    editor: editBox.EditBox,
): ManagerState {
    const source = editor.read();
    const fields = Vue.ref(findNameOverrideFields(source));
    const filter = Vue.ref<OverrideFilter>("unfilled");
    const initiallyFilled = new Set(
        fields.value.filter(isFieldFilled).map(getFieldKey),
    );
    const result = {
        compact: Vue.ref(hasCompactReferenceCalls(source)),
        fields,
        filter,
        filteredFields: Vue.computed(() =>
            filterFields(fields.value, filter.value, initiallyFilled),
        ),
        initiallyFilled,
        open: Vue.ref(true),
        reviewField: Vue.ref<NameOverrideField | null>(null),
        reviewOpen: Vue.ref(false),
        source,
    };
    return result;
}

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

function createManagerActions(context: {
    cleanup: () => void;
    compact: { value: boolean };
    editor: editBox.EditBox;
    fields: { value: ReturnType<typeof findNameOverrideFields> };
    open: { value: boolean };
    source: string;
}): Record<string, unknown> {
    const close = function close(): void {
        context.open.value = false;
    };
    const apply = function apply(): void {
        const updates = [];
        for (const field of context.fields.value) {
            for (const occurrence of field.occurrences) {
                updates.push({
                    ids: [occurrence.id],
                    override: occurrence.override,
                });
            }
        }
        const text = manageCitations(
            context.source,
            updates,
            context.compact.value,
        );
        context.editor.write(text);
        context.editor.focus();
        mw.notify("Citation management changes applied.", {
            type: "success",
        });
        close();
    };
    const onOpenChange = (value: boolean): void => {
        if (!value) {
            queueMicrotask(context.cleanup);
        }
    };
    return { apply, close, onOpenChange };
}

function filterFields(
    fields: ReturnType<typeof findNameOverrideFields>,
    filter: OverrideFilter,
    initiallyFilled: Set<string>,
): ReturnType<typeof findNameOverrideFields> {
    if (filter === "all") {
        return fields;
    }
    const filled = filter === "filled";
    const result = fields.filter(
        (field) => initiallyFilled.has(getFieldKey(field)) === filled,
    );
    return result;
}

function getFieldKey(field: NameOverrideField): string {
    return field.ids.join("|");
}

function isFieldFilled(field: NameOverrideField): boolean {
    const result = field.occurrences.every(
        (occurrence) => occurrence.override.trim() !== "",
    );
    return result;
}

function synchronizeFieldOverride(field: NameOverrideField | null): void {
    if (field == null) {
        return;
    }
    const values = new Set(
        field.occurrences.map((occurrence) => occurrence.override),
    );
    field.override = values.size === 1 ? [...values][0] : "";
}

function registerCodexComponents(
    app: VueApp,
    Codex: CodexComponents,
): void {
    app.component("CdxButton", Codex.CdxButton);
    app.component("CdxCheckbox", Codex.CdxCheckbox);
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
    <template #footer>
        <cdx-checkbox v-model="compact">
            Use <span v-pre>{{r}}</span> style
        </cdx-checkbox>
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
