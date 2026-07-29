/**
 * Defines editable form values, review rows, and restoration behavior.
 */

import {
    ARTICLE_PARAMETER_GROUPS,
    NAME_MARKETS,
    NOTE_TA_NAMES_SOURCE,
    SOURCE_REFERENCE_FIELDS,
    STEAM_NAME_HELPER_ROW,
} from "#gadget/ui/form/constants.ts";
import { getEnteredSourceUrls } from "#gadget/domain/source-fields.ts";
import {
    buildOfficialNameConversionText,
    sortNoteTaEntries,
} from "#gadget/domain/wiki.ts";
import { sortCitationParams } from "#gadget/domain/citations/index.ts";
import { msg } from "#gadget/i18n/index.ts";
import * as reviewLinkSession from "#gadget/ui/form/review-link-session.ts";
import * as wikitext from "#shared/wikitext";

export {
    buildGoogleSiteSearchUrl,
    buildMetacriticSearchUrl,
    buildMetacriticUrl,
    buildOpenCriticSearchUrl,
    buildOpenCriticUrl,
    buildSteamSearchUrl,
    buildSteamUrl,
    buildWikidataSearchUrl,
    createBlankEnwikiMetadata,
    createEnwikiTipPlaceholders,
    extractEnwikiTitleFromUrl,
    getBasePageTitle,
    getWikidataLookupStatus,
    normalizeEnwikiTitleValue,
} from "#gadget/ui/form/external-links.ts";
export const { claimReviewLinksOpening } = reviewLinkSession;

const {
    hasFirstLevelFieldSeparator,
    parsePrefixedValue,
    splitFieldValues,
    trimValue,
} = wikitext;

/**
 * Normalizes a list value entered through an article field.
 *
 * @param value - Raw textbox value.
 * @returns Semicolon-delimited list value.
 */
export function normalizeListFieldValue(value: any): string {
    const text = trimValue(value);

    if (!hasFirstLevelFieldSeparator(text)) {
        return text;
    }

    return splitFieldValues(text).join("; ");
}

/**
 * Marks a localized-name row as inserted by the Steam helper.
 *
 * @param row - Localized-name row.
 * @returns The marked row.
 */
export function markSteamNameHelperRow(row: any): any {
    Object.defineProperty(row, STEAM_NAME_HELPER_ROW, {
        configurable: true,
        value: true,
    });

    return row;
}

/**
 * Formats a category row source as a compact badge label.
 *
 * @param source - Category row source.
 * @returns Compact source label.
 */
export function formatCategorySourceLabel(source: string): string {
    const { label, modified } = getCategorySourceDisplay(source);

    return modified ? `${label}†` : label;
}

/**
 * Formats a category row source tooltip.
 *
 * @param source - Category row source.
 * @returns Source tooltip.
 */
export function formatCategorySourceTitle(source: string): string {
    const { label, modified } = getCategorySourceDisplay(source);

    return modified ? msg("review.modified", { label }) : label;
}

/**
 * Gets display metadata for a category source.
 *
 * @param source - Category row source.
 * @returns Source display metadata.
 */
export function getCategorySourceDisplay(source: string): any {
    const value = String(source || "").trim();
    const modified = value.endsWith("†");
    const base = modified ? value.replace(/\s*†$/u, "") : value;
    const labels: Record<string, string> = {
        found: msg("review.found"),
        known: msg("review.known"),
        manual: msg("review.manual"),
        suggested: msg("review.suggested"),
    };
    const label = labels[base] || base;

    const result = {
        label,
        modified,
    };
    return result;
}

/**
 * Normalizes an English Wikipedia category title.
 *
 * @param title - User-entered English category name.
 * @returns Canonical English category title, or an empty
 * string.
 */
export function normalizeEnglishCategoryTitle(title: string): string {
    const value = trimValue(title);

    if (value === "") {
        return "";
    }

    return /^Category:/iu.test(value) ? value : `Category:${value}`;
}

/**
 * Initializes editable stub-tag rows from generated category metadata.
 *
 * @param form - Dialog form values.
 * @returns Result when the function
 *   initializes editable stub-tag rows from generated
 *   category metadata.
 */
export function initializeStubTagRows(form: any): void {
    if (form.stubTagRows != null) {
        return;
    }

    form.stubTagRows = buildStubTagRowsFromCategories(form.categoryRows);
    ensureTrailingStubTagRow(form);
}

/**
 * Adds newly generated stub-tag rows while preserving editable rows.
 *
 * @param form - Dialog form values.
 * @returns Result when the function
 *   adds newly generated stub-tag rows while
 *   preserving editable rows.
 */
export function syncStubTagRowsFromCategories(form: any): void {
    if (form.stubTagRows == null) {
        initializeStubTagRows(form);
        return;
    }

    const rows = ensureStubTagRows(form);
    const mapCallbackG = (row: any) => trimStubTagValue(row.stubTag);
    const existingTags = rows.map(mapCallbackG);
    const filterCallbackC = function callback(row: any) {
        const stubTag = trimStubTagValue(row.stubTag);

        return stubTag !== "" && !existingTags.includes(stubTag);
    };
    const additions = buildStubTagRowsFromCategories(form.categoryRows).filter(
        filterCallbackC,
    );

    if (additions.length === 0) {
        ensureTrailingStubTagRow(form);
        return;
    }

    const filterCallbackB = (row: any) => !isBlankStubTagRow(row);
    const nonBlankRows = rows.filter(filterCallbackB);

    rows.splice(0, rows.length, ...nonBlankRows, ...additions);
    ensureTrailingStubTagRow(form);
}

/**
 * Builds unique stub-tag rows from category rows.
 *
 * @param rows - Category review rows.
 * @returns Stub-tag review rows.
 */
export function buildStubTagRowsFromCategories(rows: Array<any>): Array<any> {
    const tags: string[] = [];
    const safeRows = (rows || []).filter(Boolean);

    const forEachCallbackC = function callback(row: any) {
        const stubTag = trimStubTagValue(row.stubTag);

        if (stubTag !== "" && !tags.includes(stubTag)) {
            tags.push(stubTag);
        }
    };
    safeRows.forEach(forEachCallbackC);

    const mapCallbackF = function callback(stubTag: string) {
        const someCallbackA = function callback(row: any) {
            const result =
                trimStubTagValue(row.stubTag) === stubTag &&
                row.stubTagEnabled === true;
            return result;
        };
        const someCallbackB = function callback(row: any) {
            const result =
                trimStubTagValue(row.stubTag) === stubTag &&
                row.originalStubTagEnabled === true;
            return result;
        };
        const someResult = {
            enabled: safeRows.some(someCallbackA),
            originalEnabled: safeRows.some(someCallbackB),
            originalStubTag: stubTag,
            stubTag,
        };
        const result = createStubTagRow(someResult);
        return result;
    };
    const result = tags.map(mapCallbackF);
    return result;
}

