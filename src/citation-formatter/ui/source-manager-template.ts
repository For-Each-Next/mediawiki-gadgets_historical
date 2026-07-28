const MAIN_DIALOG_OPEN_TEMPLATE = `
<cdx-dialog
    v-model:open="open"
    class="cf-source-manager"
    :title="msg( 'tool.name' )"
    :subtitle="toolBuildLabel"
    :lang="interfaceLocale"
    @update:open="onOpenChange"
>
    <cdx-toast-container />
    <cdx-message
        v-if="error"
        type="error"
        class="cf-source-manager__status"
    >
        {{ error }}
    </cdx-message>
    <cdx-message
        v-if="warning"
        type="warning"
        class="cf-source-manager__status"
    >
        {{ warning }}
    </cdx-message>
`;

const LOOKUP_TABS_OPEN_TEMPLATE = `
<div>
    <cdx-tabs
        v-model:active="activeLookupTab"
        class="cf-source-manager__tabs"
    >
`;

const ADD_SOURCE_TAB_TEMPLATE = `
<cdx-tab name="add" :label="msg( 'tabs.addSource' )">
    <form
        class="cf-source-manager__source-lookup"
        @submit.prevent="resolveEnteredSource()"
    >
        <cdx-field>
            <template #label>
                {{ msg( 'lookup.source' ) }}
            </template>
            <template #description>
                {{ msg( 'lookup.sourceDescription' ) }}
            </template>
            <cdx-text-input
                v-model="sourceInput"
                input-type="search"
                :disabled="loading"
                :placeholder="msg( 'lookup.sourcePlaceholder' )"
                autofocus
                @paste="onSourcePaste"
            />
        </cdx-field>
        <cdx-button
            action="progressive"
            weight="primary"
            :disabled="loading"
            type="submit"
        >
            {{ msg( 'lookup.findSource' ) }}
        </cdx-button>
    </form>
    <div v-if="loading" class="cf-source-manager__loading">
        <small>{{ msg( 'lookup.loading' ) }}</small>
        <cdx-progress-bar
            :aria-label="msg( 'lookup.loading' )"
        />
    </div>
    <div class="cf-source-manager__manual-source">
        <cdx-field>
            <template #label>
                {{ msg( 'lookup.citationType' ) }}
            </template>
            <template #description>
                {{ msg( 'lookup.manualDescription' ) }}
            </template>
            <cdx-select
                v-model:selected="manualTemplate"
                :menu-items="manualTemplateOptions"
                :menu-config="{ visibleItemLimit: 8 }"
                :disabled="loading"
            />
        </cdx-field>
        <cdx-field v-if="manualTemplate === '__based-on__'">
            <template #label>
                {{ msg( 'lookup.basedOn' ) }}
            </template>
            <cdx-select
                v-model:selected="basedOnSourceId"
                :menu-items="basedOnSourceOptions"
                :menu-config="{ visibleItemLimit: 6 }"
                :disabled="loading"
                :default-label="msg( 'lookup.chooseExisting' )"
            />
        </cdx-field>
        <cdx-button
            class="cf-source-manager__create-source"
            action="progressive"
            weight="primary"
            :disabled="
                loading ||
                manualTemplate == null ||
                (
                    manualTemplate === '__based-on__' &&
                    basedOnSourceId == null
                )
            "
            @click="createManualSource"
        >
            {{ msg( 'lookup.createSource' ) }}
        </cdx-button>
    </div>
</cdx-tab>
`;

const EXISTING_SOURCES_TAB_OPEN_TEMPLATE = `
<cdx-tab
    name="view"
    :label="
        msg(
            'tabs.viewSources',
            { count: existingSources.length }
        )
    "
>
    <div
        v-if="existingSources.length > 0"
        class="cf-source-manager__source-filters"
    >
        <cdx-field
            class="cf-source-manager__filter-field"
        >
            <template #label>
                {{ keywordFilterLabel }}
            </template>
            <cdx-text-input
                v-model="existingSourceQuery"
                :placeholder="
                    msg( 'lookup.filterKeywordPlaceholder' )
                "
            />
        </cdx-field>
        <div
            v-if="sourceSectionSelectors.length > 0"
            class="cf-source-manager__filter-field"
            role="group"
            aria-labelledby="cf-source-manager-section-filter-label"
        >
            <div
                id="cf-source-manager-section-filter-label"
                class="cf-source-manager__filter-label"
            >
                {{ sectionFilterLabel }}
            </div>
            <div class="cf-source-manager__filter-controls">
                <cdx-combobox
                    v-for="selector in sourceSectionSelectors"
                    :key="selector.level"
                    :selected="selector.selected"
                    :menu-items="selector.menuItems"
                    :menu-config="{ visibleItemLimit: 8 }"
                    :aria-label="selector.label"
                    @update:selected="
                        selectSourceSection( selector, $event )
                    "
                />
            </div>
        </div>
    </div>
    <p v-if="existingSources.length === 0">
        {{ msg( 'lookup.noDefinitions' ) }}
    </p>
    <p v-else-if="filteredExistingSources.length === 0">
        {{ msg( 'lookup.noMatches' ) }}
    </p>
`;

