/* eslint-disable */

/**
 * Builds the create-vg-stub dialog form.
 */

import {
    formatArticleFormField,
    getArticleSourceFields,
    isArticleListField,
} from "../article/index.js";
import {
    buildNameSourceReferenceKey,
    hasFirstLevelFieldSeparator,
    trimFieldValue,
} from "../shared/form-values.js";
import { getEnteredSourceUrls } from "../sources/source-references.js";

export {
    buildNameSourceReferenceKey,
    splitSourceUrls,
    trimFieldValue,
} from "../shared/form-values.js";

export class StyleSheet {
    constructor() {
        this.rules = [];
    }

    /**
     * Adds one CSS rule.
     *
     * @param {string|Array<string>} selectors - Rule selector or selectors.
     * @param {object} declarations - CSS declarations.
     * @returns {StyleSheet} Current stylesheet.
     */
    add(selectors, declarations) {
        this.rules.push({
            declarations,
            selectors: Array.isArray(selectors) ? selectors : [selectors],
            type: "rule",
        });

        return this;
    }

    /**
     * Adds a nested media query.
     *
     * @param {string} condition - Media query condition.
     * @param {Function} buildRules - Nested rule builder.
     * @returns {StyleSheet} Current stylesheet.
     */
    media(condition, buildRules) {
        const sheet = new StyleSheet();

        buildRules(sheet);
        this.rules.push({ condition, rules: sheet.rules, type: "media" });

        return this;
    }

    /**
     * Serializes the stylesheet.
     *
     * @returns {string} Stylesheet text.
     */
    toString() {
        return renderStyleRules(this.rules);
    }
}

const DIALOG_CSS = new StyleSheet()
    .add(".create-vg-stub-dialog.cdx-dialog", {
        maxWidth: "min(96vw, 60em)",
        width: "min(96vw, 60em)",
    })
    .add(".create-vg-stub-category-view-dialog.cdx-dialog", {
        maxWidth: "min(96vw, 60em)",
        width: "min(96vw, 60em)",
    })
    .add(".create-vg-stub-category-view", {
        border: "1px solid var(--border-color-base, #a2a9b1)",
        height: "70vh",
        width: "100%",
    })
    .add(".create-vg-stub-tab-panel", {
        paddingTop: "0.75em",
    })
    .add([".create-vg-stub-field-row", ".create-vg-stub-name-row"], {
        alignItems: "center",
        display: "grid",
        gap: "0.75em",
    })
    .add(".create-vg-stub-field-row", {
        gridTemplateColumns: "5.75em minmax(0, 1fr)",
        marginBottom: "0.75em",
    })
    .add(".create-vg-stub-field-separator", {
        border: "0",
        borderTop: "1px solid var(--border-color-subtle, #eaecf0)",
        gridColumn: "1 / -1",
        margin: "1em 0",
    })
    .add(".create-vg-stub-field-separator-compact", {
        margin: "1em 0 0.75em",
    })
    .add(".create-vg-stub-name-row", {
        borderBottom: "1px solid var(--border-color-subtle, #eaecf0)",
        gridTemplateColumns: "minmax(0, 1fr)",
        marginBottom: "1em",
        paddingBottom: "1em",
    })
    .add(".create-vg-stub-field-label", {
        fontWeight: "600",
        lineHeight: "1.35",
        overflowWrap: "anywhere",
    })
    .add([".create-vg-stub-field-controls", ".create-vg-stub-name-controls"], {
        display: "grid",
        gap: "0",
        minWidth: "0",
    })
    .add(".create-vg-stub-steam-helper", {
        display: "grid",
        gap: "0.5em",
        gridTemplateColumns: "minmax(0, 1fr) auto",
        marginBottom: "1em",
    })
    .add(".create-vg-stub-steam-actions", {
        display: "flex",
        flexWrap: "wrap",
        gap: "0.5em",
        gridColumn: "1 / -1",
    })
    .add(".create-vg-stub-steam-suggestion", {
        color: "var(--color-subtle, #54595d)",
        fontSize: "0.75em",
        gridColumn: "1 / -1",
        overflowWrap: "anywhere",
    })
    .add(
        [
            ".create-vg-stub-source-url textarea",
            "textarea.create-vg-stub-source-url",
        ],
        {
            fontSize: "0.75em",
            height: "2.67em",
            minHeight: "2.67em",
            resize: "vertical",
        },
    )
    .add(".create-vg-stub-wikitext-preview", {
        color: "var(--color-subtle, #72777d)",
        fontFamily: "monospace",
        fontSize: "0.75em",
        lineHeight: "1.35",
        marginTop: "0.25em",
        overflowWrap: "anywhere",
    })
    .add(".create-vg-stub-field-note", {
        margin: "-0.5em 0 0.75em",
    })
    .add(".create-vg-stub-category-grid", {
        display: "grid",
        gap: "0.25em",
        gridTemplateColumns:
            "auto minmax(4.2em, 6em) minmax(12em, 1.6fr) auto auto",
        marginBottom: "0.75em",
    })
    .add(".create-vg-stub-category-status", {
        alignItems: "center",
        alignSelf: "center",
        background: "var(--background-color-neutral-subtle, #f8f9fa)",
        border: "1px solid var(--border-color-base, #a2a9b1)",
        borderRadius: "2px",
        color: "var(--color-base, #202122)",
        display: "inline-flex",
        fontSize: "0.875em",
        fontWeight: "600",
        height: "2em",
        justifyContent: "center",
        lineHeight: "1",
        minWidth: "2em",
        padding: "0 0.43em",
    })
    .add(".create-vg-stub-company-category-text textarea", {
        fontFamily: "monospace",
    })
    .add(".create-vg-stub-error", {
        color: "var(--color-error, #d73333)",
    })
    .add(".create-vg-stub-prose-length", {
        color: "var(--color-subtle, #54595d)",
        fontSize: "0.75em",
        margin: "0.25em 0 0.75em",
    })
    .add(".create-vg-stub-navbox-grid", {
        display: "grid",
        gap: "0.25em",
        gridTemplateColumns:
            "auto minmax(4.2em, 0.35fr) minmax(12em, 1.6fr) auto auto",
        marginBottom: "0.75em",
    })
    .add(".create-vg-stub-category-actions", {
        alignItems: "center",
        display: "flex",
        gap: "1em",
    })
    .add(".create-vg-stub-category-action", {
        width: "5em",
    })
    .add(".create-vg-stub-category-stub-tag", {
        alignItems: "center",
        display: "inline-flex",
        gap: "0.25em",
        whiteSpace: "nowrap",
    })
    .media("(max-width: 40em)", (sheet) => {
        sheet.add([".create-vg-stub-field-row", ".create-vg-stub-name-row"], {
            gridTemplateColumns: "1fr",
        });
        sheet.add(".create-vg-stub-steam-helper", {
            gridTemplateColumns: "1fr",
        });
    })
    .toString();

/**
 * Describes a reusable article parameter input.
 */
class ArticleParameterField {
    /**
     * Creates article parameter field metadata.
     *
     * @param {string} key - Form key used by the dialog.
     * @param {string} label - English label shown in the UI.
     * @param {string} path - Normalized parameter path.
     * @param {object} [sourceField] - Optional source URL field metadata.
     * @param {object} [options] - Field display options.
     * @param {boolean} [options.multiline] - Whether to use a textarea.
     * @param {string} [options.previewKey] - Shared preview group key.
     */
    constructor(key, label, path, sourceField, options = {}) {
        this.breakBefore = Boolean(options.breakBefore);
        this.compact = Boolean(options.compact);
        this.heading = options.heading;
        this.key = key;
        this.label = label;
        this.multiline = Boolean(options.multiline);
        this.path = path;
        this.placeholder = options.placeholder;
        this.previewKey = options.previewKey;
        this.readonly = Boolean(options.readonly);
        this.sourceField = sourceField;
    }
}

/**
 * Describes a group of related article parameter inputs.
 */
class ArticleParameterGroup {
    /**
     * Creates an article parameter group.
     *
     * @param {string} key - Stable group key.
     * @param {string} label - English group heading.
     * @param {Array<ArticleParameterField>} fields - Group field metadata.
     * @param {string} [nameGroupKey] - Localized name row form key.
     * @param {object} [options] - Group display options.
     */
    constructor(key, label, fields, nameGroupKey, options = {}) {
        this.categoryReview = Boolean(options.categoryReview);
        this.fields = fields;
        this.key = key;
        this.label = label;
        this.nameGroupKey = nameGroupKey;
    }
}

export const SOURCE_REFERENCE_FIELDS = getArticleSourceFields();
const NAME_MARKETS = [
    {
        key: "ww",
        label: "WW",
    },
    {
        key: "hans",
        label: "Hans",
    },
    {
        key: "hant",
        label: "Hant",
    },
    {
        key: "cn",
        label: "CN",
    },
    {
        key: "tw",
        label: "TW",
    },
    {
        key: "hk",
        label: "HK",
    },
];
const STEAM_NAME_CHOICES = [
    {
        key: "none",
        label: "None",
    },
    {
        key: "hans",
        label: "Hans",
    },
    {
        key: "hant",
        label: "Hant",
    },
    {
        key: "both",
        label: "Both",
    },
    {
        key: "merge",
        label: "Worldwide name",
    },
    {
        key: "other",
        label: "Custom name",
    },
];
const ARTICLE_PARAMETER_GROUPS = [
    new ArticleParameterGroup("titles", "Titles", [
        new ArticleParameterField(
            "enwikiTitle",
            "Enwiki",
            "enwikiTitle",
            null,
            {
                placeholder: "Page title in English Wikipedia",
            },
        ),
        new ArticleParameterField("name", "Title", "name", null, {
            breakBefore: true,
            placeholder: "Leave blank to use the page title",
        }),
        new ArticleParameterField(
            "originalName",
            "Original title",
            "originalName",
            getSourceReferenceField("originalName"),
            {
                placeholder: "ja:タイトル or en:Title",
            },
        ),
        new ArticleParameterField(
            "englishName",
            "English title",
            "englishName",
            getSourceReferenceField("englishName"),
            {
                placeholder: "Localized title",
                previewKey: "names",
            },
        ),
        new ArticleParameterField("sortKey", "Sort key", "sortKey", null, {
            placeholder: "Leave blank to use the generated value",
        }),
        new ArticleParameterField(
            "metacriticScore",
            "Score",
            "scores.metacriticScore",
            getSourceReferenceField("metacriticScore"),
            {
                breakBefore: true,
                compact: true,
                heading: "MC score",
                placeholder: "ps4:95 or 95",
            },
        ),
        new ArticleParameterField(
            "openCriticRecommend",
            "Critics Recommend",
            "scores.openCriticRecommend",
            getSourceReferenceField("openCriticRecommend"),
            {
                compact: true,
                heading: "OC score",
                placeholder: "Recommend rate",
                previewKey: "score",
            },
        ),
    ]),
    new ArticleParameterGroup("attribution", "Attribution", [
        new ArticleParameterField(
            "developers",
            "Dev",
            "companies.developers",
            getSourceReferenceField("developers"),
            {
                placeholder: "Names",
            },
        ),
        new ArticleParameterField(
            "publishers",
            "Pub",
            "companies.publishers",
            getSourceReferenceField("publishers"),
            {
                placeholder: "Names",
            },
        ),
        new ArticleParameterField(
            "series",
            "Series",
            "series",
            getSourceReferenceField("series"),
            {
                placeholder: "Title",
            },
        ),
        new ArticleParameterField(
            "platforms",
            "Plat",
            "platforms",
            getSourceReferenceField("platforms"),
            {
                placeholder: "Names",
            },
        ),
        new ArticleParameterField(
            "year",
            "Year",
            "year",
            getSourceReferenceField("year"),
            {
                placeholder: "YYYY",
            },
        ),
        new ArticleParameterField(
            "genres",
            "Genre",
            "genres",
            getSourceReferenceField("genres"),
            {
                placeholder: "Names",
                previewKey: "attribution",
            },
        ),
    ]),
    new ArticleParameterGroup("localizedNames", "Names", [], "localizedNames"),
    new ArticleParameterGroup(
        "review",
        "Review",
        [
            new ArticleParameterField(
                "additionalProse",
                "Additional prose",
                "additionalProse",
                getSourceReferenceField("additionalProse"),
                {
                    multiline: true,
                    placeholder: "Text appended after the generated prose",
                },
            ),
        ],
        null,
        {
            categoryReview: true,
        },
    ),
];

