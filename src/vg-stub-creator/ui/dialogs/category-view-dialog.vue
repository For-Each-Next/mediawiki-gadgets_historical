<template>
    <cdx-dialog
        class="vg-stub-creator-category-view-dialog"
        :default-action="{ label: msg('common.close') }"
        :lang="interfaceLocale"
        :title="categoryViewState.title"
        v-model:open="categoryViewOpen"
        @default="closeCategoryView"
        @update:open="!$event &amp;&amp; closeCategoryView()"
    >
        <iframe
            class="vg-stub-creator-category-view"
            :src="categoryViewState.url"
            :title="categoryViewState.title"
        ></iframe>
    </cdx-dialog>
</template>