const EXISTING_SOURCE_TABLE_TEMPLATE = `
<cdx-table
    v-else
    class="cf-source-manager__source-table"
    :caption="msg( 'lookup.tableCaption' )"
    :hide-caption="true"
    :use-row-headers="true"
    :columns="sourceTableColumns"
    :data="sourceTableRows"
>
    <template #item-reference="{ item, row }">
        <div class="cf-source-manager__source-reference">
            <span
                class="
                    cf-source-manager__source-reference-name
                "
                :title="item"
            >
                {{ item }}
            </span>
            <small class="cf-source-manager__source-details">
                <code>{{ row.details }}</code>
                <template v-if="row.group">
                    ·
                    {{
                        msg(
                            'lookup.group',
                            { group: row.group }
                        )
                    }}
                </template>
                · {{ row.usageCount }}×
            </small>
        </div>
    </template>
    <template #item-source="{ item, row }">
        <span
            class="cf-source-manager__source-title"
            :lang="row.titleLanguage || undefined"
            :title="item"
        >
            {{ item }}
        </span>
    </template>
    <template #item-actions="{ row }">
        <div class="cf-source-manager__source-actions">
            <cdx-button
                v-tooltip="msg( 'lookup.useSource' )"
                action="progressive"
                weight="quiet"
                :disabled="loading"
                :aria-label="msg( 'lookup.useSource' )"
                @click="insertListedSource( row.id )"
            >
                <cdx-icon :icon="useSourceIcon" />
            </cdx-button>
            <cdx-button
                v-tooltip="msg( 'lookup.editSource' )"
                weight="quiet"
                :disabled="loading"
                :aria-label="msg( 'lookup.editSource' )"
                @click="editListedSource( row.id )"
            >
                <cdx-icon :icon="editSourceIcon" />
            </cdx-button>
        </div>
    </template>
</cdx-table>
`;

const EXISTING_SOURCES_TAB_CLOSE_TEMPLATE = `
</cdx-tab>
`;

const TOOLS_TAB_TEMPLATE = `
<cdx-tab name="tools" :label="msg( 'tabs.tools' )">
    <div class="cf-source-manager__tools">
        <cdx-field
            class="cf-source-manager__advanced-formatting"
            :is-fieldset="true"
        >
            <template #label>
                {{ msg( 'tools.advanced' ) }}
            </template>
            <template #description>
                {{ msg( 'tools.advancedDescription' ) }}
            </template>
            <cdx-checkbox
                :model-value="referenceStyle === 'r'"
                @update:model-value="setCompactReferences"
            >
                {{ msg( 'tools.compactReferences' ) }}
            </cdx-checkbox>
            <cdx-checkbox
                :model-value="citationLayout === 'block'"
                @update:model-value="setBlockCitations"
            >
                {{ msg( 'tools.blockCitations' ) }}
            </cdx-checkbox>
            <cdx-checkbox v-model="autoScriptTitle">
                {{ msg( 'tools.scriptTitle' ) }}
            </cdx-checkbox>
            <cdx-button
                action="progressive"
                weight="primary"
                :disabled="loading"
                @click="formatArticle"
            >
                {{ msg( 'tools.applyFormatting' ) }}
            </cdx-button>
        </cdx-field>
        <section class="cf-source-manager__tool-section">
            <h3>{{ msg( 'tools.checks' ) }}</h3>
            <p>{{ msg( 'tools.checksDescription' ) }}</p>
            <div class="cf-source-manager__tool-launchers">
                <cdx-button
                    action="progressive"
                    @click="openAnalysisTool"
                >
                    {{ msg( 'tools.analyze' ) }}
                </cdx-button>
                <cdx-button
                    v-if="canCheckCs1Tool"
                    action="progressive"
                    :disabled="cs1ToolStatus === 'checking'"
                    @click="openCs1Tool"
                >
                    {{ msg( 'tools.checkCs1' ) }}
                </cdx-button>
                <cdx-button
                    action="progressive"
                    @click="openNonCs1Tool"
                >
                    {{ msg( 'tools.checkNonCs1' ) }}
                </cdx-button>
            </div>
        </section>
    </div>
</cdx-tab>
`;

const LOOKUP_TABS_CLOSE_TEMPLATE = `
</cdx-tabs>
</div>
`;

const DRAFT_EDITOR_OPEN_TEMPLATE = `
<div
    v-if="draft"
    class="cf-source-manager__draft-editor"
    :aria-busy="loading"
>
    <section
        v-if="
            editingSource &&
            editingSource.status === 'non-standard'
        "
        class="cf-source-manager__original-source"
    >
        <h3>{{ msg( 'draft.originalSource' ) }}</h3>
        <p>{{ msg( 'draft.originalDescription' ) }}</p>
        <pre>{{ editingSource.rawReference }}</pre>
    </section>
    <div class="cf-source-manager__draft-header">
        <cdx-field
            class="cf-source-manager__template-field"
            :disabled="loading"
        >
            <template #label>
                {{ msg( 'draft.citationTemplate' ) }}
            </template>
            <cdx-select
                :selected="draft.template"
                :menu-items="templateOptions"
                :menu-config="{ visibleItemLimit: 8 }"
                @update:selected="changeDraftTemplate"
            />
        </cdx-field>
    </div>
`;

