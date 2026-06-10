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
  prepareCompanyCategoryText,
  saveCompanyCategory,
} from "./company-category-helper.js";
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
  buildNavboxText,
  buildNoteTaText,
} from "./fragments/index.js";
import { buildEditSummary } from "./edit-summary.js";
import { fetchEnwikiMetadata } from "./crosswiki.js";
import { countGeneratedProseSinographs } from "./prose-count.js";
import {
  buildPreSaveActions,
  buildRedirectTitles,
  buildTitleFix,
  fetchExistingPageTitles,
  runSelectedActions,
} from "./pre-save.js";
import { addMissingPageEditTrigger } from "./page-trigger.js";
import {
  createSaveProgress,
  readSaveProgress,
  renderSaveProgress,
  storeSaveProgress,
  updateSaveProgress,
} from "./save-progress.js";
import {
  buildCompanyMetadata,
  buildPlatformSeriesMetadata,
  buildYearGenreMetadata,
} from "./sectors/index.js";
import { buildArticleWikitext } from "./wikitext.js";

const MOVE_TEXT_STORAGE_KEY = "create-vg-stub-move-text";
const PENDING_SAVE_STORAGE_KEY = "create-vg-stub-pending-save";
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
   * @param {string} form.additionalProse - User-entered appended prose.
   * @param {string} form.developers - Developer names.
   * @param {string} form.englishName - English game title.
   * @param {string} form.genres - Game genre text.
   * @param {string} form.metacriticPlatform - Metacritic platform.
   * @param {string} form.metacriticScore - Metacritic score.
   * @param {string} form.name - Game title.
   * @param {string} form.navboxText - Series navbox wikitext.
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
    this.additionalProseText = buildAdditionalProseText(
      form.additionalProse,
      this.sourceTags.additionalProse,
    );
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
    this.navboxText = form.navboxText || "";
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
 * Builds user-entered prose with its source reference tags.
 *
 * @param {string} prose - User-entered prose.
 * @param {string} sourceTag - Generated source reference tags.
 * @returns {string} Appended prose wikitext.
 */
