/* eslint-disable */

/**
 * Provides vg-stub-creator form state, row, URL, and editor helpers.
 */

import {
    ARTICLE_PARAMETER_GROUPS,
    NAME_MARKETS,
    NOTE_TA_NAMES_SOURCE,
    SOURCE_REFERENCE_FIELDS,
    STEAM_NAME_HELPER_ROW,
} from "./constants.js";
import {
    parsePrefixedValue,
    trimFieldValue,
} from "../../shared/form-values.js";
import { getEnteredSourceUrls } from "../../sources/source-references.js";
import { sortCitationParams } from "../../sources/citations.js";
import {
    buildOfficialNameConversionText,
    sortNoteTaEntries,
} from "../../wikitext/note-ta.js";

/**
 * Marks a localized-name row as inserted by the Steam helper.
 *
 * @param {object} row - Localized-name row.
 * @returns {object} The marked row.
 */
export function markSteamNameHelperRow(row) {
    Object.defineProperty(row, STEAM_NAME_HELPER_ROW, {
        configurable: true,
        value: true,
    });

    return row;
}

/**
 * Formats a category row source as a compact badge label.
 *
 * @param {string} source - Category row source.
 * @returns {string} Compact source label.
 */
export function formatCategorySourceLabel(source) {
    const { label, modified } = getCategorySourceDisplay(source);

    return modified ? `${label}†` : label;
}

/**
 * Formats a category row source tooltip.
 *
 * @param {string} source - Category row source.
 * @returns {string} Source tooltip.
 */
export function formatCategorySourceTitle(source) {
    const { label, modified } = getCategorySourceDisplay(source);

    return modified ? `${label} (modified)` : label;
}

/**
 * Gets display metadata for a category source.
 *
 * @param {string} source - Category row source.
 * @returns {object} Source display metadata.
 */