const PARAMETER_TABLE_OPEN_TEMPLATE = `
<cdx-table
    class="cf-source-manager__parameter-table"
    :caption="msg( 'draft.parametersCaption' )"
    :hide-caption="true"
    :columns="parameterTableColumns"
    :show-vertical-borders="false"
    :use-row-headers="true"
>
    <template #header>
        <div
            class="
                cf-source-manager__parameter-table-header
            "
        >
            <div
                class="
                    cf-source-manager__reference-name-preview
                "
            >
                <strong>
                    {{ msg( 'draft.referenceName' ) }}:
                </strong>
                <span
                    :title="msg( 'draft.referenceAuthor' )"
                    :class="{
                        'cf-source-manager__reference-name-part--empty':
                            citationNameParts.author === ''
                    }"
                >
                    {{ citationNameParts.author || '—' }}
                </span>
                <span aria-hidden="true"> · </span>
                <span
                    :title="msg( 'draft.referenceYear' )"
                    :class="{
                        'cf-source-manager__reference-name-part--empty':
                            citationNameParts.year === ''
                    }"
                >
                    {{ citationNameParts.year || '—' }}
                </span>
                <span aria-hidden="true"> · </span>
                <span
                    :title="msg( 'draft.referencePart' )"
                    :class="{
                        'cf-source-manager__reference-name-part--empty':
                            citationNameParts.part === ''
                    }"
                >
                    {{ citationNameParts.part || '—' }}
                </span>
            </div>
        </div>
    </template>
    <template #tbody>
        <tbody>
`;

const PARAMETER_ROW_OPEN_TEMPLATE = `
<tr
    v-for="( row, index ) in draft.rows"
    :key="draftRowKey( row )"
    class="cf-source-manager__parameter-row"
    :class="{
        'cf-source-manager__parameter-row--reference-name':
            citationNameCells.has( index )
    }"
>
`;

const PARAMETER_NAME_CELL_TEMPLATE = `
<th
    scope="row"
    class="
        cf-source-manager__parameter-cell
        cf-source-manager__parameter-cell--name
    "
>
    <cdx-combobox
        v-tooltip="getParameterNameTooltip( row.name )"
        v-model:selected="row.name"
        class="cf-source-manager__parameter-name"
        :menu-items="parameterNameOptions"
        :menu-config="{ visibleItemLimit: 8 }"
        :status="
            draftCellErrors.get( index )?.name
                ? 'error'
                : 'default'
        "
        :disabled="loading"
        :aria-label="
            getDraftFieldLabel(
                index,
                'name',
                row.name
            )
        "
        :placeholder="
            msg( 'draft.parameterPlaceholder' )
        "
        @update:selected="
            clearDraftValidationError
        "
    >
        <template #no-results>
            {{ msg( 'draft.customParameter' ) }}
        </template>
    </cdx-combobox>
    <small
        v-if="draftCellErrors.get( index )?.name"
        :id="'cf-parameter-name-error-' + index"
        class="
            cf-source-manager__field-error
        "
    >
        {{ draftCellErrors.get( index ).name }}
    </small>
</th>
`;

const PARAMETER_VALUE_CELL_TEMPLATE = `
<td
    class="
        cf-source-manager__parameter-cell
        cf-source-manager__parameter-cell--value
    "
>
    <cdx-text-area
        :model-value="row.value"
        :autosize="true"
        rows="1"
        wrap="soft"
        :status="
            draftCellErrors.get( index )?.value
                ? 'error'
                : 'default'
        "
        :disabled="loading"
        :aria-label="
            getDraftFieldLabel(
                index,
                'value',
                row.name
            )
        "
        @update:model-value="
            updateParameterValue( index, $event )
        "
    />
    <small
        v-if="row.alias.trim() !== ''"
        class="
            cf-source-manager__parameter-alias-caption
        "
    >
        {{
            getParameterAliasCaption(
                row.name,
                row.alias
            )
        }}
    </small>
    <small
        v-if="draftCellErrors.get( index )?.value"
        :id="'cf-parameter-value-error-' + index"
        class="
            cf-source-manager__field-error
        "
    >
        {{ draftCellErrors.get( index ).value }}
    </small>
    <small
        v-if="draftCellErrors.get( index )?.alias"
        :id="'cf-parameter-alias-error-' + index"
        class="
            cf-source-manager__field-error
        "
    >
        {{ draftCellErrors.get( index ).alias }}
    </small>
    <div
        v-if="getAliasSuggestion( index )"
        class="
            cf-source-manager__alias-suggestion
        "
    >
        <small>
            {{
                msg(
                    'draft.aliasSuggestion',
                    {
                        alias:
                            getAliasSuggestion(
                                index
                            ).alias
                    }
                )
            }}
        </small>
        <div
            class="
                cf-source-manager__alias-suggestion-actions
            "
        >
            <cdx-button
                action="progressive"
                weight="quiet"
                :disabled="loading"
                @click="
                    useAliasSuggestion( index )
                "
            >
                {{ msg( 'common.use' ) }}
            </cdx-button>
            <cdx-button
                weight="quiet"
                :disabled="loading"
                @click="
                    dismissAliasSuggestion( index )
                "
            >
                {{ msg( 'common.dismiss' ) }}
            </cdx-button>
        </div>
    </div>
</td>
`;

