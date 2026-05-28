/* eslint-disable */

/**
 * Mounts the create-vg-stub gadget and builds generated article wikitext.
 */

import {
  buildCategoryRows,
  createManualCategoryRow,
  resetCategoryRow,
  updateCategoryRowCategory,
} from "./categories.js";
import { fetchCiteTemplate } from "./citations.js";
import {
  addDialogStyles,
  buildNameSourceReferenceKey,
  createDialogComponent,
  getEnteredNameSourceReferenceFields,
  SOURCE_REFERENCE_FIELDS,
  splitSourceUrls,
  trimFieldValue,
} from "./interface.js";
import {
  clearFormHistory,
  deleteFormHistoryEntry,
  readFormDraftEntry,
  readFormDraftForPage,
  readFormHistory,
  saveFormDraft,
  saveFormHistory,
} from "./history.js";
import {
  buildAggScoresText,
  buildDefaultSortKey,
  buildDefaultSortText,
  buildInfoboxText,
  buildLeadNameText,
  buildNoteTaText,
} from "./fragments/index.js";
import { buildEditSummary } from "./edit-summary.js";
import { fetchEnwikiMetadata } from "./crosswiki.js";
import { countGeneratedProseSinographs } from "./prose-count.js";
import {
  buildCompanyMetadata,
  buildPlatformSeriesMetadata,
  buildYearGenreMetadata,
} from "./sectors/index.js";
import { buildArticleWikitext } from "./wikitext.js";

const MOVE_TEXT_STORAGE_KEY = "create-vg-stub-move-text";
const CATEGORY_CACHE_STORAGE_PREFIX = "create-vg-stub-category-cache:";
const CITATION_PREFETCH_DELAY = 800;

/**
 * Stores normalized video game article parameters.
 */
class VideoGameArticleParams {
  /**
   * Creates reusable video game article parameters.
   *
   * @param {object} form - Dialog form values.
   * @param {string} form.developers - Developer names.
   * @param {string} form.englishName - English game title.
   * @param {string} form.genres - Game genre text.
   * @param {string} form.metacriticPlatform - Metacritic platform.
   * @param {string} form.metacriticScore - Metacritic score.
   * @param {string} form.name - Game title.
   * @param {string} form.openCriticRecommend - OpenCritic recommendation rate.
   * @param {string} form.originalLanguage - Original title language code.
   * @param {string} form.originalName - Original game title.
   * @param {string} form.sortKey - Category sort key.
   * @param {Array<object>} [form.commonNames] - Common localized name rows.
   * @param {Array<object>} [form.categoryRows] - Reviewed category rows.
   * @param {Array<object>} [form.officialNames] - Official localized name rows.
   * @param {string} form.platforms - Platform names.
   * @param {string} form.publishers - Publisher names.
   * @param {string} form.series - Series name.
   * @param {Array<object>} [form.sourceReferences] - Named source refs.
   * @param {string} form.year - Release year.
   */
  constructor(form) {
    this.sourceReferences = buildNamedSourceReferences(form.sourceReferences);
    this.sourceTags = buildSourceReferenceTags(this.sourceReferences);
    this.aggScoresText = buildAggScoresText({
      metacriticPlatform: form.metacriticPlatform || "",
      metacriticScore: form.metacriticScore || "",
      metacriticSourceTag: this.sourceTags.metacriticScore,
      openCriticRecommend: form.openCriticRecommend || "",
      openCriticSourceTag: this.sourceTags.openCriticRecommend,
    });
    this.companies = {
      developers: form.developers,
      publishers: form.publishers,
    };
    this.companyMetadata = buildCompanyMetadata(this.companies, {
      sourceTag: joinSourceTags(this.sourceTags, ["developers", "publishers"]),
    });
    this.englishName = form.englishName || "";
    this.genres = form.genres;
    this.noteTaText = buildNoteTaText({
      officialNames: form.officialNames,
    });
    this.defaultSortText = buildDefaultSortText({
      english: form.englishName || "",
      original: form.originalName || "",
      sortKey: form.sortKey || "",
      title: form.name,
    });
    this.infoboxText = buildInfoboxText({
      commonNames: buildInfoboxNameRows(
        form.commonNames,
        this.sourceTags,
        "commonNames",
      ),
      englishName: this.englishName,
      name: form.name,
      officialNames: buildInfoboxNameRows(
        form.officialNames,
        this.sourceTags,
        "officialNames",
      ),
      originalLanguage: form.originalLanguage || "ja",
      originalName: form.originalName || "",
    });
    this.leadNameText = buildLeadNameText({
      englishName: this.englishName,
      name: form.name,
      originalLanguage: form.originalLanguage || "ja",
      originalName: form.originalName || "",
      sourceTags: this.sourceTags,
    });
    this.name = form.name;
    this.originalLanguage = form.originalLanguage;
    this.originalName = form.originalName || "";
    this.platforms = form.platforms;
    this.platformSeriesMetadata = buildPlatformSeriesMetadata(
      {
        platforms: this.platforms,
        series: form.series || "",
      },
      {
        platformSourceTag: this.sourceTags.platforms,
        seriesSourceTag: this.sourceTags.series,
      },
    );
    this.year = form.year;
    this.yearGenreMetadata = buildYearGenreMetadata({
      genres: this.genres,
      sourceTag: joinSourceTags(this.sourceTags, ["year", "genres"]),
      year: this.year,
    });
    this.categoryRows = form.categoryRows || [];
  }
}