/**
 * Adds dialog styles to the current page.
 *
 * @returns {void}
 */
export function addDialogStyles() {
    mw.util.addCSS(DIALOG_CSS);
}

/**
 * Creates the Vue component definition for the Codex dialog.
 *
 * @param {object} Vue - ResourceLoader Vue module.
 * @param {object} options - Dialog options.
 * @param {string} options.defaultName - Default article title.
 * @param {Function} options.getFieldPlaceholder - Field placeholder builder.
 * @param {Function} options.getProseSinographs - Prose length calculator.
 * @param {Function} options.getCategoryPageUrl - Category page URL builder.
 * @param {Function} options.getTemplatePageUrl - Template page URL builder.
 * @param {object} [options.initialForm] - Initial form values.
 * @param {number} [options.citationPrefetchDelay] - Citation prefetch debounce delay.
 * @param {Function} [options.getFieldPreview] - Field wikitext preview builder.
 * @param {Function} options.getHistoryEntries - Form history entry provider.
 * @param {Function} options.onCategoryRowsRefresh - Category refresh handler.
 * @param {Function} options.onClearHistory - Form history clear handler.
 * @param {Function} options.onCreateCategoryRow - Category row factory.
 * @param {Function} options.onDeleteHistoryEntry - Form history delete handler.
 * @param {Function} options.onFormChange - Form change handler.
 * @param {Function} options.onMoveTarget - New-page target opener.
 * @param {Function} options.onPrepareCompanyCategory - Company category text builder.
 * @param {Function} options.onPrepareReview - Review report builder.
 * @param {Function} options.onSaveCategory - Category page save handler.
 * @param {Function} options.onSaveCompanyCategory - Company category save handler.
 * @param {Function} options.onSaveNavbox - Navbox template save handler.
 * @param {Function} options.onEnwikiTitleChange - Enwiki metadata lookup handler.
 * @param {Function} options.onPreview - Editor preview handler.
 * @param {Function} options.onPreSavePrepare - Follow-up action builder.
 * @param {Function} [options.onSourceUrlChange] - Source URL change handler.
 * @param {Function} options.onSubmit - Submit handler.
 * @param {Function} options.onSubmitHistory - Form history submit handler.
 * @param {Function} options.onUpdateCategoryRowCategory - Category title update handler.
 * @returns {object} Vue component options.
 */
