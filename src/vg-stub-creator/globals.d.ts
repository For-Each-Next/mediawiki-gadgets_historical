/** A value accepted by a MediaWiki template parameter. */
type TemplateParamValue = string | number | boolean | null | undefined;

/** A MediaWiki template parameter key and value. */
type TemplateParam = [string | number | null, TemplateParamValue];

/** One normalized value carried by an article data record. */
interface ArticleDataValue {
    [key: string]: any;
    displayText: string;
    linkTarget?: string;
    metadata?: Record<string, any>;
    normalizedText: string;
    wikitext: string;
}

/** A normalized record passed through article processing. */
interface ArticleDataRecord {
    [key: string]: any;
    assumedCategories: string[];
    assumedStubTags: string[];
    categoryItems: Record<string, any>[];
    categoryPlans: Record<string, any>[];
    citations: Record<string, any>[];
    inputText: Record<string, any>;
    issues: Record<string, any>[];
    key: string;
    metadata: Record<string, any>;
    navboxes: Record<string, any>[];
    normalizedText: Record<string, any>;
    sourceUrls: string[];
    values: ArticleDataValue[];
    wikitext: Record<string, any>;
}

declare const __VG_STUB_CREATOR_DIALOG_CSS__: string;