/**
 * Checks whether the current view is editing a missing page.
 *
 * @returns {boolean} Whether the current view is a new-page edit form.
 */
function isNewPageEdit() {
  return (
    isEditAction(mw.config.get("wgAction")) &&
    mw.config.get("wgArticleId") === 0
  );
}

/**
 * Checks whether an action can show a new-page edit form.
 *
 * @param {string} action - MediaWiki action.
 * @returns {boolean} Whether the action edits or submits page text.
 */
function isEditAction(action) {
  return action === "edit" || action === "submit";
}

/**
 * Builds the Chinese Wikipedia video game stub article text.
 *
 * @param {object} params - Normalized article parameters.
 * @param {string} params.aggScoresText - Aggregate review score sentence.
 * @param {object} params.companyMetadata - Company text and metadata.
 * @param {string} params.defaultSortText - DEFAULTSORT wikitext.
 * @param {string} params.infoboxText - Infobox wikitext.
 * @param {string} params.leadNameText - Lead article name text.
 * @param {string} params.noteTaText - NoteTA-lite wikitext.
 * @param {object} params.platformSeriesMetadata - Platform and series text and metadata.
 * @param {Array<object>} params.sourceReferences - Named source references.
 * @param {object} params.yearGenreMetadata - Year/genre text and metadata.
 * @returns {string} Generated Chinese wikitext.
 */
export function buildStubText(params) {
  return buildArticleWikitext(params);
}

/**
 * Builds named source references.
 *
 * @param {Array<object>} [references] - Source references.
 * @returns {Array<object>} Source references with generated names.
 */
function buildNamedSourceReferences(references) {
  return (references || []).map(buildNamedSourceReference);
}

/**
 * Builds one named source reference.
 *
 * @param {object} reference - Source reference.
 * @param {string} reference.citation - Citation template wikitext.
 * @param {string} reference.key - Source reference section key.
 * @param {number} index - Source reference index.
 * @returns {object} Named source reference.
 */
function buildNamedSourceReference(reference, index) {
  return {
    ...reference,
    name: reference.name || `:${index + 1}`,
  };
}

/**
 * Builds source reference tags keyed by article section.
 *
 * @param {Array<object>} references - Named source references.
 * @returns {object} Source reference tags keyed by section.
 */
