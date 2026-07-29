<template>
    <cdx-dialog
        class="vg-stub-creator-dialog"
        v-model:open="open"
        v-bind:title="getDialogTitle()"
    >
        <div
            class="vg-stub-creator-dialog-body"
            v-bind:class="{
                'vg-stub-creator-dialog-body--masked': previewLoading,
            }"
        >
            <cdx-tabs v-model:active="activeTab">
                <cdx-tab
                    v-bind:key="group.key"
                    v-bind:label="group.label"
                    v-bind:name="group.key"
                    v-for="group in groups"
                >
                    <p
                        class="vg-stub-creator-tab-description"
                        v-if="group.description"
                    >
                        {{ group.description }}
                    </p>
                    <template v-if="group.fields.length">
                        <cdx-field is-fieldset v-if="group.fieldsetLabel">
                            <div class="vg-stub-creator-fieldset-fields">
                                <template
                                    v-bind:key="field.key"
                                    v-for="field in group.fields"
                                >
                                    <div
                                        class="vg-stub-creator-fieldset-field"
                                    >
                                        <div
                                            class="vg-stub-creator-field-controls"
                                            v-bind:class="{
                                                'vg-stub-creator-field-controls--with-source':
                                                    field.sourceField,
                                                'vg-stub-creator-field-controls--with-move':
                                                    field.key === 'pageName',
                                            }"
                                        >
                                            <template v-if="field.multiline">
                                                <cdx-text-area
                                                    class="vg-stub-creator-article-field-text"
                                                    rows="1"
                                                    v-bind:placeholder="
                                                        getFieldPlaceholder(
                                                            field,
                                                        ) || field.placeholder
                                                    "
                                                    v-bind:model-value="
                                                        form[field.key]
                                                    "
                                                    v-on:change="
                                                        normalizeFieldValue(
                                                            field,
                                                        )
                                                    "
                                                    v-on:update:model-value="
                                                        updateFieldValue(
                                                            field,
                                                            $event,
                                                        )
                                                    "
                                                ></cdx-text-area>
                                            </template>
                                            <template v-else>
                                                <cdx-text-input
                                                    v-bind:placeholder="
                                                        getFieldPlaceholder(
                                                            field,
                                                        ) || field.placeholder
                                                    "
                                                    v-bind:readonly="
                                                        field.readonly
                                                    "
                                                    v-bind:model-value="
                                                        form[field.key]
                                                    "
                                                    v-on:change="
                                                        normalizeFieldValue(
                                                            field,
                                                        )
                                                    "
                                                    v-on:paste="
                                                        normalizePastedFieldValue(
                                                            field,
                                                            $event,
                                                        )
                                                    "
                                                    v-on:update:model-value="
                                                        updateFieldValue(
                                                            field,
                                                            $event,
                                                        )
                                                    "
                                                ></cdx-text-input>
                                                <cdx-button
                                                    type="button"
                                                    v-on:click="openMoveDialog"
                                                    v-bind:disabled="
                                                        sourceFetchState.loading
                                                    "
                                                    v-if="field.key === 'pageName' &amp;&amp; canMovePageName()"
                                                >
                                                    {{ msg("text.move") }}
                                                </cdx-button>
                                            </template>
                                            <template v-if="field.sourceField">
                                                <cdx-text-area
                                                    class="vg-stub-creator-source-url"
                                                    rows="1"
                                                    v-bind:model-value="
                                                        form[
                                                            field.sourceField
                                                                .sourceKey
                                                        ]
                                                    "
                                                    v-on:change="
                                                        trimSourceValue(
                                                            field.sourceField,
                                                        )
                                                    "
                                                    v-on:update:model-value="
                                                        updateSourceValue(
                                                            field.sourceField,
                                                            $event,
                                                        )
                                                    "
                                                    :placeholder="
                                                        msg('form.sourceUrls')
                                                    "
                                                ></cdx-text-area>
                                            </template>
                                        </div>
                                    </div>
                                </template>
                            </div>
                            <template v-slot:label>
                                {{ group.fieldsetLabel }}
                            </template>
                        </cdx-field>
                        <template v-if="!group.fieldsetLabel">
                            <template v-if="group.key === 'metadata'">
                                <template
                                    v-bind:key="field.key"
                                    v-for="field in group.fields.slice(0, 1)"
                                >
                                    <cdx-field
                                        v-bind:is-fieldset="
                                            !!field.sourceField
                                        "
                                        v-if="field.compact"
                                    >
                                        <div
                                            class="vg-stub-creator-field-controls"
                                            v-bind:class="{
                                                'vg-stub-creator-field-controls--with-source':
                                                    field.sourceField,
                                                'vg-stub-creator-field-controls--with-move':
                                                    field.key === 'pageName',
                                            }"
                                        >
                                            <template v-if="field.multiline">
                                                <cdx-text-area
                                                    class="vg-stub-creator-article-field-text"
                                                    rows="1"
                                                    v-bind:placeholder="
                                                        field.placeholder
                                                    "
                                                    v-bind:model-value="
                                                        form[field.key]
                                                    "
                                                    v-on:change="
                                                        normalizeFieldValue(
                                                            field,
                                                        )
                                                    "
                                                    v-on:update:model-value="
                                                        updateFieldValue(
                                                            field,
                                                            $event,
                                                        )
                                                    "
                                                ></cdx-text-area>
                                            </template>
                                            <template v-else>
                                                <cdx-text-input
                                                    v-bind:placeholder="
                                                        field.placeholder
                                                    "
                                                    v-bind:readonly="
                                                        field.readonly
                                                    "
                                                    v-bind:model-value="
                                                        form[field.key]
                                                    "
                                                    v-on:change="
                                                        normalizeFieldValue(
                                                            field,
                                                        )
                                                    "
                                                    v-on:paste="
                                                        normalizePastedFieldValue(
                                                            field,
                                                            $event,
                                                        )
                                                    "
                                                    v-on:update:model-value="
                                                        updateFieldValue(
                                                            field,
                                                            $event,
                                                        )
                                                    "
                                                ></cdx-text-input>
                                                <cdx-button
                                                    type="button"
                                                    v-on:click="openMoveDialog"
                                                    v-bind:disabled="
                                                        sourceFetchState.loading
                                                    "
                                                    v-if="field.key === 'pageName' &amp;&amp; canMovePageName()"
                                                >
                                                    {{ msg("text.move") }}
                                                </cdx-button>
                                            </template>
                                            <template v-if="field.sourceField">
                                                <cdx-text-area
                                                    class="vg-stub-creator-source-url"
                                                    rows="1"
                                                    v-bind:model-value="
                                                        form[
                                                            field.sourceField
                                                                .sourceKey
                                                        ]
                                                    "
                                                    v-on:change="
                                                        trimSourceValue(
                                                            field.sourceField,
                                                        )
                                                    "
                                                    v-on:update:model-value="
                                                        updateSourceValue(
                                                            field.sourceField,
                                                            $event,
                                                        )
                                                    "
                                                    :placeholder="
                                                        msg('form.sourceUrls')
                                                    "
                                                ></cdx-text-area>
                                            </template>
                                        </div>
                                        <template v-slot:label>
                                            {{ field.heading || field.label }}
                                        </template>
                                    </cdx-field>
                                    <cdx-field
                                        v-bind:is-fieldset="
                                            !!field.sourceField
                                        "
                                        v-else-if="!field.compact"
                                    >
                                        <div
                                            class="vg-stub-creator-field-controls"
                                            v-bind:class="{
                                                'vg-stub-creator-field-controls--with-source':
                                                    field.sourceField,
                                                'vg-stub-creator-field-controls--with-move':
                                                    field.key === 'pageName',
                                            }"
                                        >
                                            <template v-if="field.multiline">
                                                <cdx-text-area
                                                    class="vg-stub-creator-article-field-text"
                                                    rows="1"
                                                    v-bind:placeholder="
                                                        getFieldPlaceholder(
                                                            field,
                                                        ) || field.placeholder
                                                    "
                                                    v-bind:model-value="
                                                        form[field.key]
                                                    "
                                                    v-on:change="
                                                        normalizeFieldValue(
                                                            field,
                                                        )
                                                    "
                                                    v-on:update:model-value="
                                                        updateFieldValue(
                                                            field,
                                                            $event,
                                                        )
                                                    "
                                                ></cdx-text-area>
                                            </template>
                                            <template v-else>
                                                <cdx-text-input
                                                    v-bind:placeholder="
                                                        getFieldPlaceholder(
                                                            field,
                                                        ) || field.placeholder
                                                    "
                                                    v-bind:readonly="
                                                        field.readonly
                                                    "
                                                    v-bind:model-value="
                                                        form[field.key]
                                                    "
                                                    v-on:change="
                                                        normalizeFieldValue(
                                                            field,
                                                        )
                                                    "
                                                    v-on:paste="
                                                        normalizePastedFieldValue(
                                                            field,
                                                            $event,
                                                        )
                                                    "
                                                    v-on:update:model-value="
                                                        updateFieldValue(
                                                            field,
                                                            $event,
                                                        )
                                                    "
                                                ></cdx-text-input>
                                                <cdx-button
                                                    type="button"
                                                    v-on:click="openMoveDialog"
                                                    v-bind:disabled="
                                                        sourceFetchState.loading
                                                    "
                                                    v-if="field.key === 'pageName' &amp;&amp; canMovePageName()"
                                                >
                                                    {{ msg("text.move") }}
                                                </cdx-button>
                                            </template>
                                            <template v-if="field.sourceField">
                                                <cdx-text-area
                                                    class="vg-stub-creator-source-url"
                                                    rows="1"
                                                    v-bind:model-value="
                                                        form[
                                                            field.sourceField
                                                                .sourceKey
                                                        ]
                                                    "
                                                    v-on:change="
                                                        trimSourceValue(
                                                            field.sourceField,
                                                        )
                                                    "
                                                    v-on:update:model-value="
                                                        updateSourceValue(
                                                            field.sourceField,
                                                            $event,
                                                        )
                                                    "
                                                    :placeholder="
                                                        msg('form.sourceUrls')
                                                    "
                                                ></cdx-text-area>
                                            </template>
                                        </div>
                                        <template v-slot:label>
                                            {{ field.label }}
                                        </template>
                                        <template
                                            v-slot:help-text
                                            v-if="field.key === 'enwikiTitle'"
                                        >
                                            <template
                                                v-if="
                                                    getEnwikiTipLinks().length
                                                "
                                            >
                                                <span
                                                    class="vg-stub-creator-enwiki-help vg-stub-creator-horizontal-list"
                                                >
                                                    <span
                                                        class="vg-stub-creator-horizontal-list-item"
                                                        v-bind:key="link.label"
                                                        v-for="link in getEnwikiTipLinks()"
                                                    >
                                                        {{ link.label }}
                                                        <a
                                                            v-if="link.url"
                                                            v-bind:href="
                                                                link.url
                                                            "
                                                            rel="noopener noreferrer"
                                                            target="_blank"
                                                        >
                                                            {{ link.value }}
                                                        </a>
                                                        <span v-else>
                                                            {{ link.value }}
                                                        </span>
                                                    </span>
                                                </span>
                                            </template>
                                            <template v-else>
                                                {{ getWikidataStatusText() }}
                                            </template>
                                        </template>
                                    </cdx-field>
                                </template>
                                <cdx-table
                                    class="vg-stub-creator-metadata-table"
                                    :caption="msg('metadata.fields')"
                                    v-bind:columns="metadataTableColumns"
                                    v-bind:data="
                                        getMetadataFieldTableRows(group)
                                    "
                                >
                                    <template v-slot:item-label="{ row }">
                                        {{ getMetadataFieldLabel(row.field) }}
                                    </template>
                                    <template v-slot:item-value="{ row }">
                                        <cdx-text-input
                                            v-bind:placeholder="
                                                getFieldPlaceholder(
                                                    row.field,
                                                ) || row.field.placeholder
                                            "
                                            v-bind:readonly="
                                                row.field.readonly
                                            "
                                            v-bind:model-value="
                                                form[row.field.key]
                                            "
                                            v-on:change="
                                                normalizeFieldValue(row.field)
                                            "
                                            v-on:paste="
                                                normalizePastedFieldValue(
                                                    row.field,
                                                    $event,
                                                )
                                            "
                                            v-on:update:model-value="
                                                updateFieldValue(
                                                    row.field,
                                                    $event,
                                                )
                                            "
                                        ></cdx-text-input>
                                    </template>
                                    <template v-slot:item-source="{ row }">
                                        <cdx-text-area
                                            class="vg-stub-creator-source-url"
                                            rows="1"
                                            v-bind:model-value="
                                                form[
                                                    row.field.sourceField
                                                        .sourceKey
                                                ]
                                            "
                                            v-on:change="
                                                trimSourceValue(
                                                    row.field.sourceField,
                                                )
                                            "
                                            v-on:update:model-value="
                                                updateSourceValue(
                                                    row.field.sourceField,
                                                    $event,
                                                )
                                            "
                                            :placeholder="
                                                msg('form.sourceUrls')
                                            "
                                        ></cdx-text-area>
                                    </template>
                                </cdx-table>
                            </template>
                            <template v-else>
                                <template
                                    v-bind:key="field.key"
                                    v-for="field in group.fields"
                                >
                                    <cdx-field
                                        v-bind:is-fieldset="
                                            !!field.sourceField
                                        "
                                        v-if="field.compact"
                                    >
                                        <div
                                            class="vg-stub-creator-field-controls"
                                            v-bind:class="{
                                                'vg-stub-creator-field-controls--with-source':
                                                    field.sourceField,
                                                'vg-stub-creator-field-controls--with-move':
                                                    field.key === 'pageName',
                                            }"
                                        >
                                            <template v-if="field.multiline">
                                                <cdx-text-area
                                                    class="vg-stub-creator-article-field-text"
                                                    rows="1"
                                                    v-bind:placeholder="
                                                        field.placeholder
                                                    "
                                                    v-bind:model-value="
                                                        form[field.key]
                                                    "
                                                    v-on:change="
                                                        normalizeFieldValue(
                                                            field,
                                                        )
                                                    "
                                                    v-on:update:model-value="
                                                        updateFieldValue(
                                                            field,
                                                            $event,
                                                        )
                                                    "
                                                ></cdx-text-area>
                                            </template>
                                            <template v-else>
                                                <cdx-text-input
                                                    v-bind:placeholder="
                                                        field.placeholder
                                                    "
                                                    v-bind:readonly="
                                                        field.readonly
                                                    "
                                                    v-bind:model-value="
                                                        form[field.key]
                                                    "
                                                    v-on:change="
                                                        normalizeFieldValue(
                                                            field,
                                                        )
                                                    "
                                                    v-on:paste="
                                                        normalizePastedFieldValue(
                                                            field,
                                                            $event,
                                                        )
                                                    "
                                                    v-on:update:model-value="
                                                        updateFieldValue(
                                                            field,
                                                            $event,
                                                        )
                                                    "
                                                ></cdx-text-input>
                                                <cdx-button
                                                    type="button"
                                                    v-on:click="openMoveDialog"
                                                    v-bind:disabled="
                                                        sourceFetchState.loading
                                                    "
                                                    v-if="field.key === 'pageName' &amp;&amp; canMovePageName()"
                                                >
                                                    {{ msg("text.move") }}
                                                </cdx-button>
                                            </template>
                                            <template v-if="field.sourceField">
                                                <cdx-text-area
                                                    class="vg-stub-creator-source-url"
                                                    rows="1"
                                                    v-bind:model-value="
                                                        form[
                                                            field.sourceField
                                                                .sourceKey
                                                        ]
                                                    "
                                                    v-on:change="
                                                        trimSourceValue(
                                                            field.sourceField,
                                                        )
                                                    "
                                                    v-on:update:model-value="
                                                        updateSourceValue(
                                                            field.sourceField,
                                                            $event,
                                                        )
                                                    "
                                                    :placeholder="
                                                        msg('form.sourceUrls')
                                                    "
                                                ></cdx-text-area>
                                            </template>
                                        </div>
                                        <template v-slot:label>
                                            {{ field.heading || field.label }}
                                        </template>
                                    </cdx-field>
                                    <cdx-field
                                        v-bind:is-fieldset="
                                            !!field.sourceField
                                        "
                                        v-else-if="!field.compact"
                                    >
                                        <div
                                            class="vg-stub-creator-field-controls"
                                            v-bind:class="{
                                                'vg-stub-creator-field-controls--with-source':
                                                    field.sourceField,
                                                'vg-stub-creator-field-controls--with-move':
                                                    field.key === 'pageName',
                                            }"
                                        >
                                            <template v-if="field.multiline">
                                                <cdx-text-area
                                                    class="vg-stub-creator-article-field-text"
                                                    rows="1"
                                                    v-bind:placeholder="
                                                        getFieldPlaceholder(
                                                            field,
                                                        ) || field.placeholder
                                                    "
                                                    v-bind:model-value="
                                                        form[field.key]
                                                    "
                                                    v-on:change="
                                                        normalizeFieldValue(
                                                            field,
                                                        )
                                                    "
                                                    v-on:update:model-value="
                                                        updateFieldValue(
                                                            field,
                                                            $event,
                                                        )
                                                    "
                                                ></cdx-text-area>
                                            </template>
                                            <template v-else>
                                                <cdx-text-input
                                                    v-bind:placeholder="
                                                        getFieldPlaceholder(
                                                            field,
                                                        ) || field.placeholder
                                                    "
                                                    v-bind:readonly="
                                                        field.readonly
                                                    "
                                                    v-bind:model-value="
                                                        form[field.key]
                                                    "
                                                    v-on:change="
                                                        normalizeFieldValue(
                                                            field,
                                                        )
                                                    "
                                                    v-on:paste="
                                                        normalizePastedFieldValue(
                                                            field,
                                                            $event,
                                                        )
                                                    "
                                                    v-on:update:model-value="
                                                        updateFieldValue(
                                                            field,
                                                            $event,
                                                        )
                                                    "
                                                ></cdx-text-input>
                                                <cdx-button
                                                    type="button"
                                                    v-on:click="openMoveDialog"
                                                    v-bind:disabled="
                                                        sourceFetchState.loading
                                                    "
                                                    v-if="field.key === 'pageName' &amp;&amp; canMovePageName()"
                                                >
                                                    {{ msg("text.move") }}
                                                </cdx-button>
                                            </template>
                                            <template v-if="field.sourceField">
                                                <cdx-text-area
                                                    class="vg-stub-creator-source-url"
                                                    rows="1"
                                                    v-bind:model-value="
                                                        form[
                                                            field.sourceField
                                                                .sourceKey
                                                        ]
                                                    "
                                                    v-on:change="
                                                        trimSourceValue(
                                                            field.sourceField,
                                                        )
                                                    "
                                                    v-on:update:model-value="
                                                        updateSourceValue(
                                                            field.sourceField,
                                                            $event,
                                                        )
                                                    "
                                                    :placeholder="
                                                        msg('form.sourceUrls')
                                                    "
                                                ></cdx-text-area>
                                            </template>
                                        </div>
                                        <template v-slot:label>
                                            {{ field.label }}
                                        </template>
                                        <template
                                            v-slot:help-text
                                            v-if="field.key === 'enwikiTitle'"
                                        >
                                            <template
                                                v-if="
                                                    getEnwikiTipLinks().length
                                                "
                                            >
                                                <span
                                                    class="vg-stub-creator-enwiki-help vg-stub-creator-horizontal-list"
                                                >
                                                    <span
                                                        class="vg-stub-creator-horizontal-list-item"
                                                        v-bind:key="link.label"
                                                        v-for="link in getEnwikiTipLinks()"
                                                    >
                                                        {{ link.label }}
                                                        <a
                                                            v-if="link.url"
                                                            v-bind:href="
                                                                link.url
                                                            "
                                                            rel="noopener noreferrer"
                                                            target="_blank"
                                                        >
                                                            {{ link.value }}
                                                        </a>
                                                        <span v-else>
                                                            {{ link.value }}
                                                        </span>
                                                    </span>
                                                </span>
                                            </template>
                                            <template v-else>
                                                {{ getWikidataStatusText() }}
                                            </template>
                                        </template>
                                    </cdx-field>
                                </template>
                            </template>
                        </template>
                        <cdx-card
                            class="vg-stub-creator-preview-card"
                            v-if="group.previewKey &amp;&amp; getGroupPreview(group)"
                        >
                            <template v-slot:title>
                                {{ msg("preview.wikitext") }}
                            </template>
                            <template v-slot:supporting-text>
                                <pre
                                    class="vg-stub-creator-preview-card-text"
                                    >{{ getGroupPreview(group) }}</pre>
                            </template>
                        </cdx-card>
                        <cdx-card
                            class="vg-stub-creator-preview-card"
                            v-if="group.fullTextReview &amp;&amp; getProseWikitext()"
                        >
                            <template v-slot:title>
                                {{ msg("preview.fullText") }}
                            </template>
                            <template v-slot:supporting-text>
                                <p
                                    class="vg-stub-creator-preview-card-description"
                                >
                                    {{ getProseReviewDescription() }}
                                </p>
                                <pre
                                    class="vg-stub-creator-preview-card-text"
                                    >{{ getProseWikitext() }}</pre>
                            </template>
                        </cdx-card>
                    </template>
                    <template v-if="group.nameGroupKey">
                        <cdx-field>
                            <div class="vg-stub-creator-steam-helper">
                                <div class="vg-stub-creator-steam-row">
                                    <cdx-text-input
                                        placeholder="https://store.steampowered.com/app/..."
                                        v-bind:model-value="steamUrl"
                                        v-on:update:model-value="
                                            updateSteamUrl($event)
                                        "
                                    ></cdx-text-input>
                                    <cdx-button
                                        type="button"
                                        v-on:click="addSteamNames"
                                        v-bind:disabled="
                                            sourceFetchState.loading
                                        "
                                    >
                                        {{ msg("names.check") }}
                                    </cdx-button>
                                </div>
                                <div
                                    class="vg-stub-creator-steam-row vg-stub-creator-steam-row--suggestions"
                                    v-if="fetchedSteamNameRows.length"
                                >
                                    <ul
                                        class="vg-stub-creator-steam-suggestion vg-stub-creator-steam-links"
                                    >
                                        <li
                                            v-bind:key="suggestion.label"
                                            v-for="suggestion in getSteamNameSuggestions(
                                                fetchedSteamNameRows,
                                            )"
                                        >
                                            <strong>
                                                {{ suggestion.label }}
                                            </strong>
                                            <a
                                                v-bind:href="suggestion.url"
                                                rel="noopener noreferrer"
                                                target="_blank"
                                            >
                                                {{ suggestion.value }}
                                            </a>
                                        </li>
                                    </ul>
                                    <cdx-button-group
                                        class="vg-stub-creator-steam-actions"
                                        v-bind:buttons="steamNameButtons"
                                        v-on:click="applySteamNameChoice"
                                    ></cdx-button-group>
                                </div>
                            </div>
                            <template v-slot:label>
                                {{ msg("names.steamHelper") }}
                            </template>
                        </cdx-field>
                        <cdx-field v-if="getNameSearchRows().length &gt; 0">
                            <ul class="vg-stub-creator-name-search">
                                <li
                                    v-bind:key="row.key"
                                    v-for="row in getNameSearchRows()"
                                >
                                    <template
                                        v-for="part in msgParts(
                                            'names.searchSentence',
                                            {
                                                query: '__vg_query_part__',
                                                links: '__vg_links_part__',
                                            },
                                        )"
                                    >
                                        <strong
                                            v-if="part === '__vg_query_part__'"
                                        >
                                            {{ row.query }}
                                        </strong>
                                        <span
                                            class="vg-stub-creator-horizontal-list"
                                            v-else-if="
                                                part === '__vg_links_part__'
                                            "
                                        >
                                            <span
                                                class="vg-stub-creator-horizontal-list-item"
                                                v-bind:key="link.label"
                                                v-for="link in row.links"
                                            >
                                                <a
                                                    v-bind:href="link.url"
                                                    rel="noopener noreferrer"
                                                    target="_blank"
                                                >
                                                    {{ link.label }}
                                                </a>
                                            </span>
                                        </span>
                                        <template v-else>{{ part }}</template>
                                    </template>
                                </li>
                            </ul>
                            <template v-slot:label>
                                {{ msg("names.originalTitleLookup") }}
                            </template>
                        </cdx-field>
                        <div class="vg-stub-creator-name-fields">
                            <template
                                v-bind:key="index"
                                v-for="(row, index) in form[
                                    group.nameGroupKey
                                ]"
                            >
                                <cdx-field is-fieldset>
                                    <div
                                        class="vg-stub-creator-name-settings-row"
                                    >
                                        <cdx-checkbox
                                            class="vg-stub-creator-name-official-checkbox"
                                            v-bind:model-value="row.official"
                                            v-on:update:model-value="
                                                updateNameOfficial(
                                                    group.nameGroupKey,
                                                    index,
                                                    $event,
                                                )
                                            "
                                        >
                                            {{ msg("names.official") }}
                                        </cdx-checkbox>
                                        <span
                                            aria-hidden="true"
                                            class="vg-stub-creator-name-market-separator"
                                        ></span>
                                        <cdx-checkbox
                                            v-bind:key="market.key"
                                            v-bind:model-value="
                                                row[market.key]
                                            "
                                            v-for="market in nameMarkets"
                                            v-on:update:model-value="
                                                updateNameMarket(
                                                    group.nameGroupKey,
                                                    index,
                                                    market.key,
                                                    $event,
                                                )
                                            "
                                        >
                                            {{ market.label }}
                                        </cdx-checkbox>
                                    </div>
                                    <div
                                        class="vg-stub-creator-field-controls vg-stub-creator-field-controls--with-source"
                                    >
                                        <cdx-text-input
                                            :placeholder="msg('names.title')"
                                            v-bind:model-value="row.name"
                                            v-on:change="
                                                updateNameRow(
                                                    group.nameGroupKey,
                                                    index,
                                                    'name',
                                                )
                                            "
                                            v-on:update:model-value="
                                                updateNameRowValue(
                                                    group.nameGroupKey,
                                                    index,
                                                    'name',
                                                    $event,
                                                )
                                            "
                                        ></cdx-text-input>
                                        <cdx-text-area
                                            class="vg-stub-creator-source-url"
                                            rows="1"
                                            v-bind:model-value="row.sourceUrl"
                                            v-on:change="
                                                updateNameRow(
                                                    group.nameGroupKey,
                                                    index,
                                                    'sourceUrl',
                                                )
                                            "
                                            v-on:update:model-value="
                                                updateNameRowValue(
                                                    group.nameGroupKey,
                                                    index,
                                                    'sourceUrl',
                                                    $event,
                                                )
                                            "
                                            :placeholder="
                                                msg('names.sourceUrls')
                                            "
                                        ></cdx-text-area>
                                    </div>
                                    <template v-slot:label>
                                        {{ msg("names.localizedName") }}
                                        {{ index + 1 }}
                                        <template
                                            v-if="isSteamNameHelperRow(row)"
                                        >
                                            ({{ msg("names.bySteamHelper") }})
                                        </template>
                                        <cdx-button
                                            :aria-label="
                                                msg('names.applyAsPageTitle')
                                            "
                                            class="vg-stub-creator-icon-button"
                                            :title="
                                                msg('names.applyAsPageTitle')
                                            "
                                            type="button"
                                            weight="quiet"
                                            v-if="row.name.trim()"
                                            v-on:click="
                                                applyNameAsPageTitle(
                                                    group.nameGroupKey,
                                                    index,
                                                )
                                            "
                                        >
                                            <cdx-icon
                                                v-bind:icon="
                                                    tableActionIcons.applyTitle
                                                "
                                                size="medium"
                                            ></cdx-icon>
                                        </cdx-button>
                                        <cdx-button
                                            :aria-label="msg('names.remove')"
                                            class="vg-stub-creator-icon-button vg-stub-creator-destructive-action"
                                            :title="msg('names.remove')"
                                            type="button"
                                            weight="quiet"
                                            v-on:click="
                                                removeNameRow(
                                                    group.nameGroupKey,
                                                    index,
                                                )
                                            "
                                        >
                                            <cdx-icon
                                                v-bind:icon="
                                                    tableActionIcons.remove
                                                "
                                                size="medium"
                                            ></cdx-icon>
                                        </cdx-button>
                                    </template>
                                </cdx-field>
                            </template>
                        </div>
                    </template>
                    <template v-if="group.noteTaReview">
                        <cdx-table
                            :caption="msg('noteta.items')"
                            v-bind:columns="notetaTableColumns"
                            v-bind:data="form.noteTaRows"
                        >
                            <template v-slot:header>
                                <cdx-button
                                    :aria-label="msg('noteta.sort')"
                                    class="vg-stub-creator-icon-button"
                                    :title="msg('noteta.sort')"
                                    type="button"
                                    weight="quiet"
                                    v-on:click="sortNoteTaRows"
                                >
                                    <cdx-icon
                                        v-bind:icon="tableActionIcons.sort"
                                        size="medium"
                                    ></cdx-icon>
                                </cdx-button>
                                <cdx-button
                                    :aria-label="msg('common.reset')"
                                    class="vg-stub-creator-icon-button"
                                    :title="msg('common.reset')"
                                    type="button"
                                    weight="quiet"
                                    v-on:click="regenerateNoteTaRows"
                                >
                                    <cdx-icon
                                        v-bind:icon="
                                            tableActionIcons.regenerate
                                        "
                                        size="medium"
                                    ></cdx-icon>
                                </cdx-button>
                                <cdx-button
                                    :aria-label="msg('common.clean')"
                                    class="vg-stub-creator-icon-button"
                                    :title="msg('common.clean')"
                                    type="button"
                                    weight="quiet"
                                    v-on:click="cleanNoteTaRows"
                                >
                                    <cdx-icon
                                        v-bind:icon="tableActionIcons.clean"
                                        size="medium"
                                    ></cdx-icon>
                                </cdx-button>
                                <cdx-button
                                    :aria-label="msg('common.add')"
                                    class="vg-stub-creator-icon-button"
                                    :title="msg('common.add')"
                                    type="button"
                                    weight="quiet"
                                    v-on:click="addNoteTaRow"
                                >
                                    <cdx-icon
                                        v-bind:icon="
                                            tableActionIcons.cdxIconArticleAdd
                                        "
                                        size="medium"
                                    ></cdx-icon>
                                </cdx-button>
                            </template>
                            <template v-slot:item-key="{ row }">
                                <cdx-text-input
                                    :placeholder="msg('noteta.keyPlaceholder')"
                                    v-bind:model-value="row.key"
                                    v-on:update:model-value="
                                        updateNoteTaRow(
                                            form.noteTaRows.indexOf(row),
                                            'key',
                                            $event,
                                        )
                                    "
                                ></cdx-text-input>
                            </template>
                            <template v-slot:item-value="{ row }">
                                <cdx-text-input
                                    :placeholder="
                                        msg('noteta.valuePlaceholder')
                                    "
                                    v-bind:model-value="row.value"
                                    v-on:update:model-value="
                                        updateNoteTaRow(
                                            form.noteTaRows.indexOf(row),
                                            'value',
                                            $event,
                                        )
                                    "
                                ></cdx-text-input>
                            </template>
                            <template v-slot:item-actions="{ row }">
                                <cdx-button
                                    :aria-label="msg('common.remove')"
                                    class="vg-stub-creator-icon-button vg-stub-creator-destructive-action"
                                    :title="msg('common.remove')"
                                    type="button"
                                    weight="quiet"
                                    v-on:click="
                                        removeNoteTaRow(
                                            form.noteTaRows.indexOf(row),
                                        )
                                    "
                                >
                                    <cdx-icon
                                        v-bind:icon="tableActionIcons.remove"
                                        size="medium"
                                    ></cdx-icon>
                                </cdx-button>
                            </template>
                        </cdx-table>
                    </template>
                    <template v-if="group.citationReview">
                        <p v-if="form.citationRows.length === 0">
                            {{ msg("references.empty") }}
                        </p>
                        <cdx-tabs
                            v-if="form.citationRows.length"
                            v-bind:key="getCitationTabsKey(form.citationRows)"
                            v-model:active="activeCitationTab"
                        >
                            <cdx-tab
                                class="vg-stub-creator-citation"
                                v-bind:key="citation.sourceUrl"
                                v-bind:label="getCitationTabLabel(citation)"
                                v-bind:name="
                                    getCitationTabName(citation, citationIndex)
                                "
                                v-for="(
                                    citation, citationIndex
                                ) in form.citationRows"
                            >
                                <cdx-table
                                    v-bind:caption="
                                        getCitationTabLabel(citation)
                                    "
                                    v-bind:columns="citationTableColumns"
                                    v-bind:data="
                                        getCitationParamTableRows(citation)
                                    "
                                >
                                    <template v-slot:header>
                                        <cdx-button
                                            :aria-label="
                                                msg('references.refetchAction')
                                            "
                                            class="vg-stub-creator-icon-button vg-stub-creator-destructive-action"
                                            :title="msg('references.refetch')"
                                            type="button"
                                            weight="quiet"
                                            v-on:click="
                                                refetchCitation(citationIndex)
                                            "
                                        >
                                            <cdx-icon
                                                v-bind:icon="
                                                    tableActionIcons.regenerate
                                                "
                                                size="medium"
                                            ></cdx-icon>
                                        </cdx-button>
                                        <cdx-button
                                            :aria-label="msg('common.clean')"
                                            class="vg-stub-creator-icon-button"
                                            :title="msg('common.clean')"
                                            type="button"
                                            weight="quiet"
                                            v-on:click="
                                                cleanCitationParams(
                                                    citationIndex,
                                                )
                                            "
                                        >
                                            <cdx-icon
                                                v-bind:icon="
                                                    tableActionIcons.clean
                                                "
                                                size="medium"
                                            ></cdx-icon>
                                        </cdx-button>
                                        <cdx-button
                                            :aria-label="
                                                msg('references.addParameter')
                                            "
                                            class="vg-stub-creator-icon-button"
                                            :title="
                                                msg('references.addParameter')
                                            "
                                            type="button"
                                            weight="quiet"
                                            v-on:click="
                                                addCitationParam(citationIndex)
                                            "
                                        >
                                            <cdx-icon
                                                v-bind:icon="
                                                    tableActionIcons.cdxIconArticleAdd
                                                "
                                                size="medium"
                                            ></cdx-icon>
                                        </cdx-button>
                                    </template>
                                    <template v-slot:item-name="{ row }">
                                        <cdx-text-input
                                            :placeholder="
                                                msg('references.parameterName')
                                            "
                                            v-bind:model-value="row.param.name"
                                            v-on:change="
                                                sortCitation(citationIndex)
                                            "
                                            v-on:update:model-value="
                                                updateCitationParam(
                                                    citationIndex,
                                                    row.index,
                                                    'name',
                                                    $event,
                                                )
                                            "
                                        ></cdx-text-input>
                                    </template>
                                    <template v-slot:item-value="{ row }">
                                        <cdx-text-input
                                            :placeholder="msg('common.value')"
                                            v-bind:model-value="
                                                row.param.value
                                            "
                                            v-on:change="
                                                sortCitation(citationIndex)
                                            "
                                            v-on:update:model-value="
                                                updateCitationParam(
                                                    citationIndex,
                                                    row.index,
                                                    'value',
                                                    $event,
                                                )
                                            "
                                        ></cdx-text-input>
                                    </template>
                                    <template v-slot:item-actions="{ row }">
                                        <cdx-button
                                            :aria-label="msg('common.reset')"
                                            class="vg-stub-creator-icon-button"
                                            :title="msg('common.reset')"
                                            type="button"
                                            weight="quiet"
                                            v-if="row.index &lt; citation.params.length"
                                            v-on:click="
                                                resetCitationParam(
                                                    citationIndex,
                                                    row.index,
                                                )
                                            "
                                        >
                                            <cdx-icon
                                                v-bind:icon="
                                                    tableActionIcons.regenerate
                                                "
                                                size="medium"
                                            ></cdx-icon>
                                        </cdx-button>
                                        <cdx-button
                                            :aria-label="msg('common.remove')"
                                            class="vg-stub-creator-icon-button vg-stub-creator-destructive-action"
                                            :title="msg('common.remove')"
                                            type="button"
                                            weight="quiet"
                                            v-if="row.index &lt; citation.params.length"
                                            v-on:click="
                                                removeCitationParam(
                                                    citationIndex,
                                                    row.index,
                                                )
                                            "
                                        >
                                            <cdx-icon
                                                v-bind:icon="
                                                    tableActionIcons.remove
                                                "
                                                size="medium"
                                            ></cdx-icon>
                                        </cdx-button>
                                    </template>
                                    <template v-slot:footer>
                                        <a
                                            v-bind:href="citation.sourceUrl"
                                            rel="noopener noreferrer"
                                            target="_blank"
                                        >
                                            {{ citation.sourceUrl }}
                                        </a>
                                    </template>
                                </cdx-table>
                            </cdx-tab>
                        </cdx-tabs>
                        <cdx-message
                            class="vg-stub-creator-message"
                            type="error"
                            v-if="citationState.error"
                        >
                            {{ citationState.error }}
                        </cdx-message>
                    </template>
                    <template v-if="group.categoryReview">
                        <section>
                            <cdx-table
                                :caption="msg('review.redirects')"
                                class="vg-stub-creator-review-table vg-stub-creator-redirect-table"
                                v-bind:columns="redirectTableColumns"
                                v-bind:data="form.redirectRows || []"
                            >
                                <template v-slot:header>
                                    <cdx-button
                                        :aria-label="msg('common.reset')"
                                        class="vg-stub-creator-icon-button"
                                        :title="msg('review.resetRedirects')"
                                        type="button"
                                        weight="quiet"
                                        v-on:click="rebuildRedirectRows"
                                        v-bind:disabled="reviewState.loading"
                                    >
                                        <cdx-icon
                                            v-bind:icon="
                                                tableActionIcons.regenerate
                                            "
                                            size="medium"
                                        ></cdx-icon>
                                    </cdx-button>
                                    <cdx-button
                                        :aria-label="msg('common.clean')"
                                        class="vg-stub-creator-icon-button"
                                        :title="msg('common.clean')"
                                        type="button"
                                        weight="quiet"
                                        v-on:click="cleanRedirectRows"
                                    >
                                        <cdx-icon
                                            v-bind:icon="
                                                tableActionIcons.clean
                                            "
                                            size="medium"
                                        ></cdx-icon>
                                    </cdx-button>
                                    <cdx-button
                                        :aria-label="msg('common.add')"
                                        class="vg-stub-creator-icon-button"
                                        :title="msg('common.add')"
                                        type="button"
                                        weight="quiet"
                                        v-on:click="addRedirectRow"
                                    >
                                        <cdx-icon
                                            v-bind:icon="
                                                tableActionIcons.cdxIconArticleAdd
                                            "
                                            size="medium"
                                        ></cdx-icon>
                                    </cdx-button>
                                    <cdx-button
                                        :aria-label="msg('review.refresh')"
                                        class="vg-stub-creator-icon-button"
                                        :title="msg('review.refreshRedirects')"
                                        type="button"
                                        weight="quiet"
                                        v-on:click="checkRedirectRows"
                                        v-bind:disabled="reviewState.loading"
                                    >
                                        <cdx-icon
                                            v-bind:icon="
                                                tableActionIcons.reload
                                            "
                                            size="medium"
                                        ></cdx-icon>
                                    </cdx-button>
                                </template>
                                <template v-slot:item-enabled="{ row }">
                                    <cdx-checkbox
                                        :aria-label="
                                            msg('review.includeRedirect')
                                        "
                                        :title="msg('review.includeRedirect')"
                                        v-model="row.enabled"
                                    ></cdx-checkbox>
                                    <span
                                        aria-hidden="true"
                                        class="vg-stub-creator-review-row-marker vg-stub-creator-review-row-marker--redirect-conflict"
                                        v-if="isRedirectConflictReviewRow(row)"
                                    ></span>
                                </template>
                                <template v-slot:item-status="{ row }">
                                    <cdx-info-chip
                                        v-bind:status="
                                            getRedirectStatusChipStatus(row)
                                        "
                                        v-bind:title="row.status"
                                    >
                                        {{ formatRedirectStatusLabel(row) }}
                                    </cdx-info-chip>
                                </template>
                                <template v-slot:item-title="{ row }">
                                    <cdx-text-input
                                        v-model="row.title"
                                        v-on:blur="
                                            checkRedirectRow(
                                                (
                                                    form.redirectRows || []
                                                ).indexOf(row),
                                                $event,
                                            )
                                        "
                                        v-on:update:model-value="
                                            updateRedirectRowTitle(
                                                (
                                                    form.redirectRows || []
                                                ).indexOf(row),
                                                $event,
                                            )
                                        "
                                    ></cdx-text-input>
                                </template>
                                <template v-slot:item-page="{ row }">
                                    <a
                                        href="#"
                                        v-bind:aria-label="
                                            getReviewPageActionAriaLabel(
                                                row,
                                                row.exists,
                                            )
                                        "
                                        v-if="row.title"
                                        v-on:click.prevent="
                                            openRedirectEdit(row)
                                        "
                                    >
                                        {{
                                            getReviewPageActionLabel(
                                                row,
                                                row.exists,
                                            )
                                        }}
                                    </a>
                                </template>
                                <template v-slot:item-actions="{ row }">
                                    <cdx-button
                                        :aria-label="msg('review.refresh')"
                                        class="vg-stub-creator-icon-button"
                                        :title="msg('review.refreshRedirect')"
                                        type="button"
                                        weight="quiet"
                                        v-if="row.title"
                                        v-on:click="
                                            checkRedirectRow(
                                                (
                                                    form.redirectRows || []
                                                ).indexOf(row),
                                            )
                                        "
                                    >
                                        <cdx-icon
                                            v-bind:icon="
                                                tableActionIcons.reload
                                            "
                                            size="medium"
                                        ></cdx-icon>
                                    </cdx-button>
                                    <cdx-button
                                        :aria-label="msg('common.remove')"
                                        class="vg-stub-creator-icon-button vg-stub-creator-destructive-action"
                                        :title="msg('common.remove')"
                                        type="button"
                                        weight="quiet"
                                        v-on:click="
                                            removeRedirectRow(
                                                (
                                                    form.redirectRows || []
                                                ).indexOf(row),
                                            )
                                        "
                                    >
                                        <cdx-icon
                                            v-bind:icon="
                                                tableActionIcons.remove
                                            "
                                            size="medium"
                                        ></cdx-icon>
                                    </cdx-button>
                                </template>
                            </cdx-table>
                        </section>
                        <section>
                            <cdx-table
                                :caption="msg('review.categories')"
                                class="vg-stub-creator-review-table vg-stub-creator-category-table"
                                v-bind:columns="categoryTableColumns"
                                v-bind:data="form.categoryRows"
                            >
                                <template v-slot:header>
                                    <cdx-button
                                        :aria-label="msg('common.reset')"
                                        class="vg-stub-creator-icon-button"
                                        :title="msg('common.reset')"
                                        type="button"
                                        weight="quiet"
                                        v-on:click="rebuildCategoryRows"
                                        v-bind:disabled="categoryState.loading"
                                    >
                                        <cdx-icon
                                            v-bind:icon="
                                                tableActionIcons.regenerate
                                            "
                                            size="medium"
                                        ></cdx-icon>
                                    </cdx-button>
                                    <cdx-button
                                        :aria-label="msg('common.clean')"
                                        class="vg-stub-creator-icon-button"
                                        :title="msg('common.clean')"
                                        type="button"
                                        weight="quiet"
                                        v-on:click="cleanCategoryRows"
                                    >
                                        <cdx-icon
                                            v-bind:icon="
                                                tableActionIcons.clean
                                            "
                                            size="medium"
                                        ></cdx-icon>
                                    </cdx-button>
                                    <cdx-button
                                        :aria-label="msg('common.add')"
                                        class="vg-stub-creator-icon-button"
                                        :title="msg('common.add')"
                                        type="button"
                                        weight="quiet"
                                        v-on:click="addCategoryRow"
                                    >
                                        <cdx-icon
                                            v-bind:icon="
                                                tableActionIcons.cdxIconArticleAdd
                                            "
                                            size="medium"
                                        ></cdx-icon>
                                    </cdx-button>
                                </template>
                                <template v-slot:item-enabled="{ row }">
                                    <cdx-checkbox
                                        :aria-label="
                                            msg('review.includeCategory')
                                        "
                                        :title="msg('review.includeCategory')"
                                        v-model="row.enabled"
                                    ></cdx-checkbox>
                                    <span
                                        aria-hidden="true"
                                        class="vg-stub-creator-review-row-marker vg-stub-creator-review-row-marker--category-add"
                                        v-if="isCategoryAddReviewRow(row)"
                                    ></span>
                                </template>
                                <template v-slot:item-source="{ row }">
                                    <cdx-info-chip
                                        v-bind:status="
                                            getCategoryStatusChipStatus(row)
                                        "
                                        v-bind:title="
                                            formatCategoryStatusTitle(row)
                                        "
                                    >
                                        {{ formatCategoryStatusLabel(row) }}
                                    </cdx-info-chip>
                                </template>
                                <template v-slot:item-category="{ row }">
                                    <cdx-text-input
                                        v-model="row.category"
                                        v-on:blur="
                                            checkCategoryRow(
                                                form.categoryRows.indexOf(row),
                                                $event,
                                            )
                                        "
                                        v-on:update:model-value="
                                            updateCategoryRowCategory(
                                                form.categoryRows.indexOf(row),
                                                $event,
                                            )
                                        "
                                    ></cdx-text-input>
                                </template>
                                <template v-slot:item-page="{ row }">
                                    <a
                                        href="#"
                                        v-bind:aria-label="
                                            getReviewPageActionAriaLabel(
                                                row,
                                                row.status === 'OK',
                                            )
                                        "
                                        v-if="row.category"
                                        v-on:click.prevent="
                                            openCategoryEdit(row)
                                        "
                                    >
                                        {{
                                            getReviewPageActionLabel(
                                                row,
                                                row.status === "OK",
                                            )
                                        }}
                                    </a>
                                </template>
                                <template v-slot:item-actions="{ row }">
                                    <cdx-button
                                        :aria-label="msg('review.refresh')"
                                        class="vg-stub-creator-icon-button"
                                        :title="msg('review.refreshCategory')"
                                        type="button"
                                        weight="quiet"
                                        v-if="row.category"
                                        v-on:click="
                                            checkCategoryRow(
                                                form.categoryRows.indexOf(row),
                                            )
                                        "
                                    >
                                        <cdx-icon
                                            v-bind:icon="
                                                tableActionIcons.reload
                                            "
                                            size="medium"
                                        ></cdx-icon>
                                    </cdx-button>
                                    <cdx-button
                                        :aria-label="msg('common.remove')"
                                        class="vg-stub-creator-icon-button vg-stub-creator-destructive-action"
                                        :title="msg('common.remove')"
                                        type="button"
                                        weight="quiet"
                                        v-on:click="
                                            removeCategoryRow(
                                                form.categoryRows.indexOf(row),
                                            )
                                        "
                                    >
                                        <cdx-icon
                                            v-bind:icon="
                                                tableActionIcons.remove
                                            "
                                            size="medium"
                                        ></cdx-icon>
                                    </cdx-button>
                                </template>
                            </cdx-table>
                            <cdx-message
                                class="vg-stub-creator-message"
                                type="error"
                                v-if="categoryState.error"
                            >
                                {{ categoryState.error }}
                            </cdx-message>
                        </section>
                        <section>
                            <cdx-table
                                :caption="msg('review.stubTags')"
                                class="vg-stub-creator-review-table vg-stub-creator-stub-tag-table"
                                v-bind:columns="stubTagTableColumns"
                                v-bind:data="stubTagRows"
                            >
                                <template v-slot:header>
                                    <cdx-button
                                        :aria-label="msg('common.reset')"
                                        class="vg-stub-creator-icon-button"
                                        :title="msg('common.reset')"
                                        type="button"
                                        weight="quiet"
                                        v-on:click="resetStubTagRows"
                                    >
                                        <cdx-icon
                                            v-bind:icon="
                                                tableActionIcons.regenerate
                                            "
                                            size="medium"
                                        ></cdx-icon>
                                    </cdx-button>
                                    <cdx-button
                                        :aria-label="msg('common.clean')"
                                        class="vg-stub-creator-icon-button"
                                        :title="msg('common.clean')"
                                        type="button"
                                        weight="quiet"
                                        v-on:click="cleanStubTagRows"
                                    >
                                        <cdx-icon
                                            v-bind:icon="
                                                tableActionIcons.clean
                                            "
                                            size="medium"
                                        ></cdx-icon>
                                    </cdx-button>
                                    <cdx-button
                                        :aria-label="msg('common.add')"
                                        class="vg-stub-creator-icon-button"
                                        :title="msg('common.add')"
                                        type="button"
                                        weight="quiet"
                                        v-on:click="addStubTagRow"
                                    >
                                        <cdx-icon
                                            v-bind:icon="
                                                tableActionIcons.cdxIconArticleAdd
                                            "
                                            size="medium"
                                        ></cdx-icon>
                                    </cdx-button>
                                </template>
                                <template v-slot:item-enabled="{ row }">
                                    <cdx-checkbox
                                        :aria-label="
                                            msg('review.includeStubTag')
                                        "
                                        :title="msg('review.includeStubTag')"
                                        v-model="row.enabled"
                                    ></cdx-checkbox>
                                    <span
                                        aria-hidden="true"
                                        class="vg-stub-creator-review-row-marker vg-stub-creator-review-row-marker--stub-tag-add"
                                        v-if="isStubTagAddReviewRow(row)"
                                    ></span>
                                </template>
                                <template v-slot:item-type="{ row }">
                                    <cdx-info-chip
                                        v-bind:status="
                                            getStubTagStatusChipStatus(row)
                                        "
                                        v-bind:title="
                                            formatStubTagLabel(row.stubTag)
                                        "
                                    >
                                        {{ formatStubTagStatusLabel(row) }}
                                    </cdx-info-chip>
                                </template>
                                <template v-slot:item-stubTag="{ row }">
                                    <cdx-text-input
                                        v-model="row.stubTag"
                                        v-on:update:model-value="
                                            updateStubTagRow(
                                                stubTagRows.indexOf(row),
                                                $event,
                                            )
                                        "
                                    ></cdx-text-input>
                                </template>
                                <template v-slot:item-page="{ row }">
                                    <a
                                        href="#"
                                        v-bind:aria-label="
                                            getReviewPageActionAriaLabel(
                                                row,
                                                true,
                                            )
                                        "
                                        v-if="row.stubTag"
                                        v-on:click.prevent="
                                            openStubTagEdit(row)
                                        "
                                    >
                                        {{
                                            getReviewPageActionLabel(row, true)
                                        }}
                                    </a>
                                </template>
                                <template v-slot:item-actions="{ row }">
                                    <cdx-button
                                        :aria-label="msg('common.remove')"
                                        class="vg-stub-creator-icon-button vg-stub-creator-destructive-action"
                                        :title="msg('common.remove')"
                                        type="button"
                                        weight="quiet"
                                        v-on:click="
                                            removeStubTagRow(
                                                stubTagRows.indexOf(row),
                                            )
                                        "
                                    >
                                        <cdx-icon
                                            v-bind:icon="
                                                tableActionIcons.remove
                                            "
                                            size="medium"
                                        ></cdx-icon>
                                    </cdx-button>
                                </template>
                            </cdx-table>
                        </section>
                        <section>
                            <cdx-table
                                :caption="msg('review.navboxes')"
                                class="vg-stub-creator-review-table vg-stub-creator-navbox-table"
                                v-bind:columns="navboxTableColumns"
                                v-bind:data="form.navboxRows || []"
                            >
                                <template v-slot:header>
                                    <cdx-button
                                        :aria-label="msg('common.reset')"
                                        class="vg-stub-creator-icon-button"
                                        :title="msg('common.reset')"
                                        type="button"
                                        weight="quiet"
                                        v-on:click="rebuildNavboxRows"
                                        v-bind:disabled="reviewState.loading"
                                    >
                                        <cdx-icon
                                            v-bind:icon="
                                                tableActionIcons.regenerate
                                            "
                                            size="medium"
                                        ></cdx-icon>
                                    </cdx-button>
                                    <cdx-button
                                        :aria-label="msg('common.clean')"
                                        class="vg-stub-creator-icon-button"
                                        :title="msg('common.clean')"
                                        type="button"
                                        weight="quiet"
                                        v-on:click="cleanNavboxRows"
                                    >
                                        <cdx-icon
                                            v-bind:icon="
                                                tableActionIcons.clean
                                            "
                                            size="medium"
                                        ></cdx-icon>
                                    </cdx-button>
                                    <cdx-button
                                        :aria-label="msg('common.add')"
                                        class="vg-stub-creator-icon-button"
                                        :title="msg('common.add')"
                                        type="button"
                                        weight="quiet"
                                        v-on:click="addNavboxRow"
                                    >
                                        <cdx-icon
                                            v-bind:icon="
                                                tableActionIcons.cdxIconArticleAdd
                                            "
                                            size="medium"
                                        ></cdx-icon>
                                    </cdx-button>
                                </template>
                                <template v-slot:item-enabled="{ row }">
                                    <cdx-checkbox
                                        :aria-label="
                                            msg('review.includeNavbox')
                                        "
                                        :title="msg('review.includeNavbox')"
                                        v-model="row.enabled"
                                    ></cdx-checkbox>
                                    <span
                                        aria-hidden="true"
                                        class="vg-stub-creator-review-row-marker vg-stub-creator-review-row-marker--navbox-add"
                                        v-if="isNavboxAddReviewRow(row)"
                                    ></span>
                                </template>
                                <template v-slot:item-status="{ row }">
                                    <cdx-info-chip
                                        v-bind:status="
                                            getNavboxStatusChipStatus(row)
                                        "
                                        v-bind:title="row.status"
                                    >
                                        {{ formatNavboxStatusLabel(row) }}
                                    </cdx-info-chip>
                                </template>
                                <template v-slot:item-text="{ row }">
                                    <cdx-text-input
                                        v-model="row.text"
                                        v-on:blur="
                                            checkNavboxRow(
                                                (
                                                    form.navboxRows || []
                                                ).indexOf(row),
                                                $event,
                                            )
                                        "
                                        v-on:update:model-value="
                                            updateNavboxRow(
                                                (
                                                    form.navboxRows || []
                                                ).indexOf(row),
                                                $event,
                                            )
                                        "
                                    ></cdx-text-input>
                                </template>
                                <template v-slot:item-page="{ row }">
                                    <a
                                        href="#"
                                        v-bind:aria-label="
                                            getReviewPageActionAriaLabel(
                                                row,
                                                row.status === 'OK',
                                            )
                                        "
                                        v-if="row.title"
                                        v-on:click.prevent="
                                            openNavboxEdit(row)
                                        "
                                    >
                                        {{
                                            getReviewPageActionLabel(
                                                row,
                                                row.status === "OK",
                                            )
                                        }}
                                    </a>
                                </template>
                                <template v-slot:item-actions="{ row }">
                                    <cdx-button
                                        :aria-label="msg('review.refresh')"
                                        class="vg-stub-creator-icon-button"
                                        :title="msg('review.refreshNavbox')"
                                        type="button"
                                        weight="quiet"
                                        v-if="row.title"
                                        v-on:click="
                                            checkNavboxRow(
                                                (
                                                    form.navboxRows || []
                                                ).indexOf(row),
                                            )
                                        "
                                    >
                                        <cdx-icon
                                            v-bind:icon="
                                                tableActionIcons.reload
                                            "
                                            size="medium"
                                        ></cdx-icon>
                                    </cdx-button>
                                    <cdx-button
                                        :aria-label="msg('common.remove')"
                                        class="vg-stub-creator-icon-button vg-stub-creator-destructive-action"
                                        :title="msg('common.remove')"
                                        type="button"
                                        weight="quiet"
                                        v-on:click="
                                            removeNavboxRow(
                                                (
                                                    form.navboxRows || []
                                                ).indexOf(row),
                                            )
                                        "
                                    >
                                        <cdx-icon
                                            v-bind:icon="
                                                tableActionIcons.remove
                                            "
                                            size="medium"
                                        ></cdx-icon>
                                    </cdx-button>
                                </template>
                            </cdx-table>
                            <cdx-message
                                class="vg-stub-creator-message"
                                type="error"
                                v-if="reviewState.error"
                            >
                                {{ reviewState.error }}
                            </cdx-message>
                        </section>
                    </template>
                </cdx-tab>
            </cdx-tabs>
            <div class="vg-stub-creator-dialog-mask" v-if="previewLoading">
                <div class="vg-stub-creator-dialog-mask-panel">
                    <cdx-progress-bar
                        :aria-label="msg('preview.preparing')"
                    ></cdx-progress-bar>
                    <p class="vg-stub-creator-dialog-mask-text">
                        {{ previewLoadingMessage }}
                    </p>
                </div>
            </div>
        </div>
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
                        v-on:click="closeDialog"
                        weight="quiet"
                    >
                        {{ msg("common.close") }}
                    </cdx-button>
                </div>
                <div class="vg-stub-creator-dialog-footer-group">
                    <cdx-menu-button
                        v-bind:disabled="sourceFetchState.loading"
                        v-bind:menu-items="mainActionMenuItems"
                        v-model:selected="mainActionMenuSelection"
                        v-on:update:selected="handleMainActionSelect"
                    >
                        {{ msg("form.more") }}
                    </cdx-menu-button>
                    <cdx-button
                        type="button"
                        v-on:click="submitForm"
                        action="progressive"
                        v-bind:disabled="
                            sourceFetchState.loading || previewLoading
                        "
                        weight="primary"
                    >
                        {{
                            previewLoading
                                ? msg("preview.preparing")
                                : sourceFetchState.loading
                                  ? msg("form.loading")
                                  : msg("form.review")
                        }}
                    </cdx-button>
                </div>
            </div>
        </template>
    </cdx-dialog>
</template>