const PARAMETER_ACTIONS_CELL_TEMPLATE = `
<td
    class="
        cf-source-manager__parameter-cell
        cf-source-manager__parameter-cell--actions
    "
>
    <div
        class="
            cf-source-manager__parameter-actions
        "
    >
        <cdx-button
            v-tooltip="
                getParameterAliasActionLabel(
                    row
                )
            "
            class="
                cf-source-manager__parameter-alias-action
            "
            :class="{
                'cf-source-manager__parameter-alias-action--excluded':
                    hasReferenceNameExclusion( row )
            }"
            weight="quiet"
            :disabled="loading"
            :aria-label="
                getParameterAliasActionLabel(
                    row
                )
            "
            @click="
                openParameterAliasDialog( index )
            "
        >
            <cdx-icon
                :icon="parameterAliasIcon"
            />
        </cdx-button>
        <a
            v-if="
                isUrlDraftParameter( row.name ) &&
                getOpenableDraftUrl( row.value )
            "
            v-tooltip="msg( 'draft.openUrl' )"
            class="
                cdx-button
                cdx-button--fake-button
                cdx-button--fake-button--enabled
                cdx-button--weight-quiet
                cdx-button--action-default
                cdx-button--icon-only
            "
            :href="getOpenableDraftUrl( row.value )"
            target="_blank"
            rel="noopener noreferrer"
            :aria-label="
                msg(
                    'draft.openUrlLabel',
                    { parameter: row.name }
                )
            "
        >
            <cdx-icon :icon="openUrlIcon" />
        </a>
        <cdx-button
            v-if="
                row.name.trim().toLowerCase() ===
                'url-status'
            "
            v-tooltip="msg( 'draft.switchStatus' )"
            weight="quiet"
            :disabled="loading"
            :aria-label="
                msg( 'draft.switchStatusLabel' )
            "
            @click="switchUrlStatus( index )"
        >
            <cdx-icon :icon="switchStatusIcon" />
        </cdx-button>
        <cdx-button
            v-if="
                isDateAutofillParameter(
                    row.name
                )
            "
            v-tooltip="
                getDateAutofillTooltip( row.name )
            "
            weight="quiet"
            :disabled="loading"
            :aria-label="
                getDateAutofillTooltip( row.name )
            "
            @click="autofillDate( index )"
        >
            <cdx-icon :icon="magicWandIcon" />
        </cdx-button>
        <cdx-button
            v-if="
                isLinkableDraftParameter(
                    row.name
                )
            "
            v-tooltip="msg( 'draft.checkLink' )"
            weight="quiet"
            :disabled="
                loading ||
                row.value.trim() === ''
            "
            :aria-label="
                msg(
                    'draft.checkLinkLabel',
                    { parameter: row.name }
                )
            "
            @click="linkOrganization( index )"
        >
            <cdx-icon :icon="linkIcon" />
        </cdx-button>
        <cdx-button
            v-if="
                isAuthorDraftParameter( row.name )
            "
            v-tooltip="msg( 'draft.splitAuthor' )"
            weight="quiet"
            :disabled="
                loading ||
                !canSplitAuthor( index )
            "
            :aria-label="
                msg(
                    'draft.splitAuthorLabel',
                    { parameter: row.name }
                )
            "
            @click="splitAuthor( index )"
        >
            <cdx-icon
                class="
                    cf-source-manager__split-author-icon
                "
                :icon="splitAuthorIcon"
            />
        </cdx-button>
        <cdx-button
            v-else-if="
                isLastAuthorDraftParameter(
                    row.name
                )
            "
            v-tooltip="msg( 'draft.joinAuthor' )"
            weight="quiet"
            :disabled="
                loading ||
                !canJoinAuthor( index )
            "
            :aria-label="
                msg(
                    'draft.joinAuthorLabel',
                    { parameter: row.name }
                )
            "
            @click="joinAuthor( index )"
        >
            <cdx-icon :icon="joinAuthorIcon" />
        </cdx-button>
    </div>
</td>
`;

const PARAMETER_ROW_CLOSE_TEMPLATE = `
</tr>
`;

const PARAMETER_TABLE_CLOSE_TEMPLATE = `
        </tbody>
    </template>
</cdx-table>
`;

const SOURCE_PREVIEW_CARD_TEMPLATE = `
<cdx-card
    class="
        cf-source-manager__source-preview-card
    "
>
    <template #title>
        {{ msg( 'draft.sourceCode' ) }}
    </template>
    <template #description>
        <code
            class="
                cf-source-manager__source-preview
            "
        ><span
            v-for="( part, index ) in draftSourcePreview"
            :key="index"
            :class="
                'cf-source-manager__source-preview--' +
                part.kind
            "
        >{{ part.text }}</span></code>
    </template>
</cdx-card>
`;

const DRAFT_EDITOR_CLOSE_TEMPLATE = `
</div>
`;

const DRAFT_UTILITY_ACTIONS_TEMPLATE = `
<div class="cf-source-manager__draft-actions">
    <cdx-button :disabled="loading" @click="addParameter">
        {{ msg( 'draft.addParameter' ) }}
    </cdx-button>
    <cdx-button :disabled="loading" @click="sortParameters">
        {{ msg( 'draft.sortParameters' ) }}
    </cdx-button>
    <cdx-button
        v-if="
            editingSource &&
            editingSource.status !== 'non-standard' &&
            !draftReviewTool
        "
        :disabled="loading"
        @click="duplicateDraft"
    >
        {{ msg( 'draft.duplicate' ) }}
    </cdx-button>
</div>
`;

const MAIN_DIALOG_FOOTER_TEMPLATE = `
<template #footer>
    <div class="cf-source-manager__footer-actions">
        <cdx-button
            action="progressive"
            weight="primary"
            :disabled="loading"
            @click="formatArticle"
        >
            {{ msg( 'tool.formatCitations' ) }}
        </cdx-button>
        <cdx-button @click="close">
            {{ msg( 'common.close' ) }}
        </cdx-button>
        <cdx-button
            action="destructive"
            weight="quiet"
            :disabled="loading"
            @click="cancelAllChanges"
        >
            {{ msg( 'common.cancelChanges' ) }}
        </cdx-button>
    </div>
</template>
</cdx-dialog>
`;