function buildSourceReferenceTags(references) {
  return references.reduce((tags, reference) => {
    tags[reference.key] = `${tags[reference.key] || ""}${buildReferenceTag(
      reference.name,
    )}`;

    return tags;
  }, {});
}

/**
 * Builds localized infobox name rows with generated source tags.
 *
 * @param {Array<object>} rows - Localized name rows.
 * @param {object} sourceTags - Source reference tags keyed by field.
 * @param {string} key - Localized name group key.
 * @returns {Array<object>} Localized name rows with reference tags.
 */
function buildInfoboxNameRows(rows, sourceTags, key) {
  return (rows || []).map((row, index) => ({
    ...row,
    ref: sourceTags[buildNameSourceReferenceKey(key, index)] || "",
  }));
}

/**
 * Joins source reference tags for one article module.
 *
 * @param {object} tags - Source reference tags keyed by field.
 * @param {Array<string>} keys - Source reference keys to join.
 * @returns {string} Joined source reference tags.
 */
function joinSourceTags(tags, keys) {
  return keys.map((key) => tags[key] || "").join("");
}

/**
 * Builds a named reference invocation.
 *
 * @param {string} name - Reference name.
 * @returns {string} Named reference invocation.
 */
function buildReferenceTag(name) {
  return `<ref name="${name}" />`;
}

/**
 * Replaces the MediaWiki edit textarea with generated wikitext.
 *
 * @param {string} text - Generated wikitext to place in the editor.
 * @returns {void}
 */
function writeEditText(text) {
  const textbox = document.getElementById("wpTextbox1");
  const $textbox = $(textbox);

  if (typeof $textbox.textSelection === "function") {
    $textbox.textSelection("setContents", text);
  } else {
    textbox.value = text;
  }

  $textbox.trigger("input").trigger("change");
  textbox.focus();
}

/**
 * Replaces the MediaWiki edit summary with generated text.
 *
 * @param {string} summary - Generated edit summary.
 * @returns {void}
 */
function writeEditSummary(summary) {
  const summaryInput = document.getElementById("wpSummary");

  if (summaryInput == null) {
    return;
  }

  summaryInput.value = summary;
  $(summaryInput).trigger("input").trigger("change");
}

/**
 * Creates the DOM host used by the Vue application.
 *
 * @returns {HTMLElement} Element appended to the document body.
 */
function createHost() {
  const host = document.createElement("div");

  document.body.append(host);

  return host;
}

/**
 * Gets the default article name from the current page title.
 *
 * @returns {string} Page title without a trailing disambiguation suffix.
 */
function getDefaultName() {
  return mw.config.get("wgTitle").replace(/ \(.+?\)$/u, "");
}

/**
 * Gets placeholder text for one form field.
 *
 * @param {object} form - Dialog form values.
 * @param {object} field - Dialog field definition.
 * @param {string} field.key - Form key for the field.
 * @returns {string|undefined} Placeholder text.
 */
function getFieldPlaceholder(form, field) {
  if (field.key === "wikidataId") {
    return trimFieldValue(form.enwikiTitle) === ""
      ? "Enter enwiki title first"
      : "No connected Wikidata item";
  }

  if (field.key !== "sortKey") {
    return undefined;
  }

  const sortKey = buildDefaultSortKey({
    english: form.englishName,
    original: form.originalName,
    title: form.name,
  });

  return `Leave blank to use ${sortKey}`;
}

/**
 * Builds reusable article parameters from raw form values.
 *
 * @param {object} form - Dialog form values.
 * @param {string} form.developers - Developer names.
 * @param {string} form.genres - Game genre text.
 * @param {string} form.name - Game title.
 * @param {string} form.platforms - Platform names.
 * @param {string} form.publishers - Publisher names.
 * @param {string} form.series - Series name.
 * @param {Array<object>} [form.sourceReferences] - Named source refs.
 * @param {string} form.year - Release year.
 * @returns {object} Normalized article parameters.
 */
