<template>
    <cdx-dialog
        class="vg-stub-creator-company-category-dialog"
        :lang="interfaceLocale"
        :title="getCompanyCategoryDialogTitle()"
        v-model:open="companyCategoryOpen"
        @update:open="!$event &amp;&amp; closeCompanyCategory()"
    >
        <cdx-field class="vg-stub-creator-form-field">
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
                    class="vg-stub-creator-external-link"
                    :href="getCompanyCategoryWikidataUrl()"
                    v-else-if="companyCategoryState.wikidataId"
                    rel="noopener noreferrer"
                    target="_blank"
                >
                    {{ companyCategoryState.wikidataId }}
                    <cdx-icon
                        aria-hidden="true"
                        class="vg-stub-creator-external-link-icon"
                        :icon="externalLinkIcon"
                        size="x-small"
                    ></cdx-icon>
                </a>
            </template>
        </cdx-field>
        <cdx-field
            class="vg-stub-creator-form-field"
            :messages="{ error: companyCategoryValidationError }"
            :status="companyCategoryValidationError ? 'error' : 'default'"
        >
            <cdx-text-area
                class="vg-stub-creator-company-category-text"
                ref="companyCategoryTextArea"
                rows="10"
                :disabled="companyCategoryState.loading"
                :status="companyCategoryValidationError ? 'error' : 'default'"
                v-model="companyCategoryState.text"
                @update:model-value="companyCategoryValidationError = ''"
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
        <template #footer>
            <div class="vg-stub-creator-dialog-footer">
                <div class="vg-stub-creator-dialog-footer-actions">
                    <cdx-button
                        type="button"
                        action="progressive"
                        :disabled="companyCategoryState.loading"
                        weight="primary"
                        @click="saveCompanyCategory"
                    >
                        {{
                            companyCategoryState.loading
                                ? msg("review.saving")
                                : msg("common.save")
                        }}
                    </cdx-button>
                    <cdx-button
                        type="button"
                        :disabled="companyCategoryState.loading"
                        @click="closeCompanyCategory"
                    >
                        {{ msg("common.close") }}
                    </cdx-button>
                </div>
                <div class="vg-stub-creator-dialog-footer-peer-actions">
                    <cdx-button
                        type="button"
                        action="destructive"
                        :disabled="companyCategoryState.loading"
                        v-if="companyCategoryState.pending"
                        @click="cancelCompanyCategoryCreation"
                    >
                        {{ msg("common.delete") }}
                    </cdx-button>
                </div>
            </div>
        </template>
    </cdx-dialog>
</template>