const DRAFT_DIALOG_OPEN_TEMPLATE = `
<cdx-dialog
    v-model:open="draftPopupOpen"
    class="cf-source-manager__draft-dialog"
    :title="
        editingSource
            ? msg( 'draft.editSourceTitle' )
            : msg( 'draft.createSourceTitle' )
    "
    :lang="interfaceLocale"
    @update:open="onDraftPopupOpenChange"
>
    <cdx-message
        v-if="error"
        type="error"
        class="cf-source-manager__status"
    >
        {{ error }}
    </cdx-message>
    <cdx-message
        v-if="warning"
        type="warning"
        class="cf-source-manager__status"
    >
        {{ warning }}
    </cdx-message>
    <div
        v-if="draftCs1Checking"
        class="
            cf-source-manager__loading
            cf-source-manager__draft-cs1-progress
        "
        aria-live="polite"
    >
        <small>{{ msg( 'checker.checking' ) }}</small>
        <cdx-progress-bar
            :aria-label="msg( 'checker.checking' )"
        />
    </div>
`;

const DRAFT_DIALOG_FOOTER_TEMPLATE = `
<template #footer>
    <div class="cf-source-manager__draft-footer">
        ${DRAFT_UTILITY_ACTIONS_TEMPLATE}
        <div class="cf-source-manager__footer-actions">
            <cdx-button
                action="progressive"
                weight="primary"
                :disabled="loading"
                @click="saveDraft"
            >
                {{ msg( 'common.save' ) }}
            </cdx-button>
            <cdx-button
                action="progressive"
                :disabled="loading"
                @click="applyDraft"
            >
                {{ msg( 'common.apply' ) }}
            </cdx-button>
            <cdx-button
                action="destructive"
                weight="quiet"
                :disabled="loading"
                @click="closeDraftPopup"
            >
                {{ msg( 'common.cancel' ) }}
            </cdx-button>
        </div>
    </div>
</template>
</cdx-dialog>
`;

const PARAMETER_ALIAS_DIALOG_TEMPLATE = `
<cdx-dialog
    v-model:open="parameterAliasDialogOpen"
    class="
        cf-source-manager__parameter-alias-dialog
    "
    :title="msg( 'draft.alias' )"
    :lang="interfaceLocale"
    @update:open="
        onParameterAliasDialogOpenChange
    "
>
    <div
        class="
            cf-source-manager__parameter-alias-fields
        "
    >
        <cdx-field>
            <template #label>
                {{
                    getParameterAliasOriginalValueLabel()
                }}
            </template>
            <template #description>
                {{
                    msg(
                        'draft.originalValueDescription'
                    )
                }}
            </template>
            <cdx-text-area
                v-model="
                    parameterAliasDialogOriginalValue
                "
                :autosize="true"
                rows="1"
                :status="
                    getParameterAliasDialogError()
                        ? 'error'
                        : 'default'
                "
                :aria-label="
                    getParameterAliasOriginalValueLabel()
                "
            />
        </cdx-field>
        <cdx-field>
            <template #label>
                {{
                    getParameterAliasDialogLabel()
                }}
            </template>
            <template #description>
                {{
                    msg(
                        'draft.aliasDialogDescription'
                    )
                }}
            </template>
            <cdx-text-area
                v-model="parameterAliasDialogValue"
                :autosize="true"
                rows="1"
                :aria-label="
                    getParameterAliasDialogLabel()
                "
                autofocus
            />
        </cdx-field>
        <cdx-field :is-fieldset="true">
            <template #label>
                {{ msg( 'draft.directives' ) }}
            </template>
            <template #description>
                {{ msg( 'draft.directivesDescription' ) }}
            </template>
            <cdx-checkbox
                v-model="parameterAliasDialogDirectives"
                input-value="!no-author"
            >
                <code>!no-author</code>
                — {{ msg( 'draft.noAuthorDirective' ) }}
            </cdx-checkbox>
            <cdx-checkbox
                v-model="parameterAliasDialogDirectives"
                input-value="!no-date"
            >
                <code>!no-date</code>
                — {{ msg( 'draft.noDateDirective' ) }}
            </cdx-checkbox>
            <cdx-checkbox
                v-model="parameterAliasDialogDirectives"
                input-value="!no-part"
            >
                <code>!no-part</code>
                — {{ msg( 'draft.noPartDirective' ) }}
            </cdx-checkbox>
        </cdx-field>
    </div>
    <small
        v-if="getParameterAliasDialogError()"
        class="
            cf-source-manager__field-error
        "
    >
        {{ getParameterAliasDialogError() }}
    </small>
    <template #footer>
        <div
            class="
                cf-source-manager__footer-actions
            "
        >
            <cdx-button
                action="progressive"
                weight="primary"
                :disabled="
                    loading ||
                    !canApplyParameterAlias()
                "
                @click="applyParameterAlias"
            >
                {{ msg( 'common.save' ) }}
            </cdx-button>
            <cdx-button
                action="destructive"
                weight="quiet"
                @click="
                    closeParameterAliasDialog
                "
            >
                {{ msg( 'common.cancel' ) }}
            </cdx-button>
        </div>
    </template>
</cdx-dialog>
`;