export function createArticleParams(form) {
  return new VideoGameArticleParams(form);
}

/**
 * Inserts generated wikitext from dialog form values.
 *
 * @param {object} form - Dialog form values.
 * @param {object} sourceFetchState - Source fetch status state.
 * @param {Function} closeDialog - Dialog close callback.
 * @param {object} citationStore - Citation fetch/cache store.
 * @returns {Promise<void>} Resolves after generated text is written.
 */
async function submitForm(form, sourceFetchState, closeDialog, citationStore) {
  sourceFetchState.error = "";
  sourceFetchState.loading = true;

  try {
    const stub = await buildStubFromForm(form, citationStore);

    writeEditText(stub.text);
    writeEditSummary(buildEditSummary(createEditSummaryMetadata(form, stub)));
    closeDialog();
  } catch (error) {
    sourceFetchState.error = error.message;
  } finally {
    sourceFetchState.loading = false;
  }
}

/**
 * Builds generated wikitext from dialog form values.
 *
 * @param {object} form - Dialog form values.
 * @param {object} citationStore - Citation fetch/cache store.
 * @returns {Promise<string>} Generated stub wikitext.
 */
async function buildStubTextFromForm(form, citationStore) {
  return (await buildStubFromForm(form, citationStore)).text;
}

/**
 * Builds generated wikitext and metadata from dialog form values.
 *
 * @param {object} form - Dialog form values.
 * @param {object} citationStore - Citation fetch/cache store.
 * @returns {Promise<object>} Generated stub text and article parameters.
 */
async function buildStubFromForm(form, citationStore) {
  const params = createArticleParams({
    ...form,
    sourceReferences: await fetchSourceReferences(form, citationStore),
  });

  return {
    params,
    text: buildStubText(params),
  };
}

/**
 * Creates edit summary metadata from dialog form values.
 *
 * @param {object} form - Dialog form values.
 * @param {string} form.englishName - English game title.
 * @param {string} form.originalName - Original game title.
 * @param {string} form.wikidataId - Wikidata item ID.
 * @param {string} form.year - Release year.
 * @param {object} stub - Generated stub data.
 * @param {object} stub.params - Article parameters.
 * @returns {object} Edit summary metadata.
 */
function createEditSummaryMetadata(form, stub) {
  return {
    displayName: getEditSummaryDisplayName(form),
    proseSinographs: countGeneratedProseSinographs(stub.params),
    wikidataId: trimFieldValue(form.wikidataId),
    year: trimFieldValue(form.year),
  };
}

/**
 * Gets the title shown in the edit summary Wikidata link.
 *
 * @param {object} form - Dialog form values.
 * @param {string} form.englishName - English game title.
 * @param {string} form.originalName - Original game title.
 * @returns {string} Summary display title.
 */
function getEditSummaryDisplayName(form) {
  return trimFieldValue(form.originalName) || trimFieldValue(form.englishName);
}

/**
 * Refreshes reviewed category rows from current generated metadata.
 *
 * @param {object} form - Dialog form values.
 * @param {object} categoryState - Category refresh status state.
 * @param {object} categoryCache - Category resolution cache.
 * @returns {Promise<void>} Resolves after category rows are refreshed.
 */
async function refreshFormCategoryRows(
  form,
  categoryState,
  categoryStore,
  options = {},
) {
  categoryState.error = "";
  categoryState.loading = true;

  try {
    if (options.bypassCache) {
      categoryStore.clear();
    }

    form.categoryRows = await buildCategoryRows(
      form,
      createArticleParams({
        ...form,
        categoryRows: [],
      }),
      form.categoryRows,
      {
        bypassCache: options.bypassCache,
        cache: categoryStore.cache,
      },
    );
    categoryStore.save();
  } catch (error) {
    categoryState.error = error.message;
  } finally {
    categoryState.loading = false;
  }
}

