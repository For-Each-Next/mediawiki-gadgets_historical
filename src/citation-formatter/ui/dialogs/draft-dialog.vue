<template>
    <cdx-dialog
        v-model:open="draftPopupOpen"
        class="cf-source-manager__draft-dialog"
        :title="
            editingSource
                ? msg('draft.editSourceTitle')
                : msg('draft.createSourceTitle')
        "
        :lang="interfaceLocale"
        @update:open="onDraftPopupOpenChange"
    >
        <div class="cf-source-manager__dialog-body-content">
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
                class="cf-source-manager__loading cf-source-manager__draft-cs1-progress"
                aria-live="polite"
            >
                <small>{{ msg("checker.checking") }}</small>
                <cdx-progress-bar :aria-label="msg('checker.checking')" />
            </div>
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
                    <h3>{{ msg("draft.originalSource") }}</h3>
                    <p>{{ msg("draft.originalDescription") }}</p>
                    <pre>{{ editingSource.rawReference }}</pre>
                </section>
                <div class="cf-source-manager__draft-header">
                    <cdx-field
                        class="cf-source-manager__template-field"
                        :disabled="loading"
                    >
                        <template #label>
                            {{ msg("draft.citationTemplate") }}
                        </template>
                        <cdx-select
                            :selected="draft.template"
                            :menu-items="templateOptions"
                            :menu-config="{ visibleItemLimit: 8 }"
                            @update:selected="changeDraftTemplate"
                        />
                    </cdx-field>
                </div>
                <cdx-table
                    class="cf-source-manager__parameter-table"
                    :caption="msg('draft.parametersCaption')"
                    :hide-caption="true"
                    :columns="parameterTableColumns"
                    :show-vertical-borders="false"
                    :use-row-headers="true"
                >
                    <template #header>
                        <div class="cf-source-manager__parameter-table-header">
                            <div
                                class="cf-source-manager__reference-name-preview"
                            >
                                <strong>
                                    {{ msg("draft.referenceName") }}:
                                </strong>
                                <span
                                    :title="msg('draft.referenceAuthor')"
                                    :class="{
                                        'cf-source-manager__reference-name-part--empty':
                                            citationNameParts.author === '',
                                    }"
                                >
                                    {{ citationNameParts.author || "—" }}
                                </span>
                                <span aria-hidden="true"> · </span>
                                <span
                                    :title="msg('draft.referenceYear')"
                                    :class="{
                                        'cf-source-manager__reference-name-part--empty':
                                            citationNameParts.year === '',
                                    }"
                                >
                                    {{ citationNameParts.year || "—" }}
                                </span>
                                <span aria-hidden="true"> · </span>
                                <span
                                    :title="msg('draft.referencePart')"
                                    :class="{
                                        'cf-source-manager__reference-name-part--empty':
                                            citationNameParts.part === '',
                                    }"
                                >
                                    {{ citationNameParts.part || "—" }}
                                </span>
                            </div>
                        </div>
                    </template>
                    <template #tbody>
                        <tbody>
                            <tr
                                v-for="(row, index) in draft.rows"
                                :key="draftRowKey(row)"
                                class="cf-source-manager__parameter-row"
                                :class="{
                                    'cf-source-manager__parameter-row--reference-name':
                                        citationNameCells.has(index),
                                }"
                            >
                                <th
                                    scope="row"
                                    class="cf-source-manager__parameter-cell cf-source-manager__parameter-cell--name"
                                >
                                    <cdx-combobox
                                        :title="
                                            getParameterNameTooltip(row.name)
                                        "
                                        v-model:selected="row.name"
                                        class="cf-source-manager__parameter-name"
                                        :menu-items="parameterNameOptions"
                                        :menu-config="{ visibleItemLimit: 8 }"
                                        :status="
                                            draftCellErrors.get(index)?.name
                                                ? 'error'
                                                : 'default'
                                        "
                                        :disabled="loading"
                                        :aria-label="
                                            getDraftFieldLabel(
                                                index,
                                                'name',
                                                row.name,
                                            )
                                        "
                                        :placeholder="
                                            msg('draft.parameterPlaceholder')
                                        "
                                        @update:selected="
                                            clearDraftValidationError
                                        "
                                    >
                                        <template #no-results>
                                            {{ msg("draft.customParameter") }}
                                        </template>
                                    </cdx-combobox>
                                    <small
                                        v-if="draftCellErrors.get(index)?.name"
                                        :id="
                                            'cf-parameter-name-error-' + index
                                        "
                                        class="cf-source-manager__field-error"
                                    >
                                        {{ draftCellErrors.get(index)?.name }}
                                    </small>
                                </th>
                                <td
                                    class="cf-source-manager__parameter-cell cf-source-manager__parameter-cell--value"
                                >
                                    <cdx-text-area
                                        :model-value="row.value"
                                        :autosize="true"
                                        rows="1"
                                        wrap="soft"
                                        :status="
                                            draftCellErrors.get(index)?.value
                                                ? 'error'
                                                : 'default'
                                        "
                                        :disabled="loading"
                                        :aria-label="
                                            getDraftFieldLabel(
                                                index,
                                                'value',
                                                row.name,
                                            )
                                        "
                                        @update:model-value="
                                            updateParameterValue(index, $event)
                                        "
                                    />
                                    <small
                                        v-if="row.alias.trim() !== ''"
                                        class="cf-source-manager__parameter-alias-caption"
                                    >
                                        {{
                                            getParameterAliasCaption(
                                                row.name,
                                                row.alias,
                                            )
                                        }}
                                    </small>
                                    <small
                                        v-if="
                                            draftCellErrors.get(index)?.value
                                        "
                                        :id="
                                            'cf-parameter-value-error-' + index
                                        "
                                        class="cf-source-manager__field-error"
                                    >
                                        {{ draftCellErrors.get(index)?.value }}
                                    </small>
                                    <small
                                        v-if="
                                            draftCellErrors.get(index)?.alias
                                        "
                                        :id="
                                            'cf-parameter-alias-error-' + index
                                        "
                                        class="cf-source-manager__field-error"
                                    >
                                        {{ draftCellErrors.get(index)?.alias }}
                                    </small>
                                    <div
                                        v-if="getAliasSuggestion(index)"
                                        class="cf-source-manager__alias-suggestion"
                                    >
                                        <small>
                                            {{
                                                msg("draft.aliasSuggestion", {
                                                    alias:
                                                        getAliasSuggestion(
                                                            index,
                                                        )?.alias ?? "",
                                                })
                                            }}
                                        </small>
                                        <div
                                            class="cf-source-manager__alias-suggestion-actions"
                                        >
                                            <cdx-button
                                                action="progressive"
                                                weight="quiet"
                                                :disabled="loading"
                                                @click="
                                                    useAliasSuggestion(index)
                                                "
                                            >
                                                {{ msg("common.use") }}
                                            </cdx-button>
                                            <cdx-button
                                                weight="quiet"
                                                :disabled="loading"
                                                @click="
                                                    dismissAliasSuggestion(
                                                        index,
                                                    )
                                                "
                                            >
                                                {{ msg("common.dismiss") }}
                                            </cdx-button>
                                        </div>
                                    </div>
                                </td>
                                <td
                                    class="cf-source-manager__parameter-cell cf-source-manager__parameter-cell--actions"
                                >
                                    <div
                                        class="cf-source-manager__parameter-actions"
                                    >
                                        <cdx-button
                                            :title="
                                                getParameterAliasActionLabel(
                                                    row,
                                                )
                                            "
                                            class="cf-source-manager__parameter-alias-action"
                                            :class="{
                                                'cf-source-manager__parameter-alias-action--excluded':
                                                    hasReferenceNameExclusion(
                                                        row,
                                                    ),
                                            }"
                                            weight="quiet"
                                            :disabled="loading"
                                            :aria-label="
                                                getParameterAliasActionLabel(
                                                    row,
                                                )
                                            "
                                            @click="
                                                openParameterAliasDialog(index)
                                            "
                                        >
                                            <cdx-icon
                                                :icon="parameterAliasIcon"
                                            />
                                        </cdx-button>
                                        <a
                                            v-if="
                                                isUrlDraftParameter(
                                                    row.name,
                                                ) &&
                                                getOpenableDraftUrl(row.value)
                                            "
                                            :title="msg('draft.openUrl')"
                                            class="cdx-button cdx-button--fake-button cdx-button--fake-button--enabled cdx-button--weight-quiet cdx-button--action-default cdx-button--icon-only"
                                            :href="
                                                getOpenableDraftUrl(row.value)
                                            "
                                            target="_blank"
                                            rel="noopener noreferrer"
                                            :aria-label="
                                                msg('draft.openUrlLabel', {
                                                    parameter: row.name,
                                                })
                                            "
                                        >
                                            <cdx-icon :icon="openUrlIcon" />
                                        </a>
                                        <cdx-button
                                            v-if="
                                                row.name
                                                    .trim()
                                                    .toLowerCase() ===
                                                'url-status'
                                            "
                                            :title="msg('draft.switchStatus')"
                                            weight="quiet"
                                            :disabled="loading"
                                            :aria-label="
                                                msg('draft.switchStatusLabel')
                                            "
                                            @click="switchUrlStatus(index)"
                                        >
                                            <cdx-icon
                                                :icon="switchStatusIcon"
                                            />
                                        </cdx-button>
                                        <cdx-button
                                            v-if="
                                                isDateAutofillParameter(
                                                    row.name,
                                                )
                                            "
                                            :title="
                                                getDateAutofillTooltip(
                                                    row.name,
                                                )
                                            "
                                            weight="quiet"
                                            :disabled="loading"
                                            :aria-label="
                                                getDateAutofillTooltip(
                                                    row.name,
                                                )
                                            "
                                            @click="autofillDate(index)"
                                        >
                                            <cdx-icon :icon="magicWandIcon" />
                                        </cdx-button>
                                        <cdx-button
                                            v-if="
                                                isLinkableDraftParameter(
                                                    row.name,
                                                )
                                            "
                                            :title="msg('draft.checkLink')"
                                            weight="quiet"
                                            :disabled="
                                                loading ||
                                                row.value.trim() === ''
                                            "
                                            :aria-label="
                                                msg('draft.checkLinkLabel', {
                                                    parameter: row.name,
                                                })
                                            "
                                            @click="linkOrganization(index)"
                                        >
                                            <cdx-icon :icon="linkIcon" />
                                        </cdx-button>
                                        <cdx-button
                                            v-if="
                                                isAuthorDraftParameter(
                                                    row.name,
                                                )
                                            "
                                            :title="msg('draft.splitAuthor')"
                                            weight="quiet"
                                            :disabled="
                                                loading ||
                                                !canSplitAuthor(index)
                                            "
                                            :aria-label="
                                                msg('draft.splitAuthorLabel', {
                                                    parameter: row.name,
                                                })
                                            "
                                            @click="splitAuthor(index)"
                                        >
                                            <cdx-icon
                                                class="cf-source-manager__split-author-icon"
                                                :icon="splitAuthorIcon"
                                            />
                                        </cdx-button>
                                        <cdx-button
                                            v-else-if="
                                                isLastAuthorDraftParameter(
                                                    row.name,
                                                )
                                            "
                                            :title="msg('draft.joinAuthor')"
                                            weight="quiet"
                                            :disabled="
                                                loading ||
                                                !canJoinAuthor(index)
                                            "
                                            :aria-label="
                                                msg('draft.joinAuthorLabel', {
                                                    parameter: row.name,
                                                })
                                            "
                                            @click="joinAuthor(index)"
                                        >
                                            <cdx-icon :icon="joinAuthorIcon" />
                                        </cdx-button>
                                    </div>
                                </td>
                            </tr>
                        </tbody>
                    </template>
                </cdx-table>
                <cdx-card class="cf-source-manager__source-preview-card">
                    <template #title>
                        {{ msg("draft.sourceCode") }}
                    </template>
                    <template #description>
                        <code class="cf-source-manager__source-preview"
                            ><span
                                v-for="(part, index) in draftSourcePreview"
                                :key="index"
                                :class="
                                    'cf-source-manager__source-preview--' +
                                    part.kind
                                "
                                >{{ part.text }}</span
                            ></code
                        >
                    </template>
                </cdx-card>
            </div>
        </div>
        <template #footer>
            <div class="cf-source-manager__draft-footer">
                <div class="cf-source-manager__draft-actions">
                    <cdx-button :disabled="loading" @click="addParameter">
                        {{ msg("draft.addParameter") }}
                    </cdx-button>
                    <cdx-button :disabled="loading" @click="sortParameters">
                        {{ msg("draft.sortParameters") }}
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
                        {{ msg("draft.duplicate") }}
                    </cdx-button>
                </div>
                <div class="cf-source-manager__footer-actions">
                    <cdx-button
                        action="progressive"
                        weight="primary"
                        :disabled="loading"
                        @click="saveDraft"
                    >
                        {{ msg("common.save") }}
                    </cdx-button>
                    <cdx-button
                        action="progressive"
                        :disabled="loading"
                        @click="applyDraft"
                    >
                        {{ msg("common.apply") }}
                    </cdx-button>
                    <cdx-button
                        action="destructive"
                        weight="quiet"
                        :disabled="loading"
                        @click="closeDraftPopup"
                    >
                        {{ msg("common.cancel") }}
                    </cdx-button>
                </div>
            </div>
        </template>
    </cdx-dialog>
</template>