const TOOL_DIALOG_OPEN_TEMPLATE = `
<cdx-dialog
    v-model:open="toolPopupOpen"
    class="cf-source-manager__tool-dialog"
    :title="
        toolPopup === 'analysis'
            ? msg( 'analysis.title' )
            : (
                toolPopup === 'cs1'
                    ? msg( 'checker.cs1Title' )
                    : msg( 'checker.nonCs1Title' )
            )
    "
    :lang="interfaceLocale"
    @update:open="onToolPopupOpenChange"
>
`;

const ANALYSIS_TOOL_BODY_TEMPLATE = `
<template v-if="toolPopup === 'analysis'">
    <p class="cf-source-analysis__intro" tabindex="0">
        {{ msg( 'analysis.intro' ) }}
    </p>
    <cdx-tabs
        v-model:active="activeAnalysisTab"
        class="cf-source-analysis__tabs"
    >
        <cdx-tab
            v-for="tab in analysisTabs"
            :key="tab.name"
            :name="tab.name"
            :label="tab.label"
        >
            <cdx-message
                v-if="
                    tab.findings.length === 0 &&
                    tab.appliedFindings.length === 0
                "
                type="success"
            >
                {{ msg( 'analysis.none' ) }}
            </cdx-message>
            <div v-else class="cf-source-analysis__findings">
        <div
            v-for="finding in tab.findings"
            :key="finding.id"
            class="cf-source-analysis__finding"
            :style="{ order: finding.displayOrder }"
        >
            <header class="cf-source-analysis__finding-heading">
                <h4>{{ finding.title }}</h4>
                <p>{{ finding.description }}</p>
            </header>
            <cdx-field
                class="cf-source-analysis__value-options"
                :is-fieldset="true"
            >
                <template #label>
                    {{
                        finding.category === 'alias'
                            ? msg( 'analysis.aliasField' )
                            : msg( 'analysis.valueField' )
                    }}
                </template>
                <div class="cf-source-analysis__radio-options">
                    <cdx-radio
                        v-for="option in finding.options"
                        :key="option.value"
                        v-model="finding.replacementChoice"
                        :name="'analysis-value-' + finding.id"
                        :input-value="option.value"
                        :inline="true"
                        @update:model-value="
                            selectAllAnalysisOccurrences(
                                finding
                            )
                        "
                    >
                        <bdi>
                            {{
                                option.value ||
                                msg( 'analysis.emptyValue' )
                            }}
                        </bdi>
                    </cdx-radio>
                    <div class="cf-source-analysis__custom-option">
                        <cdx-radio
                            v-model="finding.replacementChoice"
                            :name="'analysis-value-' + finding.id"
                            :input-value="customAnalysisReplacement"
                            :inline="true"
                            @update:model-value="
                                selectAllAnalysisOccurrences(
                                    finding
                                )
                            "
                        >
                            {{ msg( 'analysis.customValue' ) }}
                        </cdx-radio>
                        <cdx-text-input
                            v-model="finding.customReplacement"
                            :disabled="
                                finding.replacementChoice !==
                                customAnalysisReplacement
                            "
                            :aria-label="msg( 'analysis.customValue' )"
                        />
                    </div>
                </div>
            </cdx-field>
            <ul class="cf-source-analysis__occurrences">
                <li
                    v-for="occurrence in finding.occurrences"
                    :key="occurrence.id"
                >
                    <cdx-checkbox
                        v-model="occurrence.selected"
                        :disabled="
                            isAnalysisOccurrenceUnchanged(
                                finding,
                                occurrence
                            )
                        "
                    >
                        <span class="cf-source-analysis__occurrence-heading">
                            <strong>
                                {{
                                    occurrence.referenceName ||
                                    msg( 'common.unnamedReference' )
                                }}
                            </strong>
                            <code>|{{ occurrence.parameter }}=</code>
                            <code>{{ occurrence.displayValue }}</code>
                            <code v-if="occurrence.cell === 'alias'">
                                {{
                                    occurrence.value
                                        ? '<!-- # ' +
                                            occurrence.value +
                                            ' -->'
                                        : msg( 'analysis.noHashAlias' )
                                }}
                            </code>
                        </span>
                        <small>
                            {{ occurrence.template }} ·
                            {{ occurrence.title }}
                        </small>
                    </cdx-checkbox>
                </li>
            </ul>
            <div class="cf-source-analysis__selection-actions">
                <cdx-button @click="selectAllAnalysisOccurrences( finding )">
                    {{ msg( 'analysis.selectAll' ) }}
                </cdx-button>
                <cdx-button @click="clearAnalysisSelection( finding )">
                    {{ msg( 'common.clear' ) }}
                </cdx-button>
                <cdx-button
                    action="progressive"
                    weight="primary"
                    :disabled="
                        countSelectedFindingReplacements(
                            finding
                        ) === 0
                    "
                    @click="applyAnalysisFinding( finding )"
                >
                    {{ msg( 'analysis.applyCase' ) }}
                </cdx-button>
            </div>
        </div>
        <div
            v-for="applied in tab.appliedFindings"
            :key="applied.changeId"
            class="
                cf-source-analysis__finding
                cf-source-analysis__finding--changed
            "
            :style="{ order: applied.finding.displayOrder }"
        >
            <header class="cf-source-analysis__finding-heading">
                <h4>{{ applied.finding.title }}</h4>
                <p>{{ applied.finding.description }}</p>
            </header>
            <div class="cf-source-analysis__changed-row">
                <span>
                    <strong>{{ msg( 'analysis.changed' ) }}</strong>
                    <code>
                        {{ getAnalysisReplacement( applied.finding ) }}
                    </code>
                </span>
                <cdx-button
                    action="destructive"
                    weight="primary"
                    @click="
                        revertAppliedAnalysisFinding(
                            applied.changeId
                        )
                    "
                >
                    {{ msg( 'analysis.revert' ) }}
                </cdx-button>
            </div>
            <ul class="cf-source-analysis__occurrences">
                <li
                    v-for="occurrence in applied.finding.occurrences"
                    v-show="occurrence.selected"
                    :key="occurrence.id"
                >
                    <span class="cf-source-analysis__occurrence-heading">
                        <strong>
                            {{
                                occurrence.referenceName ||
                                msg( 'common.unnamedReference' )
                            }}
                        </strong>
                        <code>|{{ occurrence.parameter }}=</code>
                        <code>{{ occurrence.displayValue }}</code>
                    </span>
                    <small>
                        {{ occurrence.template }} ·
                        {{ occurrence.title }}
                    </small>
                </li>
            </ul>
        </div>
            </div>
        </cdx-tab>
    </cdx-tabs>
</template>
`;

