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
                    <cdx-field :is-fieldset="true">
                        <template #label>
                            {{ msg("dialog.indentation") }}
                        </template>
                        <cdx-checkbox
                            :model-value="indentBlockTemplates"
                            @update:model-value="updateIndentBlockTemplates"
                        >
                            {{ msg("dialog.indentBlockTemplates") }}
                        </cdx-checkbox>
                        <cdx-field
                            :disabled="!indentBlockTemplates"
                            :messages="{ error: indentError }"
                            :status="indentError ? 'error' : 'default'"
                        >
                            <template #label>
                                {{ msg("dialog.indentSpaces") }}
                            </template>
                            <cdx-text-input
                                input-type="number"
                                min="0"
                                max="8"
                                step="1"
                                :disabled="!indentBlockTemplates"
                                :model-value="indentSpaces"
                                :status="indentError ? 'error' : 'default'"
                                @update:model-value="updateIndentSpaces"
                            />
                        </cdx-field>
                    </cdx-field>
                    <cdx-field :is-fieldset="true">
                        <template #label>
                            {{ msg("dialog.firstParameterGroup") }}
                        </template>
                        <cdx-checkbox
                            v-model="formatFirstParameter"
                            @update:model-value="markSettingsDirty"
                        >
                            {{ msg("dialog.enableParameterLayout") }}
                        </cdx-checkbox>
                        <cdx-radio
                            v-model="firstParameterLayout"
                            name="first-parameter-layout"
                            input-value="align-values"
                            :disabled="!formatFirstParameter"
                            @update:model-value="markSettingsDirty"
                        >
                            {{ msg("dialog.alignValues") }}
                        </cdx-radio>
                        <cdx-radio
                            v-model="firstParameterLayout"
                            name="first-parameter-layout"
                            input-value="compact"
                            :disabled="!formatFirstParameter"
                            @update:model-value="markSettingsDirty"
                        >
                            {{ msg("dialog.compact") }}
                        </cdx-radio>
                    </cdx-field>
                    <cdx-field :is-fieldset="true">
                        <template #label>
                            {{ msg("dialog.subsequentParameterGroup") }}
                        </template>
                        <cdx-checkbox
                            v-model="formatSubsequentParameters"
                            @update:model-value="markSettingsDirty"
                        >
                            {{ msg("dialog.enableParameterLayout") }}
                        </cdx-checkbox>
                        <cdx-radio
                            v-model="subsequentParameterLayout"
                            name="subsequent-parameter-layout"
                            input-value="align-names"
                            :disabled="!formatSubsequentParameters"
                            @update:model-value="markSettingsDirty"
                        >
                            {{ msg("dialog.alignNames") }}
                        </cdx-radio>
                        <cdx-radio
                            v-model="subsequentParameterLayout"
                            name="subsequent-parameter-layout"
                            input-value="align-names-and-values"
                            :disabled="!formatSubsequentParameters"
                            @update:model-value="markSettingsDirty"
                        >
                            {{ msg("dialog.alignNamesAndValues") }}
                        </cdx-radio>
                        <cdx-radio
                            v-model="subsequentParameterLayout"
                            name="subsequent-parameter-layout"
                            input-value="compact"
                            :disabled="!formatSubsequentParameters"
                            @update:model-value="markSettingsDirty"
                        >
                            {{ msg("dialog.compact") }}
                        </cdx-radio>
                    </cdx-field>
                    <cdx-checkbox
                        :model-value="characterWidthRatio === '5:3'"
                        @update:model-value="updateCharacterWidthRatio"
                    >
                        {{ msg("dialog.characterWidthFiveToThree") }}
                        <template #description>
                            {{ msg("dialog.characterWidthDescription") }}
                        </template>
                    </cdx-checkbox>
                </cdx-field>
            </cdx-tab>
            <cdx-tab
                name="other-formatting"
                :label="msg('dialog.otherFormattingTab')"
            >
                <cdx-field :is-fieldset="true">
                    <template #label>{{ msg("dialog.advanced") }}</template>
                    <cdx-checkbox
                        v-model="normalizeConversion"
                        @update:model-value="markSettingsDirty"
                    >
                        {{ msg("dialog.normalizeConversion") }}
                        <template #description>
                            {{ msg("dialog.normalizeConversionDescription") }}
                        </template>
                    </cdx-checkbox>
                    <cdx-field :is-fieldset="true">
                        <template #label>
                            {{ msg("dialog.redirectScope") }}
                        </template>
                        <cdx-checkbox
                            v-model="resolveRedirects"
                            @update:model-value="markSettingsDirty"
                        >
                            {{ msg("dialog.resolveRedirects") }}
                            <template #description>
                                <span
                                    >{{ msg("dialog.resolveDescriptionBefore")
                                    }}{{ notBrokenSeparator }}</span
                                ><a
                                    :href="notBrokenUrl"
                                    target="_blank"
                                    rel="noopener noreferrer"
                                >
                                    {{ msg("dialog.notBrokenPolicy") }}</a
                                >{{ msg("dialog.resolveDescriptionAfter") }}
                            </template>
                        </cdx-checkbox>
                        <cdx-checkbox
                            v-model="resolveTemplateRedirects"
                            :disabled="!resolveRedirects"
                            @update:model-value="markSettingsDirty"
                        >
                            {{ msg("dialog.resolveTemplateRedirects") }}
                        </cdx-checkbox>
                    </cdx-field>
                </cdx-field>
            </cdx-tab>
            <cdx-tab
                name="editor-display"
                :label="msg('dialog.editorDisplayTab')"
            >
                <cdx-field :is-fieldset="true">
                    <template #label>
                        {{ msg("dialog.editorFeatures") }}
                    </template>
                    <template #description>
                        {{ msg("dialog.editorFeaturesDescription") }}
                    </template>
                    <cdx-toggle-switch
                        :model-value="largeFont"
                        :align-switch="true"
                        @update:model-value="updateLargeFont"
                    >
                        {{ msg("dialog.largeFont") }}
                    </cdx-toggle-switch>
                    <cdx-toggle-switch
                        :model-value="referencePreviews"
                        :align-switch="true"
                        @update:model-value="updateReferencePreviews"
                    >
                        {{ msg("dialog.referencePreviews") }}
                    </cdx-toggle-switch>
                    <cdx-toggle-switch
                        :model-value="smallReferenceText"
                        :align-switch="true"
                        @update:model-value="updateSmallReferenceText"
                    >
                        {{ msg("dialog.smallReferenceText") }}
                        <template #description>
                            {{ msg("dialog.smallReferenceTextDescription") }}
                        </template>
                    </cdx-toggle-switch>
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
                    :disabled="
                        applying || savingSettings || indentError !== ''
                    "
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
                        :disabled="
                            applying || savingSettings || indentError !== ''
                        "
                        @click="apply"
                    >
                        {{ msg("dialog.apply") }}
                    </cdx-button>
                </div>
            </div>
        </template>
    </cdx-dialog>
</template>