export function createDialogComponent(Vue, options) {
    const activeTab = Vue.ref(ARTICLE_PARAMETER_GROUPS[0].key);
    const form = Vue.reactive(createFormValues(options.defaultName));
    const categoryState = Vue.reactive({
        error: "",
        loading: false,
    });
    const reviewState = Vue.reactive({
        error: "",
        loading: false,
    });
    const companyCategoryOpen = Vue.ref(false);
    const companyCategoryState = Vue.reactive({
        category: "",
        company: "",
        error: "",
        loading: false,
        text: "",
    });
    const navboxCreateOpen = Vue.ref(false);
    const navboxCreateState = Vue.reactive({
        error: "",
        loading: false,
        text: "",
        title: "",
    });
    const categoryViewOpen = Vue.ref(false);
    const categoryViewState = Vue.reactive({
        title: "",
        url: "",
    });
    const historyEntries = Vue.ref(options.getHistoryEntries());
    const historyOpen = Vue.ref(false);
    const moveTarget = Vue.ref(options.defaultName);
    const moveOpen = Vue.ref(false);
    const preSaveMoveEnabled = Vue.ref(false);
    const preSaveMoveTitle = Vue.ref(options.defaultName);
    const preSaveOpen = Vue.ref(false);
    const preSaveActions = Vue.reactive([]);
    const enwikiLookupSerial = Vue.ref(0);
    const fetchedSteamNameRows = Vue.ref([]);
    const steamUrl = Vue.ref("");
    const sourceFetchState = Vue.reactive({
        error: "",
        loading: false,
    });
    const open = Vue.ref(options.initialOpen === true);
    const initialForm = options.initialForm;

    if (initialForm != null) {
        replaceFormValues(form, initialForm);
    }

    let navboxRowsPrepared = hasPreparedNavboxRows(form);
    const queueCitationPrefetch = createCitationPrefetchQueue(options);

    Vue.watch(
        form,
        (currentForm) => {
            options.onFormChange(currentForm);
            queueCitationPrefetch(currentForm);
        },
        {
            deep: true,
        },
    );
    queueCitationPrefetch(form);
    Vue.watch(activeTab, (tab) => {
        if (tab === "review") {
            refreshReview();
        }
    });

    async function openPreSave() {
        await refreshReview();
        sourceFetchState.error = "";
        sourceFetchState.loading = true;
        preSaveMoveTitle.value = getCurrentTitle();
        preSaveOpen.value = true;

        try {
            const prepared = await options.onPreSavePrepare(
                form,
                getCurrentTitle(),
            );

            preSaveActions.splice(
                0,
                preSaveActions.length,
                ...(prepared.actions || []),
            );
            preSaveMoveEnabled.value = prepared.move?.enabled === true;
            preSaveMoveTitle.value =
                trimFieldValue(prepared.move?.to) || getCurrentTitle();
        } catch (error) {
            sourceFetchState.error = error.message || String(error);
        } finally {
            sourceFetchState.loading = false;
        }
    }

    window.createVgStubDialog = {
        open: openDialog.bind(null, open),
        async submit() {
            open.value = true;
            await openPreSave();
        },
    };

    return {
        methods: {
            /**
             * Closes the Codex dialog without writing text.
             *
             * @returns {void}
             */
            closeDialog() {
                open.value = false;
            },

            /**
             * Opens a MediaWiki preview after review.
             *
             * @returns {Promise<void>} Resolves after preview submission starts.
             */
            async previewForm() {
                await refreshReview();
                options.onSubmitHistory(form, getCurrentTitle());
                historyEntries.value = options.getHistoryEntries();
                await options.onPreview(
                    form,
                    sourceFetchState,
                    this.closeDialog,
                );
            },

            /**
             * Opens the pre-save checklist after review.
             *
             * @returns {Promise<void>} Resolves after checklist preparation.
             */
            async submitForm() {
                await openPreSave();
            },

            /**
             * Saves the article after confirming the pre-save fixes.
             *
             * @returns {Promise<void>} Resolves after save submission starts.
             */
            async confirmSubmit() {
                options.onSubmitHistory(form, getCurrentTitle());
                historyEntries.value = options.getHistoryEntries();

                const moveTitle = trimFieldValue(preSaveMoveTitle.value);

                if (
                    preSaveMoveEnabled.value &&
                    moveTitle !== "" &&
                    moveTitle !== getCurrentTitle()
                ) {
                    await options.onMoveTarget(
                        form,
                        moveTitle,
                        sourceFetchState,
                    );

                    if (sourceFetchState.error === "") {
                        preSaveOpen.value = false;
                    }

                    return;
                }

                await options.onSubmit(
                    form,
                    sourceFetchState,
                    this.closeDialog,
                    {
                        actions: preSaveActions,
                        move: {
                            enabled: false,
                            to: getCurrentTitle(),
                        },
                    },
                );

                if (sourceFetchState.error === "") {
                    preSaveOpen.value = false;
                }
            },

            /**
             * Opens the form history dialog.
             *
             * @returns {void}
             */
            openHistoryDialog() {
                historyEntries.value = options.getHistoryEntries();
                historyOpen.value = true;
            },

            /**
             * Closes the form history dialog.
             *
             * @returns {void}
             */
            closeHistoryDialog() {
                historyOpen.value = false;
            },

            /**
             * Fills the current form from a history entry.
             *
             * @param {object} entry - History entry.
             * @param {object} entry.form - Stored form values.
             * @returns {void}
             */
            fillHistoryEntry(entry) {
                replaceFormValues(form, entry.form);
                navboxRowsPrepared = hasPreparedNavboxRows(form);
                historyOpen.value = false;
            },

            /**
             * Deletes one history entry.
             *
             * @param {string} id - History entry ID.
             * @returns {void}
             */
            deleteHistoryEntry(id) {
                options.onDeleteHistoryEntry(id);
                historyEntries.value = options.getHistoryEntries();
            },

            /**
             * Clears all form history entries.
             *
             * @returns {void}
             */
            clearHistory() {
                options.onClearHistory();
                historyEntries.value = options.getHistoryEntries();
            },

            /**
             * Opens the move target dialog.
             *
             * @returns {void}
             */
            openMoveDialog() {
                moveTarget.value = getCurrentTitle();
                moveOpen.value = true;
            },

            /**
             * Closes the move target dialog.
             *
             * @returns {void}
             */
            closeMoveDialog() {
                moveOpen.value = false;
            },

            /**
             * Updates the move target title from live input.
             *
             * @param {string} value - Raw input value.
             * @returns {void}
             */
            updateMoveTarget(value) {
                moveTarget.value = trimFieldValue(value);
            },

            /**
             * Generates current data and opens it in the target page editor.
             *
             * @returns {Promise<void>} Resolves after navigation starts.
             */
            async submitMoveTarget() {
                await refreshCategoryRows();
                options.onSubmitHistory(form, moveTarget.value);
                historyEntries.value = options.getHistoryEntries();
                await options.onMoveTarget(
                    form,
                    moveTarget.value,
                    sourceFetchState,
                );
            },

            /**
             * Normalizes multiline article field values.
             *
             * @param {object} field - Article parameter field.
             * @param {string} field.key - Form key for the field.
             * @returns {void}
             */
            normalizeFieldValue(field) {
                form[field.key] = formatArticleFormField(
                    form,
                    field.key,
                    form[field.key],
                );
            },

            /**
             * Trims pasted source URL field values.
             *
             * @param {object} field - Source reference field.
             * @param {string} field.sourceKey - Form key for the source URL.
             * @returns {void}
             */
            trimSourceValue(field) {
                form[field.sourceKey] = trimFieldValue(form[field.sourceKey]);
            },

            /**
             * Updates one article field from live input.
             *
             * @param {object} field - Article parameter field.
             * @param {string} value - Raw input value.
             * @returns {void}
             */
            updateFieldValue(field, value) {
                form[field.key] = formatArticleFormField(
                    form,
                    field.key,
                    value,
                );

                if (field.key === "enwikiTitle") {
                    refreshEnwikiMetadata();
                }
            },

            /**
             * Updates one source URL field from live input.
             *
             * @param {object} field - Source reference field.
             * @param {string} value - Raw input value.
             * @returns {void}
             */
            updateSourceValue(field, value) {
                form[field.sourceKey] = trimFieldValue(value);
            },

            /**
             * Trims one form value by key.
             *
             * @param {string} key - Form value key.
             * @returns {void}
             */
            trimFormValue(key) {
                form[key] = trimFieldValue(form[key]);
            },

            /**
             * Updates one form value by key from live input.
             *
             * @param {string} key - Form value key.
             * @param {string} value - Raw input value.
             * @returns {void}
             */
            updateFormValue(key, value) {
                form[key] = trimFieldValue(value);
            },

            /**
             * Refreshes English Wikipedia metadata after the enwiki title changes.
             *
             * @returns {Promise<void>} Resolves after metadata is refreshed.
             */
            async updateEnwikiTitle() {
                await refreshEnwikiMetadata();
            },

            /**
             * Normalizes pasted multiline article field values.
             *
             * @param {object} field - Article parameter field.
             * @param {string} field.key - Form key for the field.
             * @param {*} event - Clipboard paste event.
             * @returns {void}
             */
            normalizePastedFieldValue(field, event) {
                if (!isArticleListField(field.key)) {
                    return;
                }

                const clipboardData =
                    event.clipboardData || event.originalEvent.clipboardData;
                const text = clipboardData.getData("text");

                if (!hasFirstLevelFieldSeparator(text)) {
                    return;
                }

                event.preventDefault();
                form[field.key] = formatArticleFormField(
                    form,
                    field.key,
                    text,
                );
            },

            /**
             * Trims a localized name row value.
             *
             * @param {string} key - Localized name group key.
             * @param {number} index - Row index.
             * @param {string} field - Row field key.
             * @returns {void}
             */
            updateNameRow(key, index, field) {
                form[key][index][field] = trimFieldValue(
                    form[key][index][field],
                );
            },

            /**
             * Updates a localized name row value from live input.
             *
             * @param {string} key - Localized name group key.
             * @param {number} index - Row index.
             * @param {string} field - Row field key.
             * @param {string} value - Raw input value.
             * @returns {void}
             */
            updateNameRowValue(key, index, field, value) {
                form[key][index][field] = trimFieldValue(value);
            },

            /**
             * Appends a blank localized name row.
             *
             * @param {string} key - Localized name group key.
             * @returns {void}
             */
            addNameRow(key) {
                form[key].push(createNameRow());
            },

            /**
             * Updates the Steam helper URL.
             *
             * @param {string} value - Raw Steam URL.
             * @returns {void}
             */
            updateSteamUrl(value) {
                steamUrl.value = trimFieldValue(value);
                fetchedSteamNameRows.value = [];
            },

            /**
             * Fetches Steam names and stores them as helper suggestions.
             *
             * @returns {Promise<void>} Resolves after rows are fetched.
             */
            async addSteamNames() {
                if (options.onSteamNamesFetch == null) {
                    return;
                }

                sourceFetchState.error = "";
                sourceFetchState.loading = true;

                try {
                    const rows = await options.onSteamNamesFetch(
                        steamUrl.value,
                    );

                    fetchedSteamNameRows.value = rows;
                } catch (error) {
                    sourceFetchState.error = error.message;
                } finally {
                    sourceFetchState.loading = false;
                }
            },

            /**
             * Applies one Steam name helper suggestion choice.
             *
             * @param {string} choice - Steam helper choice key.
             * @returns {void}
             */
            applySteamNameChoice(choice) {
                if (choice !== "none") {
                    if (
                        form.localizedNames.every(
                            (row) => !hasEnteredNameRowValue(row),
                        )
                    ) {
                        form.localizedNames.splice(
                            0,
                            form.localizedNames.length,
                        );
                    }

                    buildSteamNameChoiceRows(
                        fetchedSteamNameRows.value,
                        choice,
                    ).forEach((row) => {
                        fillNameRow(form.localizedNames, row);
                    });
                }

                fetchedSteamNameRows.value = [];
            },

            /**
             * Removes localized name rows without a name or source URL.
             *
             * @param {string} key - Localized name group key.
             * @returns {void}
             */
            removeBlankNameRows(key) {
                form[key] = form[key].filter(hasEnteredNameRowValue);
            },

            /**
             * Refreshes generated category rows.
             *
             * @returns {Promise<void>} Resolves after category rows are refreshed.
             */
            async refreshCategoryRows() {
                await refreshCategoryRows();
            },

            /**
             * Rebuilds category rows, bypassing the stored category query cache.
             *
             * @returns {Promise<void>} Resolves after category rows are rebuilt.
             */
            async rebuildCategoryRows() {
                await refreshCategoryRows({
                    bypassCache: true,
                });
            },

            /**
             * Adds one manual category row.
             *
             * @returns {void}
             */
            addCategoryRow() {
                form.categoryRows.push(options.onCreateCategoryRow());
            },

            /**
             * Appends a blank navbox row.
             *
             * @returns {void}
             */
            addNavboxRow() {
                ensureNavboxRows(form).push(createNavboxRow());
                navboxRowsPrepared = true;
            },

            /**
             * Updates one navbox row.
             *
             * @param {number} index - Navbox row index.
             * @param {string} navbox - Navbox wikitext.
             * @returns {void}
             */
            updateNavboxRow(index, navbox) {
                const row = ensureNavboxRows(form)[index];

                row.text = navbox;
                row.title = getNavboxTitle(navbox);
                row.status = "";
            },

            /**
             * Removes one navbox row.
             *
             * @param {number} index - Navbox row index.
             * @returns {void}
             */
            removeNavboxRow(index) {
                ensureNavboxRows(form).splice(index, 1);
            },

            /**
             * Regenerates navbox rows from the current series field.
             *
             * @returns {Promise<void>} Resolves after suggestions are refreshed.
             */
            async rebuildNavboxRows() {
                await refreshNavboxRows(true, true);
            },

            /**
             * Checks the current navbox rows.
             *
             * @returns {Promise<void>} Resolves after statuses are refreshed.
             */
            async checkNavboxRows() {
                await refreshNavboxRows(true, false);
            },

            /**
             * Checks one edited navbox row after its textbox loses focus.
             *
             * @param {number} index - Navbox row index.
             * @param {Event} event - Text input blur event.
             * @returns {Promise<void>} Resolves after the textbox is updated.
             */
            async checkNavboxRow(index, event) {
                const value = event?.target?.value;

                if (value != null) {
                    this.updateNavboxRow(index, value);
                }

                await this.checkNavboxRows();
            },

            /**
             * Opens an existing navbox template.
             *
             * @param {object} row - Navbox review row.
             * @returns {void}
             */
            openNavboxView(row) {
                openPageView(
                    `Template:${row.title}`,
                    options.getTemplatePageUrl(row.title, false),
                );
            },

            /**
             * Opens the missing navbox template editor.
             *
             * @param {object} row - Navbox review row.
             * @returns {void}
             */
            createNavbox(row) {
                Object.assign(navboxCreateState, {
                    error: "",
                    loading: false,
                    text: "",
                    title: row.title,
                });
                navboxCreateOpen.value = true;
            },

            /**
             * Closes the navbox template editor.
             *
             * @returns {void}
             */
            closeNavboxCreate() {
                navboxCreateOpen.value = false;
            },

            /**
             * Saves the navbox template and refreshes its status.
             *
             * @returns {Promise<void>} Resolves after the template is saved.
             */
            async saveNavbox() {
                navboxCreateState.error = "";
                navboxCreateState.loading = true;

                try {
                    await options.onSaveNavbox(
                        navboxCreateState.title,
                        navboxCreateState.text,
                    );
                    navboxCreateOpen.value = false;
                    await refreshNavboxRows(true, false);
                } catch (error) {
                    navboxCreateState.error = error.message || String(error);
                } finally {
                    navboxCreateState.loading = false;
                }
            },

            /**
             * Updates one category row title and its modified marker.
             *
             * @param {number} index - Category row index.
             * @param {string} category - New category title.
             * @returns {void}
             */
            updateCategoryRowCategory(index, category) {
                form.categoryRows[index] = options.onUpdateCategoryRowCategory(
                    form.categoryRows[index],
                    trimFieldValue(category),
                );
            },

            /**
             * Checks one edited category after its textbox loses focus.
             *
             * @param {number} index - Category row index.
             * @param {Event} event - Text input blur event.
             * @returns {Promise<void>} Resolves after the textbox is updated.
             */
            async checkCategoryRow(index, event) {
                const value = event?.target?.value;

                if (value != null) {
                    this.updateCategoryRowCategory(index, value);
                }

                await refreshCategoryRows({
                    bypassCache: true,
                });

                if (value != null && form.categoryRows[index] != null) {
                    form.categoryRows[index].category = trimFieldValue(value);
                }
            },

            /**
             * Opens an editor for one missing category.
             *
             * @param {object} row - Category review row.
             * @returns {Promise<void>} Resolves after the category text is prepared.
             */
            async openCategoryCreate(row) {
                Object.assign(companyCategoryState, {
                    category: trimFieldValue(row.category),
                    company: trimFieldValue(row.company),
                    error: "",
                    loading: false,
                    text: "",
                });
                companyCategoryOpen.value = true;

                if (companyCategoryState.company === "") {
                    return;
                }

                companyCategoryState.loading = true;

                try {
                    companyCategoryState.text =
                        await options.onPrepareCompanyCategory(row);
                } catch (error) {
                    companyCategoryState.error =
                        error.message || String(error);
                } finally {
                    companyCategoryState.loading = false;
                }
            },

            /**
             * Closes the company category editor.
             *
             * @returns {void}
             */
            closeCompanyCategory() {
                companyCategoryOpen.value = false;
            },

            /**
             * Saves the category and refreshes category status.
             *
             * @returns {Promise<void>} Resolves after the category is saved.
             */
            async saveCompanyCategory() {
                companyCategoryState.error = "";
                companyCategoryState.loading = true;

                try {
                    const save =
                        companyCategoryState.company === ""
                            ? options.onSaveCategory
                            : options.onSaveCompanyCategory;

                    await save(
                        companyCategoryState.category,
                        companyCategoryState.text,
                    );
                    companyCategoryOpen.value = false;
                    await refreshCategoryRows({
                        bypassCache: true,
                    });
                } catch (error) {
                    companyCategoryState.error =
                        error.message || String(error);
                } finally {
                    companyCategoryState.loading = false;
                }
            },

            /**
             * Checks whether a category row supports the company helper.
             *
             * @param {object} row - Category review row.
             * @returns {boolean} Whether the helper should be shown.
             */
            canCreateCompanyCategory(row) {
                return (
                    trimFieldValue(row.company) !== "" && row.status !== "OK"
                );
            },

            /**
             * Checks whether a category row can be created.
             *
             * @param {object} row - Category review row.
             * @returns {boolean} Whether the category editor should be shown.
             */
            canCreateCategory(row) {
                return (
                    trimFieldValue(row.category) !== "" && row.status !== "OK"
                );
            },

            /**
             * Opens one category page in the viewer dialog.
             *
             * @param {object} row - Category review row.
             * @returns {void}
             */
            openCategoryView(row) {
                const category = trimFieldValue(row.category);

                openPageView(
                    `Category:${category}`,
                    options.getCategoryPageUrl(category),
                );
            },

            /**
             * Closes the category page viewer.
             *
             * @returns {void}
             */
            closeCategoryView() {
                categoryViewOpen.value = false;
            },

            /**
             * Formats a category row source as a compact badge label.
             *
             * @param {string} source - Category row source.
             * @returns {string} Compact source label.
             */
            formatCategorySourceLabel(source) {
                return formatCategorySourceLabel(source);
            },

            /**
             * Formats a navbox existence status as a compact badge.
             *
             * @param {string} status - Navbox existence status.
             * @returns {string} Compact status label.
             */
            formatNavboxStatusLabel(status) {
                return (
                    {
                        "Not exists": "Missing",
                        OK: "OK",
                    }[status] || "Unchecked"
                );
            },

            /**
             * Gets the current generated prose length.
             *
             * @returns {number} Hanzi-equivalent sinograph count.
             */
            getProseSinographs() {
                return options.getProseSinographs(form);
            },
        },
        /**
         * Exposes dialog state and actions to the template.
         *
         * @returns {object} Component state consumed by the template.
         */
        setup() {
            return {
                activeTab,
                categoryState,
                categoryViewOpen,
                categoryViewState,
                companyCategoryOpen,
                companyCategoryState,
                groups: ARTICLE_PARAMETER_GROUPS,
                form,
                fetchedSteamNameRows,
                formatSteamNameSuggestion,
                getArticleField,
                getFieldPlaceholder: options.getFieldPlaceholder.bind(
                    null,
                    form,
                ),
                getFieldPreview,
                getWikidataText,
                historyEntries,
                historyOpen,
                moveOpen,
                moveTarget,
                nameMarkets: NAME_MARKETS,
                navboxCreateOpen,
                navboxCreateState,
                open,
                reviewState,
                preSaveMoveEnabled,
                preSaveMoveTitle,
                preSaveOpen,
                preSaveActions,
                sourceFetchState,
                steamNameChoices: STEAM_NAME_CHOICES,
                steamUrl,
            };
        },
        template: createDialogTemplate(),
    };

    /**
     * Refreshes category rows through the owning module.
     *
     * @returns {Promise<void>} Resolves after rows are refreshed.
     */
    async function refreshCategoryRows(refreshOptions) {
        await options.onCategoryRowsRefresh(
            form,
            categoryState,
            refreshOptions,
        );
    }

    /**
     * Refreshes categories and generated review details.
     *
     * @returns {Promise<void>} Resolves after review data is refreshed.
     */
    async function refreshReview() {
        reviewState.error = "";
        reviewState.loading = true;

        try {
            await Promise.all([
                refreshCategoryRows(),
                refreshNavboxRows(false),
            ]);
        } catch (error) {
            reviewState.error = error.message || String(error);
        } finally {
            reviewState.loading = false;
        }
    }

    /**
     * Generates navbox rows when needed or explicitly requested.
     *
     * @param {boolean} force - Whether to replace reviewed rows.
     * @returns {Promise<void>} Resolves after navbox rows are refreshed.
     */
    async function refreshNavboxRows(force, rebuild = false) {
        if (!force && navboxRowsPrepared) {
            return;
        }

        const rows = (await options.onPrepareReview(form, rebuild)).map(
            createNavboxRow,
        );

        if (!rebuild && Array.isArray(form.navboxRows)) {
            form.navboxRows.splice(
                0,
                form.navboxRows.length,
                ...rows.map((row, index) => {
                    const current = form.navboxRows[index];

                    if (current == null) {
                        return row;
                    }

                    Object.assign(current, row);
                    return current;
                }),
            );
            navboxRowsPrepared = true;
            return;
        }

        form.navboxRows = rows;
        navboxRowsPrepared = true;
    }

    /**
     * Opens a page in the embedded viewer.
     *
     * @param {string} title - Dialog title.
     * @param {string} url - Page URL.
     * @returns {void}
     */
    function openPageView(title, url) {
        categoryViewState.title = title;
        categoryViewState.url = url;
        categoryViewOpen.value = true;
    }

    /**
     * Gets the entered title, falling back to the current page title.
     *
     * @returns {string} Current article title.
     */
    function getCurrentTitle() {
        return trimFieldValue(form.name) || options.defaultName;
    }

    /**
     * Builds a small wikitext preview for one field.
     *
     * @param {object} field - Article parameter field.
     * @returns {string} Preview wikitext, or an empty string.
     */
    function getFieldPreview(field) {
        if (options.getFieldPreview == null) {
            return "";
        }

        return (
            options.getFieldPreview(form, field.previewKey || field.key) || ""
        );
    }

    /**
     * Gets the Wikidata note text.
     *
     * @returns {string} Wikidata ID or lookup status text.
     */
    function getWikidataText() {
        return (
            form.wikidataId ||
            options.getFieldPlaceholder(form, {
                key: "wikidataId",
            }) ||
            ""
        );
    }

    /**
     * Refreshes form values derived from the English Wikipedia title.
     *
     * @returns {Promise<void>} Resolves after the lookup is handled.
     */
    async function refreshEnwikiMetadata() {
        const title = trimFieldValue(form.enwikiTitle);
        const serial = enwikiLookupSerial.value + 1;

        enwikiLookupSerial.value = serial;
        form.wikidataId = "";

        if (title === "" || options.onEnwikiTitleChange == null) {
            return;
        }

        let metadata;

        try {
            metadata = await options.onEnwikiTitleChange(title);
        } catch (_error) {
            metadata = {};
        }

        if (serial !== enwikiLookupSerial.value) {
            return;
        }

        form.wikidataId = trimFieldValue(metadata.wikidataId);

        if (trimFieldValue(form.englishName) === "") {
            form.englishName = getBasePageTitle(metadata.title);
        }
    }
}

