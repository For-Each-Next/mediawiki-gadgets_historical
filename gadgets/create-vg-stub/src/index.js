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
  trimFieldValue,
} from "./form.js";
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
  buildPlatformMetadata,
  buildYearGenreMetadata,
} from "./wikitext/index.js";

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
    this.platformMetadata = buildPlatformMetadata(this.platforms, {
      sourceTag: this.sourceTags.platforms,
    });
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
    mw.config.get("wgAction") === "edit" && mw.config.get("wgArticleId") === 0
  );
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
 * @param {object} params.platformMetadata - Platform text and metadata.
 * @param {Array<object>} params.sourceReferences - Named source references.
 * @param {object} params.yearGenreMetadata - Year/genre text and metadata.
 * @returns {string} Generated Chinese wikitext.
 */
export function buildStubText(params) {
  const intro =
    `${params.leadNameText}是${buildVideoGameText(params)}。` +
    params.platformMetadata.text +
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
  return Object.fromEntries(references.map(buildSourceReferenceTagEntry));
}

/**
 * Builds one source reference tag entry.
 *
 * @param {object} reference - Named source reference.
 * @param {string} reference.key - Source reference section key.
 * @param {string} reference.name - Reference name.
 * @returns {Array<string>} Source reference tag entry.
 */
function buildSourceReferenceTagEntry(reference) {
  return [reference.key, buildReferenceTag(reference.name)];
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
 * @param {object} params.platformMetadata - Platform text and metadata.
 * @param {object} params.yearGenreMetadata - Year/genre text and metadata.
 * @returns {string} Category wikitext.
 */
function buildCategoryText(params) {
  const categoryText = uniqueValues([
    ...params.companyMetadata.categories,
    ...params.platformMetadata.categories,
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
 * @param {object} params.platformMetadata - Platform text and metadata.
 * @param {object} params.yearGenreMetadata - Year/genre text and metadata.
 * @returns {string} Stub tag wikitext.
 */
function buildStubTagText(params) {
  return uniqueValues([
    ...params.companyMetadata.stubTags,
    ...params.platformMetadata.stubTags,
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
 * @returns {Promise<void>} Resolves after generated text is written.
 */
async function submitForm(form, sourceFetchState, closeDialog) {
  sourceFetchState.error = "";
  sourceFetchState.loading = true;

  try {
    writeEditText(
      buildStubText(
        createArticleParams({
          ...form,
          sourceReferences: await fetchSourceReferences(form),
        }),
      ),
    );
    closeDialog();
  } catch (error) {
    sourceFetchState.error = error.message;
  } finally {
    sourceFetchState.loading = false;
  }
}

/**
 * Fetches citations for entered source URLs.
 *
 * @param {object} form - Dialog form values.
 * @returns {Promise<Array<object>>} Source reference data.
 */
async function fetchSourceReferences(form) {
  const entries = getEnteredSourceReferenceFields(form);

  return Promise.all(entries.map(fetchSourceReference.bind(null, form)));
}

/**
 * Gets source fields with entered URLs.
 *
 * @param {object} form - Dialog form values.
 * @returns {Array<object>} Entered source reference fields.
 */
function getEnteredSourceReferenceFields(form) {
  return [
    ...SOURCE_REFERENCE_FIELDS.filter((field) =>
      Boolean(form[field.sourceKey].trim()),
    ),
    ...getEnteredNameSourceReferenceFields(form),
  ];
}

/**
 * Fetches one source reference citation.
 *
 * @param {object} form - Dialog form values.
 * @param {object} field - Source reference field.
 * @param {string} field.key - Source reference section key.
 * @param {string} [field.sourceKey] - Form key for the source URL.
 * @param {string} [field.sourceUrl] - Source URL.
 * @returns {Promise<object>} Source reference data.
 */
async function fetchSourceReference(form, field) {
  return {
    citation: await fetchCiteTemplate(getSourceReferenceUrl(form, field)),
    key: field.key,
  };
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
  if (field.sourceKey != null) {
    return trimFieldValue(form[field.sourceKey]);
  }

  return trimFieldValue(field.sourceUrl);
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
 * Mounts the Codex dialog and registers the toolbox trigger.
 *
 * @param {Function} require - ResourceLoader module resolver.
 * @returns {void}
 */
function init(require) {
  const Vue = require("vue");
  const Codex = require("@wikimedia/codex");
  const app = Vue.createMwApp(createDialogComponent(Vue, {
    defaultName: getDefaultName(),
    getFieldPlaceholder,
    onSubmit: submitForm,
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
}

if (isNewPageEdit()) {
  mw.loader.using([
    "mediawiki.util",
    "jquery.textSelection",
    "vue",
    "@wikimedia/codex",
  ]).then(init);
}
