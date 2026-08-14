<template>
    <cdx-dialog
        v-model:open="open"
        class="wiked-lite-dialog"
        :title="msg('dialog.title')"
        :lang="interfaceLocale"
        @update:open="onOpenChange"
    >
        <p>{{ msg("dialog.intro") }}</p>
        <cdx-message v-if="error" type="error">{{ error }}</cdx-message>
        <cdx-message v-if="settingsSaved" type="success">
            {{ msg("feedback.settingsSaved") }}
        </cdx-message>
        <cdx-tabs>
            <cdx-tab
                name="block-templates"
                :label="msg('dialog.blockTemplatesTab')"
            >
                <cdx-field :is-fieldset="true">
                    <template #label>{{ msg("dialog.layout") }}</template>
                    <cdx-checkbox v-model="indentPipes">
                        {{ msg("dialog.indentPipes") }}
                    </cdx-checkbox>
                    <cdx-field :is-fieldset="true">
                        <template #label>
                            {{ msg("dialog.firstParameterLayout") }}
                        </template>
                        <cdx-radio
                            v-model="firstParameterLayout"
                            name="first-parameter-layout"
                            input-value="align-separator"
                            :title="msg('dialog.alignFirstSeparatorTooltip')"
                        >
                            {{ msg("dialog.alignFirstSeparator") }}
                        </cdx-radio>
                        <cdx-radio
                            v-model="firstParameterLayout"
                            name="first-parameter-layout"
                            input-value="compact"
                        >
                            {{ msg("dialog.compact") }}
                        </cdx-radio>
                        <cdx-radio
                            v-model="firstParameterLayout"
                            name="first-parameter-layout"
                            input-value="preserve"
                        >
                            {{ msg("dialog.preserve") }}
                        </cdx-radio>
                    </cdx-field>
                    <cdx-field :is-fieldset="true">
                        <template #label>
                            {{ msg("dialog.subsequentParameterLayout") }}
                        </template>
                        <cdx-radio
                            v-model="subsequentParameterLayout"
                            name="subsequent-parameter-layout"
                            input-value="align-columns"
                            :title="msg('dialog.alignColumnsTooltip')"
                        >
                            {{ msg("dialog.alignColumns") }}
                        </cdx-radio>
                        <cdx-radio
                            v-model="subsequentParameterLayout"
                            name="subsequent-parameter-layout"
                            input-value="align-columns-completely"
                            :title="
                                msg('dialog.alignColumnsCompletelyTooltip')
                            "
                        >
                            {{ msg("dialog.alignColumnsCompletely") }}
                        </cdx-radio>
                        <cdx-radio
                            v-model="subsequentParameterLayout"
                            name="subsequent-parameter-layout"
                            input-value="compact"
                        >
                            {{ msg("dialog.compact") }}
                        </cdx-radio>
                        <cdx-radio
                            v-model="subsequentParameterLayout"
                            name="subsequent-parameter-layout"
                            input-value="preserve"
                        >
                            {{ msg("dialog.preserve") }}
                        </cdx-radio>
                    </cdx-field>
                    <cdx-field
                        :is-fieldset="true"
                        :disabled="
                            firstParameterLayout !== 'align-separator' &&
                            subsequentParameterLayout !== 'align-columns' &&
                            subsequentParameterLayout !==
                                'align-columns-completely'
                        "
                    >
                        <template #label>
                            {{ msg("dialog.characterWidths") }}
                        </template>
                        <cdx-radio
                            v-model="characterWidthRatio"
                            name="character-width-ratio"
                            input-value="5:3"
                            :inline="true"
                            :title="
                                msg('dialog.characterRatioFiveToThreeTooltip')
                            "
                        >
                            5:3
                        </cdx-radio>
                        <cdx-radio
                            v-model="characterWidthRatio"
                            name="character-width-ratio"
                            input-value="2:1"
                            :inline="true"
                            :title="
                                msg('dialog.characterRatioTwoToOneTooltip')
                            "
                        >
                            2:1
                        </cdx-radio>
                    </cdx-field>
                </cdx-field>
            </cdx-tab>
            <cdx-tab name="other" :label="msg('dialog.otherTab')">
                <cdx-field :is-fieldset="true">
                    <template #label>{{ msg("dialog.advanced") }}</template>
                    <cdx-checkbox v-model="normalizeConversion">
                        {{ msg("dialog.normalizeConversion") }}
                    </cdx-checkbox>
                    <cdx-checkbox v-model="resolveRedirects">
                        {{ msg("dialog.resolveRedirects") }}
                        <template #description>
                            {{ msg("dialog.resolveDescriptionBefore") }}
                            <a
                                :href="notBrokenUrl"
                                target="_blank"
                                rel="noopener noreferrer"
                            >
                                {{ msg("dialog.notBrokenPolicy") }}</a
                            >{{ msg("dialog.resolveDescriptionAfter") }}
                        </template>
                    </cdx-checkbox>
                </cdx-field>
                <cdx-field :is-fieldset="true">
                    <template #label>
                        {{ msg("dialog.editorFeatures") }}
                    </template>
                    <cdx-toggle-switch
                        :model-value="highlightMissing"
                        :align-switch="true"
                        @update:model-value="updateHighlightMissing"
                    >
                        {{ msg("dialog.highlightMissing") }}
                        <template #description>
                            {{ msg("dialog.highlightMissingDescription") }}
                        </template>
                    </cdx-toggle-switch>
                    <cdx-toggle-switch
                        :model-value="referencePreviews"
                        :align-switch="true"
                        @update:model-value="updateReferencePreviews"
                    >
                        {{ msg("dialog.referencePreviews") }}
                    </cdx-toggle-switch>
                    <cdx-toggle-switch
                        :model-value="fullPageReferencePreviews"
                        :align-switch="true"
                        @update:model-value="updateFullPageReferencePreviews"
                    >
                        {{ msg("dialog.fullPageReferencePreviews") }}
                        <template #description>
                            {{
                                msg(
                                    "dialog.fullPageReferencePreviewsDescription",
                                )
                            }}
                        </template>
                    </cdx-toggle-switch>
                </cdx-field>
            </cdx-tab>
        </cdx-tabs>
        <cdx-progress-bar
            v-if="applying || savingSettings"
            :aria-label="
                savingSettings
                    ? msg('dialog.saveSettings')
                    : msg('dialog.apply')
            "
        />
        <template #footer>
            <div class="wiked-lite-dialog__footer">
                <cdx-button
                    type="button"
                    :disabled="applying || savingSettings"
                    @click="saveCurrentSettings"
                >
                    {{ msg("dialog.saveSettings") }}
                </cdx-button>
                <div class="wiked-lite-dialog__footer-actions">
                    <cdx-button
                        type="button"
                        :disabled="applying || savingSettings"
                        @click="onCancel"
                    >
                        {{ msg("dialog.cancel") }}
                    </cdx-button>
                    <cdx-button
                        type="button"
                        action="progressive"
                        weight="primary"
                        :disabled="applying || savingSettings"
                        @click="apply"
                    >
                        {{ msg("dialog.apply") }}
                    </cdx-button>
                </div>
            </div>
        </template>
    </cdx-dialog>
</template>
