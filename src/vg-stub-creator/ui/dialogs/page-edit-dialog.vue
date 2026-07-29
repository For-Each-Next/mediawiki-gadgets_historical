<template>
    <cdx-dialog
        class="vg-stub-creator-preview-dialog"
        v-bind:title="getPageEditDialogTitle()"
        v-if="pageEditOpen"
        v-model:open="pageEditOpen"
    >
        <cdx-field
            v-if="pageEditState.create &amp;&amp; (pageEditState.kind === 'category' || pageEditState.kind === 'navbox')"
        >
            <cdx-text-input
                v-bind:disabled="pageEditState.loading"
                v-bind:placeholder="getPageEditEnglishPlaceholder()"
                v-model="pageEditState.englishName"
            ></cdx-text-input>
            <template v-slot:label>{{ getPageEditEnglishLabel() }}</template>
        </cdx-field>
        <div class="vg-stub-creator-preview-layout">
            <cdx-text-area
                class="vg-stub-creator-preview-text"
                ref="pageEditTextArea"
                v-model="pageEditState.text"
                rows="18"
                spellcheck="false"
                v-bind:disabled="pageEditState.loading"
            ></cdx-text-area>
            <div
                class="vg-stub-creator-preview-rendered mw-parser-output"
                v-html="pageEditState.html"
            ></div>
        </div>
        <cdx-message
            class="vg-stub-creator-message"
            type="error"
            v-if="pageEditState.error"
        >
            {{ pageEditState.error }}
        </cdx-message>
        <template v-slot:footer>
            <div class="vg-stub-creator-dialog-footer">
                <div class="vg-stub-creator-dialog-footer-group">
                    <cdx-button
                        type="button"
                        v-on:click="closePageEditDialog"
                        weight="quiet"
                    >
                        {{ msg("preview.cancel") }}
                    </cdx-button>
                </div>
                <div class="vg-stub-creator-dialog-footer-group">
                    <cdx-button
                        type="button"
                        v-on:click="refreshPageEditPreview"
                        v-bind:disabled="pageEditState.loading"
                    >
                        {{
                            pageEditState.loading
                                ? msg("preview.updating")
                                : msg("preview.updatePreview")
                        }}
                    </cdx-button>
                    <cdx-button
                        type="button"
                        v-on:click="resetPageEdit"
                        action="destructive"
                        v-bind:disabled="pageEditState.loading"
                        v-if="pageEditState.pending"
                    >
                        {{ msg("common.reset") }}
                    </cdx-button>
                    <cdx-button
                        type="button"
                        v-on:click="stagePageEdit"
                        action="progressive"
                        v-bind:disabled="
                            pageEditState.loading || !pageEditState.text.trim()
                        "
                        weight="primary"
                    >
                        {{ msg("preview.stage") }}
                    </cdx-button>
                </div>
            </div>
        </template>
    </cdx-dialog>
</template>