export function getCategorySourceDisplay(source) {
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
export function normalizeEnglishCategoryTitle(title) {
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
export function initializeStubTagRows(form) {
    if (form.stubTagRows != null) {
        return;
    }

    form.stubTagRows = buildStubTagRowsFromCategories(form.categoryRows);
    ensureTrailingStubTagRow(form);
}

/**
 * Adds newly generated stub-tag rows while preserving editable rows.
 *
 * @param {object} form - Dialog form values.
 * @returns {void}
 */
export function syncStubTagRowsFromCategories(form) {
    if (form.stubTagRows == null) {
        initializeStubTagRows(form);
        return;
    }

    const rows = ensureStubTagRows(form);
    const existingTags = rows.map((row) => trimStubTagValue(row.stubTag));
    const additions = buildStubTagRowsFromCategories(form.categoryRows).filter(
        (row) => {
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
 * @param {Array<object>} rows - Category review rows.
 * @returns {Array<object>} Stub-tag review rows.
 */
export function buildStubTagRowsFromCategories(rows) {
    const tags = [];
    const safeRows = (rows || []).filter(Boolean);

    safeRows.forEach((row) => {
        const stubTag = trimStubTagValue(row.stubTag);

        if (stubTag !== "" && !tags.includes(stubTag)) {
            tags.push(stubTag);
        }
    });

    return tags.map((stubTag) =>
        createStubTagRow({
            enabled: safeRows.some(
                (row) =>
                    trimStubTagValue(row.stubTag) === stubTag &&
                    row.stubTagEnabled === true,
            ),
            originalEnabled: safeRows.some(
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
export function ensureStubTagRows(form) {
    if (!Array.isArray(form.stubTagRows)) {
        form.stubTagRows = [];
    }

    return form.stubTagRows;
}

/**
 * Removes surplus blank editable rows while keeping one blank row if present.
 *
 * @param {Array<object>} rows - Editable rows.
 * @param {Function} isBlank - Blank row predicate.
 * @param {Function} createBlank - Blank row factory.
 * @returns {Array<object>} Cleaned editable rows.
 */
export function cleanEditableRows(rows, isBlank, createBlank) {
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
 * @param {Array<object>} rows - Editable rows.
 * @param {Function} isBlank - Blank row predicate.
 * @param {Function} createBlank - Blank row factory.
 * @returns {void}
 */
export function ensureTrailingEditableRow(rows, isBlank, createBlank) {
    const nonBlankRows = rows.filter((row) => !isBlank(row));

    rows.splice(0, rows.length, ...nonBlankRows, createBlank());
}

/**
 * Ensures category review rows end with one blank row.
 *
 * @param {object} form - Dialog form values.
 * @param {Function} _createBlank - Unused legacy category row factory.
 * @returns {void}
 */
export function ensureTrailingCategoryRow(form, _createBlank) {
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
 * @param {object} form - Dialog form values.
 * @returns {void}
 */
export function ensureTrailingRedirectRow(form) {
    ensureTrailingEditableRow(
        ensureRedirectRows(form),
        isBlankRedirectRow,
        createRedirectRow,
    );
}

/**
 * Ensures navbox review rows end with one blank row.
 *
 * @param {object} form - Dialog form values.
 * @returns {void}
 */
export function ensureTrailingNavboxRow(form) {
    ensureTrailingEditableRow(
        ensureNavboxRows(form),
        isBlankNavboxRow,
        createNavboxRow,
    );
}

/**
 * Ensures stub-tag review rows end with one blank row.
 *
 * @param {object} form - Dialog form values.
 * @returns {void}
 */
export function ensureTrailingStubTagRow(form) {
    ensureTrailingEditableRow(
        ensureStubTagRows(form),
        isBlankStubTagRow,
        createStubTagRow,
    );
}

/**
 * Checks whether a category row is blank.
 *
 * @param {object} row - Category row.
 * @returns {boolean} Whether the row is blank.
 */
export function isBlankCategoryRow(row) {
    return trimFieldValue(row?.category) === "";
}

/**
 * Creates a fallback manual category row.
 *
 * @returns {object} Blank category row.
 */
export function createBlankCategoryRow() {
    return {
        category: "",
        enabled: true,
        source: "manual",
    };
}

/**
 * Checks whether a stub-tag row is blank.
 *
 * @param {object} row - Stub-tag row.
 * @returns {boolean} Whether the row is blank.
 */
export function isBlankStubTagRow(row) {
    return trimStubTagValue(row?.stubTag) === "";
}

/**
 * Checks whether a stub-tag row was entered manually.
 *
 * @param {object} row - Stub-tag row.
 * @returns {boolean} Whether the row was manually entered.
 */
export function isManualStubTagRow(row) {
    return (
        trimStubTagValue(row?.stubTag) !== "" &&
        trimStubTagValue(row?.originalStubTag) === ""
    );
}

/**
 * Creates one stub-tag review row.
 *
 * @param {*} [value] - Existing row or template name.
 * @returns {object} Stub-tag review row.
 */
export function createStubTagRow(value = "") {
    const stubTag = trimStubTagValue(value?.stubTag ?? value);

    return {
        enabled: value?.enabled !== false,
        originalEnabled: value?.originalEnabled === true,
        originalStubTag: trimStubTagValue(value?.originalStubTag || stubTag),
        status: trimFieldValue(value?.status),
        stubTag,
        ...(value?.pendingEdit == null
            ? {}
            : {
                  pendingEdit: value.pendingEdit,
              }),
    };
}

/**
 * Normalizes a stub template name entered by the user.
 *
 * @param {*} value - Stub template name.
 * @returns {string} Template name without braces.
 */
export function trimStubTagValue(value) {
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
export function createCitationPrefetchQueue(options) {
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
 * Creates empty form values keyed by input field name.
 *
 * @returns {object} Initial dialog form values.
 */
export function createFormValues() {
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
export function createNameRow(selectedMarkets = [], options = {}) {
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
export function createNoteTaRow(key = "", value = "") {
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
export function createNameRowFromValues(values) {
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
export function getSteamNameSuggestions(rows) {
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
export function formatSteamNameMarkets(row) {
    return getNameRowSelectedMarkets(row).map(formatSteamNameMarket).join("/");
}

/**
 * Formats one Steam name market key.
 *
 * @param {string} market - Market key.
 * @returns {string} Market label.
 */
export function formatSteamNameMarket(market) {
    const item = NAME_MARKETS.find((entry) => entry.key === market);

    return item?.label || market;
}

/**
 * Gets the normalized original-title language for helper lookups.
 *
 * @param {object} form - Current form values.
 * @returns {string} Original-title language code.
 */
export function getOriginalNameLanguage(form) {
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
export function buildSteamNameChoiceRows(rows, choice) {
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
 * @param {Array<object>} rows - Fetched Steam name rows.
 * @param {string} market - Market key.
 * @returns {object|undefined} Matching row.
 */
export function findSteamNameRow(rows, market) {
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
export function mergeSteamNameRows(hans, hant, blankName, worldwide = true) {
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
export function getNameRowSelectedMarkets(values) {
    return (
        values.markets ||
        NAME_MARKETS.filter((market) => values[market.key]).map(
            (market) => market.key,
        )
    );
}

/**
 * Ensures localized name rows end with a blank row.
 *
 * @param {Array<object>} rows - Localized name rows.
 * @returns {void}
 */
export function ensureTrailingNameRow(rows) {
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
 * @param {object} row - Localized name row.
 * @returns {boolean} Whether the row has any user-facing value.
 */
export function hasAnyNameRowValue(row) {
    return (
        hasEnteredNameRowValue(row) ||
        Boolean(row.official) ||
        getNameRowSelectedMarkets(row).length > 0
    );
}

/**
 * Checks whether a localized name row has entered text.
 *
 * @param {object} row - Localized name row.
 * @param {string} row.name - Localized name value.
 * @param {string} row.sourceUrl - Localized name source URL.
 * @returns {boolean} Whether the row should be kept.
 */
export function hasEnteredNameRowValue(row) {
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
export function getArticleFields() {
    return ARTICLE_PARAMETER_GROUPS.flatMap(getGroupFields);
}

/**
 * Gets an article field definition by form key.
 *
 * @param {string} key - Form key for the field.
 * @returns {object} Matching field definition.
 */
export function getArticleField(key) {
    return getArticleFields().find((field) => field.key === key);
}

/**
 * Maps review existence states to Codex InfoChip statuses.
 *
 * @param {string} status - Review status value.
 * @returns {string} Codex InfoChip status.
 */
export function getReviewStatusChipStatus(status) {
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
 * @param {string} key - Article field key.
 * @returns {object|undefined} Matching source field definition.
 */
export function getSourceReferenceField(key) {
    return SOURCE_REFERENCE_FIELDS.find((field) => field.key === key);
}

/**
 * Gets the fields from an article parameter group.
 *
 * @param {object} group - Article parameter group.
 * @param {Array<object>} group.fields - Field definitions in the group.
 * @returns {Array<object>} Field definitions for the group.
 */
export function getGroupFields(group) {
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
export function getEmptyFieldValue(field) {
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
export function getFieldValueKey(field) {
    return field.sourceKey || field.key;
}

/**
 * Removes a trailing parenthesized disambiguator from a page title.
 *
 * @param {string} title - Page title.
 * @returns {string} Base page title.
 */
export function getBasePageTitle(title) {
    return trimFieldValue(title).replace(/ \(.+?\)$/u, "");
}

/**
 * Creates blank external identifiers for the Enwiki lookup tip.
 *
 * @returns {object} Blank identifier values.
 */
export function createBlankEnwikiMetadata() {
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
export function getWikidataLookupStatus(pageExists) {
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
export function createEnwikiTipPlaceholders(value) {
    return ["Wikidata", "Metacritic", "OpenCritic", "Steam"].map((label) => ({
        label,
        value,
        url: "",
    }));
}

/**
 * Normalizes an English Wikipedia field value.
 *
 * @param {*} value - Raw field value.
 * @returns {string} Normalized title or trimmed value.
 */
export function normalizeEnwikiTitleValue(value) {
    return extractEnwikiTitleFromUrl(value) || trimFieldValue(value);
}

/**
 * Extracts an English Wikipedia title from a pasted URL.
 *
 * @param {*} value - Raw pasted value.
 * @returns {string} English Wikipedia page title, or an empty string.
 */
export function extractEnwikiTitleFromUrl(value) {
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
 * @param {string} title - Page title without a disambiguation suffix.
 * @returns {string} Search URL.
 */
export function buildWikidataSearchUrl(title) {
    return buildGoogleSiteSearchUrl(title, "wikidata.org/wiki");
}

/**
 * Builds a Metacritic game URL.
 *
 * @param {string} id - Metacritic game ID.
 * @returns {string} Game URL.
 */
export function buildMetacriticUrl(id) {
    return `https://www.metacritic.com/game/${encodeURIComponent(id)}/`;
}

/**
 * Builds a Google site search for a Metacritic game page.
 *
 * @param {string} title - Game title without a disambiguation suffix.
 * @returns {string} Search URL.
 */
export function buildMetacriticSearchUrl(title) {
    const query = `"${getBasePageTitle(title)}" site:metacritic.com`;

    return `https://www.google.com/search?q=${encodeURIComponent(query)}`;
}

/**
 * Builds an OpenCritic game URL.
 *
 * @param {string} id - OpenCritic game ID.
 * @returns {string} Game URL.
 */
export function buildOpenCriticUrl(id) {
    return `https://opencritic.com/game/${encodeURIComponent(id)}/-`;
}

/**
 * Builds a Google site search for an OpenCritic game page.
 *
 * @param {string} title - Game title without a disambiguation suffix.
 * @returns {string} Search URL.
 */
export function buildOpenCriticSearchUrl(title) {
    return buildGoogleSiteSearchUrl(title, "opencritic.com/game");
}

/**
 * Builds a Steam store application URL.
 *
 * @param {string} id - Steam application ID.
 * @returns {string} Store URL.
 */
export function buildSteamUrl(id) {
    return `https://store.steampowered.com/app/${encodeURIComponent(id)}/`;
}

/**
 * Builds a Google site search for a Steam application page.
 *
 * @param {string} title - Game title without a disambiguation suffix.
 * @returns {string} Search URL.
 */
export function buildSteamSearchUrl(title) {
    return buildGoogleSiteSearchUrl(title, "store.steampowered.com/app");
}

/**
 * Builds a Google site search URL.
 *
 * @param {string} title - Page title without a disambiguation suffix.
 * @param {string} site - Site or path restriction.
 * @returns {string} Search URL.
 */
export function buildGoogleSiteSearchUrl(title, site) {
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
export function replaceFormValues(form, values) {
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
export function normalizeReceivedFormValues(values) {
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
export function getHistoryEntryForm(entry) {
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
export function applyCitationPatches(rows, patches = []) {
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
export function applyCitationParamPatches(generatedParams = [], patches = []) {
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
export function applyCategoryPatches(rows, patches = []) {
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
export function applyNavboxPatches(rows, patches = []) {
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
export function isCategoryPatchTarget(row, patch) {
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
export function createCategoryPatchRow(patch) {
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
export function syncGeneratedNameNoteTaRow(form) {
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
export function regenerateNoteTaRows(form) {
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
export function isManualNoteTaRow(row) {
    const key = trimFieldValue(row.key);

    return row.source !== NOTE_TA_NAMES_SOURCE && !/^G[1-9]\d*$/u.test(key);
}

/**
 * Gets official localized name rows for NoteTA generation.
 *
 * @param {object} form - Dialog form values.
 * @returns {Array<object>} Official name rows.
 */
export function getOfficialNameNoteTaRows(form) {
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
export function getGeneratedNameNoteTaInsertIndex(rows) {
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
export function ensureNoteTaRows(form) {
    if (!Array.isArray(form.noteTaRows)) {
        form.noteTaRows = [];
    }

    return form.noteTaRows;
}

/**
 * Checks whether a NoteTA row is blank.
 *
 * @param {object} row - NoteTA row.
 * @returns {boolean} Whether the row is blank.
 */
export function isBlankNoteTaRow(row) {
    return (
        trimFieldValue(row?.key) === "" && trimFieldValue(row?.value) === ""
    );
}

/**
 * Ensures the form has editable navbox rows.
 *
 * @param {object} form - Dialog form values.
 * @returns {Array<string>} Navbox rows.
 */
export function ensureNavboxRows(form) {
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
export function createRedirectRow(value = "", fixed = value?.fixed === true) {
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
        ...(value?.pendingEdit == null
            ? {}
            : {
                  pendingEdit: value.pendingEdit,
              }),
    };
}

/**
 * Checks whether a redirect row is blank.
 *
 * @param {object} row - Redirect row.
 * @returns {boolean} Whether the row is blank.
 */
export function isBlankRedirectRow(row) {
    return trimFieldValue(row?.title) === "";
}

/**
 * Marks category rows as fixed for their current category titles.
 *
 * @param {Array<object>} rows - Category rows.
 * @returns {void}
 */
export function markCategoryRowsFixed(rows) {
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
export function markCategoryRowsUnfixed(rows) {
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
export function syncCategoryRowFixedState(row, current) {
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
export function isCategoryRowFixed(row) {
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
export function setRedirectRowTitle(row, value) {
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
export function isRedirectRowFixed(row) {
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
export function ensureRedirectRows(form) {
    if (!Array.isArray(form.redirectRows)) {
        form.redirectRows = [];
    }

    return form.redirectRows;
}

export function hasPreparedNavboxRows(form) {
    return (
        Array.isArray(form.navboxRows) &&
        (form.navboxRows.some((row) => !isBlankNavboxRow(row)) ||
            trimFieldValue(form.series) === "")
    );
}

/**
 * Builds a case-insensitive title comparison key.
 *
 * @param {*} value - Raw title value.
 * @returns {string} Title comparison key.
 */
export function normalizeTitleKey(value) {
    return trimFieldValue(value).toLocaleLowerCase();
}

/**
 * Creates one editable navbox row.
 *
 * @param {*} [value] - Existing row or navbox wikitext.
 * @param {boolean} [fixed] - Whether the row text was just fixed.
 * @returns {object} Navbox row.
 */
export function createNavboxRow(value = "", fixed = value?.fixed === true) {
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
 * Checks whether a navbox row is blank.
 *
 * @param {object} row - Navbox row.
 * @returns {boolean} Whether the row is blank.
 */
export function isBlankNavboxRow(row) {
    return trimFieldValue(row?.text) === "";
}

/**
 * Updates a navbox row text and marks stale checks as unfixed.
 *
 * @param {object} row - Navbox review row.
 * @param {string} value - Raw navbox text.
 * @returns {void}
 */
export function setNavboxRowText(row, value) {
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
export function isNavboxRowFixed(row) {
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
export function shouldSkipFixedRows(refreshOptions, rows, isFixed) {
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
export function getNavboxTitle(value) {
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
export function createCitationRow(value = {}) {
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
export function createCitationParamRow(value = {}) {
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
export function sortManagedCitationParams(params = []) {
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
export function getCitationParamRows(citation) {
    return [...(citation.params || []), createCitationParamRow()];
}

/**
 * Gets visible citation parameter rows for Codex Table.
 *
 * @param {object} citation - Managed citation row.
 * @returns {Array<object>} Visible parameter table rows.
 */
export function getCitationParamTableRows(citation) {
    return getCitationParamRows(citation).map((param, index) => ({
        index,
        param,
    }));
}

/**
 * Builds a key for remounting dynamic citation tabs.
 *
 * @param {Array<object>} rows - Managed citation rows.
 * @returns {string} Citation tabs key.
 */
export function getCitationTabsKey(rows) {
    return rows
        .map((citation) => trimFieldValue(citation.sourceUrl))
        .join("\n");
}

/**
 * Gets source-backed metadata fields as Codex Table rows.
 *
 * @param {object} group - Metadata article parameter group.
 * @returns {Array<object>} Metadata table rows.
 */
export function getMetadataFieldTableRows(group) {
    return group.fields.slice(1).map((field) => ({
        field,
    }));
}

/**
 * Builds the stable tab name for a managed citation row.
 *
 * @param {object} citation - Managed citation row.
 * @param {number} index - Citation row index.
 * @returns {string} Citation tab name.
 */
export function getCitationTabName(citation, index) {
    return `citation-${citation.index || index + 1}`;
}

/**
 * Builds a compact citation tab label.
 *
 * @param {object} citation - Managed citation row.
 * @returns {string} Citation tab label.
 */
export function getCitationTabLabel(citation) {
    return `${citation.index}: ${getCitationSourceDomain(citation.sourceUrl)}`;
}

/**
 * Gets a source URL domain for compact display.
 *
 * @param {string} sourceUrl - Source URL.
 * @returns {string} Hostname or source URL fallback.
 */
export function getCitationSourceDomain(sourceUrl) {
    try {
        return new URL(sourceUrl).hostname.replace(/^www\./u, "");
    } catch (_error) {
        return trimFieldValue(sourceUrl) || "source";
    }
}

/**
 * Gets the MediaWiki ResourceLoader object when it can load CodeMirror.
 *
 * @returns {object|undefined} ResourceLoader object.
 */
export function getCodeMirrorLoader() {
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
export function findTextareaElement(element) {
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
export function getCodeMirrorText(editor, textarea) {
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
export function setCodeMirrorText(editor, textarea, text) {
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
export function hasCitationParamValue(param) {
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
export function cloneValue(value) {
    return JSON.parse(JSON.stringify(value));
}

/**
 * Opens the mounted Codex dialog.
 *
 * @param {object} open - Vue reference controlling dialog visibility.
 * @param {boolean} open.value - Current dialog visibility state.
 * @returns {void}
 */
export function openDialog(open) {
    open.value = true;
}
