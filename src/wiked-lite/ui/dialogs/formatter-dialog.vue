<template>
    <cdx-dialog
        v-model:open="open"
        class="wiked-lite-dialog"
        :title="msg('dialog.title')"
        :lang="interfaceLocale"
        :close-button-label="msg('dialog.close')"
        use-close-button
        @update:open="onOpenChange"
    >
        <cdx-message v-if="error" type="error">{{ error }}</cdx-message>
        <cdx-message v-if="settingsSaved" type="success">
            {{ msg("feedback.settingsSaved") }}
        </cdx-message>
        <cdx-tabs>
            <cdx-tab
                name="block-templates"
                :label="msg('dialog.blockTemplatesTab')"
            >
                <cdx-field>
                    <template #label>
                        {{ msg("dialog.indentation") }}
                    </template>
                    <cdx-select
                        :selected="indentation"
                        :menu-items="indentationOptions"
                        :aria-label="msg('dialog.indentation')"
                        @update:selected="updateIndentation"
                    />
                </cdx-field>
                <cdx-checkbox
                    :model-value="skipFirstLevelIndentation"
                    :disabled="indentation === 'preserve' || indentation === 0"
                    @update:model-value="updateSkipFirstLevelIndentation"
                >
                    {{ msg("dialog.skipFirstLevelIndentation") }}
                </cdx-checkbox>
                <cdx-field :is-fieldset="true">
                    <template #label>
                        {{ msg("dialog.firstParameterGroup") }}
                    </template>
                    <cdx-radio
                        :model-value="firstParameterMode"
                        name="first-parameter-layout"
                        input-value="preserve"
                        @update:model-value="updateFirstParameterMode"
                    >
                        {{ msg("dialog.preserve") }}
                    </cdx-radio>
                    <cdx-radio
                        :model-value="firstParameterMode"
                        name="first-parameter-layout"
                        input-value="align-values"
                        @update:model-value="updateFirstParameterMode"
                    >
                        {{ msg("dialog.alignValues") }}
                    </cdx-radio>
                    <cdx-radio
                        :model-value="firstParameterMode"
                        name="first-parameter-layout"
                        input-value="compact"
                        @update:model-value="updateFirstParameterMode"
                    >
                        {{ msg("dialog.compact") }}
                    </cdx-radio>
                </cdx-field>
                <cdx-field :is-fieldset="true">
                    <template #label>
                        {{ msg("dialog.subsequentParameterGroup") }}
                    </template>
                    <cdx-radio
                        :model-value="subsequentParameterMode"
                        name="subsequent-parameter-layout"
                        input-value="preserve"
                        @update:model-value="updateSubsequentParameterMode"
                    >
                        {{ msg("dialog.preserve") }}
                    </cdx-radio>
                    <cdx-radio
                        :model-value="subsequentParameterMode"
                        name="subsequent-parameter-layout"
                        input-value="align-names"
                        @update:model-value="updateSubsequentParameterMode"
                    >
                        {{ msg("dialog.alignNames") }}
                    </cdx-radio>
                    <cdx-radio
                        :model-value="subsequentParameterMode"
                        name="subsequent-parameter-layout"
                        input-value="align-names-and-values"
                        @update:model-value="updateSubsequentParameterMode"
                    >
                        {{ msg("dialog.alignNamesAndValues") }}
                    </cdx-radio>
                    <cdx-radio
                        :model-value="subsequentParameterMode"
                        name="subsequent-parameter-layout"
                        input-value="compact"
                        @update:model-value="updateSubsequentParameterMode"
                    >
                        {{ msg("dialog.compact") }}
                    </cdx-radio>
                </cdx-field>
                <cdx-field :is-fieldset="true">
                    <template #label>
                        {{ msg("dialog.characterWidth") }}
                    </template>
                    <cdx-radio
                        v-model="characterWidthRatio"
                        name="character-width-ratio"
                        input-value="5:3"
                        @update:model-value="markSettingsDirty"
                    >
                        {{ msg("dialog.characterWidthFiveToThree") }}
                    </cdx-radio>
                    <cdx-radio
                        v-model="characterWidthRatio"
                        name="character-width-ratio"
                        input-value="2:1"
                        @update:model-value="markSettingsDirty"
                    >
                        {{ msg("dialog.characterWidthTwoToOne") }}
                    </cdx-radio>
                </cdx-field>
            </cdx-tab>
            <cdx-tab
                name="other-formatting"
                :label="msg('dialog.otherFormattingTab')"
            >
                <cdx-checkbox
                    v-model="normalizeConversion"
                    @update:model-value="markSettingsDirty"
                >
                    {{ msg("dialog.normalizeConversion") }}
                    <template #description>
                        <span class="wiked-lite-dialog__control-description">
                            {{ msg("dialog.normalizeConversionDescription") }}
                        </span>
                    </template>
                </cdx-checkbox>
                <cdx-field :is-fieldset="true">
                    <template #label>
                        {{ msg("dialog.redirectScope") }}
                    </template>
                    <p class="wiked-lite-dialog__note">
                        {{ msg("dialog.resolveDescriptionBefore")
                        }}{{ notBrokenSeparator
                        }}<a
                            :href="notBrokenUrl"
                            target="_blank"
                            rel="noopener noreferrer"
                            >{{ msg("dialog.notBrokenPolicy") }}</a
                        >{{ msg("dialog.resolveDescriptionAfter") }}
                    </p>
                    <cdx-checkbox
                        v-model="resolveRedirects"
                        @update:model-value="markSettingsDirty"
                    >
                        {{ msg("dialog.resolveRedirects") }}
                    </cdx-checkbox>
                    <cdx-checkbox
                        v-model="resolveTemplateRedirects"
                        :disabled="!resolveRedirects"
                        @update:model-value="markSettingsDirty"
                    >
                        {{ msg("dialog.resolveTemplateRedirects") }}
                    </cdx-checkbox>
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
                    <p class="wiked-lite-dialog__note">
                        {{ msg("dialog.editorFeaturesDescription") }}
                    </p>
                    <cdx-checkbox
                        v-model="largeFont"
                        @update:model-value="markSettingsDirty"
                    >
                        {{ msg("dialog.largeFont") }}
                    </cdx-checkbox>
                    <cdx-checkbox
                        v-model="referencePreviews"
                        @update:model-value="markSettingsDirty"
                    >
                        {{ msg("dialog.referencePreviews") }}
                    </cdx-checkbox>
                    <cdx-checkbox
                        v-model="smallReferenceText"
                        @update:model-value="markSettingsDirty"
                    >
                        {{ msg("dialog.smallReferenceText") }}
                        <template #description>
                            <span
                                class="wiked-lite-dialog__control-description"
                            >
                                {{
                                    msg("dialog.smallReferenceTextDescription")
                                }}
                            </span>
                        </template>
                    </cdx-checkbox>
                    <cdx-checkbox
                        v-model="highlightMissing"
                        @update:model-value="markSettingsDirty"
                    >
                        {{ msg("dialog.highlightMissing") }}
                        <template #description>
                            <span
                                class="wiked-lite-dialog__control-description"
                            >
                                {{ msg("dialog.highlightMissingDescription") }}
                            </span>
                        </template>
                    </cdx-checkbox>
                    <cdx-checkbox
                        v-model="fullPageReferencePreviews"
                        @update:model-value="markSettingsDirty"
                    >
                        {{ msg("dialog.fullPageReferencePreviews") }}
                        <template #description>
                            <span
                                class="wiked-lite-dialog__control-description"
                            >
                                {{
                                    msg(
                                        "dialog.fullPageReferencePreviewsDescription",
                                    )
                                }}
                            </span>
                        </template>
                    </cdx-checkbox>
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