/**
 * Formats a category row source as a compact badge label.
 *
 * @param {string} source - Category row source.
 * @returns {string} Compact source label.
 */
function formatCategorySourceLabel(source) {
    const value = String(source || "").trim();
    const modified = value.endsWith("†");
    const base = modified ? value.replace(/\s*†$/u, "") : value;
    const labels = {
        found: "Found",
        known: "Data",
        manual: "Manual",
        suggested: "Built",
    };
    const label = labels[base] || base;

    return modified ? `${label}†` : label;
}

/**
 * Creates a debounced citation prefetch queue.
 *
 * @param {object} options - Dialog options.
 * @param {number} [options.citationPrefetchDelay] - Citation prefetch debounce delay.
 * @param {Function} [options.onSourceUrlChange] - Source URL change handler.
 * @returns {Function} Citation prefetch queue function.
 */
function createCitationPrefetchQueue(options) {
    let lastUrlsKey = null;
    let timer = null;

    return (form) => {
        if (options.onSourceUrlChange == null) {
            return;
        }

        const urls = getEnteredSourceUrls(form);
        const urlsKey = JSON.stringify(urls);

        if (urlsKey === lastUrlsKey) {
            return;
        }

        lastUrlsKey = urlsKey;

        if (timer != null) {
            clearTimeout(timer);
        }

        timer = setTimeout(() => {
            urls.forEach(options.onSourceUrlChange);
        }, options.citationPrefetchDelay || 0);
    };
}

/**
 * Creates the Vue dialog template as a serialized markup tree.
 *
 * @returns {string} Dialog template markup.
 */
function createDialogTemplate() {
    return renderTemplate([
        createDialogTemplateRoot(),
        createPreSaveDialogTemplate(),
        createCompanyCategoryDialogTemplate(),
        createNavboxDialogTemplate(),
        createCategoryViewDialogTemplate(),
        createMoveDialogTemplate(),
        createHistoryDialogTemplate(),
    ]);
}

/**
 * Creates the missing navbox template editor dialog.
 *
 * @returns {object} Navbox template dialog node.
 */
function createNavboxDialogTemplate() {
    return createElement(
        "cdx-dialog",
        {
            "v-bind:title": "'Create Template:' + navboxCreateState.title",
            "v-model:open": "navboxCreateOpen",
        },
        [
            createElement("cdx-text-area", {
                rows: "10",
                "v-bind:disabled": "navboxCreateState.loading",
                "v-model": "navboxCreateState.text",
            }),
            createElement(
                "p",
                {
                    class: "create-vg-stub-error",
                    "v-if": "navboxCreateState.error",
                },
                [createText("{{ navboxCreateState.error }}")],
            ),
            createElement(
                "template",
                {
                    "v-slot:footer": "",
                },
                [
                    createActionFooterTemplate([
                        createElement(
                            "cdx-button",
                            {
                                "v-bind:disabled": "navboxCreateState.loading",
                                "v-on:click": "closeNavboxCreate",
                            },
                            [createText("Cancel")],
                        ),
                        createElement(
                            "cdx-button",
                            {
                                action: "progressive",
                                "v-bind:disabled":
                                    "navboxCreateState.loading || !navboxCreateState.text.trim()",
                                "v-on:click": "saveNavbox",
                                weight: "primary",
                            },
                            [
                                createText(
                                    "{{ navboxCreateState.loading ? 'Working' : 'Save' }}",
                                ),
                            ],
                        ),
                    ]),
                ],
            ),
        ],
    );
}

/**
 * Creates the category page viewer dialog.
 *
 * @returns {object} Category viewer dialog template node.
 */
function createCategoryViewDialogTemplate() {
    return createElement(
        "cdx-dialog",
        {
            class: "create-vg-stub-category-view-dialog",
            "v-bind:title": "categoryViewState.title",
            "v-model:open": "categoryViewOpen",
        },
        [
            createElement("iframe", {
                class: "create-vg-stub-category-view",
                "v-bind:src": "categoryViewState.url",
                "v-bind:title": "categoryViewState.title",
            }),
            createElement(
                "template",
                {
                    "v-slot:footer": "",
                },
                [
                    createActionFooterTemplate([
                        createElement(
                            "cdx-button",
                            {
                                "v-on:click": "closeCategoryView",
                            },
                            [createText("Close")],
                        ),
                    ]),
                ],
            ),
        ],
    );
}

/**
 * Creates the missing company category editor dialog.
 *
 * @returns {object} Company category dialog template node.
 */