function buildAdditionalProseText(prose, sourceTag) {
  const text = trimFieldValue(prose);

  if (text === "") {
    return "";
  }

  const reference = sourceTag || "";

  return text.endsWith("。")
    ? `${text.slice(0, -1)}${reference}。`
    : `${text}${reference}`;
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
 * Checks whether the current view displays a missing page.
 *
 * @returns {boolean} Whether the current action views an uncreated page.
 */
function isMissingPageView() {
  return (
    mw.config.get("wgAction") === "view" &&
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
 * @param {string} params.additionalProseText - User-entered appended prose.
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
    ref:
      sourceTags[row.sourceKey] ||
      sourceTags[buildNameSourceReferenceKey(key, index)] ||
      "",
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
 * Builds a category page URL.
 *
 * @param {string} category - Category title without namespace.
 * @returns {string} Category page URL.
 */
const getCategoryPageUrl = (category) =>
  mw.util.getUrl(`Category:${category}`);

/**
 * Builds a template page URL.
 *
 * @param {string} template - Template title without namespace.
 * @param {boolean} edit - Whether to open the edit form.
 * @returns {string} Template page URL.
 */
const getTemplatePageUrl = (template, edit = false) =>
  mw.util.getUrl(`Template:${template}`, edit ? { action: "edit" } : {});

/**
 * Counts generated prose from current form values.
 *
 * @param {object} form - Dialog form values.
 * @returns {number} Hanzi-equivalent sinograph count.
 */
const getFormProseSinographs = (form) =>
  countGeneratedProseSinographs(createArticleParams(form));

/**
 * Gets placeholder text for one form field.
 *
 * @param {object} form - Dialog form values.
 * @param {object} field - Dialog field definition.
 * @param {string} field.key - Form key for the field.
 * @returns {string|undefined} Placeholder text.
 */
function getFieldPlaceholder(form, field) {
  if (field.key === "name") {
    return getDefaultName();
  }

  if (field.key === "wikidataId") {
    return trimFieldValue(form.enwikiTitle) === ""
      ? "Enter enwiki title first"
      : "No connected Wikidata item";
  }

  if (field.key !== "sortKey") {
    return undefined;
  }

  const normalizedForm = normalizeArticleForm(form);
  const sortKey = buildDefaultSortKey({
    english: normalizedForm.englishName,
    original: normalizedForm.originalName,
    title: normalizedForm.name,
  });

  return sortKey;
}

/**
 * Builds a small live wikitext preview for one dialog field.
 *
 * @param {object} form - Dialog form values.
 * @param {string} previewKey - Shared preview group key.
 * @returns {string} Preview wikitext, or an empty string.
 */
function getFieldPreview(form, previewKey) {
  try {
    return getArticleParamsFieldPreview(createArticleParams(form), previewKey);
  } catch (_error) {
    return "";
  }
}

/**
 * Selects the generated wikitext fragment represented by one field.
 *
 * @param {object} params - Normalized article parameters.
 * @param {string} key - Preview group key.
 * @returns {string} Preview wikitext, or an empty string.
 */
function getArticleParamsFieldPreview(params, key) {
  if (key === "names") {
    return params.leadNameText;
  }

  if (key === "score") {
    return params.aggScoresText;
  }

  if (key === "attribution") {
    return buildAttributionPreviewText(params);
  }

  return "";
}

/**
 * Builds the combined attribution preview sentence.
 *
 * @param {object} params - Normalized article parameters.
 * @returns {string} Attribution preview wikitext.
 */
function buildAttributionPreviewText(params) {
  const introText = `${params.yearGenreMetadata.text}${params.companyMetadata.text}`;
  const platformText = params.platformSeriesMetadata.text;

  if (introText === "") {
    return platformText;
  }

  return `……是${introText}。${platformText}`;
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
  return new VideoGameArticleParams(normalizeArticleForm(form));
}

/**
 * Normalizes form values needed by article builders.
 *
 * @param {object} form - Dialog form values.
 * @param {string} form.name - User-entered article title.
 * @returns {object} Form values with builder fallbacks applied.
 */
function normalizeArticleForm(form) {
  const originalTitle = parsePrefixedValue(
    form.originalName,
    form.originalLanguage || "ja",
  );
  const metacriticScore = parsePrefixedValue(
    form.metacriticScore,
    form.metacriticPlatform || "",
  );
  const localizedNames = getLocalizedNameRows(form);

  return {
    ...form,
    commonNames: localizedNames.filter((row) => !row.official),
    metacriticPlatform: metacriticScore.prefix,
    metacriticScore: metacriticScore.value,
    name: trimFieldValue(form.name) || getDefaultNameFallback(),
    officialNames: localizedNames.filter((row) => row.official),
    originalLanguage: originalTitle.prefix || "ja",
    originalName: originalTitle.value,
  };
}

/**
 * Gets merged localized name rows, preserving source reference keys.
 *
 * @param {object} form - Dialog form values.
 * @returns {Array<object>} Localized name rows.
 */
function getLocalizedNameRows(form) {
  if (Array.isArray(form.localizedNames)) {
    return form.localizedNames.map((row, index) => ({
      ...row,
      sourceKey: buildNameSourceReferenceKey("localizedNames", index),
    }));
  }

  return [
    ...(form.officialNames || []).map((row, index) => ({
      ...row,
      official: true,
      sourceKey: buildNameSourceReferenceKey("officialNames", index),
    })),
    ...(form.commonNames || []).map((row, index) => ({
      ...row,
      official: false,
      sourceKey: buildNameSourceReferenceKey("commonNames", index),
    })),
  ];
}

/**
 * Parses compact prefixed field values like "ja:タイトル".
 *
 * @param {*} value - Raw field value.
 * @param {string} defaultPrefix - Prefix used when none is entered.
 * @returns {object} Parsed prefix and value.
 */
function parsePrefixedValue(value, defaultPrefix) {
  const text = trimFieldValue(value);
  const match = text.match(/^([^:\s][^:]*):(.*)$/u);

  if (match == null) {
    return {
      prefix: trimFieldValue(defaultPrefix),
      value: text,
    };
  }

  return {
    prefix: trimFieldValue(match[1]),
    value: trimFieldValue(match[2]),
  };
}

/**
 * Gets the current page title when MediaWiki globals are available.
 *
 * @returns {string} Default article title, or an empty string.
 */
function getDefaultNameFallback() {
  if (typeof mw === "undefined") {
    return "";
  }

  return getDefaultName();
}

/**
 * Generates wikitext and fills the MediaWiki edit form without submitting it.
 *
 * @param {object} form - Dialog form values.
 * @param {object} sourceFetchState - Source fetch status state.
 * @param {Function} closeDialog - Dialog close callback.
 * @param {object} citationStore - Citation fetch/cache store.
 * @returns {Promise<void>} Resolves after generated text is inserted.
 */
async function fillForm(form, sourceFetchState, closeDialog, citationStore) {
  sourceFetchState.error = "";
  sourceFetchState.loading = true;

  try {
    await writeGeneratedStub(form, citationStore);
    sessionStorage.removeItem(PENDING_SAVE_STORAGE_KEY);
    closeDialog();
  } catch (error) {
    sourceFetchState.error = error.message;
  } finally {
    sourceFetchState.loading = false;
  }
}

/**
 * Generates wikitext and submits the MediaWiki edit form.
 *
 * @param {object} form - Dialog form values.
 * @param {object} sourceFetchState - Source fetch status state.
 * @param {Function} closeDialog - Dialog close callback.
 * @param {object} preSave - Configured pre-save fixes.
 * @param {object} citationStore - Citation fetch/cache store.
 * @returns {Promise<void>} Resolves after save submission starts.
 */
async function submitForm(
  form,
  sourceFetchState,
  closeDialog,
  preSave,
  citationStore,
) {
  sourceFetchState.error = "";
  sourceFetchState.loading = true;

  try {
    const moveTitle = trimFieldValue(preSave?.move?.to);
    const shouldMove =
      preSave?.move?.enabled === true &&
      moveTitle !== "" &&
      normalizePageTitle(moveTitle) !== normalizePageTitle(getPageName());
    const submittedForm = shouldMove
      ? {
          ...form,
          name: moveTitle,
        }
      : form;
    const stub = await buildStubFromForm(submittedForm, citationStore);
    const summary = buildEditSummary(
      createEditSummaryMetadata(submittedForm, stub),
    );
    const pending = {
      actions: preSave.actions,
      move: shouldMove
        ? {
            ...preSave.move,
            to: moveTitle,
          }
        : {
            enabled: false,
          },
    };

    storePendingSaveData(submittedForm, getPageName(), {
      actions: pending.actions,
      move: pending.move,
    });
    startSaveProgress(getPageName(), pending);

    if (document.getElementById("editform") == null) {
      await new mw.Api().postWithToken("csrf", {
        action: "edit",
        createonly: true,
        summary,
        text: stub.text,
        title: getPageName(),
      });
      setSaveProgressStep("save", "complete");
      window.location.href = mw.util.getUrl(getPageName());
    } else {
      writeEditText(stub.text);
      writeEditSummary(summary);
      submitEditForm();
    }

    closeDialog();
  } catch (error) {
    failSaveProgress(error);
    sourceFetchState.error = error.message;
  } finally {
    sourceFetchState.loading = false;
  }
}

/**
 * Starts and renders persistent save progress.
 *
 * @param {string} title - Submitted article title.
 * @param {object} pending - Pending follow-up actions.
 * @returns {void}
 */
function startSaveProgress(title, pending) {
  const progress = createSaveProgress(
    title,
    pending.actions || [],
    pending.move || {},
  );

  storeSaveProgress(updateSaveProgress(progress, "save", "running"));
  renderStoredSaveProgress();
}

/**
 * Updates and renders one save progress row.
 *
 * @param {string} id - Progress row ID.
 * @param {string} status - New status.
 * @returns {void}
 */
function setSaveProgressStep(id, status) {
  const progress = readSaveProgress();

  if (progress == null) {
    return;
  }

  storeSaveProgress(updateSaveProgress(progress, id, status));
  renderStoredSaveProgress();
}

/**
 * Stores a progress failure and keeps the layer visible.
 *
 * @param {Error} error - Save error.
 * @returns {void}
 */
function failSaveProgress(error) {
  const progress = readSaveProgress();

  if (progress == null) {
    return;
  }

  progress.error = error.message || String(error);
  const running = progress.steps.find((step) => step.status === "running");
  const failed = running == null
    ? progress
    : updateSaveProgress(progress, running.id, "failed");

  storeSaveProgress(failed);
  renderSaveProgress(failed);
}

/**
 * Renders stored save progress when available.
 *
 * @returns {void}
 */
function renderStoredSaveProgress() {
  const progress = readSaveProgress();

  if (progress != null) {
    renderSaveProgress(progress);
  }
}

/**
 * Generates and writes article text and its edit summary.
 *
 * @param {object} form - Dialog form values.
 * @param {object} citationStore - Citation fetch/cache store.
 * @returns {Promise<void>} Resolves after the editor is filled.
 */
async function writeGeneratedStub(form, citationStore) {
  const stub = await buildStubFromForm(form, citationStore);

  writeEditText(stub.text);
  writeEditSummary(buildEditSummary(createEditSummaryMetadata(form, stub)));
}

/**
 * Stores the selected follow-up tasks for the saved article.
 *
 * @param {object} form - Submitted dialog form.
 * @param {string} title - Article title.
 * @param {object} [preSave] - Configured pre-save fixes.
 * @returns {void}
 */
function storePendingSaveData(form, title, preSave = {}) {
  sessionStorage.setItem(
    PENDING_SAVE_STORAGE_KEY,
    JSON.stringify({
      form,
      actions: preSave.actions,
      move: preSave.move,
      title,
    }),
  );
}

/**
 * Submits the MediaWiki edit form through its save button.
 *
 * @returns {void}
 */
export function submitEditForm() {
  const editForm = document.getElementById("editform");
  const saveButton = document.getElementById("wpSave");

  if (editForm == null || saveButton == null) {
    throw new Error("MediaWiki save form is unavailable.");
  }

  editForm.requestSubmit(saveButton);
}

/**
 * Reads pending follow-up tasks for the newly saved article.
 *
 * @returns {object|undefined} Pending selected actions.
 */
function getPendingSaveData() {
  const item = sessionStorage.getItem(PENDING_SAVE_STORAGE_KEY);

  if (item == null) {
    return undefined;
  }

  try {
    const pending = JSON.parse(item);

    if (
      normalizePageTitle(pending.title) !== normalizePageTitle(getPageName())
    ) {
      return undefined;
    }

    return pending;
  } catch (_error) {
    sessionStorage.removeItem(PENDING_SAVE_STORAGE_KEY);
    return undefined;
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
  const [sourceReferences, navboxText] = await Promise.all([
    fetchSourceReferences(form, citationStore),
    getFormNavboxText(form),
  ]);
  const params = createArticleParams({
    ...form,
    navboxText,
    sourceReferences,
  });

  return {
    params,
    text: buildStubText(params),
  };
}

/**
 * Gets reviewed navbox text or generates suggestions from the series field.
 *
 * @param {object} form - Dialog form values.
 * @returns {Promise<string>} Navbox wikitext.
 */
async function getFormNavboxText(form) {
  if (!Array.isArray(form.navboxRows)) {
    return buildNavboxText(form.series);
  }

  return form.navboxRows
    .map((row) => trimFieldValue(row?.text ?? row))
    .filter(Boolean)
    .join("\n");
}

/**
 * Builds checked navbox review rows.
 *
 * @param {object} form - Dialog form values.
 * @param {boolean} rebuild - Whether to regenerate rows from the series field.
 * @returns {Promise<Array<object>>} Checked navbox rows.
 */
async function prepareNavboxRows(form, rebuild) {
  const texts =
    rebuild || !Array.isArray(form.navboxRows)
      ? (await buildNavboxText(form.series)).split("\n").filter(Boolean)
      : form.navboxRows.map((row) => row?.text ?? row);
  const rows = texts.map(buildNavboxReviewRow);
  const titles = rows.map((row) => `Template:${row.title}`);
  const existing = new Set(
    (await fetchExistingPageTitles(new mw.Api(), titles)).map(normalizePageTitle),
  );

  return rows.map((row) => ({
    ...row,
    status: existing.has(normalizePageTitle(`Template:${row.title}`))
      ? "OK"
      : "Not exists",
  }));
}

/**
 * Builds one navbox review row from entered wikitext.
 *
 * @param {*} value - Navbox wikitext.
 * @returns {object} Navbox row.
 */
function buildNavboxReviewRow(value) {
  const text = trimFieldValue(value);
  const match = text.match(/^\{\{\s*(?:Template:)?([^|}]+).*?\}\}$/iu);
  const title = trimFieldValue(match?.[1] || text)
    .replace(/^Template:/iu, "");

  return {
    status: "",
    text,
    title,
  };
}

/**
 * Creates edit summary metadata from dialog form values.
 *
 * @param {object} form - Dialog form values.
 * @param {string} form.englishName - English game title.
 * @param {string} form.enwikiTitle - English Wikipedia page title.
 * @param {string} form.originalName - Original game title.
 * @param {string} form.wikidataId - Wikidata entity ID.
 * @param {string} form.year - Release year.
 * @param {object} stub - Generated stub data.
 * @param {object} stub.params - Article parameters.
 * @returns {object} Edit summary metadata.
 */
function createEditSummaryMetadata(form, stub) {
  return {
    displayName: getEditSummaryDisplayName(form),
    enwikiTitle: trimFieldValue(form.enwikiTitle),
    proseSinographs: countGeneratedProseSinographs(stub.params),
    wikidataId: trimFieldValue(form.wikidataId),
    year: trimFieldValue(form.year),
  };
}

/**
 * Gets the title shown in the edit summary name text.
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
 * Fetches official Steam names through generated citations.
 *
 * @param {string} sourceUrl - Steam store app URL.
 * @param {object} citationStore - Citation fetch/cache store.
 * @returns {Promise<Array<object>>} Localized official name rows.
 */
async function fetchSteamNameRows(sourceUrl, citationStore) {
  getSteamAppId(sourceUrl);
  const rows = await Promise.all(
    [
      {
        language: "schinese",
        markets: ["hans"],
      },
      {
        language: "tchinese",
        markets: ["hant"],
      },
    ].map((item) => fetchSteamNameRow(sourceUrl, item, citationStore)),
  );

  return rows.filter(Boolean);
}

/**
 * Fetches one localized Steam name row through generated citation wikitext.
 *
 * @param {string} sourceUrl - Steam store app URL.
 * @param {object} item - Steam language metadata.
 * @param {object} citationStore - Citation fetch/cache store.
 * @returns {Promise<object|undefined>} Localized name row.
 */
async function fetchSteamNameRow(sourceUrl, item, citationStore) {
  const localizedUrl = buildSteamLocalizedSourceUrl(sourceUrl, item.language);
  const citation = await citationStore.fetch(localizedUrl);
  const name = cleanSteamNameTitle(getTemplateParam(citation, "title"));

  if (name === "") {
    return undefined;
  }

  return {
    markets: item.markets,
    name,
    official: true,
    sourceUrl: localizedUrl,
  };
}

/**
 * Gets a Steam app ID from a store URL.
 *
 * @param {string} sourceUrl - Steam store app URL.
 * @returns {string} Steam app ID.
 */
function getSteamAppId(sourceUrl) {
  const match = trimFieldValue(sourceUrl).match(/\/app\/(\d+)(?:[/?#]|$)/u);

  if (match == null) {
    throw new Error("Enter a Steam app URL.");
  }

  return match[1];
}

/**
 * Builds a Steam appdetails API URL.
 *
 * @param {string} appId - Steam app ID.
 * @param {string} language - Steam language key.
 * @returns {string} Steam appdetails API URL.
 */
function buildSteamLocalizedSourceUrl(sourceUrl, language) {
  const url = new URL(trimFieldValue(sourceUrl));

  url.searchParams.set("l", language);

  return url.toString();
}

/**
 * Gets a named template parameter from generated citation wikitext.
 *
 * @param {string} template - Citation template wikitext.
 * @param {string} key - Template parameter key.
 * @returns {string} Template parameter value.
 */
function getTemplateParam(template, key) {
  const match = String(template).match(new RegExp(
    `(?:^|\\|)\\s*${escapeRegExp(key)}\\s*=\\s*([^|}]*)`,
    "u",
  ));

  return trimFieldValue(match?.[1] || "");
}

/**
 * Escapes text for use inside a regular expression.
 *
 * @param {string} text - Raw text.
 * @returns {string} Escaped text.
 */
function escapeRegExp(text) {
  return text.replace(/[.*+?^${}()|[\]\\]/gu, "\\$&");
}

/**
 * Cleans a Steam citation title into the displayed game name.
 *
 * @param {string} title - Citation title.
 * @returns {string} Game name.
 */
function cleanSteamNameTitle(title) {
  return trimFieldValue(title)
    .replace(/^Steam - /u, "")
    .replace(/^Steam 上的 /u, "")
    .replace(/ on Steam$/u, "");
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

  if (isMissingPageView()) {
    addMissingPageEditTrigger(document, handleToolboxClick);
  }
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
  const movedEdit = getMovedEdit();

  addDialogStyles();

  const app = Vue.createMwApp(
    createDialogComponent(Vue, {
      citationPrefetchDelay: CITATION_PREFETCH_DELAY,
      defaultName,
      getCategoryPageUrl,
      getTemplatePageUrl,
      getHistoryEntries: readFormHistoryEntries,
      getFieldPlaceholder,
      getFieldPreview,
      getProseSinographs: getFormProseSinographs,
      initialForm: movedEdit?.form || readFormDraftForPage(defaultName),
      initialOpen: movedEdit != null,
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
      onFill: isMissingPageView()
        ? (form, sourceFetchState) =>
            openTargetPage(
              form,
              getPageName(),
              sourceFetchState,
              citationStore,
            )
        : (...args) => fillForm(...args, citationStore),
      onFormChange: saveFormDraft,
      onMoveTarget: (...args) => openTargetPage(...args, citationStore),
      onPrepareCompanyCategory: prepareCompanyCategoryText,
      onPrepareReview: prepareNavboxRows,
      async onPreSavePrepare(form, title) {
        const redirectTitles = buildRedirectTitles(form, title);
        const existingRedirectTitles = await fetchExistingPageTitles(
          new mw.Api(),
          redirectTitles,
        );

        return {
          actions: buildPreSaveActions(
            {
              form,
              title,
            },
            existingRedirectTitles,
          ),
          move: buildTitleFix(form, title),
        };
      },
      onResetCategoryRow: resetCategoryRow,
      onSaveCompanyCategory: saveCompanyCategory,
      onSourceUrlChange: (url) => citationStore.prefetch(url),
      onSteamNamesFetch: (url) => fetchSteamNameRows(url, citationStore),
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
  renderStoredSaveProgress();
  restoreMovedEditText();
}

/**
 * Runs the preselected follow-up actions on the newly created article.
 *
 * @param {Function} require - ResourceLoader module resolver.
 * @returns {void}
 */
async function runPendingSaveActions(require) {
  const pending = getPendingSaveData();

  if (pending == null) {
    return;
  }

  setSaveProgressStep("save", "complete");

  try {
    const api = new mw.Api();
    let currentTitle = pending.title;
    const result = await runSelectedActions(pending.actions || [], {
      api,
      move: pending.move,
      onActionComplete(action) {
        setSaveProgressStep(action.id, "complete");
      },
      onActionSkipped(action) {
        setSaveProgressStep(action.id, "skipped");
      },
      onActionStart(action) {
        setSaveProgressStep(action.id, "running");
      },
      onMoveComplete(title) {
        currentTitle = title;
        setSaveProgressStep("move", "complete");
      },
      onMoveStart() {
        setSaveProgressStep("move", "running");
      },
      title: currentTitle,
      wikidataApi: new mw.ForeignApi("https://www.wikidata.org/w/api.php"),
    });

    sessionStorage.removeItem(PENDING_SAVE_STORAGE_KEY);

    if (
      normalizePageTitle(result.title) !== normalizePageTitle(getPageName())
    ) {
      window.location.href = mw.util.getUrl(result.title);
    }
  } catch (error) {
    failSaveProgress(error);
  }
}

if (isNewPageEdit() || isMissingPageView()) {
  mw.loader
    .using([
      "mediawiki.api",
      "mediawiki.ForeignApi",
      "mediawiki.util",
      "jquery.textSelection",
      "vue",
      "@wikimedia/codex",
    ])
    .then(init);
} else if (
  mw.config.get("wgAction") === "view" &&
  mw.config.get("wgArticleId") !== 0 &&
  getPendingSaveData() != null
) {
  mw.loader
    .using([
      "mediawiki.api",
      "mediawiki.ForeignApi",
      "mediawiki.util",
    ])
    .then(runPendingSaveActions);
}
