<template>
    <cdx-dialog
        class="vg-stub-creator-preview-dialog"
        v-if="previewOpen"
        v-model:open="previewOpen"
        v-bind:title="getArticlePreviewTitle()"
    >
        <div class="vg-stub-creator-preview-layout">
            <cdx-text-area
                class="vg-stub-creator-preview-text"
                ref="previewTextArea"
                v-model="previewText"
                rows="18"
                spellcheck="false"
            ></cdx-text-area>
            <div
                class="vg-stub-creator-preview-rendered mw-parser-output"
                v-html="previewHtml"
            ></div>
        </div>
        <cdx-field class="vg-stub-creator-preview-summary">
            <cdx-text-input
                v-bind:disabled="sourceFetchState.loading"
                v-model="previewSummary"
            ></cdx-text-input>
            <template v-slot:label>{{ msg("preview.editSummary") }}</template>
        </cdx-field>
        <cdx-message
            class="vg-stub-creator-message"
            type="error"
            v-if="sourceFetchState.error"
        >
            {{ sourceFetchState.error }}
        </cdx-message>
        <template v-slot:footer>
            <div class="vg-stub-creator-dialog-footer">
                <div class="vg-stub-creator-dialog-footer-group">
                    <cdx-button
                        type="button"
                        v-on:click="closePreviewDialog"
                        weight="quiet"
                    >
                        {{ msg("preview.dismiss") }}
                    </cdx-button>
                </div>
                <div class="vg-stub-creator-dialog-footer-group">
                    <cdx-button
                        type="button"
                        v-on:click="refreshParsedPreview"
                        v-bind:disabled="sourceFetchState.loading"
                    >
                        {{
                            sourceFetchState.loading
                                ? msg("preview.updating")
                                : msg("preview.updatePreview")
                        }}
                    </cdx-button>
                    <cdx-button
                        type="button"
                        v-on:click="submitPreviewText"
                        action="progressive"
                        v-bind:disabled="
                            sourceFetchState.loading || !previewText.trim()
                        "
                        weight="primary"
                    >
                        {{ msg("preview.continue") }}
                    </cdx-button>
                </div>
            </div>
        </template>
    </cdx-dialog>
</template>