function createCompanyCategoryDialogTemplate() {
    return createElement(
        "cdx-dialog",
        {
            "v-bind:title":
                "'Create Category:' + companyCategoryState.category",
            "v-model:open": "companyCategoryOpen",
        },
        [
            createElement("cdx-text-area", {
                class: "create-vg-stub-company-category-text",
                rows: "10",
                "v-bind:disabled": "companyCategoryState.loading",
                "v-model": "companyCategoryState.text",
            }),
            createElement(
                "p",
                {
                    class: "create-vg-stub-error",
                    "v-if": "companyCategoryState.error",
                },
                [createText("{{ companyCategoryState.error }}")],
            ),
            createElement(
                "template",
                {
                    "v-slot:footer": "",
                },
                [
                    createActionFooterTemplate([
                        createElement(
                            "cdx-button",
                            {
                                "v-bind:disabled":
                                    "companyCategoryState.loading",
                                "v-on:click": "closeCompanyCategory",
                            },
                            [createText("Cancel")],
                        ),
                        createElement(
                            "cdx-button",
                            {
                                action: "progressive",
                                "v-bind:disabled":
                                    "companyCategoryState.loading || !companyCategoryState.text.trim()",
                                "v-on:click": "saveCompanyCategory",
                                weight: "primary",
                            },
                            [
                                createText(
                                    "{{ companyCategoryState.loading ? 'Working' : 'Save' }}",
                                ),
                            ],
                        ),
                    ]),
                ],
            ),
        ],
    );
}

/**
 * Creates the pre-save fixes dialog.
 *
 * @returns {object} Pre-save fixes dialog template node.
 */
function createPreSaveDialogTemplate() {
    return createElement(
        "cdx-dialog",
        {
            "v-model:open": "preSaveOpen",
            title: "Pre-save fixes",
        },
        [
            createElement("p", {}, [
                createText(
                    "Choose fixes to run after the article is submitted. The generated text will use the final title.",
                ),
            ]),
            createElement(
                "cdx-checkbox",
                {
                    "v-model": "preSaveMoveEnabled",
                },
                [createText("Use this title before saving")],
            ),
            createElement(
                "div",
                {
                    "v-if": "preSaveMoveEnabled",
                    style: {
                        display: "grid",
                        gap: "0.5em",
                        marginLeft: "1.75em",
                    },
                },
                [
                    createElement("cdx-text-input", {
                        placeholder: "Final article title",
                        "v-model": "preSaveMoveTitle",
                    }),
                ],
            ),
            createElement(
                "div",
                {
                    style: {
                        display: "grid",
                        gap: "0.5em",
                        marginTop: "0.75em",
                    },
                },
                [
                    createElement(
                        "cdx-checkbox",
                        {
                            "v-bind:key": "action.id",
                            "v-for": "action in preSaveActions",
                            "v-model": "action.selected",
                        },
                        [createText("{{ action.label }}")],
                    ),
                ],
            ),
            createElement(
                "p",
                {
                    class: "create-vg-stub-error",
                    "v-if": "sourceFetchState.error",
                },
                [createText("{{ sourceFetchState.error }}")],
            ),
            createElement(
                "template",
                {
                    "v-slot:footer": "",
                },
                [
                    createActionFooterTemplate([
                        createElement(
                            "cdx-button",
                            {
                                "v-bind:disabled": "sourceFetchState.loading",
                                "v-on:click": "preSaveOpen = false",
                            },
                            [createText("Back")],
                        ),
                        createElement(
                            "cdx-button",
                            {
                                action: "progressive",
                                "v-bind:disabled": "sourceFetchState.loading",
                                "v-on:click": "confirmSubmit",
                                weight: "primary",
                            },
                            [
                                createText(
                                    "{{ sourceFetchState.loading ? 'Working' : (preSaveMoveEnabled ? 'Continue' : 'Save') }}",
                                ),
                            ],
                        ),
                    ]),
                ],
            ),
        ],
    );
}

/**
 * Creates the root Codex dialog template node.
 *
 * @returns {object} Root dialog template node.
 */
function createDialogTemplateRoot() {
    return createElement(
        "cdx-dialog",
        {
            class: "create-vg-stub-dialog",
            "v-model:open": "open",
            title: "Create video game stub",
        },
        [
            createTabsTemplate(),
            createElement(
                "p",
                {
                    "v-if": "sourceFetchState.error",
                },
                [createText("{{ sourceFetchState.error }}")],
            ),
            createMainDialogFooterTemplate(),
        ],
    );
}

/**
 * Creates the main dialog footer actions.
 *
 * @returns {object} Dialog footer template node.
 */
function createMainDialogFooterTemplate() {
    return createElement(
        "template",
        {
            "v-slot:footer": "",
        },
        [
            createSplitActionFooterTemplate(
                createElement(
                    "cdx-button",
                    {
                        "v-bind:disabled": "sourceFetchState.loading",
                        "v-on:click": "openHistoryDialog",
                    },
                    [createText("History")],
                ),
                [
                    createElement(
                        "cdx-button",
                        {
                            "v-on:click": "closeDialog",
                        },
                        [createText("Cancel")],
                    ),
                    createElement(
                        "cdx-button",
                        {
                            "v-bind:disabled": "sourceFetchState.loading",
                            "v-on:click": "openMoveDialog",
                        },
                        [createText("Move")],
                    ),
                    createElement(
                        "cdx-button",
                        {
                            action: "progressive",
                            "v-bind:disabled": "sourceFetchState.loading",
                            "v-on:click": "previewForm",
                        },
                        [
                            createText(
                                "{{ sourceFetchState.loading ? 'Fetching' : 'Preview' }}",
                            ),
                        ],
                    ),
                    createElement(
                        "cdx-button",
                        {
                            action: "progressive",
                            "v-bind:disabled": "sourceFetchState.loading",
                            "v-on:click": "submitForm",
                            weight: "primary",
                        },
                        [
                            createText(
                                "{{ sourceFetchState.loading ? 'Fetching' : 'Submit' }}",
                            ),
                        ],
                    ),
                ],
            ),
        ],
    );
}

/**
 * Creates a dialog action footer with one left-aligned action.
 *
 * @param {object} leadingAction - Left-aligned footer action node.
 * @param {Array<object>} actions - Right-aligned footer action nodes.
 * @returns {object} Dialog action footer node.
 */
function createSplitActionFooterTemplate(leadingAction, actions) {
    return createElement(
        "div",
        {
            style: {
                alignItems: "center",
                display: "flex",
                justifyContent: "space-between",
                width: "100%",
            },
        },
        [
            leadingAction,
            createActionFooterTemplate(actions, {
                width: "auto",
            }),
        ],
    );
}

/**
 * Creates the form history dialog.
 *
 * @returns {object} History dialog template node.
 */
function createHistoryDialogTemplate() {
    return createElement(
        "cdx-dialog",
        {
            "v-model:open": "historyOpen",
            title: "Form history",
        },
        [
            createElement(
                "p",
                {
                    "v-if": "historyEntries.length === 0",
                },
                [createText("No saved form history.")],
            ),
            createHistoryEntryListTemplate(),
            createHistoryDialogFooterTemplate(),
        ],
    );
}

/**
 * Creates the history entry list.
 *
 * @returns {object} History entry list template node.
 */
function createHistoryEntryListTemplate() {
    return createElement(
        "div",
        {
            "v-if": "historyEntries.length > 0",
            style: {
                display: "grid",
                gap: "0.5em",
            },
        },
        [createHistoryEntryTemplate()],
    );
}

/**
 * Creates one history entry row.
 *
 * @returns {object} History entry row template node.
 */
function createHistoryEntryTemplate() {
    return createElement(
        "div",
        {
            "v-bind:key": "entry.id",
            "v-for": "(entry, index) in historyEntries",
            style: {
                alignItems: "center",
                borderBottom: "1px solid var(--border-color-subtle, #eaecf0)",
                display: "grid",
                gap: "0.5em",
                gridTemplateColumns: "1fr auto auto",
                padding: "0.5em 0",
            },
        },
        [
            createElement("div", {}, [
                createElement("div", {}, [
                    createText("{{ index + 1 }}. {{ entry.page }}"),
                ]),
                createElement(
                    "div",
                    {
                        style: {
                            color: "var(--color-subtle, #54595d)",
                            fontSize: "0.75em",
                        },
                    },
                    [createText("{{ entry.savedAt }}")],
                ),
            ]),
            createElement(
                "cdx-button",
                {
                    "v-on:click": "fillHistoryEntry(entry)",
                },
                [createText("Fill")],
            ),
            createElement(
                "cdx-button",
                {
                    "v-if": "!entry.temporary",
                    "v-on:click": "deleteHistoryEntry(entry.id)",
                },
                [createText("Delete")],
            ),
        ],
    );
}

/**
 * Creates the history dialog footer actions.
 *
 * @returns {object} History dialog footer template node.
 */
function createHistoryDialogFooterTemplate() {
    return createElement(
        "template",
        {
            "v-slot:footer": "",
        },
        [
            createActionFooterTemplate([
                createElement(
                    "cdx-button",
                    {
                        "v-bind:disabled": "historyEntries.length === 0",
                        "v-on:click": "clearHistory",
                    },
                    [createText("Clear")],
                ),
                createElement(
                    "cdx-button",
                    {
                        "v-on:click": "closeHistoryDialog",
                    },
                    [createText("Close")],
                ),
            ]),
        ],
    );
}

/**
 * Creates the move target dialog.
 *
 * @returns {object} Move dialog template node.
 */
function createMoveDialogTemplate() {
    return createElement(
        "cdx-dialog",
        {
            "v-model:open": "moveOpen",
            title: "Move stub text",
        },
        [
            createElement("cdx-text-input", {
                placeholder: "Target page title",
                "v-bind:model-value": "moveTarget",
                "v-on:update:model-value": "updateMoveTarget($event)",
            }),
            createElement(
                "p",
                {
                    "v-if": "sourceFetchState.error",
                },
                [createText("{{ sourceFetchState.error }}")],
            ),
            createMoveDialogFooterTemplate(),
        ],
    );
}

/**
 * Creates the move dialog footer actions.
 *
 * @returns {object} Move dialog footer template node.
 */
function createMoveDialogFooterTemplate() {
    return createElement(
        "template",
        {
            "v-slot:footer": "",
        },
        [
            createActionFooterTemplate([
                createElement(
                    "cdx-button",
                    {
                        "v-on:click": "closeMoveDialog",
                    },
                    [createText("Cancel")],
                ),
                createElement(
                    "cdx-button",
                    {
                        action: "progressive",
                        "v-bind:disabled": "sourceFetchState.loading",
                        "v-on:click": "submitMoveTarget",
                        weight: "primary",
                    },
                    [
                        createText(
                            "{{ sourceFetchState.loading ? 'Fetching' : 'Open target page' }}",
                        ),
                    ],
                ),
            ]),
        ],
    );
}

/**
 * Creates a dialog action footer.
 *
 * @param {Array<object>} actions - Footer action button nodes.
 * @param {object} [style] - Extra footer style properties.
 * @returns {object} Dialog action footer node.
 */
