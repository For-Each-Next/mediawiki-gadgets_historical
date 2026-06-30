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
    parsePrefixedValue,
    trimFieldValue,
} from "../shared/form-values.js";
import { getEnteredSourceUrls } from "../sources/source-references.js";
import { sortCitationParams } from "../sources/citations.js";
import {
    buildOfficialNameConversionText,
    sortNoteTaEntries,
} from "../wikitext/note-ta.js";
import {
    createPageEditDialogTemplate,
    createPreviewDialogTemplate,
} from "./source-preview.js";
import { createTabsTemplate } from "./main/index.js";
import {
    createActionFooterTemplate,
    createElement,
    createText,
    renderTemplate,
} from "./template.js";

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
    .add(".create-vg-stub-preview-dialog.cdx-dialog", {
        maxWidth: "min(98vw, 100em)",
        width: "min(98vw, 100em)",
    })
    .add(".create-vg-stub-category-view", {
        border: "1px solid var(--border-color-base, #a2a9b1)",
        height: "70vh",
        width: "100%",
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
        gridColumn: "1 / -1",
    })
    .add(".create-vg-stub-steam-suggestion", {
        color: "var(--color-subtle, #54595d)",
        fontSize: "0.75em",
        gridColumn: "1 / -1",
        overflowWrap: "anywhere",
    })
    .add(".create-vg-stub-name-market-separator", {
        alignSelf: "center",
        borderLeft: "1px solid var(--border-color-base, #a2a9b1)",
        height: "1.5em",
    })
    .add(".create-vg-stub-horizontal-list", {
        display: "flex",
        flexWrap: "wrap",
    })
    .add(".create-vg-stub-horizontal-list-item:not(:first-child)::before", {
        content: '" · "',
        whiteSpace: "pre",
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
    .add(
        [
            ".create-vg-stub-preview-text textarea",
            ".create-vg-stub-history-json-text textarea",
            "textarea.create-vg-stub-preview-text",
            "textarea.create-vg-stub-history-json-text",
        ],
        {
            fontFamily: "monospace",
        },
    )
    .add(".create-vg-stub-preview-layout", {
        display: "grid",
        gap: "0.75em",
    })
    .add(".create-vg-stub-preview-rendered", {
        border: "1px solid var(--border-color-subtle, #eaecf0)",
        maxHeight: "35vh",
        overflow: "auto",
        padding: "0.75em",
    })
    .media("(min-width: 960px)", (sheet) => {
        sheet
            .add(".create-vg-stub-preview-layout", {
                gridTemplateColumns: "minmax(0, 1fr) minmax(0, 1fr)",
            })
            .add(".create-vg-stub-preview-rendered", {
                maxHeight: "60vh",
            });
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
    .add(".create-vg-stub-review-title-cell", {
        minWidth: "0",
    })
    .add(".create-vg-stub-company-category-text textarea", {
        fontFamily: "monospace",
    })
    .add(".create-vg-stub-error", {
        color: "var(--color-error, #d73333)",
    })
    .add(".create-vg-stub-pre-save-groups", {
        display: "grid",
        gap: "0.875em",
        marginTop: "0.75em",
    })
    .add(".create-vg-stub-pre-save-page", {
        display: "grid",
        gap: "0.35em",
    })
    .add(".create-vg-stub-pre-save-title", {
        fontWeight: "600",
        overflowWrap: "anywhere",
    })
    .add(".create-vg-stub-pre-save-list", {
        display: "grid",
        gap: "0.35em",
        listStyle: "disc",
        margin: "0 0 0 1.5em",
        padding: "0",
    })
    .add(".create-vg-stub-pre-save-item", {
        paddingLeft: "0.15em",
    })
    .add(".create-vg-stub-pre-save-note", {
        overflowWrap: "anywhere",
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
    .add(".create-vg-stub-redirect-grid", {
        display: "grid",
        gap: "0.25em",
        gridTemplateColumns:
            "auto minmax(4.2em, 0.35fr) minmax(12em, 1.6fr) auto auto",
        marginBottom: "0.75em",
    })
    .add(".create-vg-stub-stub-tag-grid", {
        display: "grid",
        gap: "0.25em",
        gridTemplateColumns:
            "auto minmax(4.2em, 6em) minmax(12em, 1.6fr) auto",
        marginBottom: "0.75em",
    })
    .add(".create-vg-stub-noteta-grid", {
        display: "grid",
        gap: "0.25em",
        gridTemplateColumns: "minmax(4.2em, 7em) minmax(12em, 1fr) auto",
        marginBottom: "0.75em",
    })
    .add(".create-vg-stub-citation", {
        borderBottom: "1px solid var(--border-color-subtle, #eaecf0)",
        marginBottom: "1em",
        paddingBottom: "1em",
    })
    .add(".create-vg-stub-citation-grid", {
        display: "grid",
        gap: "0.25em",
        gridTemplateColumns: "minmax(5em, 10em) minmax(12em, 1fr) auto",
        marginBottom: "0.75em",
    })
    .add(".create-vg-stub-citation-actions", {
        display: "flex",
        flexWrap: "wrap",
        gap: "0.5em",
    })
    .add(".create-vg-stub-review-action", {
        width: "5em",
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
        this.citationReview = Boolean(options.citationReview);
        this.fields = fields;
        this.key = key;
        this.label = label;
        this.nameGroupKey = nameGroupKey;
        this.noteTaReview = Boolean(options.noteTaReview);
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
        label: "Unspecified region",
    },
];
const STEAM_NAME_BUTTONS = STEAM_NAME_CHOICES.map((choice) => ({
    label: choice.label,
    value: choice.key,
}));
const NOTE_TA_NAMES_SOURCE = "names";
const CODEMIRROR_MODULES = ["ext.CodeMirror", "ext.CodeMirror.mode.mediawiki"];
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
        new ArticleParameterField("name", "Main title", "name", null, {
            breakBefore: true,
            placeholder: "Leave blank to use the page title in article text",
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
    new ArticleParameterGroup("attribution", "Metadata", [
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
    new ArticleParameterGroup(
        "localizedNames",
        "Localized names",
        [],
        "localizedNames",
    ),
    new ArticleParameterGroup(
        "prose",
        "Prose",
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
            noteTaReview: true,
        },
    ),
    new ArticleParameterGroup("references", "References", [], null, {
        citationReview: true,
    }),
    new ArticleParameterGroup("review", "Checks", [], null, {
        categoryReview: true,
    }),
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
 * @param {string} options.currentTitle - Current page title.
 * @param {string} options.defaultName - Default article display title.
 * @param {Function} options.getFieldPlaceholder - Field placeholder builder.
 * @param {Function} options.getProseSinographs - Prose length calculator.
 * @param {Function} options.getProseWikitext - Prose wikitext preview builder.
 * @param {object} [options.initialForm] - Initial form values.
 * @param {number} [options.citationPrefetchDelay] - Citation prefetch debounce delay.
 * @param {Function} [options.getFieldPreview] - Field wikitext preview builder.
 * @param {Function} options.getHistoryEntries - Form history entry provider.
 * @param {Function} options.onActivate - Tool activation handler.
 * @param {Function} options.onCategoryRowsRefresh - Category refresh handler.
 * @param {Function} options.onClearHistory - Form history clear handler.
 * @param {Function} options.onCreateCategoryRow - Category row factory.
 * @param {Function} options.onDeleteHistoryEntry - Form history delete handler.
 * @param {Function} options.onFormChange - Form change handler.
 * @param {Function} options.onMoveTarget - New-page target opener.
 * @param {Function} options.onCheckRedirectRows - Redirect review row checker.
 * @param {Function} options.onPrepareCompanyCategory - Company category text builder.
 * @param {Function} options.onPrepareRedirectRows - Redirect review row builder.
 * @param {Function} options.onPrepareReview - Review report builder.
 * @param {Function} options.onFetchPageText - Existing page source fetcher.
 * @param {Function} options.onEnwikiTitleChange - Enwiki metadata lookup handler.
 * @param {Function} options.onParsePreview - Wikitext preview parser.
 * @param {Function} options.onPreview - Editor preview handler.
 * @param {Function} options.onPreSavePrepare - Follow-up action builder.
 * @param {Function} [options.onSourceUrlChange] - Source URL change handler.
 * @param {Function} options.onSubmit - Submit handler.
 * @param {Function} options.onSubmitHistory - Form history submit handler.
 * @param {Function} options.onUpdateCategoryRowCategory - Category title update handler.
 * @returns {object} Vue component options.
 */
export function createDialogComponent(Vue, options) {
    const currentTitle =
        trimFieldValue(options.currentTitle) || options.defaultName;
    const activeTab = Vue.ref(ARTICLE_PARAMETER_GROUPS[0].key);
    const form = Vue.reactive(createFormValues(options.defaultName));
    const categoryState = Vue.reactive({
        error: "",
        loading: false,
    });
    const citationState = Vue.reactive({
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
        englishName: "",
        error: "",
        loading: false,
        pending: false,
        text: "",
        wikidataId: "",
    });
    const companyCategoryLookupLoading = Vue.ref(false);
    const companyCategoryLookupSerial = Vue.ref(0);
    const pageEditOpen = Vue.ref(false);
    const pageEditState = Vue.reactive({
        create: false,
        company: "",
        englishName: "",
        error: "",
        html: "",
        kind: "",
        loading: false,
        pending: false,
        previousStatus: "",
        row: null,
        text: "",
        title: "",
    });
    const categoryViewOpen = Vue.ref(false);
    const categoryViewState = Vue.reactive({
        title: "",
        url: "",
    });
    const historyEntries = Vue.ref(options.getHistoryEntries());
    const historyJsonError = Vue.ref("");
    const historyJsonEditable = Vue.ref(false);
    const historyJsonOpen = Vue.ref(false);
    const historyJsonText = Vue.ref("");
    const historyOpen = Vue.ref(false);
    const moveTarget = Vue.ref(currentTitle);
    const moveOpen = Vue.ref(false);
    const preSaveMoveEnabled = Vue.ref(false);
    const preSaveMoveTitle = Vue.ref(currentTitle);
    const preSaveOpen = Vue.ref(false);
    const preSaveActions = Vue.reactive([]);
    const preSaveGroups = Vue.computed(() =>
        createPreSaveGroups(preSaveActions, form),
    );
    const stubTagRows = Vue.computed(() => form.stubTagRows || []);
    const previewOpen = Vue.ref(false);
    const previewTextArea = Vue.ref(null);
    const previewText = Vue.ref("");
    const previewSummary = Vue.ref("");
    const previewHtml = Vue.ref("");
    const previewSubmitted = Vue.ref(false);
    const pageEditTextArea = Vue.ref(null);
    const enwikiLookupLoading = Vue.ref(false);
    const enwikiLookupSerial = Vue.ref(0);
    const enwikiMetadata = Vue.reactive(createBlankEnwikiMetadata());
    const fetchedSteamNameRows = Vue.ref([]);
    const steamUrl = Vue.ref("");
    const sourceFetchState = Vue.reactive({
        error: "",
        loading: false,
    });
    const open = Vue.ref(options.initialOpen === true);
    const initialForm = options.initialForm;
    const sourceEditors = new Map();
    const sourceEditorLoads = new Set();

    if (initialForm != null) {
        replaceFormValues(form, initialForm);
    }
    syncGeneratedNameNoteTaRow(form);

    if (options.initialOpen === true) {
        options.onActivate();
    }

    let navboxRowsPrepared = hasPreparedNavboxRows(form);
    const queueCitationPrefetch = createCitationPrefetchQueue(options);

    Vue.watch(
        form,
        (currentForm) => {
            syncGeneratedNameNoteTaRow(currentForm);
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

        if (tab === "references") {
            refreshCitationRows();
        }
    });
    Vue.watch(previewOpen, (isOpen) => {
        if (isOpen) {
            queueSourceEditor("preview", previewTextArea, previewText);
        } else {
            destroySourceEditor("preview");
        }
    });
    Vue.watch(pageEditOpen, (isOpen) => {
        if (isOpen) {
            queueSourceEditor("pageEdit", pageEditTextArea, {
                get value() {
                    return pageEditState.text;
                },
                set value(text) {
                    pageEditState.text = text;
                },
            });
        } else {
            destroySourceEditor("pageEdit");
        }
    });

    if (typeof Vue.onBeforeUnmount === "function") {
        Vue.onBeforeUnmount(() => {
            for (const key of sourceEditors.keys()) {
                destroySourceEditor(key);
            }
        });
    }

    async function openPreSave() {
        await refreshReview({
            recheck: true,
        });
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
            preSaveMoveEnabled.value = false;
            preSaveMoveTitle.value =
                trimFieldValue(prepared.move?.to) || getCurrentTitle();
        } catch (error) {
            sourceFetchState.error = error.message || String(error);
        } finally {
            sourceFetchState.loading = false;
        }
    }

    window.createVgStubDialog = {
        open() {
            options.onActivate();
            openDialog(open);
        },
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
             * Gets the main dialog title.
             *
             * @returns {string} Main dialog title.
             */
            getDialogTitle() {
                return `Create a stub for ${getCurrentTitle()}`;
            },

            /**
             * Clears all form and helper data across every tab.
             *
             * @returns {void}
             */
            clearForm() {
                clearFormState();
            },

            /**
             * Opens an editable generated wikitext preview after review.
             *
             * @returns {Promise<void>} Resolves after preview text is ready.
             */
            async previewForm() {
                await refreshCitationRows();
                await refreshReview();
                options.onSubmitHistory(form, getCurrentTitle());
                historyEntries.value = options.getHistoryEntries();
                const preview = await options.onPreview(
                    form,
                    sourceFetchState,
                );

                if (preview == null) {
                    return;
                }

                previewText.value = preview.text || "";
                previewSummary.value = preview.summary || "";
                previewHtml.value = preview.html || "";
                previewSubmitted.value = false;
                previewOpen.value = true;
                queueSourceEditor("preview", previewTextArea, previewText);
            },

            /**
             * Refreshes the parsed HTML preview from the editable wikitext.
             *
             * @returns {Promise<void>} Resolves after parsed HTML is refreshed.
             */
            async refreshParsedPreview() {
                syncSourceEditorText("preview", previewText);
                sourceFetchState.error = "";
                sourceFetchState.loading = true;

                try {
                    previewHtml.value = await options.onParsePreview(
                        previewText.value,
                    );
                } catch (error) {
                    sourceFetchState.error = error.message || String(error);
                } finally {
                    sourceFetchState.loading = false;
                }
            },

            /**
             * Closes the editable preview dialog.
             *
             * @returns {void}
             */
            closePreviewDialog() {
                destroySourceEditor("preview");
                previewOpen.value = false;
            },

            /**
             * Opens pre-save checks for the edited preview text.
             *
             * @returns {Promise<void>} Resolves after checklist preparation.
             */
            async submitPreviewText() {
                syncSourceEditorText("preview", previewText);
                previewSubmitted.value = true;
                destroySourceEditor("preview");
                previewOpen.value = false;
                await openPreSave();
            },

            /**
             * Opens the editable preview before final submission.
             *
             * @returns {Promise<void>} Resolves after preview text is ready.
             */
            async submitForm() {
                await this.previewForm();
            },

            /**
             * Saves the article after confirming the pre-save fixes.
             *
             * @returns {Promise<void>} Resolves after save submission starts.
             */
            async confirmSubmit() {
                syncSourceEditorText("preview", previewText);
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

                const reviewedPreview = previewSubmitted.value
                    ? {
                          summary: previewSummary.value,
                          text: previewText.value,
                      }
                    : undefined;

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
                        registration: {
                            enabled: form.registerNewPage !== false,
                        },
                    },
                    reviewedPreview,
                );

                if (sourceFetchState.error === "") {
                    previewSubmitted.value = false;
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
             * Formats one history entry page label for display.
             *
             * @param {object} entry - History entry.
             * @returns {string} Display page label.
             */
            formatHistoryEntryPage(entry) {
                const page = trimFieldValue(entry.metadata?.page);

                if (entry.metadata?.temporary === true) {
                    return `${page || "Untitled"} (temporary draft)`;
                }

                return page || "(untitled)";
            },

            /**
             * Fills the current form from a history entry.
             *
             * @param {object} entry - History entry.
             * @returns {Promise<void>} Resolves after the restored form is refreshed.
             */
            async fillHistoryEntry(entry) {
                await restoreHistoryForm(getHistoryEntryForm(entry));
                await refreshCitationRows();
                await refreshReview();
                historyOpen.value = false;
            },

            /**
             * Opens an editable JSON representation of a history entry.
             *
             * @param {object} entry - History entry.
             * @returns {void}
             */
            openHistoryJsonDialog(entry) {
                historyJsonError.value = "";
                historyJsonEditable.value = entry.metadata?.temporary === true;
                historyJsonText.value = JSON.stringify(entry, null, 2);
                historyJsonOpen.value = true;
            },

            /**
             * Opens the history JSON dialog for importing values.
             *
             * @returns {void}
             */
            openHistoryImportDialog() {
                historyJsonError.value = "";
                historyJsonEditable.value = true;
                historyJsonText.value = "";
                historyJsonOpen.value = true;
            },

            /**
             * Closes the history JSON dialog.
             *
             * @returns {void}
             */
            closeHistoryJsonDialog() {
                historyJsonOpen.value = false;
            },

            /**
             * Imports form values from the history JSON dialog.
             *
             * @returns {void}
             */
            async importHistoryJson() {
                historyJsonError.value = "";

                try {
                    const data = JSON.parse(historyJsonText.value);
                    const importedForm = getHistoryEntryForm(data);

                    if (
                        importedForm == null ||
                        typeof importedForm !== "object" ||
                        Array.isArray(importedForm)
                    ) {
                        throw new Error(
                            "JSON must contain structured history data.",
                        );
                    }

                    await restoreHistoryForm(importedForm);
                    await refreshCitationRows();
                    await refreshReview();
                    historyJsonOpen.value = false;
                    historyOpen.value = false;
                } catch (error) {
                    historyJsonError.value = error.message || String(error);
                }
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
             * Updates the temporary draft row from current form values.
             *
             * @returns {void}
             */
            updateTemporaryHistoryEntry() {
                options.onFormChange(form);
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

                if (field.key === "series") {
                    navboxRowsPrepared = false;
                }

                markCategoryRowsUnfixed(form.categoryRows);
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
             * Updates one managed citation parameter value.
             *
             * @param {number} citationIndex - Citation row index.
             * @param {number} paramIndex - Parameter row index.
             * @param {string} field - Parameter field key.
             * @param {string} value - Raw input value.
             * @returns {void}
             */
            updateCitationParam(citationIndex, paramIndex, field, value) {
                const citation = form.citationRows[citationIndex];

                if (citation == null) {
                    return;
                }

                if (citation.params[paramIndex] == null) {
                    citation.params.push(createCitationParamRow());
                }

                citation.params[paramIndex][field] = trimFieldValue(value);
                citation.modified = true;
            },

            /**
             * Sorts one managed citation's parameters.
             *
             * @param {number} citationIndex - Citation row index.
             * @returns {void}
             */
            sortCitation(citationIndex) {
                const citation = form.citationRows[citationIndex];

                if (citation == null) {
                    return;
                }

                citation.params = sortManagedCitationParams(citation.params);
            },

            /**
             * Appends a blank parameter row to one managed citation.
             *
             * @param {number} citationIndex - Citation row index.
             * @returns {void}
             */
            addCitationParam(citationIndex) {
                const citation = form.citationRows[citationIndex];

                if (citation == null) {
                    return;
                }

                citation.params.push(createCitationParamRow());
                citation.modified = true;
            },

            /**
             * Removes one managed citation parameter row.
             *
             * @param {number} citationIndex - Citation row index.
             * @param {number} paramIndex - Parameter row index.
             * @returns {void}
             */
            removeCitationParam(citationIndex, paramIndex) {
                const citation = form.citationRows[citationIndex];

                if (citation == null) {
                    return;
                }

                citation.params.splice(paramIndex, 1);
                citation.modified = true;
            },

            /**
             * Resets one managed citation to its generated parameters.
             *
             * @param {number} citationIndex - Citation row index.
             * @returns {void}
             */
            resetCitation(citationIndex) {
                const citation = form.citationRows[citationIndex];

                if (citation == null) {
                    return;
                }

                citation.params = cloneValue(citation.generatedParams || []);
                citation.modified = false;
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
                markCategoryRowsUnfixed(form.categoryRows);
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
                markCategoryRowsUnfixed(form.categoryRows);
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
                syncGeneratedNameNoteTaRow(form);
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
                syncGeneratedNameNoteTaRow(form);
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
                        {
                            includeJapanese:
                                getOriginalNameLanguage(form) === "ja",
                        },
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
                    syncGeneratedNameNoteTaRow(form);
                }

                fetchedSteamNameRows.value = [];
            },

            /**
             * Clears all localized name rows.
             *
             * @param {string} key - Localized name group key.
             * @returns {void}
             */
            clearNameRows(key) {
                form[key] = [];
                syncGeneratedNameNoteTaRow(form);
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
                form.stubTagRows = null;
                await refreshCategoryRows({
                    bypassCache: true,
                    recheck: true,
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
             * Removes one category row.
             *
             * @param {number} index - Category row index.
             * @returns {void}
             */
            removeCategoryRow(index) {
                form.categoryRows.splice(index, 1);
            },

            /**
             * Appends a blank stub-tag row.
             *
             * @returns {void}
             */
            addStubTagRow() {
                ensureStubTagRows(form).push(createStubTagRow());
            },

            /**
             * Updates one stub-tag row.
             *
             * @param {number} index - Stub-tag row index.
             * @param {string} stubTag - Stub template name.
             * @returns {void}
             */
            updateStubTagRow(index, stubTag) {
                const row = ensureStubTagRows(form)[index];

                if (row != null) {
                    row.stubTag = trimStubTagValue(stubTag);
                }
            },

            /**
             * Removes one stub-tag row.
             *
             * @param {number} index - Stub-tag row index.
             * @returns {void}
             */
            removeStubTagRow(index) {
                ensureStubTagRows(form).splice(index, 1);
            },

            /**
             * Appends a blank redirect row.
             *
             * @returns {void}
             */
            addRedirectRow() {
                ensureRedirectRows(form).push(createRedirectRow());
            },

            /**
             * Updates one redirect row title from live input.
             *
             * @param {number} index - Redirect row index.
             * @param {string} value - Raw title input.
             * @returns {void}
             */
            updateRedirectRowTitle(index, value) {
                const row = form.redirectRows?.[index];

                if (row != null) {
                    setRedirectRowTitle(row, value);
                }
            },

            /**
             * Removes one redirect row.
             *
             * @param {number} index - Redirect row index.
             * @returns {void}
             */
            removeRedirectRow(index) {
                ensureRedirectRows(form).splice(index, 1);
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
             * Appends a blank NoteTA row.
             *
             * @returns {void}
             */
            addNoteTaRow() {
                ensureNoteTaRows(form).push(createNoteTaRow());
            },

            /**
             * Removes one NoteTA row.
             *
             * @param {number} index - NoteTA row index.
             * @returns {void}
             */
            removeNoteTaRow(index) {
                const rows = ensureNoteTaRows(form);
                const row = rows[index];

                if (row?.source === NOTE_TA_NAMES_SOURCE) {
                    form.noteTaNamesRemoved = true;
                }

                rows.splice(index, 1);
            },

            /**
             * Updates one NoteTA row key or value from live input.
             *
             * @param {number} index - NoteTA row index.
             * @param {string} field - Row field key.
             * @param {string} value - Raw input value.
             * @returns {void}
             */
            updateNoteTaRow(index, field, value) {
                const row = ensureNoteTaRows(form)[index];

                row[field] = trimFieldValue(value);

                if (row.source === NOTE_TA_NAMES_SOURCE) {
                    row.modified = true;
                }
            },

            /**
             * Sorts NoteTA rows by output source order.
             *
             * @returns {void}
             */
            sortNoteTaRows() {
                const rows = ensureNoteTaRows(form);

                rows.splice(0, rows.length, ...sortNoteTaEntries(rows));
            },

            /**
             * Rebuilds generated NoteTA rows and preserves manual extras.
             *
             * @returns {void}
             */
            regenerateNoteTaRows() {
                regenerateNoteTaRows(form);
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

                setNavboxRowText(row, navbox);
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
             * Refreshes generated redirect rows.
             *
             * @returns {Promise<void>} Resolves after redirect rows are refreshed.
             */
            async refreshRedirectRows() {
                await refreshRedirectRows();
            },

            /**
             * Checks the current redirect rows.
             *
             * @returns {Promise<void>} Resolves after redirect rows are fixed.
             */
            async checkRedirectRows() {
                await checkRedirectRows();
            },

            /**
             * Checks one edited redirect row after its textbox loses focus.
             *
             * @param {number} index - Redirect row index.
             * @param {Event} event - Text input blur event.
             * @returns {Promise<void>} Resolves after the row is fixed.
             */
            async checkRedirectRow(index, event) {
                const value = event?.target?.value;

                if (value != null && form.redirectRows?.[index] != null) {
                    setRedirectRowTitle(form.redirectRows[index], value);
                }

                await this.checkRedirectRows();
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
             * Opens an editable navbox template source preview.
             *
             * @param {object} row - Navbox review row.
             * @returns {Promise<void>} Resolves after the editor is ready.
             */
            async openNavboxEdit(row) {
                await openPageEdit({
                    create: row.status !== "OK",
                    kind: "navbox",
                    row,
                    title: `Template:${row.title}`,
                });
            },

            /**
             * Updates one category row title and its modified marker.
             *
             * @param {number} index - Category row index.
             * @param {string} category - New category title.
             * @returns {void}
             */
            updateCategoryRowCategory(index, category) {
                const current = form.categoryRows[index];

                form.categoryRows[index] = options.onUpdateCategoryRowCategory(
                    form.categoryRows[index],
                    trimFieldValue(category),
                );
                syncCategoryRowFixedState(form.categoryRows[index], current);
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
                const pendingCreation = row.pendingCreation;

                Object.assign(companyCategoryState, {
                    category: trimFieldValue(row.category),
                    company: trimFieldValue(row.company),
                    englishName: trimFieldValue(pendingCreation?.englishName),
                    error: "",
                    loading: false,
                    pending: pendingCreation != null,
                    text: String(pendingCreation?.text || ""),
                    wikidataId: trimFieldValue(pendingCreation?.wikidataId),
                });
                companyCategoryLookupLoading.value = false;
                companyCategoryOpen.value = true;

                if (pendingCreation != null) {
                    return;
                }

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
             * Cancels the staged category creation.
             *
             * @returns {void}
             */
            cancelCompanyCategoryCreation() {
                const row = form.categoryRows.find(
                    (item) =>
                        trimFieldValue(item.category) ===
                        companyCategoryState.category,
                );

                if (row == null || row.pendingCreation == null) {
                    return;
                }

                row.status = row.pendingCreation.previousStatus || "";
                delete row.pendingCreation;
                companyCategoryOpen.value = false;
            },

            /**
             * Stages the category for creation after the article is saved.
             *
             * @returns {Promise<void>} Resolves after the category is staged.
             */
            async saveCompanyCategory() {
                companyCategoryState.error = "";
                companyCategoryState.loading = true;

                try {
                    const row = form.categoryRows.find(
                        (item) =>
                            trimFieldValue(item.category) ===
                            companyCategoryState.category,
                    );

                    if (row == null) {
                        throw new Error("Category row is unavailable.");
                    }

                    row.pendingCreation = {
                        englishName: trimFieldValue(
                            companyCategoryState.englishName,
                        ),
                        previousStatus:
                            row.pendingCreation?.previousStatus || row.status,
                        text: companyCategoryState.text,
                        wikidataId: trimFieldValue(
                            companyCategoryState.wikidataId,
                        ),
                    };
                    row.enabled = true;
                    row.status = "Pending creation";
                    companyCategoryOpen.value = false;
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
             * Refreshes metadata for the company-category English title.
             *
             * @returns {Promise<void>} Resolves after lookup state is updated.
             */
            async refreshCompanyCategoryMetadata() {
                await refreshCompanyCategoryMetadata();
            },

            /**
             * Gets the Wikidata URL for the staged company category.
             *
             * @returns {string} Wikidata entity URL.
             */
            getCompanyCategoryWikidataUrl() {
                const id = trimFieldValue(companyCategoryState.wikidataId);

                return id === ""
                    ? ""
                    : `https://www.wikidata.org/wiki/${encodeURIComponent(id)}`;
            },

            /**
             * Checks whether a category row can be created.
             *
             * @param {object} row - Category review row.
             * @returns {boolean} Whether the category editor should be shown.
             */
            canCreateCategory(row) {
                return (
                    trimFieldValue(row.category) !== "" &&
                    row.status !== "OK" &&
                    row.pendingCreation == null
                );
            },

            /**
             * Opens an editable category source preview.
             *
             * @param {object} row - Category review row.
             * @returns {Promise<void>} Resolves after the editor is ready.
             */
            async openCategoryEdit(row) {
                const category = trimFieldValue(row.category);

                await openPageEdit({
                    create: row.status !== "OK",
                    kind: "category",
                    row,
                    title: `Category:${category}`,
                });
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
             * Refreshes the edited page source preview.
             *
             * @returns {Promise<void>} Resolves after the preview is refreshed.
             */
            async refreshPageEditPreview() {
                syncSourceEditorText("pageEdit", {
                    get value() {
                        return pageEditState.text;
                    },
                    set value(text) {
                        pageEditState.text = text;
                    },
                });
                pageEditState.error = "";
                pageEditState.loading = true;

                try {
                    pageEditState.html = await options.onParsePreview(
                        pageEditState.text,
                        pageEditState.title,
                    );
                } catch (error) {
                    pageEditState.error = error.message || String(error);
                } finally {
                    pageEditState.loading = false;
                }
            },

            /**
             * Closes the page edit dialog without staging changes.
             *
             * @returns {void}
             */
            closePageEditDialog() {
                destroySourceEditor("pageEdit");
                pageEditOpen.value = false;
            },

            /**
             * Cancels staged source changes for the current review row.
             *
             * @returns {void}
             */
            resetPageEdit() {
                resetPageEdit();
            },

            /**
             * Stages the edited page source for final submission.
             *
             * @returns {void}
             */
            stagePageEdit() {
                syncSourceEditorText("pageEdit", {
                    get value() {
                        return pageEditState.text;
                    },
                    set value(text) {
                        pageEditState.text = text;
                    },
                });
                stagePageEdit();
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
             * Formats a category row source tooltip.
             *
             * @param {string} source - Category row source.
             * @returns {string} Source tooltip.
             */
            formatCategorySourceTitle(source) {
                return formatCategorySourceTitle(source);
            },

            /**
             * Formats a stub template name for display.
             *
             * @param {string} stubTag - Stub template name.
             * @returns {string} Template call label.
             */
            formatStubTagLabel(stubTag) {
                return `{{${trimStubTagValue(stubTag)}}}`;
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
                        "Pending creation": "Pending",
                        "Pending edit": "Pending",
                    }[status] || "Unchecked"
                );
            },

            /**
             * Formats a redirect existence status as a compact badge.
             *
             * @param {string} status - Redirect existence status.
             * @returns {string} Compact status label.
             */
            formatRedirectStatusLabel(status) {
                return (
                    {
                        Exists: "Exists",
                        Missing: "New",
                    }[status] || "Unchecked"
                );
            },

            /**
             * Opens an existing redirect page in the viewer dialog.
             *
             * @param {object} row - Redirect review row.
             * @returns {void}
             */
            openRedirectView(row) {
                const title = trimFieldValue(row.title);

                openPageView(title, options.getPageUrl(title));
            },

            /**
             * Gets the current generated prose length.
             *
             * @returns {number} Hanzi-equivalent sinograph count.
             */
            getProseSinographs() {
                return options.getProseSinographs(form);
            },

            /**
             * Gets the current generated prose wikitext.
             *
             * @returns {string} Generated prose wikitext.
             */
            getProseWikitext() {
                return options.getProseWikitext(form);
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
                pageEditOpen,
                pageEditState,
                pageEditTextArea,
                citationState,
                companyCategoryOpen,
                companyCategoryLookupLoading,
                companyCategoryState,
                groups: ARTICLE_PARAMETER_GROUPS,
                form,
                fetchedSteamNameRows,
                getSteamNameSuggestions,
                getCitationParamRows,
                getArticleField,
                getArticlePreviewTitle,
                getFieldPlaceholder: options.getFieldPlaceholder.bind(
                    null,
                    form,
                ),
                getFieldPreview,
                getEnwikiTipLinks,
                getWikidataText,
                historyEntries,
                historyJsonEditable,
                historyJsonError,
                historyJsonOpen,
                historyJsonText,
                historyOpen,
                moveOpen,
                moveTarget,
                nameMarkets: NAME_MARKETS,
                open,
                reviewState,
                preSaveMoveEnabled,
                preSaveMoveTitle,
                preSaveOpen,
                preSaveActions,
                preSaveGroups,
                previewOpen,
                previewText,
                previewSummary,
                previewHtml,
                previewSubmitted,
                previewTextArea,
                sourceFetchState,
                steamNameButtons: STEAM_NAME_BUTTONS,
                steamUrl,
                stubTagRows,
            };
        },
        template: createDialogTemplate(),
    };

    /**
     * Queues source editor initialization after Vue has rendered the textarea.
     *
     * @param {string} key - Editor instance key.
     * @param {object} textareaRef - Vue template ref.
     * @param {object} textRef - Mutable text ref.
     * @returns {void}
     */
    function queueSourceEditor(key, textareaRef, textRef) {
        if (typeof Vue.nextTick === "function") {
            Vue.nextTick(() =>
                initializeSourceEditor(key, textareaRef, textRef),
            );
            return;
        }

        initializeSourceEditor(key, textareaRef, textRef);
    }

    /**
     * Initializes MediaWiki CodeMirror for a source textarea when available.
     *
     * @param {string} key - Editor instance key.
     * @param {object} textareaRef - Vue template ref.
     * @param {object} textRef - Mutable text ref.
     * @returns {Promise<void>} Resolves after enhancement attempt.
     */
    async function initializeSourceEditor(key, textareaRef, textRef) {
        const textarea = findTextareaElement(textareaRef.value);

        if (
            textarea == null ||
            sourceEditors.has(key) ||
            sourceEditorLoads.has(key)
        ) {
            return;
        }

        textarea.value = textRef.value;
        sourceEditorLoads.add(key);

        try {
            const loader = getCodeMirrorLoader();

            if (loader == null) {
                return;
            }

            const require = await loader.using(CODEMIRROR_MODULES);
            const CodeMirror = require("ext.CodeMirror");
            const mediawiki = require("ext.CodeMirror.mode.mediawiki");
            const editor = new CodeMirror(textarea, mediawiki());

            if (typeof editor.initialize === "function") {
                editor.initialize();
            }

            sourceEditors.set(key, {
                editor,
                textRef,
                textarea,
            });
        } catch (_error) {
            sourceEditors.delete(key);
        } finally {
            sourceEditorLoads.delete(key);
        }
    }

    /**
     * Destroys one source editor instance.
     *
     * @param {string} key - Editor instance key.
     * @returns {void}
     */
    function destroySourceEditor(key) {
        const state = sourceEditors.get(key);

        if (state == null) {
            return;
        }

        syncSourceEditorText(key);

        if (typeof state.editor.destroy === "function") {
            state.editor.destroy();
        } else if (typeof state.editor.toTextArea === "function") {
            state.editor.toTextArea();
        }

        sourceEditors.delete(key);
    }

    /**
     * Copies the live editor text into a Vue ref.
     *
     * @param {string} key - Editor instance key.
     * @param {object} [textRef] - Mutable text ref.
     * @returns {void}
     */
    function syncSourceEditorText(key, textRef) {
        const state = sourceEditors.get(key);

        if (state == null) {
            return;
        }

        const text = getCodeMirrorText(state.editor, state.textarea);

        const target = textRef || state.textRef;

        if (target != null) {
            target.value = text;
        }
    }

    /**
     * Pushes refreshed source text into an existing editor instance.
     *
     * @param {string} key - Editor instance key.
     * @param {string} text - Source text.
     * @returns {void}
     */
    function setSourceEditorText(key, text) {
        const state = sourceEditors.get(key);

        if (state == null) {
            return;
        }

        setCodeMirrorText(state.editor, state.textarea, text);
    }

    /**
     * Refreshes category rows through the owning module.
     *
     * @returns {Promise<void>} Resolves after rows are refreshed.
     */
    async function refreshCategoryRows(refreshOptions = {}) {
        if (
            shouldSkipFixedRows(
                refreshOptions,
                form.categoryRows,
                isCategoryRowFixed,
            )
        ) {
            return;
        }

        await options.onCategoryRowsRefresh(
            form,
            categoryState,
            refreshOptions,
        );
        applyCategoryPatches(
            form.categoryRows,
            form.historyPatches?.categories,
        );
        markCategoryRowsFixed(form.categoryRows);
        initializeStubTagRows(form);
    }

    /**
     * Refreshes categories and generated review details.
     *
     * @returns {Promise<void>} Resolves after review data is refreshed.
     */
    async function refreshReview(refreshOptions = {}) {
        reviewState.error = "";
        reviewState.loading = true;

        try {
            const categoryRefreshOptions =
                refreshOptions.recheck === true
                    ? {
                          ...refreshOptions,
                          bypassCache: true,
                      }
                    : refreshOptions;

            await Promise.all([
                refreshCategoryRows(categoryRefreshOptions),
                refreshRedirectRows(refreshOptions),
                refreshNavboxRows(
                    refreshOptions.recheck === true,
                    false,
                    refreshOptions,
                ),
            ]);
        } catch (error) {
            reviewState.error = error.message || String(error);
        } finally {
            reviewState.loading = false;
        }
    }

    /**
     * Refreshes editable citation rows from the current source URLs.
     *
     * @returns {Promise<void>} Resolves after citation rows are ready.
     */
    async function refreshCitationRows() {
        if (options.onPrepareCitations == null) {
            return;
        }

        citationState.error = "";
        citationState.loading = true;
        sourceFetchState.error = "";
        sourceFetchState.loading = true;

        try {
            const rows = await options.onPrepareCitations(form);
            const patchedRows = applyCitationPatches(
                rows.map(createCitationRow),
                form.historyPatches?.citations,
            );

            form.citationRows.splice(
                0,
                form.citationRows.length,
                ...patchedRows,
            );
        } catch (error) {
            citationState.error = error.message || String(error);
            sourceFetchState.error = citationState.error;
        } finally {
            citationState.loading = false;
            sourceFetchState.loading = false;
        }
    }

    /**
     * Generates navbox rows when needed or explicitly requested.
     *
     * @param {boolean} force - Whether to replace reviewed rows.
     * @returns {Promise<void>} Resolves after navbox rows are refreshed.
     */
    async function refreshNavboxRows(
        force,
        rebuild = false,
        refreshOptions = {},
    ) {
        if (!force && navboxRowsPrepared) {
            return;
        }

        if (
            force &&
            !rebuild &&
            shouldSkipFixedRows(
                refreshOptions,
                form.navboxRows,
                isNavboxRowFixed,
            )
        ) {
            navboxRowsPrepared = true;
            return;
        }

        const rows = applyNavboxPatches(
            (await options.onPrepareReview(form, rebuild)).map((row) =>
                createNavboxRow(row, true),
            ),
            form.historyPatches?.navboxes,
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
     * Refreshes generated redirect review rows.
     *
     * @returns {Promise<void>} Resolves after redirect rows are refreshed.
     */
    async function refreshRedirectRows(refreshOptions = {}) {
        if (options.onPrepareRedirectRows == null) {
            return;
        }

        if (Array.isArray(form.redirectRows)) {
            await checkRedirectRows(refreshOptions);
            return;
        }

        const currentRows = Array.isArray(form.redirectRows)
            ? form.redirectRows
            : [];
        const rows = (
            await options.onPrepareRedirectRows(form, getCurrentTitle())
        ).map((row) => createRedirectRow(row, true));

        form.redirectRows = rows.map((row) => {
            const current = currentRows.find(
                (item) =>
                    normalizeTitleKey(item.title) ===
                    normalizeTitleKey(row.title),
            );

            if (current == null) {
                return row;
            }

            row.enabled = !row.exists;
            return row;
        });
    }

    /**
     * Checks current redirect review rows in place.
     *
     * @returns {Promise<void>} Resolves after redirect rows are fixed.
     */
    async function checkRedirectRows(refreshOptions = {}) {
        if (options.onCheckRedirectRows == null) {
            return;
        }

        const currentRows = Array.isArray(form.redirectRows)
            ? form.redirectRows
            : [];

        if (
            shouldSkipFixedRows(
                refreshOptions,
                currentRows,
                isRedirectRowFixed,
            )
        ) {
            return;
        }

        const rows = (
            await options.onCheckRedirectRows(currentRows, getCurrentTitle())
        ).map((row) => createRedirectRow(row, true));

        form.redirectRows = rows.map((row, index) => {
            const current = currentRows[index];

            if (current == null) {
                return row;
            }

            row.enabled = !row.exists;
            return row;
        });
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
     * Opens a source editor for a page action staged at final submit.
     *
     * @param {object} params - Page edit parameters.
     * @param {boolean} params.create - Whether the page is missing.
     * @param {string} params.kind - Edited row kind.
     * @param {object} params.row - Review row to update.
     * @param {string} params.title - Full page title.
     * @returns {Promise<void>} Resolves after the editor is populated.
     */
    async function openPageEdit(params) {
        Object.assign(pageEditState, {
            create: params.create,
            company:
                params.kind === "category"
                    ? trimFieldValue(params.row.company)
                    : "",
            englishName: trimFieldValue(
                params.row.pendingCreation?.englishName,
            ),
            error: "",
            html: "",
            kind: params.kind,
            loading: true,
            pending: params.row.pendingEdit != null,
            previousStatus:
                params.row.pendingEdit?.previousStatus || params.row.status,
            row: params.row,
            text: "",
            title: params.title,
        });
        pageEditOpen.value = true;
        queueSourceEditor("pageEdit", pageEditTextArea, {
            get value() {
                return pageEditState.text;
            },
            set value(text) {
                pageEditState.text = text;
            },
        });

        try {
            pageEditState.text =
                getStagedPageText(params.row, params.kind) ??
                (params.create
                    ? await getNewPageEditText(params)
                    : await options.onFetchPageText(params.title));
            setSourceEditorText("pageEdit", pageEditState.text);
            pageEditState.html = await options.onParsePreview(
                pageEditState.text,
                params.title,
            );
        } catch (error) {
            pageEditState.error = error.message || String(error);
        } finally {
            pageEditState.loading = false;
        }
    }

    /**
     * Gets already staged source text for a review row.
     *
     * @param {object} row - Review row.
     * @param {string} kind - Review row kind.
     * @returns {string|undefined} Staged source text.
     */
    function getStagedPageText(row, kind) {
        if (kind === "category" && row.pendingCreation != null) {
            return String(row.pendingCreation.text || "");
        }

        if (row.pendingEdit != null) {
            return String(row.pendingEdit.text || "");
        }

        return undefined;
    }

    /**
     * Gets the initial source for a missing page.
     *
     * @param {object} params - Page edit parameters.
     * @returns {Promise<string>} Initial source text.
     */
    async function getNewPageEditText(params) {
        if (
            params.kind === "category" &&
            trimFieldValue(params.row.company) !== ""
        ) {
            return options.onPrepareCompanyCategory(params.row);
        }

        return "";
    }

    /**
     * Stages the current page edit for the final submit.
     *
     * @returns {void}
     */
    function stagePageEdit() {
        const row = pageEditState.row;

        if (row == null) {
            return;
        }

        if (pageEditState.kind === "category" && pageEditState.create) {
            row.pendingCreation = {
                englishName: trimFieldValue(pageEditState.englishName),
                previousStatus:
                    row.pendingCreation?.previousStatus || row.status,
                text: pageEditState.text,
            };
            row.enabled = true;
            row.status = "Pending creation";
            destroySourceEditor("pageEdit");
            pageEditOpen.value = false;
            return;
        }

        row.pendingEdit = {
            create: pageEditState.create,
            previousStatus:
                row.pendingEdit?.previousStatus ||
                pageEditState.previousStatus,
            summary: buildPageEditSummary(pageEditState),
            text: pageEditState.text,
            title: pageEditState.title,
        };
        row.enabled = true;
        row.status = pageEditState.create
            ? "Pending creation"
            : "Pending edit";
        destroySourceEditor("pageEdit");
        pageEditOpen.value = false;
    }

    /**
     * Cancels staged source changes for the current review row.
     *
     * @returns {void}
     */
    function resetPageEdit() {
        const row = pageEditState.row;

        if (row == null || row.pendingEdit == null) {
            return;
        }

        row.status =
            row.pendingEdit.previousStatus || pageEditState.previousStatus;
        delete row.pendingEdit;
        destroySourceEditor("pageEdit");
        pageEditOpen.value = false;
    }

    /**
     * Builds the edit summary for one staged page edit.
     *
     * @param {object} state - Page edit state.
     * @returns {string} Edit summary text.
     */
    function buildPageEditSummary(state) {
        const action = state.create ? "create" : "modify";
        const suffix =
            state.kind === "navbox"
                ? `, with link to '[[${currentTitle}]]'`
                : "";

        return `${action} '${state.title}'${suffix}`;
    }

    /**
     * Gets the current page title.
     *
     * @returns {string} Current page title.
     */
    function getCurrentTitle() {
        return currentTitle;
    }

    /**
     * Gets the editable article preview dialog title.
     *
     * @returns {string} Preview dialog title.
     */
    function getArticlePreviewTitle() {
        return `Create '${getCurrentTitle()}'`;
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
     * Gets external links discovered from the English Wikipedia title.
     *
     * @returns {Array<object>} Tip link definitions.
     */
    function getEnwikiTipLinks() {
        if (enwikiLookupLoading.value) {
            return createEnwikiTipPlaceholders("checking...");
        }

        const title = getBasePageTitle(form.enwikiTitle);

        return [
            {
                label: "Wikidata",
                value: form.wikidataId
                    ? form.wikidataId
                    : getWikidataLookupStatus(enwikiMetadata.pageExists),
                url: form.wikidataId
                    ? `https://www.wikidata.org/wiki/${encodeURIComponent(form.wikidataId)}`
                    : title
                      ? buildWikidataSearchUrl(title)
                      : "",
            },
            {
                label: "Metacritic",
                value: enwikiMetadata.metacriticId
                    ? enwikiMetadata.metacriticId
                    : title
                      ? "search"
                      : "not found",
                url: enwikiMetadata.metacriticId
                    ? buildMetacriticUrl(enwikiMetadata.metacriticId)
                    : title
                      ? buildMetacriticSearchUrl(title)
                      : "",
            },
            {
                label: "OpenCritic",
                value: enwikiMetadata.openCriticId
                    ? enwikiMetadata.openCriticId
                    : title
                      ? "search"
                      : "not found",
                url: enwikiMetadata.openCriticId
                    ? buildOpenCriticUrl(enwikiMetadata.openCriticId)
                    : title
                      ? buildOpenCriticSearchUrl(title)
                      : "",
            },
            {
                label: "Steam",
                value: enwikiMetadata.steamId
                    ? enwikiMetadata.steamId
                    : title
                      ? "search"
                      : "not found",
                url: enwikiMetadata.steamId
                    ? buildSteamUrl(enwikiMetadata.steamId)
                    : title
                      ? buildSteamSearchUrl(title)
                      : "",
            },
        ];
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
        enwikiLookupLoading.value =
            title !== "" && options.onEnwikiTitleChange != null;
        form.wikidataId = "";
        Object.assign(enwikiMetadata, createBlankEnwikiMetadata());

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

        Object.assign(enwikiMetadata, {
            metacriticId: trimFieldValue(metadata.metacriticId),
            openCriticId: trimFieldValue(metadata.openCriticId),
            pageExists:
                metadata.pageExists === true || metadata.pageExists === false
                    ? metadata.pageExists
                    : null,
            steamId: trimFieldValue(metadata.steamId),
        });
        form.wikidataId = trimFieldValue(metadata.wikidataId);

        if (trimFieldValue(form.englishName) === "") {
            form.englishName = getBasePageTitle(metadata.title);
        }

        if (
            trimFieldValue(form.metacriticScoreSourceUrl) === "" &&
            enwikiMetadata.metacriticId
        ) {
            form.metacriticScoreSourceUrl = buildMetacriticUrl(
                enwikiMetadata.metacriticId,
            );
        }

        if (
            trimFieldValue(form.openCriticRecommendSourceUrl) === "" &&
            enwikiMetadata.openCriticId
        ) {
            form.openCriticRecommendSourceUrl = buildOpenCriticUrl(
                enwikiMetadata.openCriticId,
            );
        }

        if (trimFieldValue(steamUrl.value) === "" && enwikiMetadata.steamId) {
            steamUrl.value = buildSteamUrl(enwikiMetadata.steamId);
        }

        enwikiLookupLoading.value = false;
    }

    /**
     * Refreshes Wikidata metadata for the company-category English title.
     *
     * @returns {Promise<void>} Resolves after lookup state is updated.
     */
    async function refreshCompanyCategoryMetadata() {
        const title = normalizeEnglishCategoryTitle(
            companyCategoryState.englishName,
        );
        const serial = companyCategoryLookupSerial.value + 1;

        companyCategoryLookupSerial.value = serial;
        companyCategoryState.wikidataId = "";
        companyCategoryLookupLoading.value =
            title !== "" && options.onEnwikiTitleChange != null;

        if (title === "" || options.onEnwikiTitleChange == null) {
            return;
        }

        let metadata;

        try {
            metadata = await options.onEnwikiTitleChange(title);
        } catch (_error) {
            metadata = {};
        }

        if (serial !== companyCategoryLookupSerial.value) {
            return;
        }

        companyCategoryState.wikidataId = trimFieldValue(metadata.wikidataId);
        companyCategoryLookupLoading.value = false;
    }

    /**
     * Restores form values from history and refreshes enwiki metadata.
     *
     * @param {object} values - Restored form values.
     * @returns {Promise<void>} Resolves after enwiki metadata is refreshed.
     */
    async function restoreHistoryForm(values) {
        enwikiLookupSerial.value += 1;
        enwikiLookupLoading.value = false;
        clearFormState();
        replaceFormValues(form, values);
        syncGeneratedNameNoteTaRow(form);
        navboxRowsPrepared = false;
        await refreshEnwikiMetadata();
    }

    /**
     * Clears form values and helper state.
     *
     * @returns {void}
     */
    function clearFormState() {
        replaceFormValues(form, {
            ...createFormValues(""),
            publishers: "",
        });
        syncGeneratedNameNoteTaRow(form);
        activeTab.value = ARTICLE_PARAMETER_GROUPS[0].key;
        fetchedSteamNameRows.value = [];
        steamUrl.value = "";
        Object.assign(enwikiMetadata, createBlankEnwikiMetadata());
        categoryState.error = "";
        citationState.error = "";
        reviewState.error = "";
        sourceFetchState.error = "";
        navboxRowsPrepared = false;
        form.redirectRows = null;
    }
}

/**
 * Formats a category row source as a compact badge label.
 *
 * @param {string} source - Category row source.
 * @returns {string} Compact source label.
 */
function formatCategorySourceLabel(source) {
    const { label, modified } = getCategorySourceDisplay(source);

    return modified ? `${label}†` : label;
}

/**
 * Formats a category row source tooltip.
 *
 * @param {string} source - Category row source.
 * @returns {string} Source tooltip.
 */
function formatCategorySourceTitle(source) {
    const { label, modified } = getCategorySourceDisplay(source);

    return modified ? `${label} (modified)` : label;
}

/**
 * Gets display metadata for a category source.
 *
 * @param {string} source - Category row source.
 * @returns {object} Source display metadata.
 */
function getCategorySourceDisplay(source) {
    const value = String(source || "").trim();
    const modified = value.endsWith("†");
    const base = modified ? value.replace(/\s*†$/u, "") : value;
    const labels = {
        found: "Found",
        known: "Known",
        manual: "Manual",
        suggested: "Suggested",
    };
    const label = labels[base] || base;

    return {
        label,
        modified,
    };
}

/**
 * Normalizes an English Wikipedia category title.
 *
 * @param {string} title - User-entered English category name.
 * @returns {string} Canonical English category title, or an empty string.
 */
function normalizeEnglishCategoryTitle(title) {
    const value = trimFieldValue(title);

    if (value === "") {
        return "";
    }

    return /^Category:/iu.test(value) ? value : `Category:${value}`;
}

/**
 * Initializes editable stub-tag rows from generated category metadata.
 *
 * @param {object} form - Dialog form values.
 * @returns {void}
 */
function initializeStubTagRows(form) {
    if (form.stubTagRows != null) {
        return;
    }

    form.stubTagRows = buildStubTagRowsFromCategories(form.categoryRows);
}

/**
 * Builds unique stub-tag rows from category rows.
 *
 * @param {Array<object>} rows - Category review rows.
 * @returns {Array<object>} Stub-tag review rows.
 */
function buildStubTagRowsFromCategories(rows) {
    const tags = [];

    (rows || []).forEach((row) => {
        const stubTag = trimStubTagValue(row.stubTag);

        if (stubTag !== "" && !tags.includes(stubTag)) {
            tags.push(stubTag);
        }
    });

    return tags.map((stubTag) =>
        createStubTagRow({
            enabled: (rows || []).some(
                (row) =>
                    trimStubTagValue(row.stubTag) === stubTag &&
                    row.stubTagEnabled === true,
            ),
            originalEnabled: (rows || []).some(
                (row) =>
                    trimStubTagValue(row.stubTag) === stubTag &&
                    row.originalStubTagEnabled === true,
            ),
            originalStubTag: stubTag,
            stubTag,
        }),
    );
}

/**
 * Ensures the form has editable stub-tag rows.
 *
 * @param {object} form - Dialog form values.
 * @returns {Array<object>} Stub-tag rows.
 */
function ensureStubTagRows(form) {
    if (!Array.isArray(form.stubTagRows)) {
        form.stubTagRows = [];
    }

    return form.stubTagRows;
}

/**
 * Creates one stub-tag review row.
 *
 * @param {*} [value] - Existing row or template name.
 * @returns {object} Stub-tag review row.
 */
function createStubTagRow(value = "") {
    const stubTag = trimStubTagValue(value?.stubTag ?? value);

    return {
        enabled: value?.enabled !== false,
        originalEnabled: value?.originalEnabled === true,
        originalStubTag: trimStubTagValue(value?.originalStubTag || stubTag),
        stubTag,
    };
}

/**
 * Normalizes a stub template name entered by the user.
 *
 * @param {*} value - Stub template name.
 * @returns {string} Template name without braces.
 */
function trimStubTagValue(value) {
    return trimFieldValue(value)
        .replace(/^\{\{/u, "")
        .replace(/\}\}$/u, "")
        .trim();
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
        createCategoryViewDialogTemplate(),
        createPageEditDialogTemplate(),
        createMoveDialogTemplate(),
        createPreviewDialogTemplate(),
        createHistoryDialogTemplate(),
        createHistoryJsonDialogTemplate(),
    ]);
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
                            [createText("Done")],
                        ),
                    ]),
                ],
            ),
        ],
    );
}

/**
 * Creates the category editor dialog.
 *
 * @returns {object} Company category dialog template node.
 */
function createCompanyCategoryDialogTemplate() {
    return createElement(
        "cdx-dialog",
        {
            "v-bind:title":
                "(companyCategoryState.pending ? 'Modify ' : 'Create ') + '\\'Category:' + companyCategoryState.category + '\\''",
            "v-model:open": "companyCategoryOpen",
        },
        [
            createElement(
                "label",
                {
                    "v-if": "companyCategoryState.company",
                    style: {
                        display: "block",
                        marginBottom: "0.75em",
                    },
                },
                [
                    createElement(
                        "span",
                        {
                            style: {
                                display: "block",
                                marginBottom: "0.25em",
                            },
                        },
                        [createText("English Wikipedia category")],
                    ),
                    createElement("cdx-text-input", {
                        placeholder: "e.g. Private Division games",
                        "v-bind:disabled": "companyCategoryState.loading",
                        "v-on:blur": "refreshCompanyCategoryMetadata",
                        "v-model": "companyCategoryState.englishName",
                    }),
                    createElement(
                        "p",
                        {
                            "v-if": "companyCategoryLookupLoading",
                            style: {
                                margin: "0.25em 0 0",
                            },
                        },
                        [createText("checking Wikidata...")],
                    ),
                    createElement(
                        "p",
                        {
                            "v-else-if": "companyCategoryState.wikidataId",
                            style: {
                                margin: "0.25em 0 0",
                            },
                        },
                        [
                            createElement(
                                "a",
                                {
                                    "v-bind:href":
                                        "getCompanyCategoryWikidataUrl()",
                                    target: "_blank",
                                },
                                [
                                    createText(
                                        "{{ companyCategoryState.wikidataId }}",
                                    ),
                                ],
                            ),
                        ],
                    ),
                ],
            ),
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
                                action: "destructive",
                                "v-bind:disabled":
                                    "companyCategoryState.loading",
                                "v-if": "companyCategoryState.pending",
                                "v-on:click": "cancelCompanyCategoryCreation",
                            },
                            [createText("Delete")],
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
 * Groups pre-save fixes by the page they will edit.
 *
 * @param {Array<object>} actions - Prepared pre-save action rows.
 * @param {object} form - Dialog form state.
 * @returns {Array<object>} Page-grouped pre-save rows.
 */
export function createPreSaveGroups(actions, form) {
    const groups = [];
    const byTitle = new Map();
    const actionRows = Array.isArray(actions) ? actions : [];

    for (const action of actionRows) {
        const title = getPreSaveActionPageTitle(action);

        if (title === "") {
            continue;
        }

        const group = getPreSaveGroup(title);

        group.rows.push({
            action,
            key: action.id,
            label: getPreSaveActionDisplayLabel(action),
            type: "action",
        });

        for (const note of getPreSaveActionNotes(action)) {
            group.rows.push({
                action,
                key: `${action.id}:${note.key}`,
                label: note.label,
                type: "bundled-action",
            });
        }
    }

    const articleTitle = getPreSaveRegistrationArticleTitle(actionRows);

    if (articleTitle !== "") {
        getPreSaveGroup(articleTitle).rows.push({
            key: "register-new-page",
            label: "Register on WikiProject Video games' new-page list",
            type: "registration",
        });
    }

    for (const action of actionRows.filter(isCompanyCategoryPreSaveAction)) {
        const title = getPreSaveActionPageTitle(action);

        if (title === "") {
            continue;
        }

        getPreSaveGroup(title).rows.push({
            key: `${action.id}:register-new-page`,
            label: "Register on WikiProject Video games' new-page list",
            type: "registration",
        });
    }

    return groups.filter((group) => group.rows.length > 0);

    function getPreSaveGroup(title) {
        const normalizedTitle = trimFieldValue(title);

        if (!byTitle.has(normalizedTitle)) {
            const group = {
                key: normalizedTitle,
                title: normalizedTitle,
                rows: [],
            };

            byTitle.set(normalizedTitle, group);
            groups.push(group);
        }

        return byTitle.get(normalizedTitle);
    }
}

/**
 * Gets the display page title for a pre-save action.
 *
 * @param {object} action - Pre-save action row.
 * @returns {string} Page title.
 */
function getPreSaveActionPageTitle(action) {
    return trimFieldValue(
        action?.pageTitle ||
            action?.redirectTitle ||
            (action?.type === "category" ? `Category:${action.category}` : ""),
    );
}

/**
 * Gets the short display label for a pre-save action.
 *
 * @param {object} action - Pre-save action row.
 * @returns {string} Display label.
 */
function getPreSaveActionDisplayLabel(action) {
    return (
        trimFieldValue(action?.displayLabel) || trimFieldValue(action?.label)
    );
}

/**
 * Gets non-selectable notes for bundled work inside a pre-save action.
 *
 * @param {object} action - Pre-save action row.
 * @returns {Array<object>} Display notes.
 */
function getPreSaveActionNotes(action) {
    if (action?.type !== "category" || trimFieldValue(action.company) === "") {
        return [];
    }

    const category = trimFieldValue(action.category);
    const notes = [
        {
            key: "talk-banner",
            label: `Tagging {{WikiProject Video games}} to [[Category talk:${category}]]`,
        },
    ];

    if (trimFieldValue(action.englishName) !== "") {
        notes.unshift({
            key: "wikidata",
            label: "Connect to matching Wikidata item",
        });
    }

    return notes;
}

/**
 * Gets the article page that will be added to the new-page list.
 *
 * @param {Array<object>} actions - Prepared pre-save action rows.
 * @returns {string} Article title.
 */
function getPreSaveRegistrationArticleTitle(actions) {
    const action =
        actions.find((item) => item.type === "talk-banner") ||
        actions.find((item) => item.type === "interwiki") ||
        actions.find((item) => item.type !== "redirect");

    return getPreSaveActionPageTitle(action);
}

/**
 * Checks whether an action creates a company category.
 *
 * @param {object} action - Pre-save action row.
 * @returns {boolean} Whether the action creates a company category.
 */
function isCompanyCategoryPreSaveAction(action) {
    return (
        action?.type === "category" && trimFieldValue(action.company) !== ""
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
                    "Choose fixes to run after the article is submitted.",
                ),
            ]),
            createElement(
                "div",
                {
                    class: "create-vg-stub-pre-save-groups",
                },
                [
                    createElement(
                        "section",
                        {
                            class: "create-vg-stub-pre-save-page",
                            "v-bind:key": "group.key",
                            "v-for": "group in preSaveGroups",
                        },
                        [
                            createElement(
                                "div",
                                {
                                    class: "create-vg-stub-pre-save-title",
                                },
                                [createText("{{ group.title }}")],
                            ),
                            createElement(
                                "ul",
                                {
                                    class: "create-vg-stub-pre-save-list",
                                },
                                [
                                    createElement(
                                        "li",
                                        {
                                            class: "create-vg-stub-pre-save-item",
                                            "v-bind:key": "row.key",
                                            "v-for": "row in group.rows",
                                        },
                                        [
                                            createElement(
                                                "cdx-checkbox",
                                                {
                                                    "v-if": "row.type === 'action'",
                                                    "v-model":
                                                        "row.action.selected",
                                                },
                                                [
                                                    createText(
                                                        "{{ row.label }}",
                                                    ),
                                                ],
                                            ),
                                            createElement(
                                                "cdx-checkbox",
                                                {
                                                    "v-else-if":
                                                        "row.type === 'registration'",
                                                    "v-model":
                                                        "form.registerNewPage",
                                                },
                                                [
                                                    createText(
                                                        "{{ row.label }}",
                                                    ),
                                                ],
                                            ),
                                            createElement(
                                                "cdx-checkbox",
                                                {
                                                    "v-else-if":
                                                        "row.type === 'bundled-action'",
                                                    "v-model":
                                                        "row.action.selected",
                                                },
                                                [
                                                    createText(
                                                        "{{ row.label }}",
                                                    ),
                                                ],
                                            ),
                                            createElement(
                                                "span",
                                                {
                                                    class: "create-vg-stub-pre-save-note",
                                                    "v-else": "",
                                                },
                                                [
                                                    createText(
                                                        "{{ row.label }}",
                                                    ),
                                                ],
                                            ),
                                        ],
                                    ),
                                ],
                            ),
                        ],
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
                                    "{{ sourceFetchState.loading ? 'Working' : 'Save' }}",
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
            "v-bind:title": "getDialogTitle()",
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
            createActionFooterTemplate([
                createElement(
                    "cdx-button",
                    {
                        "v-bind:disabled": "sourceFetchState.loading",
                        "v-on:click": "openHistoryDialog",
                    },
                    [createText("History")],
                ),
                createElement(
                    "cdx-button",
                    {
                        "v-bind:disabled": "sourceFetchState.loading",
                        "v-on:click": "clearForm",
                    },
                    [createText("Clear")],
                ),
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
                        "v-on:click": "submitForm",
                        weight: "primary",
                    },
                    [
                        createText(
                            "{{ sourceFetchState.loading ? 'Fetching' : 'Preview and submit' }}",
                        ),
                    ],
                ),
            ]),
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
 * Creates the editable history JSON dialog.
 *
 * @returns {object} History JSON dialog template node.
 */
function createHistoryJsonDialogTemplate() {
    return createElement(
        "cdx-dialog",
        {
            "v-model:open": "historyJsonOpen",
            title: "History JSON",
        },
        [
            createElement("p", {}, [
                createText(
                    "Copy exported JSON, or paste history JSON and load the form values.",
                ),
            ]),
            createElement("cdx-text-area", {
                class: "create-vg-stub-history-json-text",
                "v-bind:readonly": "!historyJsonEditable",
                "v-model": "historyJsonText",
                rows: "12",
                spellcheck: "false",
            }),
            createElement(
                "p",
                {
                    "v-if": "historyJsonError",
                    style: {
                        color: "var(--color-error, #b32424)",
                    },
                },
                [createText("{{ historyJsonError }}")],
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
                                "v-on:click": "closeHistoryJsonDialog",
                            },
                            [createText("Cancel")],
                        ),
                        createElement(
                            "cdx-button",
                            {
                                action: "progressive",
                                weight: "primary",
                                "v-on:click": "importHistoryJson",
                            },
                            [createText("Load")],
                        ),
                    ]),
                ],
            ),
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
                gridTemplateColumns: "1fr auto auto auto",
                padding: "0.5em 0",
            },
        },
        [
            createElement("div", {}, [
                createElement("div", {}, [
                    createText(
                        "{{ index + 1 }}. {{ formatHistoryEntryPage(entry) }}",
                    ),
                ]),
                createElement(
                    "div",
                    {
                        style: {
                            color: "var(--color-subtle, #54595d)",
                            fontSize: "0.75em",
                        },
                    },
                    [createText("{{ entry.metadata.savedAt }}")],
                ),
            ]),
            createElement(
                "cdx-button",
                {
                    "v-on:click": "fillHistoryEntry(entry)",
                },
                [createText("Load")],
            ),
            createElement(
                "cdx-button",
                {
                    "v-on:click": "openHistoryJsonDialog(entry)",
                },
                [createText("Export")],
            ),
            createElement(
                "cdx-button",
                {
                    "v-if": "!entry.metadata.temporary",
                    "v-on:click": "deleteHistoryEntry(entry.id)",
                },
                [createText("Delete")],
            ),
            createElement(
                "cdx-button",
                {
                    "v-if": "entry.metadata.temporary",
                    "v-on:click": "updateTemporaryHistoryEntry",
                },
                [createText("Update")],
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
                        "v-bind:disabled":
                            "!historyEntries.some((entry) => !entry.metadata.temporary)",
                        "v-on:click": "clearHistory",
                    },
                    [createText("Clear")],
                ),
                createElement(
                    "cdx-button",
                    {
                        "v-on:click": "closeHistoryDialog",
                    },
                    [createText("Done")],
                ),
                createElement(
                    "cdx-button",
                    {
                        action: "progressive",
                        "v-on:click": "openHistoryImportDialog",
                    },
                    [createText("Import")],
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
 * Converts a camelCase JavaScript name to a kebab-case CSS name.
 *
 * @param {string} value - JavaScript property name.
 * @returns {string} CSS property name.
 */
function toKebabCase(value) {
    return value.replace(/[A-Z]/gu, (letter) => `-${letter.toLowerCase()}`);
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
        citationRows: [],
        localizedNames: [createNameRow()],
        name: "",
        noteTaNamesRemoved: false,
        navboxRows: null,
        noteTaRows: [createNoteTaRow("G1", "Games")],
        publishers: "=",
        redirectRows: null,
        registerNewPage: true,
        sortKey: "",
        stubTagRows: null,
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
 * Creates one editable NoteTA row.
 *
 * @param {*} [key] - Existing row or row key.
 * @param {string} [value] - Row value.
 * @returns {object} NoteTA row.
 */
function createNoteTaRow(key = "", value = "") {
    const row =
        key != null && typeof key === "object"
            ? key
            : {
                  key,
                  value,
              };

    const created = {
        key: trimFieldValue(row.key),
        value: trimFieldValue(row.value),
    };

    if (trimFieldValue(row.source) !== "") {
        created.source = trimFieldValue(row.source);
    }

    if (trimFieldValue(row.generatedValue) !== "") {
        created.generatedValue = trimFieldValue(row.generatedValue);
    }

    if (row.modified === true) {
        created.modified = true;
    }

    return created;
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
 * Formats fetched Steam names as linked preview items.
 *
 * @param {Array<object>} rows - Fetched Steam name rows.
 * @returns {Array<object>} Labeled Steam name suggestions.
 */
function getSteamNameSuggestions(rows) {
    return rows.map((row) => ({
        label: row.label || formatSteamNameMarkets(row),
        url: row.sourceUrl,
        value: row.name,
    }));
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
 * Gets the normalized original-title language for helper lookups.
 *
 * @param {object} form - Current form values.
 * @returns {string} Original-title language code.
 */
function getOriginalNameLanguage(form) {
    if (trimFieldValue(form.originalName) === "") {
        return "";
    }

    return parsePrefixedValue(
        form.originalName,
        form.originalLanguage || "ja",
    ).prefix.toLocaleLowerCase();
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
        return [mergeSteamNameRows(hans, hant, true, false)].filter(Boolean);
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
function mergeSteamNameRows(hans, hant, blankName, worldwide = true) {
    const rows = [hans, hant].filter(Boolean);

    if (rows.length === 0) {
        return undefined;
    }

    const row = {
        name: blankName ? "" : trimFieldValue(hans?.name || hant?.name),
        official: true,
        sourceUrl: rows
            .map((row) => row.sourceUrl)
            .filter(Boolean)
            .join("\n"),
    };

    if (worldwide) {
        row.ww = true;
    }

    return row;
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
 * Creates blank external identifiers for the Enwiki lookup tip.
 *
 * @returns {object} Blank identifier values.
 */
function createBlankEnwikiMetadata() {
    return {
        metacriticId: "",
        openCriticId: "",
        pageExists: null,
        steamId: "",
    };
}

/**
 * Formats the Enwiki-to-Wikidata lookup outcome.
 *
 * @param {boolean|null} pageExists - Whether the English Wikipedia page exists.
 * @returns {string} Lookup status text.
 */
function getWikidataLookupStatus(pageExists) {
    if (pageExists === false) {
        return "no enwiki page";
    }

    if (pageExists === true) {
        return "not connected";
    }

    return "lookup failed";
}

/**
 * Creates fixed Enwiki tip slots with a shared placeholder value.
 *
 * @param {string} value - Placeholder text.
 * @returns {Array<object>} Tip slot definitions.
 */
function createEnwikiTipPlaceholders(value) {
    return ["Wikidata", "Metacritic", "OpenCritic", "Steam"].map((label) => ({
        label,
        value,
        url: "",
    }));
}

/**
 * Builds a Google site search for a Wikidata item.
 *
 * @param {string} title - Page title without a disambiguation suffix.
 * @returns {string} Search URL.
 */
function buildWikidataSearchUrl(title) {
    return buildGoogleSiteSearchUrl(title, "wikidata.org/wiki");
}

/**
 * Builds a Metacritic game URL.
 *
 * @param {string} id - Metacritic game ID.
 * @returns {string} Game URL.
 */
function buildMetacriticUrl(id) {
    return `https://www.metacritic.com/game/${encodeURIComponent(id)}/`;
}

/**
 * Builds a Google site search for a Metacritic game page.
 *
 * @param {string} title - Game title without a disambiguation suffix.
 * @returns {string} Search URL.
 */
function buildMetacriticSearchUrl(title) {
    const query = `"${getBasePageTitle(title)}" site:metacritic.com`;

    return `https://www.google.com/search?q=${encodeURIComponent(query)}`;
}

/**
 * Builds an OpenCritic game URL.
 *
 * @param {string} id - OpenCritic game ID.
 * @returns {string} Game URL.
 */
function buildOpenCriticUrl(id) {
    return `https://opencritic.com/game/${encodeURIComponent(id)}/-`;
}

/**
 * Builds a Google site search for an OpenCritic game page.
 *
 * @param {string} title - Game title without a disambiguation suffix.
 * @returns {string} Search URL.
 */
function buildOpenCriticSearchUrl(title) {
    return buildGoogleSiteSearchUrl(title, "opencritic.com/game");
}

/**
 * Builds a Steam store application URL.
 *
 * @param {string} id - Steam application ID.
 * @returns {string} Store URL.
 */
function buildSteamUrl(id) {
    return `https://store.steampowered.com/app/${encodeURIComponent(id)}/`;
}

/**
 * Builds a Google site search for a Steam application page.
 *
 * @param {string} title - Game title without a disambiguation suffix.
 * @returns {string} Search URL.
 */
function buildSteamSearchUrl(title) {
    return buildGoogleSiteSearchUrl(title, "store.steampowered.com/app");
}

/**
 * Builds a Google site search URL.
 *
 * @param {string} title - Page title without a disambiguation suffix.
 * @param {string} site - Site or path restriction.
 * @returns {string} Search URL.
 */
function buildGoogleSiteSearchUrl(title, site) {
    const query = `"${getBasePageTitle(title)}" site:${site}`;

    return `https://www.google.com/search?q=${encodeURIComponent(query)}`;
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

    if (!Object.hasOwn(normalized, "registerNewPage")) {
        normalized.registerNewPage = true;
    }

    if (!Object.hasOwn(normalized, "navboxRows")) {
        normalized.navboxRows = null;
    } else if (Array.isArray(normalized.navboxRows)) {
        normalized.navboxRows = normalized.navboxRows.map(createNavboxRow);
    }

    if (!Object.hasOwn(normalized, "redirectRows")) {
        normalized.redirectRows = null;
    } else if (Array.isArray(normalized.redirectRows)) {
        normalized.redirectRows =
            normalized.redirectRows.map(createRedirectRow);
    }

    if (!Array.isArray(normalized.categoryRows)) {
        normalized.categoryRows = [];
    }

    if (!Object.hasOwn(normalized, "stubTagRows")) {
        normalized.stubTagRows = null;
    } else if (Array.isArray(normalized.stubTagRows)) {
        normalized.stubTagRows = normalized.stubTagRows.map(createStubTagRow);
    }

    if (!Array.isArray(normalized.citationRows)) {
        normalized.citationRows = [];
    } else {
        normalized.citationRows =
            normalized.citationRows.map(createCitationRow);
    }

    if (!Object.hasOwn(normalized, "noteTaNamesRemoved")) {
        normalized.noteTaNamesRemoved = false;
    }

    if (!Array.isArray(normalized.noteTaRows)) {
        normalized.noteTaRows = [createNoteTaRow("G1", "Games")];
    } else {
        normalized.noteTaRows = normalized.noteTaRows.map(createNoteTaRow);
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
 * Gets restorable flat form values from structured history JSON.
 *
 * @param {object} entry - History entry or structured data.
 * @returns {object} Restorable form values.
 */
function getHistoryEntryForm(entry) {
    if (
        Number.isInteger(entry?.id) &&
        entry?.data?.input != null &&
        entry?.metadata != null
    ) {
        return {
            ...cloneValue(entry.data.input),
            historyPatches: cloneValue(entry.data.patches || {}),
        };
    }

    return undefined;
}

/**
 * Applies citation patches to generated citation rows.
 *
 * @param {Array<object>} rows - Generated citation rows.
 * @param {Array<object>} patches - Citation patches.
 * @returns {Array<object>} Patched citation rows.
 */
function applyCitationPatches(rows, patches = []) {
    return rows.map((row) => {
        const patch = patches.find(
            (item) => trimFieldValue(item.sourceUrl) === row.sourceUrl,
        );

        if (patch == null) {
            return row;
        }

        return createCitationRow({
            ...row,
            ...cloneValue(patch),
            params: applyCitationParamPatches(
                row.generatedParams,
                patch.params,
            ),
            modified: true,
            sourceUrl: row.sourceUrl,
        });
    });
}

/**
 * Applies citation parameter patches to generated parameters.
 *
 * @param {Array<object>} generatedParams - Generated citation parameters.
 * @param {Array<object>} patches - Citation parameter patches.
 * @returns {Array<object>} Patched citation parameters.
 */
function applyCitationParamPatches(generatedParams = [], patches = []) {
    const params = new Map(
        cloneValue(generatedParams).map((param) => [param.name, param]),
    );

    patches.forEach((patch) => {
        if (trimFieldValue(patch?.name) === "") {
            return;
        }

        if (patch.value == null || trimFieldValue(patch.value) === "") {
            params.delete(patch.name);
            return;
        }

        params.set(patch.name, cloneValue(patch));
    });

    return Array.from(params.values());
}

/**
 * Applies category patches to generated category rows.
 *
 * @param {Array<object>} rows - Generated category rows.
 * @param {Array<object>} patches - Category patches.
 * @returns {void}
 */
function applyCategoryPatches(rows, patches = []) {
    patches.forEach((patch) => {
        if (patch.source?.manual === true) {
            rows.push(createCategoryPatchRow(patch));
            return;
        }

        const row = rows.find((item) => isCategoryPatchTarget(item, patch));

        if (row != null) {
            const values = cloneValue(patch);

            delete values.source;
            Object.assign(row, values);
        }
    });
}

/**
 * Applies navbox patches to generated navbox rows.
 *
 * @param {Array<object>} rows - Generated navbox rows.
 * @param {Array<object>} patches - Navbox patches.
 * @returns {Array<object>} Patched navbox rows.
 */
function applyNavboxPatches(rows, patches = []) {
    return rows.map((row) => {
        const patch = patches.find(
            (item) => trimFieldValue(item.source?.title) === row.title,
        );

        if (patch == null) {
            return row;
        }

        return createNavboxRow({
            ...row,
            ...cloneValue(patch),
            title: row.title,
        });
    });
}

/**
 * Checks whether a category row matches a patch source.
 *
 * @param {object} row - Generated category row.
 * @param {object} patch - Category patch.
 * @returns {boolean} Whether the patch targets the row.
 */
function isCategoryPatchTarget(row, patch) {
    if (trimFieldValue(patch.source?.company) !== "") {
        return (
            trimFieldValue(row.company) ===
            trimFieldValue(patch.source.company)
        );
    }

    return (
        trimFieldValue(row.originalCategory || row.category) ===
        trimFieldValue(patch.source?.category)
    );
}

/**
 * Creates a category row from a patch.
 *
 * @param {object} patch - Category patch.
 * @returns {object} Category row.
 */
function createCategoryPatchRow(patch) {
    return {
        category: trimFieldValue(patch.category),
        company: trimFieldValue(patch.company),
        enabled: patch.enabled !== false,
        originalCategory: trimFieldValue(patch.category),
        originalStubTagEnabled: patch.stubTagEnabled === true,
        source: "manual",
        status: trimFieldValue(patch.status),
        stubTag: trimFieldValue(patch.stubTag),
        stubTagEnabled: patch.stubTagEnabled === true,
    };
}

/**
 * Lists the generated name conversion rule as an editable NoteTA row.
 *
 * @param {object} form - Dialog form values.
 * @returns {void}
 */
function syncGeneratedNameNoteTaRow(form) {
    const generated = buildOfficialNameConversionText(
        getOfficialNameNoteTaRows(form),
    );
    const rows = ensureNoteTaRows(form);
    const index = rows.findIndex((row) => row.source === NOTE_TA_NAMES_SOURCE);
    const current = index === -1 ? null : rows[index];

    if (form.noteTaNamesRemoved) {
        if (index !== -1) {
            rows.splice(index, 1);
        }

        return;
    }

    if (current?.modified && current.generatedValue === generated) {
        return;
    }

    if (generated == null) {
        if (index !== -1) {
            rows.splice(index, 1);
        }

        return;
    }

    const row = createNoteTaRow({
        generatedValue: generated,
        key: "1",
        source: NOTE_TA_NAMES_SOURCE,
        value: generated,
    });

    if (index === -1) {
        rows.splice(getGeneratedNameNoteTaInsertIndex(rows), 0, row);
        return;
    }

    delete current.modified;
    Object.assign(current, row);
}

/**
 * Rebuilds generated NoteTA rows while preserving manual rows.
 *
 * @param {object} form - Dialog form values.
 * @returns {void}
 */
function regenerateNoteTaRows(form) {
    const rows = ensureNoteTaRows(form);
    const manualRows = rows.filter(isManualNoteTaRow);
    const generatedRows = [createNoteTaRow("G1", "Games")];
    const generated = buildOfficialNameConversionText(
        getOfficialNameNoteTaRows(form),
    );

    form.noteTaNamesRemoved = false;

    if (generated != null) {
        generatedRows.push(
            createNoteTaRow({
                generatedValue: generated,
                key: "1",
                source: NOTE_TA_NAMES_SOURCE,
                value: generated,
            }),
        );
    }

    rows.splice(
        0,
        rows.length,
        ...sortNoteTaEntries([...manualRows, ...generatedRows]),
    );
}

/**
 * Checks whether a NoteTA row is manually managed.
 *
 * @param {object} row - NoteTA row.
 * @returns {boolean} Whether the row should survive regeneration.
 */
function isManualNoteTaRow(row) {
    const key = trimFieldValue(row.key);

    return row.source !== NOTE_TA_NAMES_SOURCE && !/^G[1-9]\d*$/u.test(key);
}

/**
 * Gets official localized name rows for NoteTA generation.
 *
 * @param {object} form - Dialog form values.
 * @returns {Array<object>} Official name rows.
 */
function getOfficialNameNoteTaRows(form) {
    return Array.isArray(form.localizedNames)
        ? form.localizedNames.filter((row) => row.official)
        : [];
}

/**
 * Finds where a generated names row should appear in the editable list.
 *
 * @param {Array<object>} rows - Current NoteTA rows.
 * @returns {number} Insertion index.
 */
function getGeneratedNameNoteTaInsertIndex(rows) {
    const index = rows.findIndex((row) => {
        const key = trimFieldValue(row.key);

        return key !== "T" && !/^G[1-9]\d*$/u.test(key);
    });

    return index === -1 ? rows.length : index;
}

/**
 * Ensures the form has editable NoteTA rows.
 *
 * @param {object} form - Dialog form values.
 * @returns {Array<object>} NoteTA rows.
 */
function ensureNoteTaRows(form) {
    if (!Array.isArray(form.noteTaRows)) {
        form.noteTaRows = [];
    }

    return form.noteTaRows;
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

/**
 * Creates one redirect review row.
 *
 * @param {*} [value] - Existing row or redirect title.
 * @param {boolean} [fixed] - Whether the row title was just fixed.
 * @returns {object} Redirect review row.
 */
function createRedirectRow(value = "", fixed = value?.fixed === true) {
    const title = trimFieldValue(
        value?.title ?? value?.redirectTitle ?? value,
    );
    const exists =
        value?.exists === true || /^Exists(?::|$)/u.test(value?.status);
    const fixedTitle = fixed ? title : trimFieldValue(value?.fixedTitle);

    return {
        fixed:
            fixed &&
            normalizeTitleKey(fixedTitle) === normalizeTitleKey(title),
        fixedTitle,
        enabled: value?.enabled ?? value?.selected ?? !exists,
        exists,
        status: value?.status || (exists ? "Exists" : "Missing"),
        title,
    };
}

/**
 * Marks category rows as fixed for their current category titles.
 *
 * @param {Array<object>} rows - Category rows.
 * @returns {void}
 */
function markCategoryRowsFixed(rows) {
    rows.forEach((row) => {
        row.fixed = true;
        row.fixedCategory = trimFieldValue(row.category);
    });
}

/**
 * Marks category rows as needing a fresh review refresh.
 *
 * @param {Array<object>} rows - Category rows.
 * @returns {void}
 */
function markCategoryRowsUnfixed(rows) {
    rows.forEach((row) => {
        row.fixed = false;
    });
}

/**
 * Preserves or clears a category row fixed flag after its normalized title update.
 *
 * @param {object} row - Updated category row.
 * @param {object} current - Previous category row.
 * @returns {void}
 */
function syncCategoryRowFixedState(row, current) {
    row.fixedCategory = trimFieldValue(current?.fixedCategory);
    row.fixed =
        current?.fixed === true &&
        normalizeTitleKey(row.fixedCategory) ===
            normalizeTitleKey(row.category);
}

/**
 * Checks whether a category row is fixed for its current title.
 *
 * @param {object} row - Category row.
 * @returns {boolean} Whether the row is current.
 */
function isCategoryRowFixed(row) {
    return (
        row.fixed === true &&
        normalizeTitleKey(row.fixedCategory) ===
            normalizeTitleKey(row.category)
    );
}

/**
 * Updates a redirect row title and marks stale checks as unfixed.
 *
 * @param {object} row - Redirect review row.
 * @param {string} value - Raw title value.
 * @returns {void}
 */
function setRedirectRowTitle(row, value) {
    const title = trimFieldValue(value);

    row.title = title;

    if (normalizeTitleKey(row.fixedTitle) !== normalizeTitleKey(title)) {
        row.fixed = false;
    }
}

/**
 * Checks whether a redirect row has been fixed for its current title.
 *
 * @param {object} row - Redirect review row.
 * @returns {boolean} Whether the row is current.
 */
function isRedirectRowFixed(row) {
    return (
        row.fixed === true &&
        normalizeTitleKey(row.fixedTitle) === normalizeTitleKey(row.title)
    );
}

/**
 * Ensures the form has editable redirect rows.
 *
 * @param {object} form - Dialog form values.
 * @returns {Array<object>} Redirect rows.
 */
function ensureRedirectRows(form) {
    if (!Array.isArray(form.redirectRows)) {
        form.redirectRows = [];
    }

    return form.redirectRows;
}

function hasPreparedNavboxRows(form) {
    return (
        Array.isArray(form.navboxRows) &&
        (form.navboxRows.length > 0 || trimFieldValue(form.series) === "")
    );
}

/**
 * Builds a case-insensitive title comparison key.
 *
 * @param {*} value - Raw title value.
 * @returns {string} Title comparison key.
 */
function normalizeTitleKey(value) {
    return trimFieldValue(value).toLocaleLowerCase();
}

/**
 * Creates one editable navbox row.
 *
 * @param {*} [value] - Existing row or navbox wikitext.
 * @param {boolean} [fixed] - Whether the row text was just fixed.
 * @returns {object} Navbox row.
 */
function createNavboxRow(value = "", fixed = value?.fixed === true) {
    const text = trimFieldValue(value?.text ?? value);
    const fixedText = fixed ? text : trimFieldValue(value?.fixedText);

    return {
        fixed: fixed && fixedText === text,
        fixedText,
        enabled: value?.enabled !== false,
        status: value?.status || "",
        text,
        title: value?.title || getNavboxTitle(text),
        ...(value?.pendingEdit == null
            ? {}
            : {
                  pendingEdit: value.pendingEdit,
              }),
    };
}

/**
 * Updates a navbox row text and marks stale checks as unfixed.
 *
 * @param {object} row - Navbox review row.
 * @param {string} value - Raw navbox text.
 * @returns {void}
 */
function setNavboxRowText(row, value) {
    const text = trimFieldValue(value);

    row.text = text;

    if (row.fixedText !== text) {
        row.fixed = false;
    }
}

/**
 * Checks whether a navbox row is fixed for its current text.
 *
 * @param {object} row - Navbox row.
 * @returns {boolean} Whether the row is current.
 */
function isNavboxRowFixed(row) {
    return row.fixed === true && row.fixedText === row.text;
}

/**
 * Checks whether a review row refresh can reuse current fixed rows.
 *
 * @param {object} refreshOptions - Review refresh options.
 * @param {Array<object>} rows - Review rows.
 * @param {Function} isFixed - Row check-state predicate.
 * @returns {boolean} Whether the refresh can be skipped.
 */
function shouldSkipFixedRows(refreshOptions, rows, isFixed) {
    return (
        refreshOptions.recheck !== true &&
        Array.isArray(rows) &&
        rows.length > 0 &&
        rows.every(isFixed)
    );
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
 * Creates one managed citation row.
 *
 * @param {object} [value] - Existing row values.
 * @returns {object} Managed citation row.
 */
function createCitationRow(value = {}) {
    const generatedParams = sortManagedCitationParams(value.generatedParams);

    return {
        generatedParams,
        index: Number(value.index) || 1,
        modified: value.modified === true,
        params: sortManagedCitationParams(value.params || generatedParams),
        sourceUrl: trimFieldValue(value.sourceUrl),
        template: trimFieldValue(value.template) || "cite web",
    };
}

/**
 * Creates one managed citation parameter row.
 *
 * @param {object} [value] - Existing parameter values.
 * @returns {object} Managed citation parameter row.
 */
function createCitationParamRow(value = {}) {
    return {
        name: trimFieldValue(value.name),
        value: trimFieldValue(value.value),
    };
}

/**
 * Sorts managed citation parameters and removes fully blank stored rows.
 *
 * @param {Array<object>} params - Citation parameter rows.
 * @returns {Array<object>} Sorted parameter rows.
 */
function sortManagedCitationParams(params = []) {
    return sortCitationParams(
        params.map(createCitationParamRow).filter(hasCitationParamValue),
    );
}

/**
 * Gets visible parameter rows, including one trailing blank row.
 *
 * @param {object} citation - Managed citation row.
 * @returns {Array<object>} Visible parameter rows.
 */
function getCitationParamRows(citation) {
    return [...(citation.params || []), createCitationParamRow()];
}

/**
 * Gets the MediaWiki ResourceLoader object when it can load CodeMirror.
 *
 * @returns {object|undefined} ResourceLoader object.
 */
function getCodeMirrorLoader() {
    if (typeof mw === "undefined" || typeof mw.loader?.using !== "function") {
        return undefined;
    }

    return mw.loader;
}

/**
 * Finds the native textarea for a Codex TextArea ref.
 *
 * @param {*} element - Vue template ref value.
 * @returns {HTMLTextAreaElement|undefined} Textarea element.
 */
function findTextareaElement(element) {
    if (element == null) {
        return undefined;
    }

    if (element.tagName === "TEXTAREA") {
        return element;
    }

    if (element.$el != null) {
        return findTextareaElement(element.$el);
    }

    if (typeof element.querySelector === "function") {
        return element.querySelector("textarea") || undefined;
    }

    return undefined;
}

/**
 * Reads text from either MediaWiki's CodeMirror wrapper or the textarea.
 *
 * @param {object} editor - CodeMirror editor instance.
 * @param {HTMLTextAreaElement} textarea - Backing textarea.
 * @returns {string} Current source text.
 */
function getCodeMirrorText(editor, textarea) {
    if (typeof editor.getValue === "function") {
        return editor.getValue();
    }

    if (typeof editor.getText === "function") {
        return editor.getText();
    }

    if (editor.view?.state?.doc != null) {
        return String(editor.view.state.doc);
    }

    return textarea.value;
}

/**
 * Writes text to either MediaWiki's CodeMirror wrapper or the textarea.
 *
 * @param {object} editor - CodeMirror editor instance.
 * @param {HTMLTextAreaElement} textarea - Backing textarea.
 * @param {string} text - Source text.
 * @returns {void}
 */
function setCodeMirrorText(editor, textarea, text) {
    if (typeof editor.setValue === "function") {
        editor.setValue(text);
        return;
    }

    if (typeof editor.setText === "function") {
        editor.setText(text);
        return;
    }

    const view = editor.view;
    const doc = view?.state?.doc;

    if (typeof view?.dispatch === "function" && doc != null) {
        view.dispatch({
            changes: {
                from: 0,
                insert: text,
                to: doc.length,
            },
        });
        return;
    }

    textarea.value = text;
}

/**
 * Checks whether a citation parameter row has any entered value.
 *
 * @param {object} param - Citation parameter row.
 * @returns {boolean} Whether the row should be kept.
 */
function hasCitationParamValue(param) {
    return (
        trimFieldValue(param.name) !== "" || trimFieldValue(param.value) !== ""
    );
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
