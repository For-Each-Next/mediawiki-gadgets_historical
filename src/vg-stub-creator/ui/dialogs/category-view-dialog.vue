<template>
    <cdx-dialog
        class="vg-stub-creator-category-view-dialog"
        v-bind:title="categoryViewState.title"
        v-model:open="categoryViewOpen"
    >
        <iframe
            class="vg-stub-creator-category-view"
            v-bind:src="categoryViewState.url"
            v-bind:title="categoryViewState.title"
        ></iframe>
        <template v-slot:footer>
            <div class="vg-stub-creator-dialog-footer">
                <div class="vg-stub-creator-dialog-footer-group">
                    <cdx-button
                        type="button"
                        v-on:click="closeCategoryView"
                        weight="quiet"
                    >
                        {{ msg("common.close") }}
                    </cdx-button>
                </div>
                <div class="vg-stub-creator-dialog-footer-group"></div>
            </div>
        </template>
    </cdx-dialog>
</template>