/**
 * Ensures the form has editable stub-tag rows.
 *
 * @param form - Dialog form values.
 * @returns Stub-tag rows.
 */
export function ensureStubTagRows(form: any): Array<any> {
    if (!Array.isArray(form.stubTagRows)) {
        form.stubTagRows = [];
    }

    return form.stubTagRows;
}

/**
 * Handles clean editable rows.
 *
 * Removes surplus blank editable rows while keeping one blank row if
 * present.
 *
 * @param rows - Editable rows.
 * @param isBlank - Blank row predicate.
 * @param createBlank - Blank row factory.
 * @returns Cleaned editable rows.
 */
export function cleanEditableRows(
    rows: Array<any>,
    isBlank: (...args: any[]) => any,
    createBlank: (...args: any[]) => any,
): Array<any> {
    const filterCallbackA = (row: any) => !isBlank(row);
    const nonBlankRows = rows.filter(filterCallbackA);
    const hasBlankRow = rows.some(isBlank);

    if (hasBlankRow || nonBlankRows.length === 0) {
        return [...nonBlankRows, createBlank()];
    }

    return nonBlankRows;
}

/**
 * Ensures an editable row list has exactly one blank row at the bottom.
 *
 * @param rows - Editable rows.
 * @param isBlank - Blank row predicate.
 * @param createBlank - Blank row factory.
 * @returns Result when the function
 *   ensures an editable row list has exactly one blank
 *   row at the bottom.
 */
export function ensureTrailingEditableRow(
    rows: Array<any>,
    isBlank: (...args: any[]) => any,
    createBlank: (...args: any[]) => any,
): void {
    const filterCallback = (row: any) => !isBlank(row);
    const nonBlankRows = rows.filter(filterCallback);

    const blankResult = createBlank();
    rows.splice(0, rows.length, ...nonBlankRows, blankResult);
}

/**
 * Ensures category review rows end with one blank row.
 *
 * @param form - Dialog form values.
 * @param _createBlank - Unused legacy category row factory.
 * @returns Result when the function
 *   ensures category review rows end with one blank
 *   row.
 */
export function ensureTrailingCategoryRow(
    form: any,
    _createBlank: (...args: any[]) => any,
): void {
    if (!Array.isArray(form.categoryRows)) {
        form.categoryRows = [];
    }

    ensureTrailingEditableRow(
        form.categoryRows,
        isBlankCategoryRow,
        createBlankCategoryRow,
    );
}

/**
 * Ensures redirect review rows end with one blank row.
 *
 * @param form - Dialog form values.
 * @returns Result when the function
 *   ensures redirect review rows end with one blank
 *   row.
 */
export function ensureTrailingRedirectRow(form: any): void {
    const ensureRedirectRowsResult = ensureRedirectRows(form);
    ensureTrailingEditableRow(
        ensureRedirectRowsResult,
        isBlankRedirectRow,
        createRedirectRow,
    );
}

/**
 * Ensures navbox review rows end with one blank row.
 *
 * @param form - Dialog form values.
 * @returns Result when the function
 *   ensures navbox review rows end with one blank row.
 */
export function ensureTrailingNavboxRow(form: any): void {
    const ensureNavboxRowsResult = ensureNavboxRows(form);
    ensureTrailingEditableRow(
        ensureNavboxRowsResult,
        isBlankNavboxRow,
        createNavboxRow,
    );
}

/**
 * Ensures stub-tag review rows end with one blank row.
 *
 * @param form - Dialog form values.
 * @returns Result when the function
 *   ensures stub-tag review rows end with one blank
 *   row.
 */
export function ensureTrailingStubTagRow(form: any): void {
    const ensureStubTagRowsResult = ensureStubTagRows(form);
    ensureTrailingEditableRow(
        ensureStubTagRowsResult,
        isBlankStubTagRow,
        createStubTagRow,
    );
}

/**
 * Checks whether a category row is blank.
 *
 * @param row - Category row.
 * @returns Whether the row is blank.
 */
export function isBlankCategoryRow(row: any): boolean {
    return trimValue(row?.category) === "";
}

/**
 * Creates a fallback manual category row.
 *
 * @returns Blank category row.
 */
export function createBlankCategoryRow(): any {
    const result = {
        category: "",
        enabled: true,
        source: "manual",
    };
    return result;
}

/**
 * Checks whether a stub-tag row is blank.
 *
 * @param row - Stub-tag row.
 * @returns Whether the row is blank.
 */
export function isBlankStubTagRow(row: any): boolean {
    return trimStubTagValue(row?.stubTag) === "";
}

/**
 * Checks whether a stub-tag row was entered manually.
 *
 * @param row - Stub-tag row.
 * @returns Whether the row was manually entered.
 */
export function isManualStubTagRow(row: any): boolean {
    const result =
        trimStubTagValue(row?.stubTag) !== "" &&
        trimStubTagValue(row?.originalStubTag) === "";
    return result;
}

/**
 * Creates one stub-tag review row.
 *
 * @param value - Existing row or template name.
 * @returns Stub-tag review row.
 */
export function createStubTagRow(value: any = ""): any {
    const stubTag = trimStubTagValue(value?.stubTag ?? value);

    const result = {
        enabled: value?.enabled !== false,
        originalEnabled: value?.originalEnabled === true,
        originalStubTag: trimStubTagValue(value?.originalStubTag || stubTag),
        status: trimValue(value?.status),
        stubTag,
        ...(value?.pendingEdit == null
            ? {}
            : { pendingEdit: value.pendingEdit }),
    };
    return result;
}

/**
 * Normalizes a stub template name entered by the user.
 *
 * @param value - Stub template name.
 * @returns Template name without braces.
 */
