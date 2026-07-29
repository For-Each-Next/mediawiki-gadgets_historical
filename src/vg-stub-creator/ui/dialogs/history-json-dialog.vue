<template>
    <cdx-dialog
        v-model:open="historyJsonOpen"
        :title="msg('form.historyData')"
    >
        <p>{{ msg("form.historyHelp") }}</p>
        <cdx-progress-bar
            :aria-label="msg('form.historyLoading')"
            v-if="historyLoading"
        ></cdx-progress-bar>
        <cdx-text-area
            class="vg-stub-creator-history-json-text"
            v-bind:readonly="!historyJsonEditable"
            v-model="historyJsonText"
            rows="12"
            spellcheck="false"
        ></cdx-text-area>
        <cdx-message
            class="vg-stub-creator-message"
            type="error"
            v-if="historyJsonError"
        >
            {{ historyJsonError }}
        </cdx-message>
        <template v-slot:footer>
            <div class="vg-stub-creator-dialog-footer">
                <div class="vg-stub-creator-dialog-footer-group">
                    <cdx-button
                        type="button"
                        v-on:click="closeHistoryJsonDialog"
                        v-bind:disabled="historyLoading"
                        weight="quiet"
                    >
                        {{ msg("common.close") }}
                    </cdx-button>
                </div>
                <div class="vg-stub-creator-dialog-footer-group">
                    <cdx-button
                        type="button"
                        v-on:click="importHistoryJson"
                        action="progressive"
                        v-bind:disabled="historyLoading"
                        weight="primary"
                    >
                        {{
                            historyLoading
                                ? msg("form.loading")
                                : msg("form.load")
                        }}
                    </cdx-button>
                </div>
            </div>
        </template>
    </cdx-dialog>
</template>
