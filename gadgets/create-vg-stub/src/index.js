/* eslint-disable */

/**
 * Mounts the create-vg-stub gadget and builds generated article wikitext.
 */

import { fetchCiteTemplate } from "./citations.js";
import {
  buildNameSourceReferenceKey,
  createDialogComponent,
  getEnteredNameSourceReferenceFields,
  SOURCE_REFERENCE_FIELDS,
  splitSourceUrls,
  trimFieldValue,
} from "./form/index.js";
import {
  buildCategoryLink,
  buildTemplateCall,
  uniqueValues,
} from "./utils.js";
import {
  buildAggScoresText,
  buildCompanyMetadata,
  buildDefaultSortKey,
  buildDefaultSortText,
  buildInfoboxText,
  buildLeadNameText,
  buildNoteTaText,
  buildPlatformSeriesMetadata,
  buildYearGenreMetadata,
} from "./wikitext/index.js";

const MOVE_TEXT_STORAGE_KEY = "create-vg-stub-move-text";
const CITATION_PREFETCH_DELAY = 800;
const DIALOG_CSS = `
.create-vg-stub-tab-panel {
  padding-top: 12px;
}

.create-vg-stub-field-row,
.create-vg-stub-name-row {
  display: grid;
  gap: 12px;
  align-items: center;
}

.create-vg-stub-field-row {
  grid-template-columns: 4rem minmax(0, 1fr);
  margin-bottom: 12px;
}

.create-vg-stub-field-separator {
  border: 0;
  border-top: 1px solid #eaecf0;
  grid-column: 1 / -1;
  margin: 16px 0;
}

.create-vg-stub-field-separator-compact {
  margin: 16px 0 12px;
}

.create-vg-stub-name-row {
  border-bottom: 1px solid #eaecf0;
  grid-template-columns: minmax(0, 1fr);
  margin-bottom: 16px;
  padding-bottom: 16px;
}

.create-vg-stub-field-label {
  font-weight: 600;
  line-height: 1.35;
  overflow-wrap: anywhere;
}

.create-vg-stub-field-controls,
.create-vg-stub-name-controls {
  display: grid;
  gap: 0;
  min-width: 0;
}

.create-vg-stub-source-url textarea,
textarea.create-vg-stub-source-url {
  height: 32px;
  min-height: 32px;
  resize: vertical;
}

@media (max-width: 640px) {
  .create-vg-stub-field-row,
  .create-vg-stub-name-row {
    grid-template-columns: 1fr;
  }
}
`;

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
  }
}

/**
 * Checks whether the current view is editing a missing page.
 *
 * @returns {boolean} Whether the current view is a new-page edit form.
 */
function isNewPageEdit() {
  return (
    isEditAction(mw.config.get("wgAction")) && mw.config.get("wgArticleId") === 0
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
 * Builds the Chinese Wikipedia video game stub sentence.
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
  const intro =
    `${params.leadNameText}是${buildVideoGameText(params)}。` +
    params.platformSeriesMetadata.text +
    params.aggScoresText;

  return [
    params.noteTaText,
    params.infoboxText,
    intro,
    buildReferencesText(params.sourceReferences),
    buildCategoryText(params),
    buildStubTagText(params),
  ]
    .filter(Boolean)
    .join("\n\n");
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
 * Builds the video game noun phrase.
 *
 * @param {object} params - Normalized article parameters.
 * @param {object} params.companyMetadata - Company text and metadata.
 * @param {Array<object>} params.sourceReferences - Named source references.
 * @param {object} params.yearGenreMetadata - Year/genre text and metadata.
 * @returns {string} Video game noun phrase.
 */
function buildVideoGameText(params) {
  return params.yearGenreMetadata.text + params.companyMetadata.text;
}

/**
 * Builds the references section for generated citations.
 *
 * @param {Array<object>} references - Named source references.
 * @returns {string} References section, or an empty string.
 */
function buildReferencesText(references) {
  if (references.length === 0) {
    return "";
  }

  return `== 参考文献 ==\n\n<references>\n${references
    .map(buildFullReferenceText)
    .join("\n")}\n</references>`;
}

/**
 * Builds one full named reference.
 *
 * @param {object} reference - Named source reference.
 * @param {string} reference.citation - Citation template wikitext.
 * @param {string} reference.name - Reference name.
 * @returns {string} Full named reference wikitext.
 */
function buildFullReferenceText(reference) {
  return `<ref name="${reference.name}">${reference.citation}</ref>`;
}

/**
 * Builds category wikitext from accepted article metadata.
 *
 * @param {object} params - Normalized article parameters.
 * @param {object} params.companyMetadata - Company text and metadata.
 * @param {object} params.platformSeriesMetadata - Platform and series text and metadata.
 * @param {object} params.yearGenreMetadata - Year/genre text and metadata.
 * @returns {string} Category wikitext.
 */
function buildCategoryText(params) {
  const categoryText = uniqueValues([
    ...params.companyMetadata.categories,
    ...params.platformSeriesMetadata.categories,
    ...params.yearGenreMetadata.categories,
  ])
    .map(buildCategoryLink)
    .join("\n");

  if (categoryText === "") {
    return "";
  }

  return `${params.defaultSortText}\n${categoryText}`;
}

/**
 * Builds stub tag wikitext from accepted article metadata.
 *
 * @param {object} params - Normalized article parameters.
 * @param {object} params.companyMetadata - Company text and metadata.
 * @param {object} params.platformSeriesMetadata - Platform and series text and metadata.
 * @param {object} params.yearGenreMetadata - Year/genre text and metadata.
 * @returns {string} Stub tag wikitext.
 */
function buildStubTagText(params) {
  return uniqueValues([
    ...params.companyMetadata.stubTags,
    ...params.platformSeriesMetadata.stubTags,
    ...params.yearGenreMetadata.stubTags,
  ])
    .map(buildTemplateCall)
    .join("\n");
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
 * Adds dialog styles to the current page.
 *
 * @returns {void}
 */
function addDialogStyles() {
  mw.util.addCSS(DIALOG_CSS);
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
  if (field.key !== "sortKey") {
    return undefined;
  }

  return buildDefaultSortKey({
    english: form.englishName,
    original: form.originalName,
    title: form.name,
  });
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
    writeEditText(await buildStubTextFromForm(form, citationStore));
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
  return buildStubText(
    createArticleParams({
      ...form,
      sourceReferences: await fetchSourceReferences(form, citationStore),
    }),
  );
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
    sessionStorage.setItem(
      MOVE_TEXT_STORAGE_KEY,
      JSON.stringify({
        form: {
          ...form,
          name: targetTitle,
        },
        text: await buildStubTextFromForm(
          {
            ...form,
            name: targetTitle,
          },
          citationStore,
        ),
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

  if (normalizePageTitle(pending.title) !== normalizePageTitle(getPageName())) {
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
  const citationStore = createCitationStore();

  addDialogStyles();

  const app = Vue.createMwApp(createDialogComponent(Vue, {
    citationPrefetchDelay: CITATION_PREFETCH_DELAY,
    defaultName: getDefaultName(),
    getFieldPlaceholder,
    initialForm: getMovedForm(),
    onMoveTarget: (...args) => openTargetPage(...args, citationStore),
    onSourceUrlChange: (url) => citationStore.prefetch(url),
    onSubmit: (...args) => submitForm(...args, citationStore),
  }));

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
  mw.loader.using([
    "mediawiki.util",
    "jquery.textSelection",
    "vue",
    "@wikimedia/codex",
  ]).then(init);
}