function createActionFooterTemplate(actions, style = {}) {
    return createElement(
        "div",
        {
            style: {
                display: "flex",
                gap: "0.5em",
                justifyContent: "flex-end",
                width: "100%",
                ...style,
            },
        },
        actions,
    );
}

/**
 * Creates the tab container template node.
 *
 * @returns {object} Tab container template node.
 */
function createTabsTemplate() {
    return createElement(
        "cdx-tabs",
        {
            framed: "",
            "v-model:active": "activeTab",
        },
        [
            createElement(
                "cdx-tab",
                {
                    "v-bind:key": "group.key",
                    "v-bind:label": "group.label",
                    "v-bind:name": "group.key",
                    "v-for": "group in groups",
                },
                [
                    createElement(
                        "div",
                        {
                            class: "create-vg-stub-tab-panel",
                        },
                        [
                            createFieldGroupTemplate(),
                            createNameGroupTemplate(),
                            createCategoryGroupTemplate(),
                        ],
                    ),
                ],
            ),
        ],
    );
}

/**
 * Creates the review panel and category grid template node.
 *
 * @returns {object} Category review grid node.
 */
function createCategoryGroupTemplate() {
    return createElement(
        "template",
        {
            "v-if": "group.categoryReview",
        },
        [
            createElement(
                "p",
                {
                    class: "create-vg-stub-prose-length",
                },
                [
                    createText(
                        "Prose length: {{ getProseSinographs() }} sinographs",
                    ),
                ],
            ),
            createElement("h3", {}, [createText("Categories")]),
            createElement(
                "div",
                {
                    class: "create-vg-stub-category-grid",
                },
                [createCategoryRowTemplate()],
            ),
            createElement(
                "p",
                {
                    class: "create-vg-stub-error",
                    "v-if": "categoryState.error",
                },
                [createText("{{ categoryState.error }}")],
            ),
            createActionFooterTemplate([
                createElement(
                    "cdx-button",
                    {
                        "v-bind:disabled": "categoryState.loading",
                        "v-on:click": "addCategoryRow",
                    },
                    [createText("Add category")],
                ),
                createElement(
                    "cdx-button",
                    {
                        "v-bind:disabled": "categoryState.loading",
                        "v-on:click": "rebuildCategoryRows",
                    },
                    [
                        createText(
                            "{{ categoryState.loading ? 'Regenerating' : 'Regenerate' }}",
                        ),
                    ],
                ),
            ]),
            createNavboxReviewTemplate(),
        ],
    );
}

/**
 * Creates editable navbox review rows.
 *
 * @returns {object} Navbox review template node.
 */
function createNavboxReviewTemplate() {
    return createElement("section", {}, [
        createElement("h3", {}, [createText("Navboxes")]),
        createElement(
            "div",
            {
                class: "create-vg-stub-navbox-grid",
            },
            [
                createElement(
                    "template",
                    {
                        "v-bind:key": "index",
                        "v-for": "(navbox, index) in form.navboxRows || []",
                    },
                    [
                        createElement("cdx-checkbox", {
                            "v-model": "navbox.enabled",
                        }),
                        createElement(
                            "span",
                            {
                                class: "create-vg-stub-category-status",
                                "v-bind:title": "navbox.status",
                            },
                            [
                                createText(
                                    "{{ formatNavboxStatusLabel(navbox.status) }}",
                                ),
                            ],
                        ),
                        createElement("cdx-text-input", {
                            "v-model": "navbox.text",
                            "v-on:blur": "checkNavboxRow(index, $event)",
                        }),
                        createElement(
                            "cdx-button",
                            {
                                "v-if": "navbox.status === 'OK'",
                                "v-on:click": "openNavboxView(navbox)",
                            },
                            [createText("View")],
                        ),
                        createElement(
                            "cdx-button",
                            {
                                "v-else-if": "navbox.title",
                                "v-on:click": "createNavbox(navbox)",
                            },
                            [createText("Create")],
                        ),
                        createElement("span", {
                            "v-else": "",
                        }),
                        createElement(
                            "cdx-button",
                            {
                                "v-on:click": "removeNavboxRow(index)",
                            },
                            [createText("Remove")],
                        ),
                    ],
                ),
            ],
        ),
        createActionFooterTemplate([
            createElement(
                "cdx-button",
                {
                    "v-on:click": "addNavboxRow",
                },
                [createText("Add navbox")],
            ),
            createElement(
                "cdx-button",
                {
                    "v-bind:disabled": "reviewState.loading",
                    "v-on:click": "rebuildNavboxRows",
                },
                [
                    createText(
                        "{{ reviewState.loading ? 'Regenerating' : 'Regenerate' }}",
                    ),
                ],
            ),
        ]),
        createElement(
            "p",
            {
                class: "create-vg-stub-error",
                "v-if": "reviewState.error",
            },
            [createText("{{ reviewState.error }}")],
        ),
    ]);
}

/**
 * Creates category row template nodes.
 *
 * @returns {object} Category rows template node.
 */
function createCategoryRowTemplate() {
    return createElement(
        "template",
        {
            "v-bind:key": "index",
            "v-for": "(row, index) in form.categoryRows",
        },
        [
            createElement("cdx-checkbox", {
                "v-model": "row.enabled",
            }),
            createElement(
                "span",
                {
                    class: "create-vg-stub-category-status",
                    "v-bind:title": "row.source",
                },
                [createText("{{ formatCategorySourceLabel(row.source) }}")],
            ),
            createElement("cdx-text-input", {
                "v-model": "row.category",
                "v-on:blur": "checkCategoryRow(index, $event)",
            }),
            createElement("span", {}),
            createElement(
                "div",
                {
                    class: "create-vg-stub-category-actions",
                },
                [
                    createElement(
                        "cdx-button",
                        {
                            class: "create-vg-stub-category-action",
                            "v-if": "canCreateCategory(row)",
                            "v-on:click": "openCategoryCreate(row)",
                        },
                        [createText("Create")],
                    ),
                    createElement(
                        "cdx-button",
                        {
                            class: "create-vg-stub-category-action",
                            "v-else-if": "row.category",
                            "v-on:click": "openCategoryView(row)",
                        },
                        [createText("View")],
                    ),
                    createElement("span", {
                        "v-else": "",
                    }),
                    createElement(
                        "label",
                        {
                            class: "create-vg-stub-category-stub-tag",
                            "v-if": "row.stubTag",
                        },
                        [
                            createElement("cdx-checkbox", {
                                "v-bind:title":
                                    "'Whether adding {{' + row.stubTag + '}}'",
                                "v-model": "row.stubTagEnabled",
                            }),
                            createElement("span", {}, [
                                createText("{{stub}}"),
                            ]),
                        ],
                    ),
                ],
            ),
        ],
    );
}

/**
 * Creates the localized name group template node.
 *
 * @returns {object} Localized name group template node.
 */
function createNameGroupTemplate() {
    return createElement(
        "template",
        {
            "v-if": "group.nameGroupKey",
        },
        [
            createSteamNameHelperTemplate(),
            createNameRowTemplate(),
            createNameActionsTemplate(),
        ],
    );
}

/**
 * Creates the Steam localized name helper template node.
 *
 * @returns {object} Steam helper template node.
 */
function createSteamNameHelperTemplate() {
    return createElement(
        "div",
        {
            class: "create-vg-stub-steam-helper",
        },
        [
            createElement("cdx-text-input", {
                placeholder: "Steam app URL",
                "v-bind:model-value": "steamUrl",
                "v-on:update:model-value": "updateSteamUrl($event)",
            }),
            createElement(
                "cdx-button",
                {
                    "v-bind:disabled": "sourceFetchState.loading",
                    "v-on:click": "addSteamNames",
                },
                [createText("Add Steam names")],
            ),
            createElement(
                "div",
                {
                    class: "create-vg-stub-steam-suggestion",
                    "v-if": "fetchedSteamNameRows.length",
                },
                [
                    createText(
                        "{{ formatSteamNameSuggestion(fetchedSteamNameRows) }}",
                    ),
                ],
            ),
            createElement(
                "div",
                {
                    class: "create-vg-stub-steam-actions",
                    "v-if": "fetchedSteamNameRows.length",
                },
                [
                    createElement(
                        "cdx-button",
                        {
                            "v-bind:key": "choice.key",
                            "v-for": "choice in steamNameChoices",
                            "v-on:click": "applySteamNameChoice(choice.key)",
                        },
                        [createText("{{ choice.label }}")],
                    ),
                ],
            ),
        ],
    );
}

/**
 * Creates localized name row action buttons.
 *
 * @returns {object} Localized name action button group node.
 */
function createNameActionsTemplate() {
    return createElement(
        "div",
        {
            style: {
                display: "flex",
                gap: "0.5em",
            },
        },
        [
            createElement(
                "cdx-button",
                {
                    action: "progressive",
                    "v-on:click": "addNameRow(group.nameGroupKey)",
                    weight: "primary",
                },
                [createText("Add")],
            ),
            createElement(
                "cdx-button",
                {
                    "v-on:click": "removeBlankNameRows(group.nameGroupKey)",
                },
                [createText("Remove blank")],
            ),
        ],
    );
}

/**
 * Creates a localized name row template node.
 *
 * @returns {object} Localized name row template node.
 */
function createNameRowTemplate() {
    return createElement(
        "div",
        {
            class: "create-vg-stub-name-row",
            "v-bind:key": "index",
            "v-for": "(row, index) in form[group.nameGroupKey]",
        },
        [
            createElement(
                "div",
                {
                    class: "create-vg-stub-name-controls",
                },
                [createNameMarketTemplate(), createNameInputTemplate()],
            ),
        ],
    );
}

/**
 * Creates the localized name market checkbox group template node.
 *
 * @returns {object} Localized name market checkbox group node.
 */
function createNameMarketTemplate() {
    return createElement(
        "div",
        {
            style: {
                display: "flex",
                flexWrap: "wrap",
                gap: "0.75em",
                marginBottom: "0.5em",
            },
        },
        [
            createElement(
                "cdx-checkbox",
                {
                    "v-model": "row.official",
                },
                [createText("Official")],
            ),
            createElement(
                "span",
                {
                    class: "create-vg-stub-name-market-label",
                },
                [createText("Regions:")],
            ),
            createElement(
                "cdx-checkbox",
                {
                    "v-bind:key": "market.key",
                    "v-for": "market in nameMarkets",
                    "v-model": "row[market.key]",
                },
                [createText("{{ market.label }}")],
            ),
        ],
    );
}

/**
 * Creates the localized name text input group template node.
 *
 * @returns {object} Localized name text input group node.
 */
function createNameInputTemplate() {
    return createElement(
        "div",
        {
            class: "create-vg-stub-field-controls",
        },
        [
            createElement("cdx-text-input", {
                placeholder: "Title",
                "v-bind:model-value": "row.name",
                "v-on:change":
                    "updateNameRow(group.nameGroupKey, index, 'name')",
                "v-on:update:model-value":
                    "updateNameRowValue(group.nameGroupKey, index, 'name', $event)",
            }),
            createSourceUrlInputTemplate({
                placeholder: "Source URLs",
                model: "row.sourceUrl",
                change: "updateNameRow(group.nameGroupKey, index, 'sourceUrl')",
                update: "updateNameRowValue(group.nameGroupKey, index, 'sourceUrl', $event)",
            }),
        ],
    );
}

