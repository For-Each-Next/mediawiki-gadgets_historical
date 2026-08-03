<template>
    <cdx-dialog
        v-model:open="open"
        class="wiked-lite-dialog"
        :title="msg('dialog.title')"
        :lang="interfaceLocale"
        :primary-action="{
            actionType: 'progressive',
            disabled: saving,
            label: msg('dialog.apply'),
        }"
        :default-action="{
            disabled: saving,
            label: msg('dialog.cancel'),
        }"
        @primary="apply"
        @default="onCancel"
        @update:open="onOpenChange"
    >
        <p>{{ msg("dialog.intro") }}</p>
        <cdx-message v-if="error" type="error">{{ error }}</cdx-message>
        <cdx-field :is-fieldset="true">
            <template #label>{{ msg("dialog.layout") }}</template>
            <cdx-checkbox v-model="indentPipes">
                {{ msg("dialog.indentPipes") }}
            </cdx-checkbox>
            <cdx-checkbox v-model="alignEquals">
                {{ msg("dialog.alignEquals") }}
                <template #custom-input>
                    <cdx-field :is-fieldset="true" :disabled="!alignEquals">
                        <template #label>
                            {{ msg("dialog.characterWidths") }}
                        </template>
                        <cdx-radio
                            v-model="characterWidthRatio"
                            name="character-width-ratio"
                            input-value="1:2"
                            :inline="true"
                        >
                            1:2
                        </cdx-radio>
                        <cdx-radio
                            v-model="characterWidthRatio"
                            name="character-width-ratio"
                            input-value="3:5"
                            :inline="true"
                        >
                            3:5
                        </cdx-radio>
                    </cdx-field>
                </template>
            </cdx-checkbox>
        </cdx-field>
        <cdx-field :is-fieldset="true">
            <template #label>{{ msg("dialog.fixes") }}</template>
            <cdx-checkbox v-model="normalizeConversion">
                {{ msg("dialog.normalizeConversion") }}
            </cdx-checkbox>
            <cdx-checkbox v-model="resolveRedirects">
                {{ msg("dialog.resolveRedirects") }}
                <template #description>
                    {{ msg("dialog.resolveDescription") }}
                </template>
            </cdx-checkbox>
            <cdx-checkbox v-model="highlightMissing">
                {{ msg("dialog.highlightMissing") }}
                <template #description>
                    {{ msg("dialog.highlightDescription") }}
                </template>
            </cdx-checkbox>
        </cdx-field>
        <cdx-progress-bar v-if="saving" :aria-label="msg('dialog.apply')" />
    </cdx-dialog>
</template>
