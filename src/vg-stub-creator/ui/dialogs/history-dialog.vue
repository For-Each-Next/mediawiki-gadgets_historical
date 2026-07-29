<template>
    <cdx-dialog v-model:open="historyOpen" :title="msg('form.historyTitle')">
        <cdx-progress-bar
            :aria-label="msg('form.historyLoading')"
            v-if="historyLoading"
        ></cdx-progress-bar>
        <p v-if="historyEntries.length === 0">
            {{ msg("form.historyEmpty") }}
        </p>
        <div
            v-if="historyEntries.length &gt; 0"
            class="vg-stub-creator-history-list"
        >
            <div
                v-bind:key="entry.id"
                v-for="(entry, index) in historyEntries"
                class="vg-stub-creator-history-entry"
            >
                <div>
                    <div>
                        {{ index + 1 }}. {{ formatHistoryEntryPage(entry) }}
                    </div>
                    <div class="vg-stub-creator-history-saved-at">
                        {{ entry.metadata.savedAt }}
                    </div>
                </div>
                <cdx-button
                    type="button"
                    v-on:click="fillHistoryEntry(entry)"
                    v-bind:disabled="historyLoading"
                >
                    {{
                        historyLoading ? msg("form.loading") : msg("form.load")
                    }}
                </cdx-button>
                <cdx-button
                    type="button"
                    v-on:click="openHistoryJsonDialog(entry)"
                    v-bind:disabled="historyLoading"
                >
                    {{ msg("form.export") }}
                </cdx-button>
                <cdx-button
                    type="button"
                    v-on:click="deleteHistoryEntry(entry.id)"
                    action="destructive"
                    v-bind:disabled="historyLoading"
                    v-if="!entry.metadata.temporary"
                >
                    {{ msg("common.delete") }}
                </cdx-button>
                <cdx-button
                    type="button"
                    v-on:click="updateTemporaryHistoryEntry"
                    v-bind:disabled="historyLoading"
                    v-if="entry.metadata.temporary"
                >
                    {{ msg("form.update") }}
                </cdx-button>
            </div>
        </div>
        <template v-slot:footer>
            <div class="vg-stub-creator-dialog-footer">
                <div class="vg-stub-creator-dialog-footer-group">
                    <cdx-button
                        type="button"
                        v-on:click="closeHistoryDialog"
                        v-bind:disabled="historyLoading"
                        weight="quiet"
                    >
                        {{ msg("common.close") }}
                    </cdx-button>
                </div>
                <div class="vg-stub-creator-dialog-footer-group">
                    <cdx-button
                        type="button"
                        v-on:click="clearHistory"
                        action="destructive"
                        v-bind:disabled="
                            historyLoading || !hasPersistentHistoryEntries()
                        "
                    >
                        {{ msg("form.clear") }}
                    </cdx-button>
                    <cdx-button
                        type="button"
                        v-on:click="openHistoryImportDialog"
                        action="progressive"
                        v-bind:disabled="historyLoading"
                    >
                        {{ msg("form.import") }}
                    </cdx-button>
                </div>
            </div>
        </template>
    </cdx-dialog>
</template>