const CS1_TOOL_BODY_TEMPLATE = `
<template v-else-if="toolPopup === 'cs1'">
    <p>
        {{
            msg(
                'checker.cs1Description',
                { wiki: cs1WikiLabel }
            )
        }}
    </p>
    <cdx-progress-bar
        v-if="cs1ToolStatus === 'checking'"
        :aria-label="msg( 'checker.checking' )"
    />
    <cdx-message
        v-else-if="cs1ToolStatus === 'unavailable'"
        type="error"
    >
        {{ msg( 'checker.unavailable' ) }}
    </cdx-message>
    <cdx-message
        v-else-if="
            cs1ToolStatus === 'complete' &&
            cs1ToolMessages.length === 0 &&
            cs1ToolSources.length === 0
        "
        type="success"
    >
        {{ msg( 'checker.noIssues' ) }}
    </cdx-message>
    <cdx-message
        v-if="
            cs1ToolStatus === 'complete' &&
            cs1ToolMessages.length > 0
        "
        type="warning"
    >
        <ul>
            <li
                v-for="message in cs1ToolMessages"
                :key="message"
            >
                {{ message }}
            </li>
        </ul>
    </cdx-message>
    <ol
        v-if="
            cs1ToolStatus === 'complete' &&
            cs1ToolSources.length > 0
        "
        class="cf-source-manager__existing-list"
    >
        <li
            v-for="result in cs1ToolSources"
            :key="result.source.id"
            class="
                cf-source-manager__existing-row
                cf-source-manager__existing-row--error
            "
        >
            <div class="cf-source-manager__existing-summary">
                <small
                    class="cf-source-manager__existing-name"
                    :title="
                        result.source.referenceName ||
                        msg( 'common.unnamed' )
                    "
                >
                    ({{
                        result.source.referenceName ||
                        msg( 'common.unnamed' )
                    }})
                </small>
                <span
                    class="cf-source-manager__existing-title"
                    :title="
                        result.source.title ||
                        result.source.url ||
                        msg( 'common.untitledSource' )
                    "
                >
                    {{
                        result.source.title ||
                        result.source.url ||
                        msg( 'common.untitledSource' )
                    }}
                </span>
                <small
                    class="cf-source-manager__existing-meta"
                    :title="result.messages.join( ' · ' )"
                >
                    <code>
                        {{
                            sourceTemplateLabel(
                                result.source.draft.template
                            )
                        }}
                    </code>
                    · {{ result.messages.join( ' · ' ) }}
                </small>
            </div>
            <div class="cf-source-manager__source-actions">
                <cdx-button
                    v-tooltip="msg( 'lookup.editSource' )"
                    weight="quiet"
                    :aria-label="msg( 'lookup.editSource' )"
                    @click="
                        reviewCs1Source( result.source.id )
                    "
                >
                    <cdx-icon :icon="editSourceIcon" />
                </cdx-button>
            </div>
        </li>
    </ol>
</template>
`;

const NON_CS1_TOOL_BODY_TEMPLATE = `
<template v-else-if="toolPopup === 'non-cs1'">
    <p>{{ msg( 'checker.nonCs1Description' ) }}</p>
    <cdx-message
        v-if="nonCs1Sources.length === 0"
        type="success"
    >
        {{ msg( 'checker.noNonCs1' ) }}
    </cdx-message>
    <ol
        v-else
        class="cf-source-manager__existing-list"
    >
        <li
            v-for="source in nonCs1Sources"
            :key="source.id"
            class="
                cf-source-manager__existing-row
                cf-source-manager__existing-row--non-standard
            "
        >
            <div class="cf-source-manager__existing-summary">
                <small
                    class="cf-source-manager__existing-name"
                    :title="
                        source.referenceName ||
                        msg( 'common.unnamed' )
                    "
                >
                    ({{
                        source.referenceName ||
                        msg( 'common.unnamed' )
                    }})
                </small>
                <span
                    class="cf-source-manager__existing-title"
                    :title="
                        source.title ||
                        source.referenceName ||
                        msg( 'common.unnamedReference' )
                    "
                >
                    {{
                        source.title ||
                        source.referenceName ||
                        msg( 'common.unnamedReference' )
                    }}
                </span>
                <small class="cf-source-manager__existing-meta">
                    <code>{{ msg( 'checker.nonCs1Source' ) }}</code>
                    · {{ source.usageCount }}×
                </small>
            </div>
            <div class="cf-source-manager__source-actions">
                <cdx-button
                    v-tooltip="msg( 'checker.convertSource' )"
                    weight="quiet"
                    :aria-label="msg( 'checker.convertSource' )"
                    @click="reviewNonCs1Source( source.id )"
                >
                    <cdx-icon :icon="editSourceIcon" />
                </cdx-button>
            </div>
        </li>
    </ol>
</template>
`;

