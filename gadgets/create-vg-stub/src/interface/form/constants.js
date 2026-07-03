/* eslint-disable */

/**
 * Defines create-vg-stub dialog form metadata and reusable constants.
 */

import { getArticleSourceFields } from "../../article/index.js";

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
        this.description = options.description || "";
        this.fieldsetLabel = options.fieldsetLabel || "";
        this.fields = fields;
        this.fullTextReview = Boolean(options.fullTextReview);
        this.key = key;
        this.label = label;
        this.nameGroupKey = nameGroupKey;
        this.noteTaReview = Boolean(options.noteTaReview);
        this.previewKey = options.previewKey || "";
    }
}

export const SOURCE_REFERENCE_FIELDS = getArticleSourceFields();

/**
 * Gets a registered source URL field by article field key.
 *
 * @param {string} key - Article field key.
 * @returns {object|undefined} Matching source field definition.
 */
function getSourceReferenceField(key) {
    return SOURCE_REFERENCE_FIELDS.find((field) => field.key === key);
}

export const NAME_MARKETS = [
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
        key: "neither",
        label: "Neither",
    },
    {
        key: "simp",
        label: "Simp",
    },
    {
        key: "trad",
        label: "Trad",
    },
    {
        key: "diff",
        label: "Diff",
    },
    {
        key: "same",
        label: "Same",
    },
];
export const STEAM_NAME_BUTTONS = STEAM_NAME_CHOICES.map((choice) => ({
    label: choice.label,
    value: choice.key,
}));
export const STEAM_NAME_HELPER_ROW = Symbol(
    "create-vg-stub-steam-name-helper",
);
export const NOTE_TA_NAMES_SOURCE = "names";
export const CODEMIRROR_MODULES = [
    "ext.CodeMirror",
    "ext.CodeMirror.mode.mediawiki",
];
const ARTICLE_TITLE_PLACEHOLDER =
    "Leave blank to use the page title in article text";
export const HISTORY_EXPORT_ERROR =
    "Paste history data exported by this tool.";
export const DIALOG_BODY_MASK_CLASS =
    "{ 'create-vg-stub-dialog-body--masked': previewLoading }";
