/**
 * Defines vg-stub-creator dialog form metadata and reusable constants.
 */

import { getArticleSourceFields } from "#stub/article";
import { msg } from "#stub/i18n";

interface ArticleParameterFieldOptions {
    breakBefore?: boolean;
    compact?: boolean;
    heading?: string;
    multiline?: boolean;
    placeholder?: string;
    previewKey?: string;
    readonly?: boolean;
}

interface ArticleParameterGroupOptions {
    categoryReview?: boolean;
    citationReview?: boolean;
    description?: string;
    fieldsetLabel?: string;
    fullTextReview?: boolean;
    noteTaReview?: boolean;
    previewKey?: string;
}

/**
 * Describes a reusable article parameter input.
 */
class ArticleParameterField {
    [key: string]: any;

    /**
     * Creates article parameter field metadata.
     *
     * @param key - Form key used by the dialog.
     * @param label - English label shown in the UI.
     * @param path - Normalized parameter path.
     * @param sourceField - Optional source URL field
     * metadata.
     * @param options - Field display options.
     * @param options.multiline - Whether to use a textarea.
     * @param options.previewKey - Shared preview group key.
     */
    constructor(
        key: string,
        label: string,
        path: string,
        sourceField: null,
        options: ArticleParameterFieldOptions = {},
    ) {
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
    [key: string]: any;

    /**
     * Creates an article parameter group.
     *
     * @param key - Stable group key.
     * @param label - English group heading.
     * @param fields - Group field
     * metadata.
     * @param nameGroupKey - Localized name row form key.
     * @param options - Group display options.
     */
    constructor(
        key: string,
        label: string,
        fields: ArticleParameterField[],
        nameGroupKey: string,
        options: ArticleParameterGroupOptions = {},
    ) {
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
 * @param key - Article field key.
 * @returns Matching source field definition.
 */
function getSourceReferenceField(key: string): any | undefined {
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
        label: msg("names.neither"),
    },
    {
        key: "simp",
        label: msg("names.simplified"),
    },
    {
        key: "trad",
        label: msg("names.traditional"),
    },
    {
        key: "diff",
        label: msg("names.diff"),
    },
    {
        key: "same",
        label: msg("names.same"),
    },
];
export const STEAM_NAME_BUTTONS = STEAM_NAME_CHOICES.map(
    function callback(choice) {
        const result = {
            label: choice.label,
            value: choice.key,
        };
        return result;
    },
);
export const STEAM_NAME_HELPER_ROW = Symbol(
    "vg-stub-creator-steam-name-helper",
);
export const NOTE_TA_NAMES_SOURCE = "names";
export const CODEMIRROR_MODULES = [
    "ext.CodeMirror",
    "ext.CodeMirror.mode.mediawiki",
];
const ARTICLE_TITLE_PLACEHOLDER = msg("text.articleTitlePlaceholder");
export const HISTORY_EXPORT_ERROR = msg("form.historyImportHelp");
export const DIALOG_BODY_MASK_CLASS = [
    "{ 'vg-stub-creator-dialog-body--ma",
    "sked': previewLoading }",
].join("");
const REVIEW_COLUMN_WIDTHS = {
    actions: "5.5em",
    enabled: "4.5em",
    main: "auto",
    page: "5.5em",
    status: "6.5em",
};
export const CATEGORY_TABLE_COLUMNS = [
    { id: "enabled", label: "", width: REVIEW_COLUMN_WIDTHS.enabled },
    {
        id: "source",
        label: msg("review.status"),
        width: REVIEW_COLUMN_WIDTHS.status,
    },
    {
        id: "category",
        label: msg("review.categoryName"),
        width: REVIEW_COLUMN_WIDTHS.main,
    },
    {
        id: "page",
        label: msg("review.page"),
        width: REVIEW_COLUMN_WIDTHS.page,
    },
    {
        id: "actions",
        label: msg("common.actions"),
        width: REVIEW_COLUMN_WIDTHS.actions,
    },
];
export const CITATION_TABLE_COLUMNS = [
    { id: "name", label: msg("references.parameter") },
    { id: "value", label: msg("common.value") },
    { id: "actions", label: msg("common.actions") },
];
export const METADATA_TABLE_COLUMNS = [
    { id: "label", label: msg("metadata.field") },
    { id: "value", label: msg("common.value") },
    { id: "source", label: msg("metadata.reference") },
];
export const NAVBOX_TABLE_COLUMNS = [
    { id: "enabled", label: "", width: REVIEW_COLUMN_WIDTHS.enabled },
    {
        id: "status",
        label: msg("review.status"),
        width: REVIEW_COLUMN_WIDTHS.status,
    },
    {
        id: "text",
        label: msg("review.templateName"),
        width: REVIEW_COLUMN_WIDTHS.main,
    },
    {
        id: "page",
        label: msg("review.page"),
        width: REVIEW_COLUMN_WIDTHS.page,
    },
    {
        id: "actions",
        label: msg("common.actions"),
        width: REVIEW_COLUMN_WIDTHS.actions,
    },
];
export const NOTETA_TABLE_COLUMNS = [
    { id: "key", label: msg("noteta.rule") },
    { id: "value", label: msg("noteta.conversion") },
    { id: "actions", label: msg("common.actions") },
];
export const REDIRECT_TABLE_COLUMNS = [
    { id: "enabled", label: "", width: REVIEW_COLUMN_WIDTHS.enabled },
    {
        id: "status",
        label: msg("review.status"),
        width: REVIEW_COLUMN_WIDTHS.status,
    },
    {
        id: "title",
        label: msg("review.pageName"),
        width: REVIEW_COLUMN_WIDTHS.main,
    },
    {
        id: "page",
        label: msg("review.page"),
        width: REVIEW_COLUMN_WIDTHS.page,
    },
    {
        id: "actions",
        label: msg("common.actions"),
        width: REVIEW_COLUMN_WIDTHS.actions,
    },
];
export const STUB_TAG_TABLE_COLUMNS = [
    { id: "enabled", label: "", width: REVIEW_COLUMN_WIDTHS.enabled },
    {
        id: "type",
        label: msg("review.status"),
        width: REVIEW_COLUMN_WIDTHS.status,
    },
    {
        id: "stubTag",
        label: msg("review.templateName"),
        width: REVIEW_COLUMN_WIDTHS.main,
    },
    {
        id: "page",
        label: msg("review.page"),
        width: REVIEW_COLUMN_WIDTHS.page,
    },
    {
        id: "actions",
        label: msg("common.actions"),
        width: REVIEW_COLUMN_WIDTHS.actions,
    },
];
export const MAIN_ACTION_MENU_ITEMS = [
    { label: msg("form.history"), value: "history" },
    { label: msg("form.reload"), value: "reload" },
    { label: msg("form.clear"), value: "clear" },
];
export const TABLE_ACTION_ICONS = {
    cdxIconArticleAdd: {
        path: [
            "M3 3h8l4 4v2h-2V8h-3V5H5v12h5v2H3z",
            "m12 8h2v3h3v2h-3v3h-2v-3h-3v-2h3z",
        ].join(""),
    },
    cdxIconEdit: {
        path: [
            "M14.7 2.3a1 1 0 0 1 1.4 0l1.6 1.6a",
            "1 1 0 0 1 0 1.4L7 16H3v-4zM5 12.8V",
            "14h1.2l8.4-8.4-1.2-1.2z",
        ].join(""),
    },
    regenerate: {
        path: [
            "M10 3a7 7 0 0 1 6.2 3.8L18 5v5h-5l",
            "1.8-1.8A5 5 0 1 0 15 12h2a7 7 0 1 ",
            "1-7-9z",
        ].join(""),
    },
    clean: {
        path: "M5 3h10v2H5zm2 4h6l1 10H6zm2 2v6h1V9zm2 0v6h1V9z",
    },
    reload: {
        path: [
            "M10 3a7 7 0 0 1 6.2 3.8L18 5v5h-5l",
            "1.8-1.8A5 5 0 1 0 15 12h2a7 7 0 1 ",
            "1-7-9z",
        ].join(""),
    },
    remove: {
        path: [
            "M6 7h2v9H6zm6 0h2v9h-2zM5 4h10l-1-",
            "2H6zm-2 1h14v2H3zm2 3h10l-1 10H6z",
        ].join(""),
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
        path: [
            "m5.4 4 4.6 4.6L14.6 4 16 5.4 11.4 ",
            "10l4.6 4.6-1.4 1.4-4.6-4.6L5.4 16 ",
            "4 14.6 8.6 10 4 5.4z",
        ].join(""),
    },
    pending: {
        path: [
            "M10 3a7 7 0 1 0 0 14 7 7 0 0 0 0-1",
            "4zm0 2a5 5 0 1 1 0 10 5 5 0 0 1 0-",
            "10z",
        ].join(""),
    },
    running: {
        path: "M10 3a7 7 0 1 0 7 7h-2a5 5 0 1 1-5-5z",
    },
    retrying: {
        path: [
            "M10 3a7 7 0 0 1 6.2 3.8L18 5v5h-5l",
            "1.8-1.8A5 5 0 1 0 15 12h2a7 7 0 1 ",
            "1-7-9z",
        ].join(""),
    },
    skipped: {
        path: "M4 5v10l7-5zm8 0h2v10h-2z",
    },
};
export const ARTICLE_PARAMETER_GROUPS = [
    new ArticleParameterGroup(
        "metadata",
        msg("metadata.tab"),
        [
            new ArticleParameterField(
                "enwikiTitle",
                msg("metadata.enwikiPage"),
                "enwikiTitle",
                null,
                {
                    placeholder: msg("metadata.enwikiPagePlaceholder"),
                },
            ),
            new ArticleParameterField(
                "developers",
                msg("metadata.developers"),
                "companies.developers",
                getSourceReferenceField("developers"),
                {
                    placeholder: msg("metadata.namesPlaceholder"),
                },
            ),
            new ArticleParameterField(
                "publishers",
                msg("metadata.publishers"),
                "companies.publishers",
                getSourceReferenceField("publishers"),
                {
                    placeholder: msg("metadata.namesPlaceholder"),
                },
            ),
            new ArticleParameterField(
                "series",
                msg("metadata.series"),
                "series",
                getSourceReferenceField("series"),
                {
                    placeholder: msg("metadata.titlePlaceholder"),
                },
            ),
            new ArticleParameterField(
                "platforms",
                msg("metadata.platforms"),
                "platforms",
                getSourceReferenceField("platforms"),
                {
                    placeholder: msg("metadata.namesPlaceholder"),
                },
            ),
            new ArticleParameterField(
                "year",
                msg("metadata.releaseYear"),
                "year",
                getSourceReferenceField("year"),
                {
                    placeholder: msg("metadata.yearPlaceholder"),
                },
            ),
            new ArticleParameterField(
                "genres",
                msg("metadata.genres"),
                "genres",
                getSourceReferenceField("genres"),
                {
                    placeholder: msg("metadata.namesPlaceholder"),
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
        msg("titles.tab"),
        [
            new ArticleParameterField(
                "originalName",
                msg("titles.originalTitle"),
                "originalName",
                getSourceReferenceField("originalName"),
                {
                    placeholder: "ja:タイトル or en:Title",
                },
            ),
            new ArticleParameterField(
                "englishName",
                msg("titles.englishTitle"),
                "englishName",
                getSourceReferenceField("englishName"),
                {
                    placeholder: msg("titles.localizedTitlePlaceholder"),
                    previewKey: "names",
                },
            ),
            new ArticleParameterField(
                "sortKey",
                msg("titles.defaultSortKey"),
                "sortKey",
                null,
                {
                    placeholder: msg("titles.defaultSortPlaceholder"),
                },
            ),
        ],
        "localizedNames",
        {
            description: msg("titles.description"),
            fieldsetLabel: msg("titles.foreignTitles"),
            noteTaReview: true,
        },
    ),
    new ArticleParameterGroup(
        "text",
        msg("text.tab"),
        [
            new ArticleParameterField(
                "pageName",
                msg("text.pageName"),
                "pageName",
                null,
                {
                    placeholder: msg("text.pageNamePlaceholder"),
                },
            ),
            new ArticleParameterField(
                "name",
                msg("text.articleDisplayTitle"),
                "name",
                null,
                {
                    placeholder: ARTICLE_TITLE_PLACEHOLDER,
                },
            ),
            new ArticleParameterField(
                "metacriticScore",
                msg("text.metacriticScore"),
                "scores.metacriticScore",
                getSourceReferenceField("metacriticScore"),
                {
                    compact: true,
                    heading: msg("text.metacriticScore"),
                    placeholder: "ps4:95 or 95",
                },
            ),
            new ArticleParameterField(
                "openCriticRecommend",
                msg("text.openCritic"),
                "scores.openCriticRecommend",
                getSourceReferenceField("openCriticRecommend"),
                {
                    compact: true,
                    heading: msg("text.openCritic"),
                    placeholder: msg("text.openCriticPlaceholder"),
                    previewKey: "score",
                },
            ),
            new ArticleParameterField(
                "additionalProse",
                msg("text.additionalProse"),
                "additionalProse",
                getSourceReferenceField("additionalProse"),
                {
                    multiline: true,
                    placeholder: msg("text.additionalProsePlaceholder"),
                },
            ),
        ],
        null,
        {
            description: msg("text.description"),
            fullTextReview: true,
        },
    ),
    new ArticleParameterGroup("references", msg("references.tab"), [], null, {
        citationReview: true,
        description: msg("references.description"),
    }),
    new ArticleParameterGroup("review", msg("review.tab"), [], null, {
        categoryReview: true,
        description: msg("review.description"),
    }),
];
