<template>
    <cdx-dialog
        v-model:open="toolPopupOpen"
        class="cf-source-manager__tool-dialog"
        :title="
            toolPopup === 'analysis'
                ? msg('analysis.title')
                : toolPopup === 'cs1'
                  ? msg('checker.cs1Title')
                  : msg('checker.nonCs1Title')
        "
        :lang="interfaceLocale"
        @update:open="onToolPopupOpenChange"
    >
        <div class="cf-source-manager__dialog-body-content">
            <template v-if="toolPopup === 'analysis'">
                <p class="cf-source-analysis__intro" tabindex="0">
                    {{ msg("analysis.intro") }}
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
                            {{ msg("analysis.none") }}
                        </cdx-message>
                        <div v-else class="cf-source-analysis__findings">
                            <div
                                v-for="finding in tab.findings"
                                :key="finding.id"
                                class="cf-source-analysis__finding"
                                :style="{ order: finding.displayOrder }"
                            >
                                <header
                                    class="cf-source-analysis__finding-heading"
                                >
                                    <h4>{{ finding.title }}</h4>
                                    <p>{{ finding.description }}</p>
                                </header>
                                <cdx-field
                                    class="cf-source-analysis__value-options"
                                    :is-fieldset="true"
                                >
                                    <template #label>
                                        {{
                                            finding.category === "alias"
                                                ? msg("analysis.aliasField")
                                                : msg("analysis.valueField")
                                        }}
                                    </template>
                                    <div
                                        class="cf-source-analysis__radio-options"
                                    >
                                        <cdx-radio
                                            v-for="option in finding.options"
                                            :key="option.value"
                                            v-model="finding.replacementChoice"
                                            :name="
                                                'analysis-value-' + finding.id
                                            "
                                            :input-value="option.value"
                                            :inline="true"
                                            @update:model-value="
                                                selectAllAnalysisOccurrences(
                                                    finding,
                                                )
                                            "
                                        >
                                            <bdi>
                                                {{
                                                    option.value ||
                                                    msg("analysis.emptyValue")
                                                }}
                                            </bdi>
                                        </cdx-radio>
                                        <div
                                            class="cf-source-analysis__custom-option"
                                        >
                                            <cdx-radio
                                                v-model="
                                                    finding.replacementChoice
                                                "
                                                :name="
                                                    'analysis-value-' +
                                                    finding.id
                                                "
                                                :input-value="
                                                    customAnalysisReplacement
                                                "
                                                :inline="true"
                                                @update:model-value="
                                                    selectAllAnalysisOccurrences(
                                                        finding,
                                                    )
                                                "
                                            >
                                                {{
                                                    msg("analysis.customValue")
                                                }}
                                            </cdx-radio>
                                            <cdx-text-input
                                                v-model="
                                                    finding.customReplacement
                                                "
                                                :disabled="
                                                    finding.replacementChoice !==
                                                    customAnalysisReplacement
                                                "
                                                :aria-label="
                                                    msg('analysis.customValue')
                                                "
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
                                                    occurrence,
                                                )
                                            "
                                        >
                                            <span
                                                class="cf-source-analysis__occurrence-heading"
                                            >
                                                <strong>
                                                    {{
                                                        occurrence.referenceName ||
                                                        msg(
                                                            "common.unnamedReference",
                                                        )
                                                    }}
                                                </strong>
                                                <code
                                                    >|{{
                                                        occurrence.parameter
                                                    }}=</code
                                                >
                                                <code>{{
                                                    occurrence.displayValue
                                                }}</code>
                                                <code
                                                    v-if="
                                                        occurrence.cell ===
                                                        'alias'
                                                    "
                                                >
                                                    {{ occurrence.value ? '<!-- # ' +
                                            occurrence.value +
                                            ' -->' : msg(
                                                    'analysis.noHashAlias' ) }}
                                                </code>
                                            </span>
                                            <small>
                                                {{ occurrence.template }} ·
                                                {{ occurrence.title }}
                                            </small>
                                        </cdx-checkbox>
                                    </li>
                                </ul>
                                <div
                                    class="cf-source-analysis__selection-actions"
                                >
                                    <cdx-button
                                        @click="
                                            selectAllAnalysisOccurrences(
                                                finding,
                                            )
                                        "
                                    >
                                        {{ msg("analysis.selectAll") }}
                                    </cdx-button>
                                    <cdx-button
                                        @click="
                                            clearAnalysisSelection(finding)
                                        "
                                    >
                                        {{ msg("common.clear") }}
                                    </cdx-button>
                                    <cdx-button
                                        action="progressive"
                                        weight="primary"
                                        :disabled="
                                            countSelectedFindingReplacements(
                                                finding,
                                            ) === 0
                                        "
                                        @click="applyAnalysisFinding(finding)"
                                    >
                                        {{ msg("analysis.applyCase") }}
                                    </cdx-button>
                                </div>
                            </div>
                            <div
                                v-for="applied in tab.appliedFindings"
                                :key="applied.changeId"
                                class="cf-source-analysis__finding cf-source-analysis__finding--changed"
                                :style="{
                                    order: applied.finding.displayOrder,
                                }"
                            >
                                <header
                                    class="cf-source-analysis__finding-heading"
                                >
                                    <h4>{{ applied.finding.title }}</h4>
                                    <p>{{ applied.finding.description }}</p>
                                </header>
                                <div class="cf-source-analysis__changed-row">
                                    <span>
                                        <strong>{{
                                            msg("analysis.changed")
                                        }}</strong>
                                        <code>
                                            {{
                                                getAnalysisReplacement(
                                                    applied.finding,
                                                )
                                            }}
                                        </code>
                                    </span>
                                    <cdx-button
                                        action="destructive"
                                        weight="primary"
                                        @click="
                                            revertAppliedAnalysisFinding(
                                                applied.changeId,
                                            )
                                        "
                                    >
                                        {{ msg("analysis.revert") }}
                                    </cdx-button>
                                </div>
                                <ul class="cf-source-analysis__occurrences">
                                    <li
                                        v-for="occurrence in applied.finding
                                            .occurrences"
                                        v-show="occurrence.selected"
                                        :key="occurrence.id"
                                    >
                                        <span
                                            class="cf-source-analysis__occurrence-heading"
                                        >
                                            <strong>
                                                {{
                                                    occurrence.referenceName ||
                                                    msg(
                                                        "common.unnamedReference",
                                                    )
                                                }}
                                            </strong>
                                            <code
                                                >|{{
                                                    occurrence.parameter
                                                }}=</code
                                            >
                                            <code>{{
                                                occurrence.displayValue
                                            }}</code>
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
            <template v-else-if="toolPopup === 'cs1'">
                <p>
                    {{ msg("checker.cs1Description", { wiki: cs1WikiLabel }) }}
                </p>
                <cdx-progress-bar
                    v-if="cs1ToolStatus === 'checking'"
                    :aria-label="msg('checker.checking')"
                />
                <div
                    v-else-if="cs1ToolStatus === 'unavailable'"
                    class="cf-source-manager__cs1-message-frame"
                >
                    <cdx-message type="error">
                        {{ msg("checker.unavailable") }}
                    </cdx-message>
                </div>
                <div
                    v-else-if="
                        cs1ToolStatus === 'complete' &&
                        cs1ToolMessages.length === 0 &&
                        cs1ToolSources.length === 0
                    "
                    class="cf-source-manager__cs1-message-frame"
                >
                    <cdx-message type="success">
                        {{ msg("checker.noIssues") }}
                    </cdx-message>
                </div>
                <div
                    v-if="
                        cs1ToolStatus === 'complete' &&
                        cs1ToolMessages.length > 0
                    "
                    class="cf-source-manager__cs1-message-frame"
                >
                    <cdx-message type="warning">
                        <ul>
                            <li
                                v-for="message in cs1ToolMessages"
                                :key="message"
                            >
                                {{ message }}
                            </li>
                        </ul>
                    </cdx-message>
                </div>
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
                        class="cf-source-manager__existing-row"
                        :class="{
                            'cf-source-manager__existing-row--error':
                                result.severity === 'error',
                            'cf-source-manager__existing-row--maintenance':
                                result.severity === 'maintenance',
                        }"
                    >
                        <div class="cf-source-manager__existing-summary">
                            <small
                                class="cf-source-manager__existing-name"
                                :title="
                                    result.source.referenceName ||
                                    msg('common.unnamed')
                                "
                            >
                                ({{
                                    result.source.referenceName ||
                                    msg("common.unnamed")
                                }})
                            </small>
                            <span
                                class="cf-source-manager__existing-title"
                                :title="
                                    result.source.title ||
                                    result.source.url ||
                                    msg('common.untitledSource')
                                "
                            >
                                {{
                                    result.source.title ||
                                    result.source.url ||
                                    msg("common.untitledSource")
                                }}
                            </span>
                            <small
                                class="cf-source-manager__existing-meta"
                                :title="result.messages.join(' · ')"
                            >
                                <code>
                                    {{
                                        sourceTemplateLabel(
                                            result.source.draft.template,
                                        )
                                    }}
                                </code>
                                · {{ result.messages.join(" · ") }}
                            </small>
                        </div>
                        <div class="cf-source-manager__source-actions">
                            <cdx-button
                                :title="msg('lookup.editSource')"
                                weight="quiet"
                                :aria-label="msg('lookup.editSource')"
                                @click="reviewCs1Source(result.source.id)"
                            >
                                <cdx-icon :icon="editSourceIcon" />
                            </cdx-button>
                        </div>
                    </li>
                </ol>
            </template>
            <template v-else-if="toolPopup === 'non-cs1'">
                <p>{{ msg("checker.nonCs1Description") }}</p>
                <cdx-message v-if="nonCs1Sources.length === 0" type="success">
                    {{ msg("checker.noNonCs1") }}
                </cdx-message>
                <ol v-else class="cf-source-manager__existing-list">
                    <li
                        v-for="source in nonCs1Sources"
                        :key="source.id"
                        class="cf-source-manager__existing-row cf-source-manager__existing-row--non-standard"
                    >
                        <div class="cf-source-manager__existing-summary">
                            <small
                                class="cf-source-manager__existing-name"
                                :title="
                                    source.referenceName ||
                                    msg('common.unnamed')
                                "
                            >
                                ({{
                                    source.referenceName ||
                                    msg("common.unnamed")
                                }})
                            </small>
                            <span
                                class="cf-source-manager__existing-title"
                                :title="
                                    source.title ||
                                    source.referenceName ||
                                    msg('common.unnamedReference')
                                "
                            >
                                {{
                                    source.title ||
                                    source.referenceName ||
                                    msg("common.unnamedReference")
                                }}
                            </span>
                            <small class="cf-source-manager__existing-meta">
                                <code>{{ msg("checker.nonCs1Source") }}</code>
                                ·
                                <span :title="formatSourceUsageTitle(source)">
                                    {{ source.usageCount }}×
                                </span>
                            </small>
                        </div>
                        <div class="cf-source-manager__source-actions">
                            <cdx-button
                                :title="msg('checker.convertSource')"
                                weight="quiet"
                                :aria-label="msg('checker.convertSource')"
                                @click="reviewNonCs1Source(source.id)"
                            >
                                <cdx-icon :icon="editSourceIcon" />
                            </cdx-button>
                        </div>
                    </li>
                </ol>
            </template>
        </div>
        <template #footer>
            <div class="cf-source-manager__footer-actions">
                <cdx-button
                    v-if="toolPopup === 'analysis'"
                    :disabled="countSelectedAnalysisReplacements() === 0"
                    action="progressive"
                    weight="primary"
                    @click="applyAnalysisReplacements"
                >
                    {{ msg("analysis.applySelected") }}
                </cdx-button>
                <cdx-button
                    v-if="toolPopup === 'cs1'"
                    :disabled="cs1ToolStatus === 'checking'"
                    action="progressive"
                    weight="primary"
                    @click="recheckCs1Tool"
                >
                    {{ msg("checker.recheckArticle") }}
                </cdx-button>
                <cdx-button @click="closeToolPopup">
                    {{ msg("common.close") }}
                </cdx-button>
            </div>
        </template>
    </cdx-dialog>
</template>
