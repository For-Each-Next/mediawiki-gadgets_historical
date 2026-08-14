<template>
    <cdx-dialog
        v-model:open="open"
        class="wiked-lite-dialog"
        :title="msg('dialog.title')"
        :lang="interfaceLocale"
        :primary-action="{
            actionType: 'progressive',
            disabled: applying || savingSettings,
            label: msg('dialog.apply'),
        }"
        :default-action="{
            disabled: applying || savingSettings,
            label: msg('dialog.cancel'),
        }"
        @primary="apply"
        @default="onCancel"
        @update:open="onOpenChange"
    >
        <p>{{ msg("dialog.intro") }}</p>
        <cdx-message v-if="error" type="error">{{ error }}</cdx-message>
        <cdx-message v-if="settingsSaved" type="success">
            {{ msg("feedback.settingsSaved") }}
        </cdx-message>
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
                    :title="msg('dialog.alignColumnsCompletelyTooltip')"
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
                    subsequentParameterLayout !== 'align-columns-completely'
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
                    :title="msg('dialog.characterRatioFiveToThreeTooltip')"
                >
                    5:3
                </cdx-radio>
                <cdx-radio
                    v-model="characterWidthRatio"
                    name="character-width-ratio"
                    input-value="2:1"
                    :inline="true"
                    :title="msg('dialog.characterRatioTwoToOneTooltip')"
                >
                    2:1
                </cdx-radio>
            </cdx-field>
        </cdx-field>
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
            <template #label>{{ msg("dialog.other") }}</template>
            <cdx-checkbox v-model="highlightMissing">
                {{ msg("dialog.highlightMissing") }}
            </cdx-checkbox>
        </cdx-field>
        <cdx-button
            type="button"
            :disabled="applying || savingSettings"
            @click="saveCurrentSettings"
        >
            {{ msg("dialog.saveSettings") }}
        </cdx-button>
        <cdx-progress-bar
            v-if="applying || savingSettings"
            :aria-label="
                savingSettings
                    ? msg('dialog.saveSettings')
                    : msg('dialog.apply')
            "
        />
    </cdx-dialog>
</template>
