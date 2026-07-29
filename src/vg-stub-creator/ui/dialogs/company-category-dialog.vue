<template>
    <cdx-dialog
        v-bind:title="getCompanyCategoryDialogTitle()"
        v-model:open="companyCategoryOpen"
    >
        <cdx-field>
            <cdx-text-input
                :placeholder="msg('review.companyCategoryEnglishPlaceholder')"
                v-model="companyCategoryState.englishName"
                v-on:blur="refreshCompanyCategoryMetadata"
            ></cdx-text-input>
            <template v-slot:label>
                {{ msg("review.companyCategoryEnglishName") }}
            </template>
            <template v-slot:help-text>
                <span v-if="companyCategoryLookupLoading">
                    {{ msg("review.companyCategoryCheckingWikidata") }}
                </span>
                <a
                    v-bind:href="getCompanyCategoryWikidataUrl()"
                    v-else-if="companyCategoryState.wikidataId"
                    rel="noopener noreferrer"
                    target="_blank"
                >
                    {{ companyCategoryState.wikidataId }}
                </a>
            </template>
        </cdx-field>
        <cdx-field>
            <cdx-text-area
                class="vg-stub-creator-company-category-text"
                rows="10"
                v-bind:disabled="companyCategoryState.loading"
                v-model="companyCategoryState.text"
            ></cdx-text-area>
            <template v-slot:label>
                {{ msg("review.companyCategoryWikitext") }}
            </template>
        </cdx-field>
        <cdx-message
            class="vg-stub-creator-message"
            type="error"
            v-if="companyCategoryState.error"
        >
            {{ companyCategoryState.error }}
        </cdx-message>
        <template v-slot:footer>
            <div class="vg-stub-creator-dialog-footer">
                <div class="vg-stub-creator-dialog-footer-group">
                    <cdx-button
                        type="button"
                        v-on:click="closeCompanyCategory"
                        v-bind:disabled="companyCategoryState.loading"
                        weight="quiet"
                    >
                        {{ msg("common.close") }}
                    </cdx-button>
                </div>
                <div class="vg-stub-creator-dialog-footer-group">
                    <cdx-button
                        type="button"
                        v-on:click="cancelCompanyCategoryCreation"
                        action="destructive"
                        v-bind:disabled="companyCategoryState.loading"
                        v-if="companyCategoryState.pending"
                    >
                        {{ msg("common.delete") }}
                    </cdx-button>
                    <cdx-button
                        type="button"
                        v-on:click="saveCompanyCategory"
                        action="progressive"
                        v-bind:disabled="
                            companyCategoryState.loading ||
                            !companyCategoryState.text.trim()
                        "
                        weight="primary"
                    >
                        {{
                            companyCategoryState.loading
                                ? msg("review.saving")
                                : msg("common.save")
                        }}
                    </cdx-button>
                </div>
            </div>
        </template>
    </cdx-dialog>
</template>