export function trimStubTagValue(value: any): string {
    const result = trimValue(value)
        .replace(/^\{\{/u, "")
        .replace(/\}\}$/u, "")
        .trim();
    return result;
}

/**
 * Creates a debounced citation prefetch queue.
 *
 * @param options - Dialog options.
 * @param options.citationPrefetchDelay - Citation prefetch
 * debounce
 * delay.
 * @param options.onSourceUrlChange - Source URL change
 * handler.
 * @returns Citation prefetch queue function.
 */
export function createCitationPrefetchQueue(
    options: any,
): (...args: any[]) => any {
    let lastUrlsKey: string | null = null;
    let timer: ReturnType<typeof setTimeout> | null = null;

    const result = function callback(form: Record<string, unknown>) {
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

        const setTimeoutCallback = function callback() {
            urls.forEach(options.onSourceUrlChange);
        };
        timer = setTimeout(
            setTimeoutCallback,
            options.citationPrefetchDelay || 0,
        );
    };
    return result;
}

/**
 * Creates empty form values keyed by input field name.
 *
 * @returns Initial dialog form values.
 */
export function createFormValues(): any {
    const mappedValuesA = [
        ...getArticleFields(),
        ...SOURCE_REFERENCE_FIELDS,
    ].map(getEmptyFieldValue);
    const result = {
        ...Object.fromEntries(mappedValuesA),
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
    return result;
}

/**
 * Creates one localized name row.
 *
 * @param selectedMarkets - Initially selected market
 * codes.
 * @param options - Initial row options.
 * @param options.official - Whether the row is official.
 * @returns Localized name row.
 */
export function createNameRow(
    selectedMarkets: Array<string> = [],
    options: any = {},
): any {
    const mapCallbackE = function callback(
        market: (typeof NAME_MARKETS)[number],
    ) {
        return [market.key, selectedMarkets.includes(market.key)];
    };
    const mappedValues = NAME_MARKETS.map(mapCallbackE);
    const result = {
        ...Object.fromEntries(mappedValues),
        name: "",
        official: Boolean(options.official),
        sourceUrl: "",
    };
    return result;
}

/**
 * Creates one editable NoteTA row.
 *
 * @param key - Existing row or row key.
 * @param value - Row value.
 * @returns NoteTA row.
 */
export function createNoteTaRow(key: any = "", value: string = ""): any {
    const row = key != null && typeof key === "object" ? key : { key, value };

    const created: Record<string, any> = {
        key: trimValue(row.key),
        value: trimValue(row.value),
    };

    if (trimValue(row.source) !== "") {
        created.source = trimValue(row.source);
    }

    if (trimValue(row.generatedValue) !== "") {
        created.generatedValue = trimValue(row.generatedValue);
    }

    if (row.modified === true) {
        created.modified = true;
    }

    return created;
}

/**
 * Creates one localized name row from fetched helper values.
 *
 * @param values - Localized name values.
 * @returns Localized name row.
 */
export function createNameRowFromValues(values: any): any {
    const nameRowSelectedMarketsResult = getNameRowSelectedMarkets(values);
    const result = {
        ...createNameRow(nameRowSelectedMarketsResult),
        ...values,
    };
    return result;
}

/**
 * Formats fetched Steam names as linked preview items.
 *
 * @param rows - Fetched Steam name rows.
 * @returns Labeled Steam name suggestions.
 */
export function getSteamNameSuggestions(rows: Array<any>): Array<any> {
    const mapCallbackD = function callback(row: any) {
        const result = {
            label: row.label || formatSteamNameMarkets(row),
            url: row.sourceUrl,
            value: row.name,
        };
        return result;
    };
    const result = rows.map(mapCallbackD);
    return result;
}

/**
 * Formats selected Steam name markets.
 *
 * @param row - Fetched Steam name row.
 * @returns Market label.
 */
export function formatSteamNameMarkets(row: any): string {
    return getNameRowSelectedMarkets(row).map(formatSteamNameMarket).join("/");
}

/**
 * Formats one Steam name market key.
 *
 * @param market - Market key.
 * @returns Market label.
 */
export function formatSteamNameMarket(market: string): string {
    const item = NAME_MARKETS.find((entry) => entry.key === market);

    return item?.label || market;
}

/**
 * Gets the normalized original-title language for helper lookups.
 *
 * @param form - Current form values.
 * @returns Original-title language code.
 */
export function getOriginalNameLanguage(form: any): string {
    if (trimValue(form.originalName) === "") {
        return "";
    }

    const result = parsePrefixedValue(
        form.originalName,
        form.originalLanguage || "ja",
    ).prefix.toLocaleLowerCase();
    return result;
}

/**
 * Builds localized name rows from a Steam helper choice.
 *
 * @param rows - Fetched Steam name rows.
 * @param choice - Steam helper choice key.
 * @returns Localized name rows to apply.
 */
export function buildSteamNameChoiceRows(
    rows: Array<any>,
    choice: string,
): Array<any> {
    const hans = findSteamNameRow(rows, "hans");
    const hant = findSteamNameRow(rows, "hant");

    if (choice === "simp") {
        return hans == null ? [] : [hans];
    }

    if (choice === "trad") {
        return hant == null ? [] : [hant];
    }

    if (choice === "diff") {
        return [hans, hant].filter(Boolean);
    }

    if (choice === "same") {
        return [mergeSteamNameRows(hans, hant, false, false)].filter(Boolean);
    }

    return [];
}

/**
 * Finds one fetched Steam name row by market.
 *
 * @param rows - Fetched Steam name rows.
 * @param market - Market key.
 * @returns Matching row.
 */
export function findSteamNameRow(
    rows: Array<any>,
    market: string,
): any | undefined {
    const findCallback = function matchesSteamMarket(row: any) {
        return getNameRowSelectedMarkets(row).includes(market);
    };
    return rows.find(findCallback);
}

/**
 * Merges fetched Steam rows into one localized name row.
 *
 * @param hans - Simplified Chinese Steam row.
 * @param hant - Traditional Chinese Steam row.
 * @param blankName - Whether to leave the name blank for
 * manual
 * entry.
 * @param worldwide - Worldwide value.
 * @returns Merged localized name row.
 */
export function mergeSteamNameRows(
    hans: any,
    hant: any,
    blankName: boolean,
    worldwide = true,
): any | undefined {
    const rows = [hans, hant].filter(Boolean);

    if (rows.length === 0) {
        return undefined;
    }

    const row: Record<string, any> = {
        name: blankName ? "" : trimValue(hans?.name || hant?.name),
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
 * @param values - Localized name values.
 * @returns Selected market keys.
 */
export function getNameRowSelectedMarkets(values: any): Array<string> {
    const result =
        values.markets ||
        NAME_MARKETS.filter((market) => values[market.key]).map(
            (market) => market.key,
        );
    return result;
}

/**
 * Ensures localized name rows end with a blank row.
 *
 * @param rows - Localized name rows.
 * @returns Result when the function
 *   ensures localized name rows end with a blank row.
 */
export function ensureTrailingNameRow(rows: Array<any>): void {
    if (!Array.isArray(rows) || rows.length === 0) {
        const nameRowResultA = createNameRow();
        rows.push(nameRowResultA);
        return;
    }

    if (hasAnyNameRowValue(rows[rows.length - 1])) {
        const nameRowResult = createNameRow();
        rows.push(nameRowResult);
    }
}

/**
 * Checks whether a localized name row has any edited value.
 *
 * @param row - Localized name row.
 * @returns Whether the row has any user-facing value.
 */
export function hasAnyNameRowValue(row: any): boolean {
    const result =
        hasEnteredNameRowValue(row) ||
        Boolean(row.official) ||
        getNameRowSelectedMarkets(row).length > 0;
    return result;
}

/**
 * Checks whether a localized name row has entered text.
 *
 * @param row - Localized name row.
 * @param row.name - Localized name value.
 * @param row.sourceUrl - Localized name source URL.
 * @returns Whether the row should be kept.
 */
export function hasEnteredNameRowValue(row: any): boolean {
    const name = trimValue(row.name);

    if (Boolean(name)) {
        return true;
    }

    const sourceUrl = trimValue(row.sourceUrl);
    return Boolean(sourceUrl);
}

/**
 * Flattens article parameter groups into field metadata.
 *
 * @returns Dialog field definitions.
 */
export function getArticleFields(): Array<any> {
    return ARTICLE_PARAMETER_GROUPS.flatMap(getGroupFields);
}

/**
 * Gets an article field definition by form key.
 *
 * @param key - Form key for the field.
 * @returns Matching field definition.
 */
export function getArticleField(key: string): any {
    return getArticleFields().find((field) => field.key === key);
}

/**
 * Maps review existence states to Codex InfoChip statuses.
 *
 * @param status - Review status value.
 * @returns Codex InfoChip status.
 */
export function getReviewStatusChipStatus(status: string): string {
    if (status === "OK" || status === "Exists") {
        return "success";
    }

    if (String(status || "").startsWith("Pending")) {
        return "progressive";
    }

    if (status === "Missing" || status === "Not exists") {
        return "warning";
    }

    return "notice";
}

/**
 * Gets a registered source URL field by article field key.
 *
 * @param key - Article field key.
 * @returns Matching source field definition.
 */
export function getSourceReferenceField(key: string): any | undefined {
    return SOURCE_REFERENCE_FIELDS.find((field) => field.key === key);
}

/**
 * Gets the fields from an article parameter group.
 *
 * @param group - Article parameter group.
 * @param group.fields - Field definitions in the group.
 * @returns Field definitions for the group.
 */
export function getGroupFields(group: any): Array<any> {
    return group.fields;
}

/**
 * Creates an empty value entry for a field tuple.
 *
 * @param field - Dialog field definition.
 * @param field.key - Form key for the field.
 * @param field.sourceKey - Form key for the source URL.
 * @returns Field key paired with an empty string.
 */
export function getEmptyFieldValue(field: any): Array<string> {
    return [getFieldValueKey(field), ""];
}

/**
 * Gets the form value key for one field.
 *
 * @param field - Dialog field definition.
 * @param field.key - Form key for article fields.
 * @param field.sourceKey - Form key for source URL fields.
 * @returns Form value key.
 */
export function getFieldValueKey(field: any): string {
    return field.sourceKey || field.key;
}

/**
 * Replaces a reactive form object with received form values.
 *
 * @param form - Reactive form object.
 * @param values - Received form values.
 * @returns Result when the function
 *   replaces a reactive form object with received form
 *   values.
 */
export function replaceFormValues(form: any, values: any): void {
    Object.keys(form).forEach(function callback(key) {
        delete form[key];
    });
    const receivedFormValuesResult = normalizeReceivedFormValues(values);
    Object.assign(form, receivedFormValuesResult);
}

/**
 * Normalizes received form values for the current dialog shape.
 *
 * @param values - Received form values.
 * @returns Normalized form values.
 */
export function normalizeReceivedFormValues(values: any): any {
    const normalized = cloneValue(values);

    normalizeReceivedReviewRows(normalized);
    normalizeReceivedCitationRows(normalized);
    normalizeReceivedNoteTaRows(normalized);
    normalizeReceivedNameRows(normalized);

    delete normalized.officialNames;
    delete normalized.commonNames;

    return normalized;
}

/**
 * Normalizes received article-review rows.
 *
 * @param form - Form values.
 */
function normalizeReceivedReviewRows(form: Record<string, unknown>): void {
    if (!Object.hasOwn(form, "registerNewPage")) {
        form.registerNewPage = true;
    }
    form.navboxRows = normalizeOptionalRows(
        form,
        "navboxRows",
        createNavboxRow,
    );
    form.redirectRows = normalizeOptionalRows(
        form,
        "redirectRows",
        createRedirectRow,
    );
    form.stubTagRows = normalizeOptionalRows(
        form,
        "stubTagRows",
        createStubTagRow,
    );

    if (!Array.isArray(form.categoryRows)) {
        form.categoryRows = [];
    }
}

/**
 * Normalizes an optional review-row collection.
 *
 * @param form - Form values.
 * @param key - Lookup key.
 * @param createRow - Create row value.
 * @returns An optional review-row collection.
 */
function normalizeOptionalRows(
    form: Record<PropertyKey, unknown>,
    key: PropertyKey,
    createRow: (value: unknown) => unknown,
): unknown[] | null {
    if (!Object.hasOwn(form, key)) {
        return null;
    }

    const rows = form[key];

    return Array.isArray(rows) ? rows.map(createRow) : null;
}

/**
 * Normalizes received managed citation rows.
 *
 * @param form - Form values.
 */
function normalizeReceivedCitationRows(form: {
    citationRows: unknown[];
}): void {
    if (Array.isArray(form.citationRows)) {
        form.citationRows = form.citationRows.map(createCitationRow);
        return;
    }

    form.citationRows = [];
}

/**
 * Normalizes received NoteTA rows and removal state.
 *
 * @param form - Form values.
 */
function normalizeReceivedNoteTaRows(form: Record<string, unknown>): void {
    if (!Object.hasOwn(form, "noteTaNamesRemoved")) {
        form.noteTaNamesRemoved = false;
    }
    if (Array.isArray(form.noteTaRows)) {
        const mapCallbackC = (row: unknown) => createNoteTaRow(row);
        form.noteTaRows = form.noteTaRows.map(mapCallbackC);
        return;
    }

    form.noteTaRows = [createNoteTaRow("G1", "Games")];
}

/**
 * Migrates legacy official/common names to localized-name rows.
 *
 * @param form - Form values.
 */
function normalizeReceivedNameRows(form: {
    localizedNames: Array<Record<string, unknown>>;
    officialNames: Array<Record<string, unknown>>;
    commonNames: Array<Record<string, unknown>>;
}): void {
    if (Array.isArray(form.localizedNames)) {
        form.localizedNames = form.localizedNames.map(createNameRowFromValues);
        ensureTrailingNameRow(form.localizedNames);
        return;
    }

    const official = addOfficialNameState(form.officialNames || [], true);
    const common = addOfficialNameState(form.commonNames || [], false);

    form.localizedNames = [...official, ...common].map(
        createNameRowFromValues,
    );
    ensureTrailingNameRow(form.localizedNames);
}

/**
 * Fills the article page title from one localized-name row.
 *
 * @param form - Mutable form values.
 * @param key - Localized-name group key.
 * @param index - Localized-name row index.
 * @returns Whether a non-empty title was applied.
 */
export function applyLocalizedNameAsPageTitle(
    form: any,
    key: string,
    index: number,
): boolean {
    const title = trimValue(form[key]?.[index]?.name);

    if (title === "") {
        return false;
    }

    form.pageName = title;
    return true;
}

/**
 * Adds an official-name flag to legacy name rows.
 *
 * @param rows - Row values.
 * @param official - Official value.
 * @returns Result when the function
 *   adds an official-name flag to legacy name rows.
 */
function addOfficialNameState(
    rows: Array<Record<string, unknown>>,
    official: boolean,
): Array<Record<string, unknown>> {
    const result = rows.map(function callback(row) {
        return { ...row, official };
    });
    return result;
}

/**
 * Gets restorable flat form values from structured history JSON.
 *
 * @param entry - History entry or structured data.
 * @returns Restorable form values.
 */
export function getHistoryEntryForm(entry: any): any {
    if (
        Number.isInteger(entry?.id) &&
        entry?.data?.input != null &&
        entry?.metadata != null
    ) {
        const result = {
            ...cloneValue(entry.data.input),
            historyPatches: cloneValue(entry.data.patches || {}),
        };
        return result;
    }

    return undefined;
}

/**
 * Applies citation patches to generated citation rows.
 *
 * @param rows - Generated citation rows.
 * @param patches - Citation patches.
 * @returns Patched citation rows.
 */
export function applyCitationPatches(
    rows: Array<any>,
    patches: Array<any> = [],
): Array<any> {
    const mapCallbackB = function callback(row: any) {
        const findCallbackC = function matchesCitationPatch(item: any) {
            return trimValue(item.sourceUrl) === row.sourceUrl;
        };
        const patch = patches.find(findCallbackC);

        if (patch == null) {
            return row;
        }

        const cloneValueResultB = {
            ...row,
            ...cloneValue(patch),
            params: applyCitationParamPatches(
                row.generatedParams,
                patch.params,
            ),
            modified: true,
            sourceUrl: row.sourceUrl,
        };
        const result = createCitationRow(cloneValueResultB);
        return result;
    };
    const result = rows.map(mapCallbackB);
    return result;
}

/**
 * Applies citation parameter patches to generated parameters.
 *
 * @param generatedParams - Generated citation
 * parameters.
 * @param patches - Citation parameter patches.
 * @returns Patched citation parameters.
 */
export function applyCitationParamPatches(
    generatedParams: Array<any> = [],
    patches: Array<any> = [],
): Array<any> {
    const clonedParams: Array<{ name: string }> = cloneValue(generatedParams);
    const entries: Array<[string, { name: string }]> = clonedParams.map(
        (param) => [param.name, param],
    );
    const params = new Map(entries);

    const forEachCallbackB = function callback(patch: any) {
        if (trimValue(patch?.name) === "") {
            return;
        }

        if (patch.value == null || trimValue(patch.value) === "") {
            params.delete(patch.name);
            return;
        }

        const cloneValueResultA = cloneValue(patch);
        params.set(patch.name, cloneValueResultA);
    };
    patches.forEach(forEachCallbackB);

    const valuesResult = params.values();
    return Array.from(valuesResult);
}

/**
 * Applies category patches to generated category rows.
 *
 * @param rows - Generated category rows.
 * @param patches - Category patches.
 * @returns Result when the function
 *   applies category patches to generated category
 *   rows.
 */
export function applyCategoryPatches(
    rows: Array<any>,
    patches: Array<any> = [],
): void {
    const forEachCallbackA = function callback(patch: any) {
        if (patch.source?.manual === true) {
            const categoryPatchRowResult = createCategoryPatchRow(patch);
            rows.push(categoryPatchRowResult);
            return;
        }

        const findCallbackB = (item: any) =>
            isCategoryPatchTarget(item, patch);
        const row = rows.find(findCallbackB);

        if (row != null) {
            const values = cloneValue(patch);

            delete values.source;
            Object.assign(row, values);
        }
    };
    patches.forEach(forEachCallbackA);
}

/**
 * Applies navbox patches to generated navbox rows.
 *
 * @param rows - Generated navbox rows.
 * @param patches - Navbox patches.
 * @returns Patched navbox rows.
 */
export function applyNavboxPatches(
    rows: Array<any>,
    patches: Array<any> = [],
): Array<any> {
    const mapCallbackA = function callback(row: any) {
        const findCallbackA = function matchesNavboxPatch(item: any) {
            return trimValue(item.source?.title) === row.title;
        };
        const patch = patches.find(findCallbackA);

        if (patch == null) {
            return row;
        }

        const cloneValueResult = {
            ...row,
            ...cloneValue(patch),
            title: row.title,
        };
        const result = createNavboxRow(cloneValueResult);
        return result;
    };
    const result = rows.map(mapCallbackA);
    return result;
}

/**
 * Checks whether a category row matches a patch source.
 *
 * @param row - Generated category row.
 * @param patch - Category patch.
 * @returns Whether the patch targets the row.
 */
export function isCategoryPatchTarget(row: any, patch: any): boolean {
    if (trimValue(patch.source?.company) !== "") {
        const result =
            trimValue(row.company) === trimValue(patch.source.company);
        return result;
    }

    const result =
        trimValue(row.originalCategory || row.category) ===
        trimValue(patch.source?.category);
    return result;
}

/**
 * Creates a category row from a patch.
 *
 * @param patch - Category patch.
 * @returns Category row.
 */
export function createCategoryPatchRow(patch: any): any {
    const result = {
        category: trimValue(patch.category),
        company: trimValue(patch.company),
        enabled: patch.enabled !== false,
        originalCategory: trimValue(patch.category),
        originalStubTagEnabled: patch.stubTagEnabled === true,
        source: "manual",
        status: trimValue(patch.status),
        stubTag: trimValue(patch.stubTag),
        stubTagEnabled: patch.stubTagEnabled === true,
    };
    return result;
}

/**
 * Lists the generated name conversion rule as an editable NoteTA row.
 *
 * @param form - Dialog form values.
 * @returns The generated name conversion rule as an editable NoteTA
 *   row.
 */
export function syncGeneratedNameNoteTaRow(form: any): void {
    const officialNameNoteTaRowsResultA = getOfficialNameNoteTaRows(form);
    const generated = buildOfficialNameConversionText(
        officialNameNoteTaRowsResultA,
    );
    const rows = ensureNoteTaRows(form);
    const index = rows.findIndex((row) => row.source === NOTE_TA_NAMES_SOURCE);
    const current = index === -1 ? null : rows[index];

    if (form.noteTaNamesRemoved) {
        removeNoteTaRow(rows, index);
        return;
    }

    if (current?.modified && current.generatedValue === generated) {
        return;
    }

    if (generated == null) {
        removeNoteTaRow(rows, index);
        return;
    }

    const row = createGeneratedNameNoteTaRow(generated);

    if (index === -1) {
        const generatedNameNoteTaInsertIndex =
            getGeneratedNameNoteTaInsertIndex(rows);
        rows.splice(generatedNameNoteTaInsertIndex, 0, row);
        return;
    }

    delete current.modified;
    Object.assign(current, row);
}

/**
 * Creates the generated official-name NoteTA row.
 *
 * @param generated - Generated value.
 * @returns The generated official-name NoteTA row.
 */
function createGeneratedNameNoteTaRow(generated: string): any {
    const row = createNoteTaRow({
        generatedValue: generated,
        key: "1",
        source: NOTE_TA_NAMES_SOURCE,
        value: generated,
    });

    return row;
}

/**
 * Removes a generated NoteTA row when present.
 *
 * @param rows - Row values.
 * @param index - Zero-based item index.
 */
function removeNoteTaRow(rows: Array<any>, index: number): void {
    if (index !== -1) {
        rows.splice(index, 1);
    }
}

/**
 * Rebuilds generated NoteTA rows while preserving manual rows.
 *
 * @param form - Dialog form values.
 * @returns Result when the function
 *   rebuilds generated noteta rows while preserving
 *   manual rows.
 */
export function regenerateNoteTaRows(form: any): void {
    const rows = ensureNoteTaRows(form);
    const manualRows = rows.filter(isManualNoteTaRow);
    const generatedRows = [createNoteTaRow("G1", "Games")];
    const officialNameNoteTaRowsResult = getOfficialNameNoteTaRows(form);
    const generated = buildOfficialNameConversionText(
        officialNameNoteTaRowsResult,
    );

    form.noteTaNamesRemoved = false;

    if (generated != null) {
        const noteTaRowResult = createNoteTaRow({
            generatedValue: generated,
            key: "1",
            source: NOTE_TA_NAMES_SOURCE,
            value: generated,
        });
        generatedRows.push(noteTaRowResult);
    }

    const sortNoteTaEntriesResult = sortNoteTaEntries([
        ...manualRows,
        ...generatedRows,
    ]);
    rows.splice(0, rows.length, ...sortNoteTaEntriesResult);
}

/**
 * Checks whether a NoteTA row is manually managed.
 *
 * @param row - NoteTA row.
 * @returns Whether the row should survive regeneration.
 */
export function isManualNoteTaRow(row: any): boolean {
    const key = trimValue(row.key);

    return row.source !== NOTE_TA_NAMES_SOURCE && !/^G[1-9]\d*$/u.test(key);
}

/**
 * Gets official localized name rows for NoteTA generation.
 *
 * @param form - Dialog form values.
 * @returns Official name rows.
 */
export function getOfficialNameNoteTaRows(form: any): Array<any> {
    if (!Array.isArray(form.localizedNames)) {
        return [];
    }

    return form.localizedNames.filter(
        (row: { official: boolean }) => row.official,
    );
}

/**
 * Finds where a generated names row should appear in the editable list.
 *
 * @param rows - Current NoteTA rows.
 * @returns Insertion index.
 */
export function getGeneratedNameNoteTaInsertIndex(rows: Array<any>): number {
    const findIndexCallback = function callback(row: any) {
        const key = trimValue(row.key);

        return key !== "T" && !/^G[1-9]\d*$/u.test(key);
    };
    const index = rows.findIndex(findIndexCallback);

    return index === -1 ? rows.length : index;
}

/**
 * Ensures the form has editable NoteTA rows.
 *
 * @param form - Dialog form values.
 * @returns NoteTA rows.
 */
export function ensureNoteTaRows(form: any): Array<any> {
    if (!Array.isArray(form.noteTaRows)) {
        form.noteTaRows = [];
    }

    return form.noteTaRows;
}

/**
 * Checks whether a NoteTA row is blank.
 *
 * @param row - NoteTA row.
 * @returns Whether the row is blank.
 */
export function isBlankNoteTaRow(row: any): boolean {
    return trimValue(row?.key) === "" && trimValue(row?.value) === "";
}

/**
 * Ensures the form has editable navbox rows.
 *
 * @param form - Dialog form values.
 * @returns Navbox rows.
 */
export function ensureNavboxRows(form: any): Array<any> {
    if (!Array.isArray(form.navboxRows)) {
        form.navboxRows = [];
    }

    return form.navboxRows;
}

/**
 * Creates one redirect review row.
 *
 * @param value - Existing row or redirect title.
 * @param fixed - Whether the row title was just fixed.
 * @returns Redirect review row.
 */
export function createRedirectRow(
    value: any = "",
    fixed: boolean = value?.fixed === true,
): any {
    const title = trimValue(value?.title ?? value?.redirectTitle ?? value);
    const exists =
        value?.exists === true || /^Exists(?::|$)/u.test(value?.status);
    const fixedTitle = fixed ? title : trimValue(value?.fixedTitle);

    let pendingEdit = {};

    if (value?.pendingEdit != null) {
        pendingEdit = { pendingEdit: value.pendingEdit };
    }
    const row = {
        fixed:
            fixed &&
            normalizeTitleKey(fixedTitle) === normalizeTitleKey(title),
        fixedTitle,
        enabled: value?.enabled ?? value?.selected ?? !exists,
        exists,
        status: value?.status || (exists ? "Exists" : "Missing"),
        title,
        ...pendingEdit,
    };

    return row;
}

/**
 * Checks whether a redirect row is blank.
 *
 * @param row - Redirect row.
 * @returns Whether the row is blank.
 */
export function isBlankRedirectRow(row: any): boolean {
    return trimValue(row?.title) === "";
}

/**
 * Marks category rows as fixed for their current category titles.
 *
 * @param rows - Category rows.
 * @returns Result when the function
 *   marks category rows as fixed for their current
 *   category titles.
 */
export function markCategoryRowsFixed(rows: Array<any>): void {
    const forEachCallback = function callback(row: any) {
        row.fixed = true;
        row.fixedCategory = trimValue(row.category);
    };
    rows.forEach(forEachCallback);
}

/**
 * Marks category rows as needing a fresh review refresh.
 *
 * @param rows - Category rows.
 * @returns Result when the function
 *   marks category rows as needing a fresh review
 *   refresh.
 */
export function markCategoryRowsUnfixed(rows: Array<any>): void {
    rows.forEach(function callback(row) {
        row.fixed = false;
    });
}

/**
 * Handles sync category row fixed state.
 *
 * Preserves or clears a category row fixed flag after its normalized
 * title update.
 *
 * @param row - Updated category row.
 * @param current - Previous category row.
 * @returns *
 */
export function syncCategoryRowFixedState(row: any, current: any): void {
    row.fixedCategory = trimValue(current?.fixedCategory);
    row.fixed =
        current?.fixed === true &&
        normalizeTitleKey(row.fixedCategory) ===
            normalizeTitleKey(row.category);
}

/**
 * Checks whether a category row is fixed for its current title.
 *
 * @param row - Category row.
 * @returns Whether the row is current.
 */
export function isCategoryRowFixed(row: any): boolean {
    const result =
        row.fixed === true &&
        normalizeTitleKey(row.fixedCategory) ===
            normalizeTitleKey(row.category);
    return result;
}

/**
 * Updates a redirect row title and marks stale checks as unfixed.
 *
 * @param row - Redirect review row.
 * @param value - Raw title value.
 * @returns Result when the function
 *   updates a redirect row title and marks stale
 *   checks as unfixed.
 */
export function setRedirectRowTitle(row: any, value: string): void {
    const title = trimValue(value);

    row.title = title;

    if (normalizeTitleKey(row.fixedTitle) !== normalizeTitleKey(title)) {
        row.fixed = false;
    }
}

/**
 * Checks whether a redirect row has been fixed for its current title.
 *
 * @param row - Redirect review row.
 * @returns Whether the row is current.
 */
export function isRedirectRowFixed(row: any): boolean {
    const result =
        row.fixed === true &&
        normalizeTitleKey(row.fixedTitle) === normalizeTitleKey(row.title);
    return result;
}

/**
 * Ensures the form has editable redirect rows.
 *
 * @param form - Dialog form values.
 * @returns Redirect rows.
 */
export function ensureRedirectRows(form: any): Array<any> {
    if (!Array.isArray(form.redirectRows)) {
        form.redirectRows = [];
    }

    return form.redirectRows;
}

/**
 * Defines the module-level has prepared navbox rows.
 *
 * @param form - Form values.
 * @returns Result when the function
 *   defines the module-level has prepared navbox rows.
 */
export function hasPreparedNavboxRows(form: {
    navboxRows: unknown[];
    series: unknown;
}) {
    const someCallback = (row: unknown) => !isBlankNavboxRow(row);
    const result =
        Array.isArray(form.navboxRows) &&
        (form.navboxRows.some(someCallback) || trimValue(form.series) === "");
    return result;
}

/**
 * Builds a case-insensitive title comparison key.
 *
 * @param value - Raw title value.
 * @returns Title comparison key.
 */
export function normalizeTitleKey(value: any): string {
    return trimValue(value).toLocaleLowerCase();
}

/**
 * Creates one editable navbox row.
 *
 * @param value - Existing row or navbox wikitext.
 * @param fixed - Whether the row text was just fixed.
 * @returns Navbox row.
 */
export function createNavboxRow(
    value: any = "",
    fixed: boolean = value?.fixed === true,
): any {
    const text = trimValue(value?.text ?? value);
    const fixedText = fixed ? text : trimValue(value?.fixedText);

    const result = {
        fixed: fixed && fixedText === text,
        fixedText,
        enabled: value?.enabled !== false,
        status: value?.status || "",
        text,
        title: value?.title || getNavboxTitle(text),
        ...(value?.pendingEdit == null
            ? {}
            : { pendingEdit: value.pendingEdit }),
    };
    return result;
}

/**
 * Checks whether a navbox row is blank.
 *
 * @param row - Navbox row.
 * @returns Whether the row is blank.
 */
export function isBlankNavboxRow(row: any): boolean {
    return trimValue(row?.text) === "";
}

/**
 * Updates a navbox row text and marks stale checks as unfixed.
 *
 * @param row - Navbox review row.
 * @param value - Raw navbox text.
 * @returns Result when the function
 *   updates a navbox row text and marks stale checks
 *   as unfixed.
 */
export function setNavboxRowText(row: any, value: string): void {
    const text = trimValue(value);

    row.text = text;

    if (row.fixedText !== text) {
        row.fixed = false;
    }
}

/**
 * Checks whether a navbox row is fixed for its current text.
 *
 * @param row - Navbox row.
 * @returns Whether the row is current.
 */
export function isNavboxRowFixed(row: any): boolean {
    return row.fixed === true && row.fixedText === row.text;
}

/**
 * Checks whether a review row refresh can reuse current fixed rows.
 *
 * @param refreshOptions - Review refresh options.
 * @param rows - Review rows.
 * @param isFixed - Row check-state predicate.
 * @returns Whether the refresh can be skipped.
 */
export function shouldSkipFixedRows(
    refreshOptions: any,
    rows: Array<any>,
    isFixed: (...args: any[]) => any,
): boolean {
    if (
        refreshOptions.recheck === true ||
        !Array.isArray(rows) ||
        rows.length === 0
    ) {
        return false;
    }

    return rows.every(isFixed);
}

/**
 * Extracts a template title from navbox wikitext.
 *
 * @param value - Navbox wikitext.
 * @returns Template title without namespace.
 */
export function getNavboxTitle(value: any): string {
    const text = trimValue(value);
    const match = text.match(/^\{\{\s*(?:Template:)?([^|}]+).*?\}\}$/iu);

    return trimValue(match?.[1] || text).replace(/^Template:/iu, "");
}

/**
 * Creates one managed citation row.
 *
 * @param value - Existing row values.
 * @returns Managed citation row.
 */
export function createCitationRow(value: any = {}): any {
    const template = trimValue(value.template) || "cite web";
    const generatedParams = sortManagedCitationParams(
        value.generatedParams,
        template,
    );

    const result = {
        generatedParams,
        index: Number(value.index) || 1,
        modified: value.modified === true,
        params: sortManagedCitationParams(
            value.params || generatedParams,
            template,
        ),
        sourceUrl: trimValue(value.sourceUrl),
        template,
    };
    return result;
}

/**
 * Creates one managed citation parameter row.
 *
 * @param value - Existing parameter values.
 * @returns Managed citation parameter row.
 */
export function createCitationParamRow(value: any = {}): any {
    const result = {
        name: trimValue(value.name),
        value: trimValue(value.value),
    };
    return result;
}

/**
 * Handles sort managed citation params.
 *
 * Sorts managed citation parameters and removes fully blank stored
 * rows.
 *
 * @param params - Citation parameter rows.
 * @param template - Template value.
 * @returns Sorted parameter rows.
 */
export function sortManagedCitationParams(
    params: Array<any> = [],
    template: string = "cite web",
): Array<any> {
    const filteredValues = params
        .map(createCitationParamRow)
        .filter(hasCitationParamValue);
    const result = sortCitationParams(filteredValues, template);
    return result;
}

/**
 * Gets visible parameter rows, including one trailing blank row.
 *
 * @param citation - Managed citation row.
 * @returns Visible parameter rows.
 */
export function getCitationParamRows(citation: any): Array<any> {
    return [...(citation.params || []), createCitationParamRow()];
}

/**
 * Gets visible citation parameter rows for Codex Table.
 *
 * @param citation - Managed citation row.
 * @returns Visible parameter table rows.
 */
export function getCitationParamTableRows(citation: any): Array<any> {
    const result = getCitationParamRows(citation).map(
        function callback(param, index) {
            const result = {
                index,
                param,
            };
            return result;
        },
    );
    return result;
}

/**
 * Builds a key for remounting dynamic citation tabs.
 *
 * @param rows - Managed citation rows.
 * @returns Citation tabs key.
 */
export function getCitationTabsKey(rows: Array<any>): string {
    const mapCallback = (citation: any) => trimValue(citation.sourceUrl);
    const result = rows.map(mapCallback).join("\n");
    return result;
}

/**
 * Gets source-backed metadata fields as Codex Table rows.
 *
 * @param group - Metadata article parameter group.
 * @returns Metadata table rows.
 */
export function getMetadataFieldTableRows(group: any): Array<any> {
    const result = group.fields.slice(1).map(function callback(
        field: unknown,
    ) {
        const result = {
            field,
        };
        return result;
    });
    return result;
}

/**
 * Builds the stable tab name for a managed citation row.
 *
 * @param citation - Managed citation row.
 * @param index - Citation row index.
 * @returns Citation tab name.
 */
export function getCitationTabName(citation: any, index: number): string {
    return `citation-${citation.index || index + 1}`;
}

/**
 * Builds a compact citation tab label.
 *
 * @param citation - Managed citation row.
 * @returns Citation tab label.
 */
export function getCitationTabLabel(citation: any): string {
    const result = [
        "",
        citation.index,
        ": ",
        getCitationSourceDomain(citation.sourceUrl),
        "",
    ].join("");
    return result;
}

/**
 * Gets a source URL domain for compact display.
 *
 * @param sourceUrl - Source URL.
 * @returns Hostname or source URL fallback.
 */
export function getCitationSourceDomain(sourceUrl: string): string {
    try {
        return new URL(sourceUrl).hostname.replace(/^www\./u, "");
    } catch (_error) {
        return trimValue(sourceUrl) || "source";
    }
}

/**
 * Checks whether a citation parameter row has any entered value.
 *
 * @param param - Citation parameter row.
 * @returns Whether the row should be kept.
 */
export function hasCitationParamValue(param: any): boolean {
    return trimValue(param.name) !== "" || trimValue(param.value) !== "";
}

/**
 * Clones a plain JSON-compatible value.
 *
 * @param value - Value to clone.
 * @returns Cloned value.
 */
export function cloneValue(value: any): any {
    const stringifyResult = JSON.stringify(value);
    return JSON.parse(stringifyResult);
}

/**
 * Opens the mounted Codex dialog.
 *
 * @param open - Vue reference controlling dialog visibility.
 * @param open.value - Current dialog visibility state.
 * @returns Result when the function
 *   opens the mounted codex dialog.
 */
export function openDialog(open: any): void {
    open.value = true;
}