const TOOL_DIALOG_FOOTER_TEMPLATE = `
<template #footer>
    <div class="cf-source-manager__footer-actions">
        <cdx-button
            v-if="toolPopup === 'analysis'"
            :disabled="countSelectedAnalysisReplacements() === 0"
            action="progressive"
            weight="primary"
            @click="applyAnalysisReplacements"
        >
            {{ msg( 'analysis.applySelected' ) }}
        </cdx-button>
        <cdx-button
            v-if="toolPopup === 'cs1'"
            :disabled="cs1ToolStatus === 'checking'"
            action="progressive"
            weight="primary"
            @click="recheckCs1Tool"
        >
            {{ msg( 'checker.recheckArticle' ) }}
        </cdx-button>
        <cdx-button
            @click="closeToolPopup"
        >
            {{ msg( 'common.close' ) }}
        </cdx-button>
    </div>
</template>
</cdx-dialog>
`;

const CLOSE_CONFIRMATION_DIALOG_TEMPLATE = `
<cdx-dialog
    v-model:open="closeConfirmationOpen"
    class="cf-source-manager__confirmation-dialog"
    :title="msg( 'analysis.closeConfirmationTitle' )"
    :lang="interfaceLocale"
    @update:open="onCloseConfirmationOpenChange"
>
    <p>{{ msg( 'analysis.closeConfirmationBody' ) }}</p>
    <template #footer>
        <div class="cf-source-manager__footer-actions">
            <cdx-button
                action="progressive"
                weight="primary"
                @click="undoAnalysisChangesAndClose"
            >
                {{ msg( 'analysis.undoAndClose' ) }}
            </cdx-button>
            <cdx-button @click="keepAnalysisChangesAndClose">
                {{ msg( 'analysis.keepAndClose' ) }}
            </cdx-button>
            <cdx-button
                action="destructive"
                weight="quiet"
                @click="cancelCloseConfirmation"
            >
                {{ msg( 'common.cancel' ) }}
            </cdx-button>
        </div>
    </template>
</cdx-dialog>
`;

const PARAMETER_ROW_TEMPLATE = [
    PARAMETER_ROW_OPEN_TEMPLATE,
    PARAMETER_NAME_CELL_TEMPLATE,
    PARAMETER_VALUE_CELL_TEMPLATE,
    PARAMETER_ACTIONS_CELL_TEMPLATE,
    PARAMETER_ROW_CLOSE_TEMPLATE,
].join("");

const PARAMETER_TABLE_TEMPLATE = [
    PARAMETER_TABLE_OPEN_TEMPLATE,
    PARAMETER_ROW_TEMPLATE,
    PARAMETER_TABLE_CLOSE_TEMPLATE,
    SOURCE_PREVIEW_CARD_TEMPLATE,
].join("");

const EXISTING_SOURCES_TAB_TEMPLATE = [
    EXISTING_SOURCES_TAB_OPEN_TEMPLATE,
    EXISTING_SOURCE_TABLE_TEMPLATE,
    EXISTING_SOURCES_TAB_CLOSE_TEMPLATE,
].join("");

const LOOKUP_TABS_TEMPLATE = [
    LOOKUP_TABS_OPEN_TEMPLATE,
    ADD_SOURCE_TAB_TEMPLATE,
    EXISTING_SOURCES_TAB_TEMPLATE,
    TOOLS_TAB_TEMPLATE,
    LOOKUP_TABS_CLOSE_TEMPLATE,
].join("");

const DRAFT_EDITOR_TEMPLATE = [
    DRAFT_EDITOR_OPEN_TEMPLATE,
    PARAMETER_TABLE_TEMPLATE,
    DRAFT_EDITOR_CLOSE_TEMPLATE,
].join("");

const DRAFT_DIALOG_TEMPLATE = [
    DRAFT_DIALOG_OPEN_TEMPLATE,
    DRAFT_EDITOR_TEMPLATE,
    DRAFT_DIALOG_FOOTER_TEMPLATE,
].join("");

const MAIN_DIALOG_TEMPLATE = [
    MAIN_DIALOG_OPEN_TEMPLATE,
    LOOKUP_TABS_TEMPLATE,
    MAIN_DIALOG_FOOTER_TEMPLATE,
].join("");

const TOOL_DIALOG_TEMPLATE = [
    TOOL_DIALOG_OPEN_TEMPLATE,
    ANALYSIS_TOOL_BODY_TEMPLATE,
    CS1_TOOL_BODY_TEMPLATE,
    NON_CS1_TOOL_BODY_TEMPLATE,
    TOOL_DIALOG_FOOTER_TEMPLATE,
].join("");

export const SOURCE_MANAGER_TEMPLATE = [
    MAIN_DIALOG_TEMPLATE,
    DRAFT_DIALOG_TEMPLATE,
    PARAMETER_ALIAS_DIALOG_TEMPLATE,
    TOOL_DIALOG_TEMPLATE,
    CLOSE_CONFIRMATION_DIALOG_TEMPLATE,
].join("");