/**
 * Creates a source URL textarea template node.
 *
 * @param {object} options - Source URL field options.
 * @param {string} options.change - Change handler expression.
 * @param {string} options.model - Vue model expression.
 * @param {string} options.placeholder - Placeholder text or expression.
 * @param {string} options.update - Input update handler expression.
 * @param {boolean} [options.bindPlaceholder] - Whether placeholder is a Vue binding.
 * @returns {object} Source URL textarea node.
 */
function createSourceUrlInputTemplate(options) {
    const attributes = {
        class: "create-vg-stub-source-url",
        rows: "1",
        "v-bind:model-value": options.model,
        "v-on:change": options.change,
        "v-on:update:model-value": options.update,
    };

    if (options.bindPlaceholder) {
        attributes["v-bind:placeholder"] = options.placeholder;
    } else {
        attributes.placeholder = options.placeholder;
    }

    return createElement("cdx-text-area", attributes);
}

/**
 * Creates the article field group template node.
 *
 * @returns {object} Article field group template node.
 */
function createFieldGroupTemplate() {
    return createElement(
        "template",
        {
            "v-if": "!group.nameGroupKey",
        },
        [
            createElement(
                "template",
                {
                    "v-bind:key": "field.key",
                    "v-for": "field in group.fields",
                },
                [
                    createCompactFieldTemplate(),
                    createStandardFieldTemplate(),
                    createWikidataNoteTemplate(),
                    createFieldPreviewTemplate(),
                ],
            ),
        ],
    );
}

/**
 * Creates a compact article field template node.
 *
 * @returns {object} Compact article field template node.
 */
function createCompactFieldTemplate() {
    return createElement(
        "div",
        {
            class: "create-vg-stub-field-row",
            "v-if": "field.compact",
        },
        [
            createFieldSeparatorTemplate("compact"),
            createElement(
                "div",
                {
                    class: "create-vg-stub-field-label",
                },
                [createText("{{ field.heading || field.label }}")],
            ),
            createElement(
                "div",
                {
                    class: "create-vg-stub-field-controls",
                },
                [
                    createElement("cdx-text-input", {
                        "v-bind:placeholder": "field.placeholder",
                        "v-bind:model-value": "form[field.key]",
                        "v-on:change": "normalizeFieldValue(field)",
                        "v-on:update:model-value":
                            "updateFieldValue(field, $event)",
                    }),
                    createElement(
                        "template",
                        {
                            "v-if": "field.sourceField",
                        },
                        [
                            createSourceUrlInputTemplate({
                                placeholder: "Source URLs",
                                model: "form[field.sourceField.sourceKey]",
                                change: "trimSourceValue(field.sourceField)",
                                update: "updateSourceValue(field.sourceField, $event)",
                            }),
                        ],
                    ),
                ],
            ),
        ],
    );
}

/**
 * Creates a standard article field template node.
 *
 * @returns {object} Standard article field template node.
 */
function createStandardFieldTemplate() {
    return createElement(
        "div",
        {
            class: "create-vg-stub-field-row",
            "v-else-if": "!field.compact",
        },
        [
            createFieldSeparatorTemplate(),
            createElement(
                "div",
                {
                    class: "create-vg-stub-field-label",
                },
                [createText("{{ field.label }}")],
            ),
            createElement(
                "div",
                {
                    class: "create-vg-stub-field-controls",
                },
                [
                    createElement(
                        "template",
                        {
                            "v-if": "field.multiline",
                        },
                        [
                            createElement("cdx-text-area", {
                                rows: "1",
                                "v-bind:placeholder":
                                    "getFieldPlaceholder(field) || field.placeholder",
                                "v-bind:model-value": "form[field.key]",
                                "v-on:change": "normalizeFieldValue(field)",
                                "v-on:update:model-value":
                                    "updateFieldValue(field, $event)",
                            }),
                        ],
                    ),
                    createElement(
                        "template",
                        {
                            "v-else": "",
                        },
                        [
                            createElement("cdx-text-input", {
                                "v-bind:placeholder":
                                    "getFieldPlaceholder(field) || field.placeholder",
                                "v-bind:readonly": "field.readonly",
                                "v-bind:model-value": "form[field.key]",
                                "v-on:change": "normalizeFieldValue(field)",
                                "v-on:paste":
                                    "normalizePastedFieldValue(field, $event)",
                                "v-on:update:model-value":
                                    "updateFieldValue(field, $event)",
                            }),
                        ],
                    ),
                    createElement(
                        "template",
                        {
                            "v-if": "field.sourceField",
                        },
                        [
                            createSourceUrlInputTemplate({
                                placeholder: "Source URLs",
                                model: "form[field.sourceField.sourceKey]",
                                change: "trimSourceValue(field.sourceField)",
                                update: "updateSourceValue(field.sourceField, $event)",
                            }),
                        ],
                    ),
                ],
            ),
        ],
    );
}

/**
 * Creates the Wikidata note template node after the Enwiki title field.
 *
 * @returns {object} Wikidata note template node.
 */
function createWikidataNoteTemplate() {
    return createElement(
        "div",
        {
            class: "create-vg-stub-wikitext-preview create-vg-stub-field-note",
            "v-if": "field.key === 'enwikiTitle'",
        },
        [createText("Wikidata: {{ getWikidataText() }}")],
    );
}

/**
 * Creates the wikitext preview template node for one article field.
 *
 * @param {string} [fieldExpression] - Vue expression resolving to a field.
 * @returns {object} Wikitext preview template node.
 */
function createFieldPreviewTemplate(fieldExpression = "field") {
    const previewExpression = `getFieldPreview(${fieldExpression})`;

    return createElement(
        "div",
        {
            class: "create-vg-stub-wikitext-preview create-vg-stub-field-note",
            "v-if": `${fieldExpression}.previewKey && ${previewExpression}`,
        },
        [createText(`{{ ${previewExpression} }}`)],
    );
}

/**
 * Creates a field separator template node.
 *
 * @param {string} [variant] - Separator display variant.
 * @returns {object} Field separator template node.
 */
function createFieldSeparatorTemplate(variant) {
    return createElement("hr", {
        class: [
            "create-vg-stub-field-separator",
            variant === "compact"
                ? "create-vg-stub-field-separator-compact"
                : "",
        ]
            .filter(Boolean)
            .join(" "),
        "v-if": "field.breakBefore",
    });
}

/**
 * Creates a template element object with attributes and children.
 *
 * @param {string} tagName - Tag name.
 * @param {object} [attributes] - Element attributes.
 * @param {Array<object|string>} [children] - Child nodes.
 * @returns {object} Created template element object.
 */
function createElement(tagName, attributes = {}, children = []) {
    return {
        attributes,
        children,
        tagName,
    };
}

/**
 * Creates a template text node.
 *
 * @param {string} value - Text content.
 * @returns {string} Created text node.
 */
function createText(value) {
    return value;
}

/**
 * Serializes a template node to markup.
 *
 * @param {object|Array<object>} node - Template node.
 * @returns {string} Template markup.
 */
function renderTemplate(node) {
    if (Array.isArray(node)) {
        return node.map(renderNode).join("");
    }

    return renderElement(node);
}

/**
 * Serializes a template child node to markup.
 *
 * @param {object|string} node - Template child node.
 * @returns {string} Template child markup.
 */
function renderNode(node) {
    if (typeof node === "string") {
        return node;
    }

    return renderElement(node);
}

/**
 * Serializes a template element object to markup.
 *
 * @param {object} element - Template element object.
 * @param {object} element.attributes - Element attributes.
 * @param {Array<object|string>} element.children - Child nodes.
 * @param {string} element.tagName - Tag name.
 * @returns {string} Element markup.
 */
function renderElement(element) {
    const attributes = renderAttributes(element.attributes);
    const children = element.children.map(renderNode).join("");

    if (element.tagName === "hr") {
        return `<${element.tagName}${attributes}>`;
    }

    return `<${element.tagName}${attributes}>${children}</${element.tagName}>`;
}

/**
 * Serializes element attributes to markup.
 *
 * @param {object} attributes - Element attributes.
 * @returns {string} Attribute markup.
 */
function renderAttributes(attributes) {
    return Object.entries(attributes).map(renderAttribute).join("");
}

/**
 * Serializes one element attribute to markup.
 *
 * @param {Array<string|object>} entry - Attribute name and value.
 * @returns {string} Attribute markup.
 */
function renderAttribute(entry) {
    const [name, value] = entry;
    const renderedValue = name === "style" ? renderStyle(value) : value;

    if (renderedValue === "") {
        return ` ${name}`;
    }

    return ` ${name}="${escapeAttribute(renderedValue)}"`;
}

/**
 * Serializes a style declaration object.
 *
 * @param {object} style - Style declaration object.
 * @returns {string} Style declaration text.
 */
function renderStyle(style) {
    return `${Object.entries(style).map(renderStyleDeclaration).join("; ")};`;
}

/**
 * Serializes a stylesheet rule object.
 *
 * @param {Array<object>} rules - Structured CSS rules.
 * @returns {string} Stylesheet text.
 */
export function renderStyleRules(rules) {
    return rules.map(renderStyleRule).join("\n\n");
}

/**
 * Serializes one stylesheet rule or nested at-rule.
 *
 * @param {object} rule - Structured CSS rule.
 * @returns {string} Stylesheet rule text.
 */
function renderStyleRule(rule) {
    if (rule.type === "media") {
        return `@media ${rule.condition} {\n${indentStyleText(
            renderStyleRules(rule.rules),
        )}\n}`;
    }

    const selector = rule.selectors.join(",\n");
    const body = Object.entries(rule.declarations)
        .map(([name, value]) => `  ${toKebabCase(name)}: ${value};`)
        .join("\n");

    return `${selector} {\n${body}\n}`;
}

/**
 * Indents nested stylesheet text.
 *
 * @param {string} text - Stylesheet text.
 * @returns {string} Indented stylesheet text.
 */
function indentStyleText(text) {
    return text
        .split("\n")
        .map((line) => `  ${line}`)
        .join("\n");
}

/**
 * Serializes one style declaration.
 *
 * @param {Array<string>} entry - Style property and value.
 * @returns {string} Style declaration text.
 */
function renderStyleDeclaration(entry) {
    const [name, value] = entry;

    return `${toKebabCase(name)}: ${value}`;
}

/**
 * Converts a camelCase JavaScript name to a kebab-case CSS name.
 *
 * @param {string} value - JavaScript property name.
 * @returns {string} CSS property name.
 */
function toKebabCase(value) {
    return value.replace(/[A-Z]/gu, (letter) => `-${letter.toLowerCase()}`);
}

/**
 * Escapes an attribute value for template markup.
 *
 * @param {string} value - Raw attribute value.
 * @returns {string} Escaped attribute value.
 */