/**
 * Saves the current form data with a target page title.
 *
 * @param {object} form - Dialog form values.
 * @param {string} page - Target page title.
 * @returns {void}
 */
function saveCurrentFormHistory(form, page) {
  saveFormHistory(
    {
      ...form,
      name: page,
    },
    page,
  );
}

/**
 * Reads explicit history entries plus the temporary draft.
 *
 * @returns {Array<object>} Form history manager entries.
 */
function readFormHistoryEntries() {
  return [readFormDraftEntry(), ...readFormHistory()].filter(Boolean);
}

/**
 * Fetches citations for entered source URLs.
 *
 * @param {object} form - Dialog form values.
 * @param {object} citationStore - Citation fetch/cache store.
 * @returns {Promise<Array<object>>} Source reference data.
 */
async function fetchSourceReferences(form, citationStore) {
  const entries = getEnteredSourceReferenceFields(form);

  return Promise.all(
    entries.map(fetchSourceReference.bind(null, form, citationStore)),
  );
}

/**
 * Gets source fields with entered URLs.
 *
 * @param {object} form - Dialog form values.
 * @returns {Array<object>} Entered source reference fields.
 */
function getEnteredSourceReferenceFields(form) {
  return [
    ...SOURCE_REFERENCE_FIELDS.flatMap((field) =>
      splitSourceUrls(form[field.sourceKey]).map((sourceUrl) => ({
        ...field,
        sourceUrl,
      })),
    ),
    ...getEnteredNameSourceReferenceFields(form),
  ];
}

/**
 * Fetches one source reference citation.
 *
 * @param {object} form - Dialog form values.
 * @param {object} citationStore - Citation fetch/cache store.
 * @param {object} field - Source reference field.
 * @param {string} field.key - Source reference section key.
 * @param {string} [field.sourceKey] - Form key for the source URL.
 * @param {string} [field.sourceUrl] - Source URL.
 * @returns {Promise<object>} Source reference data.
 */
async function fetchSourceReference(form, citationStore, field) {
  return {
    citation: await citationStore.fetch(getSourceReferenceUrl(form, field)),
    key: field.key,
  };
}

/**
 * Creates a shared citation fetch/cache store.
 *
 * @returns {object} Citation store.
 */
function createCitationStore() {
  const cache = {};
  const pending = {};

  return {
    /**
     * Fetches citation wikitext, reusing cached or in-flight requests.
     *
     * @param {string} url - Source URL.
     * @returns {Promise<string>} Citation template wikitext.
     */
    fetch(url) {
      const key = getCitationStoreKey(url);

      if (cache[key] != null) {
        return Promise.resolve(cache[key]);
      }

      if (pending[key] == null) {
        pending[key] = fetchCiteTemplate(key, { cache }).finally(() => {
          delete pending[key];
        });
      }

      return pending[key];
    },

    /**
     * Starts a background citation fetch for a source URL.
     *
     * @param {string} url - Source URL.
     * @returns {void}
     */
    prefetch(url) {
      if (!isPrefetchableSourceUrl(url)) {
        return;
      }

      this.fetch(url).catch(() => {});
    },
  };
}

/**
 * Creates a per-page category resolution cache backed by localStorage.
 *
 * @returns {object} Category cache store.
 */
function createCategoryCacheStore() {
  const storageKey = `${CATEGORY_CACHE_STORAGE_PREFIX}${getPageName()}`;
  const cache = readJsonStorage(storageKey) || {};

  return {
    cache,

    /**
     * Clears cached category resolutions for the current page.
     *
     * @returns {void}
     */
    clear() {
      Object.keys(cache).forEach((key) => {
        delete cache[key];
      });
      removeStorageItem(storageKey);
    },

    /**
     * Saves cached category resolutions for the current page.
     *
     * @returns {void}
     */
    save() {
      writeJsonStorage(storageKey, cache);
    },
  };
}

