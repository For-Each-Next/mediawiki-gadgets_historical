<template>
    <cdx-dialog
        v-model:open="open"
        class="cf-source-manager"
        :title="msg('tool.name')"
        :subtitle="toolVersionLabel"
        :lang="interfaceLocale"
        @update:open="onOpenChange"
    >
        <div class="cf-source-manager__dialog-body-content">
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
            <div>
                <cdx-tabs
                    v-model:active="activeLookupTab"
                    class="cf-source-manager__tabs"
                >
                    <cdx-tab name="add" :label="msg('tabs.addSource')">
                        <form
                            class="cf-source-manager__source-lookup"
                            @submit.prevent="resolveEnteredSource()"
                        >
                            <cdx-field>
                                <template #label>
                                    {{ msg("lookup.source") }}
                                </template>
                                <template #description>
                                    {{ msg("lookup.sourceDescription") }}
                                </template>
                                <cdx-text-input
                                    v-model="sourceInput"
                                    input-type="search"
                                    :disabled="loading"
                                    :placeholder="
                                        msg('lookup.sourcePlaceholder')
                                    "
                                    autofocus
                                    @paste="onSourcePaste"
                                />
                                <template #help-text>
                                    {{ msg("lookup.sourceHelpText") }}
                                </template>
                            </cdx-field>
                            <cdx-button
                                action="progressive"
                                weight="primary"
                                :disabled="loading"
                                type="submit"
                            >
                                {{ msg("lookup.findSource") }}
                            </cdx-button>
                        </form>
                        <div v-if="loading" class="cf-source-manager__loading">
                            <small>{{ msg("lookup.loading") }}</small>
                            <cdx-progress-bar
                                :aria-label="msg('lookup.loading')"
                            />
                        </div>
                        <div class="cf-source-manager__manual-source">
                            <cdx-field>
                                <template #label>
                                    {{ msg("lookup.citationType") }}
                                </template>
                                <template #description>
                                    {{ msg("lookup.manualDescription") }}
                                </template>
                                <cdx-select
                                    v-model:selected="manualTemplate"
                                    :menu-items="manualTemplateOptions"
                                    :menu-config="{ visibleItemLimit: 8 }"
                                    :disabled="loading"
                                />
                            </cdx-field>
                            <cdx-field
                                v-if="manualTemplate === '__based-on__'"
                            >
                                <template #label>
                                    {{ msg("lookup.basedOn") }}
                                </template>
                                <cdx-select
                                    v-model:selected="basedOnSourceId"
                                    :menu-items="basedOnSourceOptions"
                                    :menu-config="{ visibleItemLimit: 6 }"
                                    :disabled="loading"
                                    :default-label="
                                        msg('lookup.chooseExisting')
                                    "
                                />
                            </cdx-field>
                            <cdx-button
                                class="cf-source-manager__create-source"
                                action="progressive"
                                weight="primary"
                                :disabled="
                                    loading ||
                                    manualTemplate == null ||
                                    (manualTemplate === '__based-on__' &&
                                        basedOnSourceId == null)
                                "
                                @click="createManualSource"
                            >
                                {{ msg("lookup.createSource") }}
                            </cdx-button>
                        </div>
                    </cdx-tab>
                    <cdx-tab
                        name="view"
                        :label="
                            msg('tabs.viewSources', {
                                count: existingSources.length,
                            })
                        "
                    >
                        <div
                            v-if="existingSources.length > 0"
                            class="cf-source-manager__source-filters"
                        >
                            <cdx-field class="cf-source-manager__filter-field">
                                <template #label>
                                    {{ keywordFilterLabel }}
                                </template>
                                <cdx-text-input
                                    v-model="existingSourceQuery"
                                    :placeholder="
                                        msg('lookup.filterKeywordPlaceholder')
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
                                <div
                                    class="cf-source-manager__filter-controls"
                                >
                                    <cdx-combobox
                                        v-for="selector in sourceSectionSelectors"
                                        :key="selector.level"
                                        :selected="selector.selected"
                                        :menu-items="selector.menuItems"
                                        :menu-config="{ visibleItemLimit: 8 }"
                                        :aria-label="selector.label"
                                        @update:selected="
                                            selectSourceSection(
                                                selector,
                                                $event,
                                            )
                                        "
                                    />
                                </div>
                            </div>
                        </div>
                        <p v-if="existingSources.length === 0">
                            {{ msg("lookup.noDefinitions") }}
                        </p>
                        <p v-else-if="filteredExistingSources.length === 0">
                            {{ msg("lookup.noMatches") }}
                        </p>
                        <cdx-table
                            v-else
                            :key="sourceTablePaginationKey"
                            class="cf-source-manager__source-table"
                            :caption="msg('lookup.tableCaption')"
                            :hide-caption="true"
                            :use-row-headers="true"
                            :columns="sourceTableColumns"
                            :data="sourceTableRows"
                            :paginate="sourceTableRows.length > 100"
                            :pagination-size-default="100"
                            :pagination-size-options="[
                                { value: 10 },
                                { value: 20 },
                                { value: 50 },
                                { value: 100 },
                            ]"
                        >
                            <template #item-reference="{ item, row }">
                                <div
                                    class="cf-source-manager__source-reference"
                                >
                                    <span
                                        class="cf-source-manager__source-reference-name"
                                        :title="item"
                                    >
                                        {{ item }}
                                    </span>
                                    <small
                                        class="cf-source-manager__source-details"
                                    >
                                        <code>{{ row.details }}</code>
                                        <template v-if="row.group">
                                            ·
                                            {{
                                                msg("lookup.group", {
                                                    group: row.group,
                                                })
                                            }}
                                        </template>
                                        ·
                                        <span :title="row.usageTitle">
                                            {{ row.usageCount }}×
                                        </span>
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
                                        action="progressive"
                                        weight="quiet"
                                        :disabled="loading"
                                        :aria-label="msg('lookup.useSource')"
                                        :title="msg('lookup.useSource')"
                                        @click="insertListedSource(row.id)"
                                    >
                                        <cdx-icon :icon="useSourceIcon" />
                                    </cdx-button>
                                    <cdx-button
                                        weight="quiet"
                                        :disabled="loading"
                                        :aria-label="msg('lookup.editSource')"
                                        :title="msg('lookup.editSource')"
                                        @click="editListedSource(row.id)"
                                    >
                                        <cdx-icon :icon="editSourceIcon" />
                                    </cdx-button>
                                </div>
                            </template>
                        </cdx-table>
                    </cdx-tab>
                    <cdx-tab name="tools" :label="msg('tabs.tools')">
                        <div class="cf-source-manager__tools">
                            <cdx-field
                                class="cf-source-manager__advanced-formatting"
                                :is-fieldset="true"
                            >
                                <template #label>
                                    {{ msg("tools.advanced") }}
                                </template>
                                <template #description>
                                    {{ msg("tools.advancedDescription") }}
                                </template>
                                <cdx-checkbox
                                    :model-value="referenceStyle === 'r'"
                                    @update:model-value="setCompactReferences"
                                >
                                    {{ msg("tools.compactReferences") }}
                                </cdx-checkbox>
                                <cdx-checkbox
                                    :model-value="citationLayout === 'block'"
                                    @update:model-value="setBlockCitations"
                                >
                                    {{ msg("tools.blockCitations") }}
                                </cdx-checkbox>
                                <cdx-field :is-fieldset="true">
                                    <template #label>
                                        {{ msg("tools.scriptTitle") }}
                                    </template>
                                    <cdx-checkbox
                                        :model-value="formatScriptTitles"
                                        @update:model-value="
                                            setFormatScriptTitles
                                        "
                                    >
                                        {{ msg("tools.formatScriptTitles") }}
                                    </cdx-checkbox>
                                    <cdx-radio
                                        :model-value="scriptTitleMode"
                                        :disabled="!formatScriptTitles"
                                        input-value="non-latin"
                                        name="script-title-mode"
                                        @update:model-value="
                                            setScriptTitleMode
                                        "
                                    >
                                        {{ msg("tools.scriptTitleNonLatin") }}
                                    </cdx-radio>
                                    <cdx-radio
                                        :model-value="scriptTitleMode"
                                        :disabled="!formatScriptTitles"
                                        input-value="all-foreign"
                                        name="script-title-mode"
                                        @update:model-value="
                                            setScriptTitleMode
                                        "
                                    >
                                        {{
                                            msg("tools.scriptTitleAllForeign")
                                        }}
                                    </cdx-radio>
                                </cdx-field>
                            </cdx-field>
                            <section class="cf-source-manager__tool-section">
                                <h3>{{ msg("tools.checks") }}</h3>
                                <p>{{ msg("tools.checksDescription") }}</p>
                                <div class="cf-source-manager__tool-launchers">
                                    <cdx-button
                                        action="progressive"
                                        @click="openAnalysisTool"
                                    >
                                        {{ msg("tools.analyze") }}
                                    </cdx-button>
                                    <cdx-button
                                        v-if="canCheckCs1Tool"
                                        action="progressive"
                                        :disabled="
                                            cs1ToolStatus === 'checking'
                                        "
                                        @click="openCs1Tool"
                                    >
                                        {{ msg("tools.checkCs1") }}
                                    </cdx-button>
                                    <cdx-button
                                        action="progressive"
                                        @click="openNonCs1Tool"
                                    >
                                        {{ msg("tools.checkNonCs1") }}
                                    </cdx-button>
                                </div>
                            </section>
                        </div>
                    </cdx-tab>
                </cdx-tabs>
            </div>
        </div>
        <template #footer>
            <div class="cf-source-manager__footer-actions">
                <cdx-button
                    action="progressive"
                    weight="primary"
                    :disabled="loading || formatArticleDisabled"
                    @click="formatArticle"
                >
                    {{ msg("tool.formatCitations") }}
                </cdx-button>
                <cdx-button @click="close">
                    {{ msg("common.close") }}
                </cdx-button>
                <cdx-button
                    action="destructive"
                    weight="quiet"
                    :disabled="loading"
                    @click="cancelAllChanges"
                >
                    {{ msg("common.cancelChanges") }}
                </cdx-button>
            </div>
        </template>
    </cdx-dialog>
</template>
