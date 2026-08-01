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
        <cdx-field class="wiked-lite-dialog__section" :is-fieldset="true">
            <template #label>{{ msg("dialog.layout") }}</template>
            <cdx-checkbox v-model="indentPipes">
                {{ msg("dialog.indentPipes") }}
            </cdx-checkbox>
            <cdx-checkbox v-model="alignEquals">
                {{ msg("dialog.alignEquals") }}
            </cdx-checkbox>
            <cdx-field class="wiked-lite-dialog__ratio">
                <template #label>{{ msg("dialog.ratio") }}</template>
                <cdx-text-input v-model="fullWidthRatio" input-type="number" />
            </cdx-field>
        </cdx-field>
        <cdx-field class="wiked-lite-dialog__section" :is-fieldset="true">
            <template #label>{{ msg("dialog.fixes") }}</template>
            <cdx-checkbox v-model="normalizeConversion">
                {{ msg("dialog.normalizeConversion") }}
            </cdx-checkbox>
            <cdx-checkbox v-model="sortCategories">
                {{ msg("dialog.sortCategories") }}
            </cdx-checkbox>
            <cdx-checkbox v-model="resolveRedirects">
                {{ msg("dialog.resolveRedirects") }}
            </cdx-checkbox>
            <cdx-message v-if="resolveRedirects" type="warning">
                {{ msg("dialog.resolveWarning") }}
            </cdx-message>
            <cdx-checkbox v-model="highlightMissing">
                {{ msg("dialog.highlightMissing") }}
            </cdx-checkbox>
            <cdx-message v-if="highlightMissing" type="warning">
                {{ msg("dialog.highlightWarning") }}
            </cdx-message>
        </cdx-field>
        <cdx-progress-bar v-if="saving" :aria-label="msg('dialog.apply')" />
        <template #footer>
            <div class="wiked-lite-dialog__actions">
                <cdx-button :disabled="saving" @click="onCancel">
                    {{ msg("dialog.cancel") }}
                </cdx-button>
                <cdx-button
                    action="progressive"
                    weight="primary"
                    :disabled="saving"
                    @click="apply"
                >
                    {{ msg("dialog.apply") }}
                </cdx-button>
            </div>
        </template>
    </cdx-dialog>
</template>