/**
 * Reads a JSON value from localStorage.
 *
 * @param {string} key - Storage key.
 * @returns {object|undefined} Stored value.
 */
function readJsonStorage(key) {
  try {
    const value = localStorage.getItem(key);

    return value == null ? undefined : JSON.parse(value);
  } catch (_error) {
    return undefined;
  }
}

/**
 * Writes a JSON value to localStorage.
 *
 * @param {string} key - Storage key.
 * @param {object} value - Value to store.
 * @returns {void}
 */
function writeJsonStorage(key, value) {
  try {
    localStorage.setItem(key, JSON.stringify(value));
  } catch (_error) {}
}

/**
 * Removes one value from localStorage.
 *
 * @param {string} key - Storage key.
 * @returns {void}
 */
function removeStorageItem(key) {
  try {
    localStorage.removeItem(key);
  } catch (_error) {}
}

/**
 * Gets a normalized citation store key.
 *
 * @param {string} url - Source URL.
 * @returns {string} Citation store key.
 */
function getCitationStoreKey(url) {
  return trimFieldValue(url);
}

/**
 * Checks whether a URL is complete enough for background citation fetching.
 *
 * @param {string} url - Source URL.
 * @returns {boolean} Whether the URL should be prefetched.
 */
function isPrefetchableSourceUrl(url) {
  try {
    const parsed = new URL(getCitationStoreKey(url));

    return ["http:", "https:"].includes(parsed.protocol);
  } catch (_error) {
    return false;
  }
}

/**
 * Gets the URL for one source reference field.
 *
 * @param {object} form - Dialog form values.
 * @param {object} field - Source reference field.
 * @param {string} [field.sourceKey] - Form key for the source URL.
 * @param {string} [field.sourceUrl] - Source URL.
 * @returns {string} Trimmed source URL.
 */
function getSourceReferenceUrl(form, field) {
  if (field.sourceUrl != null) {
    return trimFieldValue(field.sourceUrl);
  }

  if (field.sourceKey != null) {
    return trimFieldValue(form[field.sourceKey]);
  }

  return "";
}

/**
 * Opens the dialog from the toolbox link click.
 *
 * @param {*} event - Browser event from the toolbox link.
 * @returns {void}
 */
function handleToolboxClick(event) {
  event.preventDefault();
  window.createVgStubDialog.open();
}

/**
 * Adds the dialog trigger link to the MediaWiki toolbox.
 *
 * @returns {void}
 */
function addToolboxLink() {
  const link = mw.util.addPortletLink(
    "p-tb",
    "#",
    "Create video game stub",
    "t-create-vg-stub",
  );

  link.addEventListener("click", handleToolboxClick);
}

/**
 * Generates current form data and opens it in a target new-page edit form.
 *
 * @param {object} form - Dialog form values.
 * @param {string} title - Target page title.
 * @param {object} sourceFetchState - Source fetch status state.
 * @param {object} citationStore - Citation fetch/cache store.
 * @returns {Promise<void>} Resolves after generated text is stored.
 */
async function openTargetPage(form, title, sourceFetchState, citationStore) {
  sourceFetchState.error = "";
  const targetTitle = trimFieldValue(title);

  if (targetTitle === "") {
    return;
  }

  sourceFetchState.loading = true;

  try {
    const targetForm = {
      ...form,
      name: targetTitle,
    };
    const stub = await buildStubFromForm(targetForm, citationStore);

    sessionStorage.setItem(
      MOVE_TEXT_STORAGE_KEY,
      JSON.stringify({
        form: targetForm,
        text: stub.text,
        summaryMetadata: createEditSummaryMetadata(targetForm, stub),
        title: targetTitle,
      }),
    );
    window.location.href = mw.util.getUrl(targetTitle, {
      action: "edit",
      redlink: "1",
    });
  } catch (error) {
    sourceFetchState.error = error.message;
    sourceFetchState.loading = false;
  }
}