const REVIEW_COLUMN_WIDTHS = {
    actions: "5.5em",
    enabled: "4.5em",
    main: "auto",
    page: "5.5em",
    status: "6.5em",
};
export const CATEGORY_TABLE_COLUMNS = [
    { id: "enabled", label: "", width: REVIEW_COLUMN_WIDTHS.enabled },
    { id: "source", label: "Status", width: REVIEW_COLUMN_WIDTHS.status },
    {
        id: "category",
        label: "Category name",
        width: REVIEW_COLUMN_WIDTHS.main,
    },
    { id: "page", label: "Page", width: REVIEW_COLUMN_WIDTHS.page },
    { id: "actions", label: "Actions", width: REVIEW_COLUMN_WIDTHS.actions },
];
export const CITATION_TABLE_COLUMNS = [
    { id: "name", label: "Parameter" },
    { id: "value", label: "Value" },
    { id: "actions", label: "Actions" },
];
export const METADATA_TABLE_COLUMNS = [
    { id: "label", label: "Field" },
    { id: "value", label: "Value" },
    { id: "source", label: "Reference" },
];
export const NAVBOX_TABLE_COLUMNS = [
    { id: "enabled", label: "", width: REVIEW_COLUMN_WIDTHS.enabled },
    { id: "status", label: "Status", width: REVIEW_COLUMN_WIDTHS.status },
    { id: "text", label: "Template name", width: REVIEW_COLUMN_WIDTHS.main },
    { id: "page", label: "Page", width: REVIEW_COLUMN_WIDTHS.page },
    { id: "actions", label: "Actions", width: REVIEW_COLUMN_WIDTHS.actions },
];
export const NOTETA_TABLE_COLUMNS = [
    { id: "key", label: "Rule" },
    { id: "value", label: "Conversion" },
    { id: "actions", label: "Actions" },
];
export const REDIRECT_TABLE_COLUMNS = [
    { id: "enabled", label: "", width: REVIEW_COLUMN_WIDTHS.enabled },
    { id: "status", label: "Status", width: REVIEW_COLUMN_WIDTHS.status },
    { id: "title", label: "Page name", width: REVIEW_COLUMN_WIDTHS.main },
    { id: "page", label: "Page", width: REVIEW_COLUMN_WIDTHS.page },
    { id: "actions", label: "Actions", width: REVIEW_COLUMN_WIDTHS.actions },
];
export const STUB_TAG_TABLE_COLUMNS = [
    { id: "enabled", label: "", width: REVIEW_COLUMN_WIDTHS.enabled },
    { id: "type", label: "Status", width: REVIEW_COLUMN_WIDTHS.status },
    {
        id: "stubTag",
        label: "Template name",
        width: REVIEW_COLUMN_WIDTHS.main,
    },
    { id: "page", label: "Page", width: REVIEW_COLUMN_WIDTHS.page },
    { id: "actions", label: "Actions", width: REVIEW_COLUMN_WIDTHS.actions },
];
export const MAIN_ACTION_MENU_ITEMS = [
    { label: "History", value: "history" },
    { label: "Reload", value: "reload" },
    { label: "Clear", value: "clear" },
];
export const TABLE_ACTION_ICONS = {
    cdxIconArticleAdd: {
        path: "M3 3h8l4 4v2h-2V8h-3V5H5v12h5v2H3zm12 8h2v3h3v2h-3v3h-2v-3h-3v-2h3z",
    },
    cdxIconEdit: {
        path: "M14.7 2.3a1 1 0 0 1 1.4 0l1.6 1.6a1 1 0 0 1 0 1.4L7 16H3v-4zM5 12.8V14h1.2l8.4-8.4-1.2-1.2z",
    },
    regenerate: {
        path: "M10 3a7 7 0 0 1 6.2 3.8L18 5v5h-5l1.8-1.8A5 5 0 1 0 15 12h2a7 7 0 1 1-7-9z",
    },
    clean: {
        path: "M5 3h10v2H5zm2 4h6l1 10H6zm2 2v6h1V9zm2 0v6h1V9z",
    },
    reload: {
        path: "M10 3a7 7 0 0 1 6.2 3.8L18 5v5h-5l1.8-1.8A5 5 0 1 0 15 12h2a7 7 0 1 1-7-9z",
    },
    remove: {
        path: "M6 7h2v9H6zm6 0h2v9h-2zM5 4h10l-1-2H6zm-2 1h14v2H3zm2 3h10l-1 10H6z",
    },
    sort: {
        path: "M6 3h8v2H6zm-3 5h14v2H3zm3 5h8v2H6z",
    },
};
export const PRE_SAVE_STATUS_ICONS = {
    complete: {
        path: "M8.8 13.6 4.6 9.4 3.2 10.8 8.8 16.4 18 7.2 16.6 5.8z",
    },
    failed: {
        path: "m5.4 4 4.6 4.6L14.6 4 16 5.4 11.4 10l4.6 4.6-1.4 1.4-4.6-4.6L5.4 16 4 14.6 8.6 10 4 5.4z",
    },
    pending: {
        path: "M10 3a7 7 0 1 0 0 14 7 7 0 0 0 0-14zm0 2a5 5 0 1 1 0 10 5 5 0 0 1 0-10z",
    },
    running: {
        path: "M10 3a7 7 0 1 0 7 7h-2a5 5 0 1 1-5-5z",
    },
    retrying: {
        path: "M10 3a7 7 0 0 1 6.2 3.8L18 5v5h-5l1.8-1.8A5 5 0 1 0 15 12h2a7 7 0 1 1-7-9z",
    },
    skipped: {
        path: "M4 5v10l7-5zm8 0h2v10h-2z",
    },
};
export const ARTICLE_PARAMETER_GROUPS = [
    new ArticleParameterGroup(
        "metadata",
        "Metadata",
        [
            new ArticleParameterField(
                "enwikiTitle",
                "English Wikipedia page",
                "enwikiTitle",
                null,
                {
                    placeholder: "Page title in English Wikipedia",
                },
            ),
            new ArticleParameterField(
                "developers",
                "Developers",
                "companies.developers",
                getSourceReferenceField("developers"),
                {
                    placeholder: "Names",
                },
            ),
            new ArticleParameterField(
                "publishers",
                "Publishers",
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
                "Platforms",
                "platforms",
                getSourceReferenceField("platforms"),
                {
                    placeholder: "Names",
                },
            ),
            new ArticleParameterField(
                "year",
                "Release year",
                "year",
                getSourceReferenceField("year"),
                {
                    placeholder: "YYYY",
                },
            ),
            new ArticleParameterField(
                "genres",
                "Genres",
                "genres",
                getSourceReferenceField("genres"),
                {
                    placeholder: "Names",
                    previewKey: "attribution",
                },
            ),
        ],
        null,
        {
            previewKey: "attribution",
        },
    ),
    new ArticleParameterGroup(
        "titles",
        "Titles",
        [
            new ArticleParameterField(
                "originalName",
                "Original-language title",
                "originalName",
                getSourceReferenceField("originalName"),
                {
                    placeholder: "ja:タイトル or en:Title",
                },
            ),
            new ArticleParameterField(
                "englishName",
                "English-language title",
                "englishName",
                getSourceReferenceField("englishName"),
                {
                    placeholder: "Localized title",
                    previewKey: "names",
                },
            ),
            new ArticleParameterField(
                "sortKey",
                "Default sort key",
                "sortKey",
                null,
                {
                    placeholder: "Leave blank to use the generated value",
                },
            ),
        ],
        "localizedNames",
        {
            description:
                "Review foreign titles, fetch Steam names, add Chinese name parts, and maintain the NoteTA table.",
            fieldsetLabel: "Foreign titles",
            noteTaReview: true,
        },
    ),
    new ArticleParameterGroup(
        "text",
        "Text",
        [
            new ArticleParameterField(
                "pageName",
                "Page name",
                "pageName",
                null,
                {
                    placeholder: "Actual wiki page title",
                },
            ),
            new ArticleParameterField(
                "name",
                "Article display title",
                "name",
                null,
                {
                    placeholder: ARTICLE_TITLE_PLACEHOLDER,
                },
            ),
            new ArticleParameterField(
                "metacriticScore",
                "Metacritic score",
                "scores.metacriticScore",
                getSourceReferenceField("metacriticScore"),
                {
                    compact: true,
                    heading: "Metacritic score",
                    placeholder: "ps4:95 or 95",
                },
            ),
            new ArticleParameterField(
                "openCriticRecommend",
                "OpenCritic recommendation",
                "scores.openCriticRecommend",
                getSourceReferenceField("openCriticRecommend"),
                {
                    compact: true,
                    heading: "OpenCritic recommendation",
                    placeholder: "Recommend rate",
                    previewKey: "score",
                },
            ),
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
            description:
                "Fix generated review-score text, the display title, and additional prose before reviewing the full lead text.",
            fullTextReview: true,
        },
    ),
    new ArticleParameterGroup("references", "References", [], null, {
        citationReview: true,
        description:
            "Normalize citation parameters for every source URL entered in the article fields.",
    }),
    new ArticleParameterGroup("review", "Checks", [], null, {
        categoryReview: true,
        description:
            "Confirm follow-up pages, redirects, categories, navboxes, and stub tags before saving.",
    }),
];