function escapeAttribute(value) {
    return value.replace(/&/gu, "&amp;").replace(/"/gu, "&quot;");
}

/**
 * Creates empty form values keyed by input field name.
 *
 * @param {string} defaultName - Default article title.
 * @returns {object} Initial dialog form values.
 */
function createFormValues(defaultName) {
    return {
        ...Object.fromEntries(
            [...getArticleFields(), ...SOURCE_REFERENCE_FIELDS].map(
                getEmptyFieldValue,
            ),
        ),
        categoryRows: [],
        localizedNames: [createNameRow()],
        name: "",
        navboxRows: null,
        publishers: "=",
        sortKey: "",
    };
}

/**
 * Creates one localized name row.
 *
 * @param {Array<string>} [selectedMarkets] - Initially selected market codes.
 * @param {object} [options] - Initial row options.
 * @param {boolean} [options.official] - Whether the row is official.
 * @returns {object} Localized name row.
 */
function createNameRow(selectedMarkets = [], options = {}) {
    return {
        ...Object.fromEntries(
            NAME_MARKETS.map((market) => [
                market.key,
                selectedMarkets.includes(market.key),
            ]),
        ),
        name: "",
        official: Boolean(options.official),
        sourceUrl: "",
    };
}

/**
 * Creates one localized name row from fetched helper values.
 *
 * @param {object} values - Localized name values.
 * @returns {object} Localized name row.
 */
function createNameRowFromValues(values) {
    return {
        ...createNameRow(getNameRowSelectedMarkets(values)),
        ...values,
    };
}

/**
 * Formats fetched Steam names with market labels.
 *
 * @param {Array<object>} rows - Fetched Steam name rows.
 * @returns {string} Labeled Steam name suggestion text.
 */
function formatSteamNameSuggestion(rows) {
    return rows.map(formatSteamNameSuggestionRow).join(" | ");
}

/**
 * Formats one fetched Steam name row with its market label.
 *
 * @param {object} row - Fetched Steam name row.
 * @returns {string} Labeled Steam name suggestion item.
 */
function formatSteamNameSuggestionRow(row) {
    return `${formatSteamNameMarkets(row)}: ${row.name}`;
}

/**
 * Formats selected Steam name markets.
 *
 * @param {object} row - Fetched Steam name row.
 * @returns {string} Market label.
 */
function formatSteamNameMarkets(row) {
    return getNameRowSelectedMarkets(row).map(formatSteamNameMarket).join("/");
}

/**
 * Formats one Steam name market key.
 *
 * @param {string} market - Market key.
 * @returns {string} Market label.
 */
function formatSteamNameMarket(market) {
    const item = NAME_MARKETS.find((entry) => entry.key === market);

    return item?.label || market;
}

/**
 * Builds localized name rows from a Steam helper choice.
 *
 * @param {Array<object>} rows - Fetched Steam name rows.
 * @param {string} choice - Steam helper choice key.
 * @returns {Array<object>} Localized name rows to apply.
 */
function buildSteamNameChoiceRows(rows, choice) {
    const hans = findSteamNameRow(rows, "hans");
    const hant = findSteamNameRow(rows, "hant");

    if (choice === "hans") {
        return hans == null ? [] : [hans];
    }

    if (choice === "hant") {
        return hant == null ? [] : [hant];
    }

    if (choice === "both") {
        return [hans, hant].filter(Boolean);
    }

    if (choice === "merge") {
        return [mergeSteamNameRows(hans, hant, false)].filter(Boolean);
    }

    if (choice === "other") {
        return [mergeSteamNameRows(hans, hant, true)].filter(Boolean);
    }

    return [];
}

/**
 * Finds one fetched Steam name row by market.
 *
 * @param {Array<object>} rows - Fetched Steam name rows.
 * @param {string} market - Market key.
 * @returns {object|undefined} Matching row.
 */
function findSteamNameRow(rows, market) {
    return rows.find((row) => getNameRowSelectedMarkets(row).includes(market));
}

/**
 * Merges fetched Steam rows into one localized name row.
 *
 * @param {object} hans - Simplified Chinese Steam row.
 * @param {object} hant - Traditional Chinese Steam row.
 * @param {boolean} blankName - Whether to leave the name blank for manual entry.
 * @returns {object|undefined} Merged localized name row.
 */
function mergeSteamNameRows(hans, hant, blankName) {
    const rows = [hans, hant].filter(Boolean);

    if (rows.length === 0) {
        return undefined;
    }

    return {
        name: blankName ? "" : trimFieldValue(hans?.name || hant?.name),
        official: true,
        sourceUrl: rows
            .map((row) => row.sourceUrl)
            .filter(Boolean)
            .join("\n"),
        ww: true,
    };
}

/**
 * Gets selected market keys from a row-like object.
 *
 * @param {object} values - Localized name values.
 * @returns {Array<string>} Selected market keys.
 */
function getNameRowSelectedMarkets(values) {
    return (
        values.markets ||
        NAME_MARKETS.filter((market) => values[market.key]).map(
            (market) => market.key,
        )
    );
}

/**
 * Fills a matching empty name row or appends a new one.
 *
 * @param {Array<object>} rows - Existing localized name rows.
 * @param {object} values - Localized name values.
 * @returns {void}
 */
function fillNameRow(rows, values) {
    const selectedMarkets = getNameRowSelectedMarkets(values);
    const matchingRow = rows.find(
        (row) =>
            !hasEnteredNameRowValue(row) &&
            Boolean(row.official) === Boolean(values.official) &&
            selectedMarkets.every((market) => row[market]),
    );

    if (matchingRow == null) {
        rows.push(createNameRowFromValues(values));
        return;
    }

    Object.assign(matchingRow, createNameRowFromValues(values));
}

/**
 * Checks whether a localized name row has entered text.
 *
 * @param {object} row - Localized name row.
 * @param {string} row.name - Localized name value.
 * @param {string} row.sourceUrl - Localized name source URL.
 * @returns {boolean} Whether the row should be kept.
 */
function hasEnteredNameRowValue(row) {
    return (
        Boolean(trimFieldValue(row.name)) ||
        Boolean(trimFieldValue(row.sourceUrl))
    );
}

/**
 * Flattens article parameter groups into field metadata.
 *
 * @returns {Array<object>} Dialog field definitions.
 */
function getArticleFields() {
    return ARTICLE_PARAMETER_GROUPS.flatMap(getGroupFields);
}

/**
 * Gets an article field definition by form key.
 *
 * @param {string} key - Form key for the field.
 * @returns {object} Matching field definition.
 */
function getArticleField(key) {
    return getArticleFields().find((field) => field.key === key);
}

/**
 * Gets a registered source URL field by article field key.
 *
 * @param {string} key - Article field key.
 * @returns {object|undefined} Matching source field definition.
 */
function getSourceReferenceField(key) {
    return SOURCE_REFERENCE_FIELDS.find((field) => field.key === key);
}

/**
 * Gets the fields from an article parameter group.
 *
 * @param {object} group - Article parameter group.
 * @param {Array<object>} group.fields - Field definitions in the group.
 * @returns {Array<object>} Field definitions for the group.
 */
function getGroupFields(group) {
    return group.fields;
}

/**
 * Creates an empty value entry for a field tuple.
 *
 * @param {object} field - Dialog field definition.
 * @param {string} [field.key] - Form key for the field.
 * @param {string} [field.sourceKey] - Form key for the source URL.
 * @returns {Array<string>} Field key paired with an empty string.
 */
function getEmptyFieldValue(field) {
    return [getFieldValueKey(field), ""];
}

/**
 * Gets the form value key for one field.
 *
 * @param {object} field - Dialog field definition.
 * @param {string} [field.key] - Form key for article fields.
 * @param {string} [field.sourceKey] - Form key for source URL fields.
 * @returns {string} Form value key.
 */
function getFieldValueKey(field) {
    return field.sourceKey || field.key;
}

/**
 * Removes a trailing parenthesized disambiguator from a page title.
 *
 * @param {string} title - Page title.
 * @returns {string} Base page title.
 */
function getBasePageTitle(title) {
    return trimFieldValue(title).replace(/ \(.+?\)$/u, "");
}

/**
 * Replaces a reactive form object with received form values.
 *
 * @param {object} form - Reactive form object.
 * @param {object} values - Received form values.
 * @returns {void}
 */
function replaceFormValues(form, values) {
    Object.keys(form).forEach((key) => {
        delete form[key];
    });
    Object.assign(form, normalizeReceivedFormValues(values));
}

/**
 * Normalizes received form values for the current dialog shape.
 *
 * @param {object} values - Received form values.
 * @returns {object} Normalized form values.
 */
function normalizeReceivedFormValues(values) {
    const normalized = cloneValue(values);

    if (!Object.hasOwn(normalized, "navboxRows")) {
        normalized.navboxRows = null;
    } else if (Array.isArray(normalized.navboxRows)) {
        normalized.navboxRows = normalized.navboxRows.map(createNavboxRow);
    }

    if (normalized.localizedNames == null) {
        normalized.localizedNames = [
            ...(normalized.officialNames || []).map((row) => ({
                ...row,
                official: true,
            })),
            ...(normalized.commonNames || []).map((row) => ({
                ...row,
                official: false,
            })),
        ];
    }

    delete normalized.officialNames;
    delete normalized.commonNames;

    return normalized;
}

/**
 * Ensures the form has editable navbox rows.
 *
 * @param {object} form - Dialog form values.
 * @returns {Array<string>} Navbox rows.
 */
function ensureNavboxRows(form) {
    if (!Array.isArray(form.navboxRows)) {
        form.navboxRows = [];
    }

    return form.navboxRows;
}

function hasPreparedNavboxRows(form) {
    return (
        Array.isArray(form.navboxRows) &&
        (form.navboxRows.length > 0 || trimFieldValue(form.series) === "")
    );
}

/**
 * Creates one editable navbox row.
 *
 * @param {*} [value] - Existing row or navbox wikitext.
 * @returns {object} Navbox row.
 */
function createNavboxRow(value = "") {
    const text = trimFieldValue(value?.text ?? value);

    return {
        enabled: value?.enabled !== false,
        status: value?.status || "",
        text,
        title: value?.title || getNavboxTitle(text),
    };
}

/**
 * Extracts a template title from navbox wikitext.
 *
 * @param {*} value - Navbox wikitext.
 * @returns {string} Template title without namespace.
 */
function getNavboxTitle(value) {
    const text = trimFieldValue(value);
    const match = text.match(/^\{\{\s*(?:Template:)?([^|}]+).*?\}\}$/iu);

    return trimFieldValue(match?.[1] || text).replace(/^Template:/iu, "");
}

/**
 * Clones a plain JSON-compatible value.
 *
 * @param {*} value - Value to clone.
 * @returns {*} Cloned value.
 */
function cloneValue(value) {
    return JSON.parse(JSON.stringify(value));
}

/**
 * Opens the mounted Codex dialog.
 *
 * @param {object} open - Vue reference controlling dialog visibility.
 * @param {boolean} open.value - Current dialog visibility state.
 * @returns {void}
 */
function openDialog(open) {
    open.value = true;
}