/**
 * Restores moved stub text into the target new-page editor.
 *
 * @returns {void}
 */
function restoreMovedEditText() {
  const pending = getMovedEdit();

  if (pending == null) {
    return;
  }

  writeEditText(pending.text);
  writeEditSummary(buildEditSummary(pending.summaryMetadata || {}));
  sessionStorage.removeItem(MOVE_TEXT_STORAGE_KEY);
}

/**
 * Gets pending moved form values for the current page.
 *
 * @returns {object|undefined} Pending moved form values.
 */
function getMovedForm() {
  return getMovedEdit()?.form;
}

/**
 * Gets pending moved edit data for the current page.
 *
 * @returns {object|undefined} Pending moved edit data.
 */
function getMovedEdit() {
  const item = sessionStorage.getItem(MOVE_TEXT_STORAGE_KEY);

  if (item == null) {
    return undefined;
  }

  const pending = JSON.parse(item);

  if (
    normalizePageTitle(pending.title) !== normalizePageTitle(getPageName())
  ) {
    return undefined;
  }

  return pending;
}

/**
 * Gets the current full page name.
 *
 * @returns {string} Current full page name.
 */
function getPageName() {
  return mw.config.get("wgPageName").replace(/_/gu, " ");
}

/**
 * Normalizes page title text for comparison.
 *
 * @param {string} title - Page title text.
 * @returns {string} Normalized page title text.
 */
function normalizePageTitle(title) {
  return trimFieldValue(title).replace(/_/gu, " ");
}

/**
 * Mounts the Codex dialog and registers the toolbox trigger.
 *
 * @param {Function} require - ResourceLoader module resolver.
 * @returns {void}
 */
function init(require) {
  const Vue = require("vue");
  const Codex = require("@wikimedia/codex");
  const categoryStore = createCategoryCacheStore();
  const citationStore = createCitationStore();
  const defaultName = getDefaultName();

  addDialogStyles();

  const app = Vue.createMwApp(
    createDialogComponent(Vue, {
      citationPrefetchDelay: CITATION_PREFETCH_DELAY,
      defaultName,
      getHistoryEntries: readFormHistoryEntries,
      getFieldPlaceholder,
      initialForm: getMovedForm() || readFormDraftForPage(defaultName),
      onCategoryRowsRefresh: (form, categoryState, refreshOptions) =>
        refreshFormCategoryRows(
          form,
          categoryState,
          categoryStore,
          refreshOptions,
        ),
      onClearHistory: clearFormHistory,
      onCreateCategoryRow: createManualCategoryRow,
      onDeleteHistoryEntry: deleteFormHistoryEntry,
      onEnwikiTitleChange: fetchEnwikiMetadata,
      onFormChange: saveFormDraft,
      onMoveTarget: (...args) => openTargetPage(...args, citationStore),
      onResetCategoryRow: resetCategoryRow,
      onSourceUrlChange: (url) => citationStore.prefetch(url),
      onSubmit: (...args) => submitForm(...args, citationStore),
      onSubmitHistory: saveCurrentFormHistory,
      onUpdateCategoryRowCategory: updateCategoryRowCategory,
    }),
  );

  app.component("CdxDialog", Codex.CdxDialog);
  app.component("CdxButton", Codex.CdxButton);
  app.component("CdxCheckbox", Codex.CdxCheckbox);
  app.component("CdxField", Codex.CdxField);
  app.component("CdxTab", Codex.CdxTab);
  app.component("CdxTabs", Codex.CdxTabs);
  app.component("CdxTextArea", Codex.CdxTextArea);
  app.component("CdxTextInput", Codex.CdxTextInput);
  app.mount(createHost());
  addToolboxLink();
  restoreMovedEditText();
}

if (isNewPageEdit()) {
  mw.loader
    .using([
      "mediawiki.util",
      "jquery.textSelection",
      "vue",
      "@wikimedia/codex",
    ])
    .then(init);
}
