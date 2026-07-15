/**
 * Provides vg-stub-creator form state, row, URL, and editor helpers.
 */

import {
    ARTICLE_PARAMETER_GROUPS,
    NAME_MARKETS,
    NOTE_TA_NAMES_SOURCE,
    SOURCE_REFERENCE_FIELDS,
    STEAM_NAME_HELPER_ROW,
} from "#stub/form/constants.ts";
import {
    parsePrefixedValue,
    trimFieldValue,
} from "#stub/local/form-values.ts";
import { getEnteredSourceUrls } from "#stub/sources";
import {
    buildOfficialNameConversionText,
    sortNoteTaEntries,
} from "#stub/wiki";
import { msg } from "#stub/i18n";
import { cite } from "#shared";
const { sortCitationParams } = cite;

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
    const labels = {
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
    const value = trimFieldValue(title);

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
    const existingTags = rows.map((row) => trimStubTagValue(row.stubTag));
    const additions = buildStubTagRowsFromCategories(form.categoryRows).filter(
        function callback(row) {
            const stubTag = trimStubTagValue(row.stubTag);

            return stubTag !== "" && !existingTags.includes(stubTag);
        },
    );

    if (additions.length === 0) {
        ensureTrailingStubTagRow(form);
        return;
    }

    const nonBlankRows = rows.filter((row) => !isBlankStubTagRow(row));

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
    const tags = [];
    const safeRows = (rows || []).filter(Boolean);

    safeRows.forEach(function callback(row) {
        const stubTag = trimStubTagValue(row.stubTag);

        if (stubTag !== "" && !tags.includes(stubTag)) {
            tags.push(stubTag);
        }
    });

    const result = tags.map(function callback(stubTag) {
        const result = createStubTagRow({
            enabled: safeRows.some(function callback(row) {
                const result =
                    trimStubTagValue(row.stubTag) === stubTag &&
                    row.stubTagEnabled === true;
                return result;
            }),
            originalEnabled: safeRows.some(function callback(row) {
                const result =
                    trimStubTagValue(row.stubTag) === stubTag &&
                    row.originalStubTagEnabled === true;
                return result;
            }),
            originalStubTag: stubTag,
            stubTag,
        });
        return result;
    });
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
    const nonBlankRows = rows.filter((row) => !isBlank(row));
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
    const nonBlankRows = rows.filter((row) => !isBlank(row));

    rows.splice(0, rows.length, ...nonBlankRows, createBlank());
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
    ensureTrailingEditableRow(
        ensureRedirectRows(form),
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
    ensureTrailingEditableRow(
        ensureNavboxRows(form),
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
    ensureTrailingEditableRow(
        ensureStubTagRows(form),
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
    return trimFieldValue(row?.category) === "";
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
        status: trimFieldValue(value?.status),
        stubTag,
        ...selectValue(
            value?.pendingEdit == null,
            function trueBranch() {
                return {};
            },
            function falseBranch() {
                const result = {
                    pendingEdit: value.pendingEdit,
                };
                return result;
            },
        ),
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
    const result = trimFieldValue(value)
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
    let lastUrlsKey = null;
    let timer = null;

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

        timer = setTimeout(function callback() {
            urls.forEach(options.onSourceUrlChange);
        }, options.citationPrefetchDelay || 0);
    };
    return result;
}

/**
 * Creates empty form values keyed by input field name.
 *
 * @returns Initial dialog form values.
 */
export function createFormValues(): any {
    const result = {
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
    const result = {
        ...Object.fromEntries(
            NAME_MARKETS.map(function callback(market) {
                return [market.key, selectedMarkets.includes(market.key)];
            }),
        ),
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
    const row = selectValue(
        key != null && typeof key === "object",
        function trueBranch() {
            return key;
        },
        function falseBranch() {
            const result = {
                key,
                value,
            };
            return result;
        },
    );

    const created: Record<string, any> = {
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
 * @param values - Localized name values.
 * @returns Localized name row.
 */
export function createNameRowFromValues(values: any): any {
    const result = {
        ...createNameRow(getNameRowSelectedMarkets(values)),
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
    const result = rows.map(function callback(row) {
        const result = {
            label: row.label || formatSteamNameMarkets(row),
            url: row.sourceUrl,
            value: row.name,
        };
        return result;
    });
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
    if (trimFieldValue(form.originalName) === "") {
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
    return rows.find((row) => getNameRowSelectedMarkets(row).includes(market));
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
        rows.push(createNameRow());
        return;
    }

    if (hasAnyNameRowValue(rows[rows.length - 1])) {
        rows.push(createNameRow());
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
    const result =
        Boolean(trimFieldValue(row.name)) ||
        Boolean(trimFieldValue(row.sourceUrl));
    return result;
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
 * Removes a trailing parenthesized disambiguator from a page title.
 *
 * @param title - Page title.
 * @returns Base page title.
 */
export function getBasePageTitle(title: string): string {
    return trimFieldValue(title).replace(/ \(.+?\)$/u, "");
}

/**
 * Creates blank external identifiers for the Enwiki lookup tip.
 *
 * @returns Blank identifier values.
 */
export function createBlankEnwikiMetadata(): any {
    const result = {
        metacriticId: "",
        openCriticId: "",
        pageExists: null,
        steamId: "",
    };
    return result;
}

/**
 * Formats the Enwiki-to-Wikidata lookup outcome.
 *
 * @param pageExists - Whether the English Wikipedia page
 * exists.
 * @returns Lookup status text.
 */
export function getWikidataLookupStatus(pageExists: boolean | null): string {
    if (pageExists === false) {
        return msg("metadata.noEnwikiPage");
    }

    if (pageExists === true) {
        return msg("metadata.notConnected");
    }

    return msg("metadata.lookupFailed");
}

/**
 * Creates fixed Enwiki tip slots with a shared placeholder value.
 *
 * @param value - Placeholder text.
 * @returns Tip slot definitions.
 */
export function createEnwikiTipPlaceholders(value: string): Array<any> {
    const result = ["Wikidata", "Metacritic", "OpenCritic", "Steam"].map(
        function callback(label) {
            const result = {
                label,
                value,
                url: "",
            };
            return result;
        },
    );
    return result;
}

/**
 * Normalizes an English Wikipedia field value.
 *
 * @param value - Raw field value.
 * @returns Normalized title or trimmed value.
 */
export function normalizeEnwikiTitleValue(value: any): string {
    return extractEnwikiTitleFromUrl(value) || trimFieldValue(value);
}

/**
 * Extracts an English Wikipedia title from a pasted URL.
 *
 * @param value - Raw pasted value.
 * @returns English Wikipedia page title, or an empty string.
 */
export function extractEnwikiTitleFromUrl(value: any): string {
    const text = trimFieldValue(value);

    if (text === "") {
        return "";
    }

    try {
        const url = new URL(text);
        const host = url.hostname.toLowerCase();

        if (host !== "en.wikipedia.org" && host !== "en.m.wikipedia.org") {
            return "";
        }

        const prefix = "/wiki/";

        if (!url.pathname.startsWith(prefix)) {
            return "";
        }

        const title = decodeURIComponent(url.pathname.slice(prefix.length))
            .replace(/_/gu, " ")
            .trim();

        return title;
    } catch (_error) {
        return "";
    }
}

/**
 * Builds a Google site search for a Wikidata item.
 *
 * @param title - Page title without a disambiguation suffix.
 * @returns Search URL.
 */
export function buildWikidataSearchUrl(title: string): string {
    return buildGoogleSiteSearchUrl(title, "wikidata.org/wiki");
}

/**
 * Builds a Metacritic game URL.
 *
 * @param id - Metacritic game ID.
 * @returns Game URL.
 */
export function buildMetacriticUrl(id: string): string {
    const result = [
        "https://www.metacritic.com/game/",
        encodeURIComponent(id),
        "/",
    ].join("");
    return result;
}

/**
 * Builds a Google site search for a Metacritic game page.
 *
 * @param title - Game title without a disambiguation suffix.
 * @returns Search URL.
 */
export function buildMetacriticSearchUrl(title: string): string {
    const query = `"${getBasePageTitle(title)}" site:metacritic.com`;

    const result = [
        "https://www.google.com/search?q=",
        encodeURIComponent(query),
        "",
    ].join("");
    return result;
}

/**
 * Builds an OpenCritic game URL.
 *
 * @param id - OpenCritic game ID.
 * @returns Game URL.
 */
export function buildOpenCriticUrl(id: string): string {
    const result = [
        "https://opencritic.com/game/",
        encodeURIComponent(id),
        "/-",
    ].join("");
    return result;
}

/**
 * Builds a Google site search for an OpenCritic game page.
 *
 * @param title - Game title without a disambiguation suffix.
 * @returns Search URL.
 */
export function buildOpenCriticSearchUrl(title: string): string {
    return buildGoogleSiteSearchUrl(title, "opencritic.com/game");
}

/**
 * Builds a Steam store application URL.
 *
 * @param id - Steam application ID.
 * @returns Store URL.
 */
export function buildSteamUrl(id: string): string {
    const result = [
        "https://store.steampowered.com/app",
        "/",
        encodeURIComponent(id),
        "/",
    ].join("");
    return result;
}

/**
 * Builds a Google site search for a Steam application page.
 *
 * @param title - Game title without a disambiguation suffix.
 * @returns Search URL.
 */
export function buildSteamSearchUrl(title: string): string {
    return buildGoogleSiteSearchUrl(title, "store.steampowered.com/app");
}

/**
 * Builds a Google site search URL.
 *
 * @param title - Page title without a disambiguation suffix.
 * @param site - Site or path restriction.
 * @returns Search URL.
 */
export function buildGoogleSiteSearchUrl(title: string, site: string): string {
    const query = `"${getBasePageTitle(title)}" site:${site}`;

    const result = [
        "https://www.google.com/search?q=",
        encodeURIComponent(query),
        "",
    ].join("");
    return result;
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
    Object.assign(form, normalizeReceivedFormValues(values));
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
        form.noteTaRows = form.noteTaRows.map((row) => createNoteTaRow(row));
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
    const title = trimFieldValue(form[key]?.[index]?.name);

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
    const result = rows.map(function callback(row) {
        const patch = patches.find(
            (item) => trimFieldValue(item.sourceUrl) === row.sourceUrl,
        );

        if (patch == null) {
            return row;
        }

        const result = createCitationRow({
            ...row,
            ...cloneValue(patch),
            params: applyCitationParamPatches(
                row.generatedParams,
                patch.params,
            ),
            modified: true,
            sourceUrl: row.sourceUrl,
        });
        return result;
    });
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
    const params = new Map(clonedParams.map((param) => [param.name, param]));

    patches.forEach(function callback(patch) {
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
    patches.forEach(function callback(patch) {
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
 * @param rows - Generated navbox rows.
 * @param patches - Navbox patches.
 * @returns Patched navbox rows.
 */
export function applyNavboxPatches(
    rows: Array<any>,
    patches: Array<any> = [],
): Array<any> {
    const result = rows.map(function callback(row) {
        const patch = patches.find(
            (item) => trimFieldValue(item.source?.title) === row.title,
        );

        if (patch == null) {
            return row;
        }

        const result = createNavboxRow({
            ...row,
            ...cloneValue(patch),
            title: row.title,
        });
        return result;
    });
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
    if (trimFieldValue(patch.source?.company) !== "") {
        const result =
            trimFieldValue(row.company) ===
            trimFieldValue(patch.source.company);
        return result;
    }

    const result =
        trimFieldValue(row.originalCategory || row.category) ===
        trimFieldValue(patch.source?.category);
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
    const generated = buildOfficialNameConversionText(
        getOfficialNameNoteTaRows(form),
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
        rows.splice(getGeneratedNameNoteTaInsertIndex(rows), 0, row);
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
 * @param row - NoteTA row.
 * @returns Whether the row should survive regeneration.
 */
export function isManualNoteTaRow(row: any): boolean {
    const key = trimFieldValue(row.key);

    return row.source !== NOTE_TA_NAMES_SOURCE && !/^G[1-9]\d*$/u.test(key);
}

/**
 * Gets official localized name rows for NoteTA generation.
 *
 * @param form - Dialog form values.
 * @returns Official name rows.
 */
export function getOfficialNameNoteTaRows(form: any): Array<any> {
    const localizedNames: Array<{ official: boolean }> =
        form.localizedNames || [];
    const result = selectValue(
        Array.isArray(form.localizedNames),
        function trueBranch() {
            const result = localizedNames.filter((row) => row.official);
            return result;
        },
        function falseBranch() {
            return [];
        },
    );
    return result;
}

/**
 * Finds where a generated names row should appear in the editable list.
 *
 * @param rows - Current NoteTA rows.
 * @returns Insertion index.
 */
export function getGeneratedNameNoteTaInsertIndex(rows: Array<any>): number {
    const index = rows.findIndex(function callback(row) {
        const key = trimFieldValue(row.key);

        return key !== "T" && !/^G[1-9]\d*$/u.test(key);
    });

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
    return (
        trimFieldValue(row?.key) === "" && trimFieldValue(row?.value) === ""
    );
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
    const title = trimFieldValue(
        value?.title ?? value?.redirectTitle ?? value,
    );
    const exists =
        value?.exists === true || /^Exists(?::|$)/u.test(value?.status);
    const fixedTitle = fixed ? title : trimFieldValue(value?.fixedTitle);

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
    return trimFieldValue(row?.title) === "";
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
    rows.forEach(function callback(row) {
        row.fixed = true;
        row.fixedCategory = trimFieldValue(row.category);
    });
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
    row.fixedCategory = trimFieldValue(current?.fixedCategory);
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
    const title = trimFieldValue(value);

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
    const result =
        Array.isArray(form.navboxRows) &&
        (form.navboxRows.some((row) => !isBlankNavboxRow(row)) ||
            trimFieldValue(form.series) === "");
    return result;
}

/**
 * Builds a case-insensitive title comparison key.
 *
 * @param value - Raw title value.
 * @returns Title comparison key.
 */
export function normalizeTitleKey(value: any): string {
    return trimFieldValue(value).toLocaleLowerCase();
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
    const text = trimFieldValue(value?.text ?? value);
    const fixedText = fixed ? text : trimFieldValue(value?.fixedText);

    const result = {
        fixed: fixed && fixedText === text,
        fixedText,
        enabled: value?.enabled !== false,
        status: value?.status || "",
        text,
        title: value?.title || getNavboxTitle(text),
        ...selectValue(
            value?.pendingEdit == null,
            function trueBranch() {
                return {};
            },
            function falseBranch() {
                const result = {
                    pendingEdit: value.pendingEdit,
                };
                return result;
            },
        ),
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
    return trimFieldValue(row?.text) === "";
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
    const text = trimFieldValue(value);

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
    const result =
        refreshOptions.recheck !== true &&
        Array.isArray(rows) &&
        rows.length > 0 &&
        rows.every(isFixed);
    return result;
}

/**
 * Extracts a template title from navbox wikitext.
 *
 * @param value - Navbox wikitext.
 * @returns Template title without namespace.
 */
export function getNavboxTitle(value: any): string {
    const text = trimFieldValue(value);
    const match = text.match(/^\{\{\s*(?:Template:)?([^|}]+).*?\}\}$/iu);

    return trimFieldValue(match?.[1] || text).replace(/^Template:/iu, "");
}

/**
 * Creates one managed citation row.
 *
 * @param value - Existing row values.
 * @returns Managed citation row.
 */
export function createCitationRow(value: any = {}): any {
    const template = trimFieldValue(value.template) || "cite web";
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
        sourceUrl: trimFieldValue(value.sourceUrl),
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
        name: trimFieldValue(value.name),
        value: trimFieldValue(value.value),
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
    const result = sortCitationParams(
        params.map(createCitationParamRow).filter(hasCitationParamValue),
        template,
    );
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
    const result = rows
        .map((citation) => trimFieldValue(citation.sourceUrl))
        .join("\n");
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
        return trimFieldValue(sourceUrl) || "source";
    }
}

/**
 * Gets the MediaWiki ResourceLoader object when it can load CodeMirror.
 *
 * @returns ResourceLoader object.
 */
export function getCodeMirrorLoader(): any | undefined {
    if (typeof mw === "undefined" || typeof mw.loader?.using !== "function") {
        return undefined;
    }

    return mw.loader;
}

/**
 * Finds the native textarea for a Codex TextArea ref.
 *
 * @param element - Vue template ref value.
 * @returns Textarea element.
 */
export function findTextareaElement(
    element: any,
): HTMLTextAreaElement | undefined {
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
 * Handles get code mirror text.
 *
 * Reads text from either MediaWiki's CodeMirror wrapper or the
 * textarea.
 *
 * @param editor - CodeMirror editor instance.
 * @param textarea - Backing textarea.
 * @returns Current source text.
 */
export function getCodeMirrorText(
    editor: any,
    textarea: HTMLTextAreaElement,
): string {
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
 * @param editor - CodeMirror editor instance.
 * @param textarea - Backing textarea.
 * @param text - Source text.
 * @returns Result when the function
 *   writes text to either mediawiki's codemirror
 *   wrapper or the textarea.
 */
export function setCodeMirrorText(
    editor: any,
    textarea: HTMLTextAreaElement,
    text: string,
): void {
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
 * @param param - Citation parameter row.
 * @returns Whether the row should be kept.
 */
export function hasCitationParamValue(param: any): boolean {
    return (
        trimFieldValue(param.name) !== "" || trimFieldValue(param.value) !== ""
    );
}

/**
 * Clones a plain JSON-compatible value.
 *
 * @param value - Value to clone.
 * @returns Cloned value.
 */
export function cloneValue(value: any): any {
    return JSON.parse(JSON.stringify(value));
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

/**
 * Selects a lazily evaluated value for a condition.
 *
 * @param condition - Condition to evaluate.
 * @param trueBranch - Branch used when the condition is
 * true.
 * @param falseBranch - Branch used when the condition is
 * false.
 * @returns Value returned by the selected branch.
 */
function selectValue(
    condition: unknown,
    trueBranch: (...args: any[]) => any,
    falseBranch: (...args: any[]) => any,
): any {
    if (condition) {
        return trueBranch();
    }

    return falseBranch();
}
