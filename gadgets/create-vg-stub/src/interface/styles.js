/* eslint-disable */

/**
 * Builds and installs styles for the create-vg-stub dialogs.
 */

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
        maxWidth: "min(96vw, 76em)",
        width: "min(96vw, 76em)",
    })
    .add(".create-vg-stub-category-view-dialog.cdx-dialog", {
        maxWidth: "min(96vw, 60em)",
        width: "min(96vw, 60em)",
    })
    .add(".create-vg-stub-preview-dialog.cdx-dialog", {
        maxWidth: "min(98vw, 100em)",
        width: "min(98vw, 100em)",
    })
    .add(".create-vg-stub-dialog-status", {
        margin: "0.75em 0",
    })
    .add(".create-vg-stub-dialog-body", {
        position: "relative",
    })
    .add(".create-vg-stub-dialog-mask", {
        alignItems: "center",
        backgroundColor: "rgba(255, 255, 255, 0.84)",
        display: "flex",
        inset: "0",
        justifyContent: "center",
        position: "absolute",
        zIndex: "2",
    })
    .add(".create-vg-stub-dialog-mask-panel", {
        backgroundColor: "var(--background-color-base, #fff)",
        border: "1px solid var(--border-color-subtle, #c8ccd1)",
        borderRadius: "2px",
        boxShadow: "0 2px 6px rgba(0, 0, 0, 0.2)",
        maxWidth: "min(24em, calc(100% - 2em))",
        padding: "1em",
        width: "18em",
    })
    .add(".create-vg-stub-dialog-mask-text", {
        margin: "0.75em 0 0",
        textAlign: "center",
    })
    .add(".create-vg-stub-category-view", {
        border: "1px solid var(--border-color-base, #a2a9b1)",
        height: "70vh",
        width: "100%",
    })
    .add(".create-vg-stub-dialog .cdx-field", {
        marginBottom: "1em",
    })
    .add(".create-vg-stub-dialog .cdx-message", {
        margin: "0.75em 0",
    })
    .add(".create-vg-stub-dialog section", {
        marginBottom: "1.5em",
    })
    .add(".create-vg-stub-dialog table", {
        margin: "0.5em 0",
        width: "100%",
    })
    .add(
        [
            ".create-vg-stub-dialog .cdx-table th",
            ".create-vg-stub-dialog .cdx-table td",
            ".create-vg-stub-dialog .cdx-table__table th",
            ".create-vg-stub-dialog .cdx-table__table td",
        ],
        {
            paddingBottom: "0.25em",
            paddingTop: "0.25em",
        },
    )
    .add(".create-vg-stub-dialog th", {
        whiteSpace: "nowrap",
    })
    .add(".create-vg-stub-review-table th:nth-child(1)", {
        width: "4.5em",
    })
    .add(".create-vg-stub-review-table th:nth-child(2)", {
        width: "6.5em",
    })
    .add(".create-vg-stub-review-table th:nth-child(4)", {
        width: "5.5em",
    })
    .add(".create-vg-stub-review-table th:nth-child(5)", {
        width: "5.5em",
    })
    .add(".create-vg-stub-review-row-marker", {
        display: "none",
    })
    .add(
        ".create-vg-stub-review-table tr:has(.create-vg-stub-review-row-marker--redirect-conflict) > td",
        {
            backgroundColor: "var(--background-color-error-subtle, #fee7e6)",
        },
    )
    .add(
        ".create-vg-stub-review-table tr:has(.create-vg-stub-review-row-marker--category-add) > td",
        {
            backgroundColor:
                "var(--background-color-progressive-subtle, #eaf3ff)",
        },
    )
    .add(".create-vg-stub-icon-tooltip", {
        background: "var(--background-color-inverted, #202122)",
        borderRadius: "2px",
        color: "var(--color-inverted, #fff)",
        fontSize: "0.8125em",
        lineHeight: "1.3",
        marginLeft: "0.25em",
        opacity: "0",
        padding: "0.15em 0.35em",
        pointerEvents: "none",
        position: "absolute",
        transform: "translateY(-0.15em)",
        transition: "opacity 100ms ease",
        whiteSpace: "nowrap",
        zIndex: "1",
    })
    .add(
        [
            ".cdx-table__header__content a:hover + .create-vg-stub-icon-tooltip",
            ".cdx-table__header__content a:focus + .create-vg-stub-icon-tooltip",
            ".cdx-table__header__content .create-vg-stub-icon-button:hover + .create-vg-stub-icon-tooltip",
            ".cdx-table__header__content .create-vg-stub-icon-button:focus + .create-vg-stub-icon-tooltip",
        ],
        {
            opacity: "1",
        },
    )
    .add(".create-vg-stub-icon-button.cdx-button", {
        minWidth: "2em",
    })
    .add(".create-vg-stub-field-controls", {
        display: "grid",
        gap: "0.5em",
        minWidth: "0",
    })
    .add(".create-vg-stub-field-controls--with-move", {
        alignItems: "start",
        gridTemplateColumns: "minmax(0, 1fr) auto",
    })
    .add(".create-vg-stub-field-controls--with-source", {
        alignItems: "start",
        display: "flex",
        flexWrap: "wrap",
    })
    .add(".create-vg-stub-field-controls--with-source > .cdx-field", {
        marginBottom: "0",
    })
    .add(
        [
            ".create-vg-stub-field-controls--with-source > :not(.create-vg-stub-source-url):not(.create-vg-stub-source-field)",
        ],
        {
            flex: "999 1 360px",
            minWidth: "min(100%, 360px)",
        },
    )
    .add(
        [
            ".create-vg-stub-field-controls--with-source > .create-vg-stub-source-url",
            ".create-vg-stub-field-controls--with-source > .create-vg-stub-source-field",
        ],
        {
            flex: "1 0 240px",
            maxWidth: "100%",
            minWidth: "min(100%, 240px)",
        },
    )
    .media("(max-width: 40em)", (sheet) => {
        sheet
            .add(
                [
                    ".create-vg-stub-field-controls--with-source > .create-vg-stub-source-url",
                    ".create-vg-stub-field-controls--with-source > .create-vg-stub-source-field",
                ],
                {
                    flexBasis: "100%",
                },
            )
            .add(".create-vg-stub-field-controls--with-move", {
                gridTemplateColumns: "1fr",
            });
    })
    .add(".create-vg-stub-steam-helper", {
        display: "grid",
        gap: "0.75em",
        marginBottom: "0.5em",
    })
    .add(".create-vg-stub-steam-row", {
        alignItems: "start",
        display: "grid",
        gap: "0.75em",
        gridTemplateColumns: "minmax(0, 1fr) auto",
    })
    .add(".create-vg-stub-steam-row--suggestions", {
        alignItems: "center",
    })
    .add(".create-vg-stub-steam-row > .cdx-button", {
        alignSelf: "start",
    })
    .add(".create-vg-stub-steam-actions", {
        justifySelf: "start",
    })
    .add(".create-vg-stub-steam-suggestion", {
        color: "var(--color-subtle, #54595d)",
        overflowWrap: "anywhere",
    })
    .add(".create-vg-stub-steam-links", {
        margin: "0",
        paddingLeft: "1.5em",
    })
    .add(".create-vg-stub-name-search", {
        margin: "0",
        paddingLeft: "1.5em",
    })
    .add(".create-vg-stub-name-search > li:not(:first-child)", {
        marginTop: "0.35em",
    })
    .add(".create-vg-stub-review-table .cdx-text-input", {
        maxWidth: "100%",
        minWidth: "0",
        width: "100%",
    })
    .add(".create-vg-stub-horizontal-list", {
        display: "flex",
        flexWrap: "wrap",
    })
    .add(".create-vg-stub-horizontal-list-item:not(:first-child)::before", {
        content: '" · "',
        whiteSpace: "pre",
    })
    .add(".create-vg-stub-name-settings-row", {
        alignItems: "center",
        display: "flex",
        flexWrap: "nowrap",
        gap: "0.75em 1em",
        marginBottom: "0.5em",
        overflowX: "auto",
        whiteSpace: "nowrap",
    })
    .add(".create-vg-stub-name-settings-row > .cdx-checkbox", {
        flex: "0 0 auto",
        marginBottom: "0",
        marginTop: "0",
    })
    .add(".create-vg-stub-name-official-checkbox", {
        marginRight: "1.5em",
    })
    .add(
        [
            ".create-vg-stub-article-field-text textarea",
            "textarea.create-vg-stub-article-field-text",
            ".create-vg-stub-source-url textarea",
            "textarea.create-vg-stub-source-url",
        ],
        {
            fontSize: "0.875em",
            lineHeight: "1.4",
            minHeight: "2.25em",
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
        margin: "0.25em 0 1em",
    })
    .add(".create-vg-stub-fieldset-fields", {
        display: "grid",
        gap: "0.75em",
    })
    .add(".create-vg-stub-fieldset-field .create-vg-stub-field-note", {
        marginBottom: "0",
    })
    .add(".create-vg-stub-preview-card", {
        margin: "1em 0",
    })
    .add(".create-vg-stub-preview-card-description", {
        color: "var(--color-subtle, #54595d)",
        margin: "0 0 0.5em",
    })
    .add(".create-vg-stub-preview-card-text", {
        fontFamily: "monospace",
        fontSize: "0.8125em",
        lineHeight: "1.4",
        margin: "0",
        maxHeight: "14em",
        overflow: "auto",
        whiteSpace: "pre-wrap",
        wordBreak: "break-word",
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
    .add(".create-vg-stub-destructive-action", {
        color: "var(--color-destructive, #d73333)",
    })
    .add(".create-vg-stub-company-category-text textarea", {
        fontFamily: "monospace",
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
        listStyle: "none",
        margin: "0",
        padding: "0",
    })
    .add(".create-vg-stub-pre-save-item", {
        margin: "0 -0.35em",
        padding: "0.2em 0.35em",
    })
    .add(".create-vg-stub-pre-save-progress-row", {
        alignItems: "start",
        display: "grid",
        gap: "0.4em",
        gridTemplateColumns: "min-content minmax(0, 1fr)",
    })
    .add(".create-vg-stub-pre-save-progress-row--running", {
        backgroundColor: "var(--background-color-progressive-subtle, #eaf3ff)",
        boxShadow: "inset 3px 0 0 var(--color-progressive, #36c)",
    })
    .add(".create-vg-stub-pre-save-progress-row--retrying", {
        backgroundColor: "var(--background-color-warning-subtle, #fef6e7)",
        boxShadow: "inset 3px 0 0 var(--color-warning, #edab00)",
    })
    .add(".create-vg-stub-pre-save-progress-row--failed", {
        backgroundColor: "var(--background-color-error-subtle, #fee7e6)",
        boxShadow: "inset 3px 0 0 var(--color-error, #d73333)",
    })
    .add(".create-vg-stub-pre-save-status-icon", {
        marginTop: "0.15em",
    })
    .add(".create-vg-stub-pre-save-status-icon--complete", {
        color: "var(--color-success, #14866d)",
    })
    .add(".create-vg-stub-pre-save-status-icon--failed", {
        color: "var(--color-error, #d73333)",
    })
    .add(".create-vg-stub-pre-save-status-icon--pending", {
        color: "var(--color-subtle, #54595d)",
    })
    .add(".create-vg-stub-pre-save-status-icon--running", {
        color: "var(--color-progressive, #36c)",
    })
    .add(".create-vg-stub-pre-save-status-icon--retrying", {
        color: "var(--color-warning, #edab00)",
    })
    .add(".create-vg-stub-pre-save-status-icon--skipped", {
        color: "var(--color-warning, #edab00)",
    })
    .add(".create-vg-stub-pre-save-note", {
        overflowWrap: "anywhere",
    })
    .add(".create-vg-stub-prose-length", {
        color: "var(--color-subtle, #54595d)",
        margin: "0.5em 0 1em",
    })
    .add(".create-vg-stub-tab-description", {
        color: "var(--color-subtle, #54595d)",
        margin: "0 0 1em",
        maxWidth: "48em",
    })
    .add(".create-vg-stub-citation", {
        borderBottom: "1px solid var(--border-color-subtle, #eaecf0)",
        margin: "1.25em 0",
        paddingBottom: "1.25em",
    })
    .media("(max-width: 40em)", (sheet) => {
        sheet.add(".create-vg-stub-steam-row", {
            gridTemplateColumns: "1fr",
        });
    })
    .toString();

/**
 * Adds dialog styles to the current page.
 *
 * @returns {void}
 */
export function addDialogStyles() {
    mw.util.addCSS(DIALOG_CSS);
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
