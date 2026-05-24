/* eslint-disable */

/**
 * Mounts the create-vg-stub gadget and builds generated article wikitext.
 */

import { buildCompanyMetadata } from "./companies.js";
import { fetchCiteTemplate } from "./citations.js";
import { buildLeadNameText } from "./lead-name.js";
import { buildPlatformMetadata } from "./platforms.js";
import { buildYearGenreMetadata } from "./year-genre.js";
import {
  buildCategoryLink,
  buildTemplateCall,
  uniqueValues,
} from "./utils.js";

/**
 * Describes a reusable article parameter input.
 */
class ArticleParameterField {
  /**
   * Creates article parameter field metadata.
   *
   * @param {string} key - Form key used by the dialog.
   * @param {string} label - English label shown in the UI.
   * @param {string} path - Normalized parameter path.
   * @param {object} [sourceField] - Optional source URL field metadata.
   */
  constructor(key, label, path, sourceField) {
    this.key = key;
    this.label = label;
    this.path = path;
    this.sourceField = sourceField;
  }
}

/**
 * Describes a group of related article parameter inputs.
 */
class ArticleParameterGroup {
  /**
   * Creates an article parameter group.
   *
   * @param {string} key - Stable group key.
   * @param {string} label - English group heading.
   * @param {Array<ArticleParameterField>} fields - Group field metadata.
   */
  constructor(key, label, fields) {
    this.fields = fields;
    this.key = key;
    this.label = label;
  }
}

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
   * @param {string} form.name - Game title.
   * @param {string} form.originalLanguage - Original title language code.
   * @param {string} form.originalName - Original game title.
   * @param {string} form.platforms - Platform names.
   * @param {string} form.publishers - Publisher names.
   * @param {Array<object>} [form.sourceReferences] - Named source refs.
   * @param {string} form.year - Release year.
   */
  constructor(form) {
    this.sourceReferences = buildNamedSourceReferences(form.sourceReferences);
    this.sourceTags = buildSourceReferenceTags(this.sourceReferences);
    this.companies = {
      developers: form.developers,
      publishers: form.publishers,
    };
    this.companyMetadata = buildCompanyMetadata(this.companies, {
      sourceTag: joinSourceTags(this.sourceTags, ["developers", "publishers"]),
    });
    this.englishName = form.englishName || "";
    this.genres = form.genres;
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

const SOURCE_REFERENCE_FIELDS = [
  {
    key: "originalName",
    label: "Original name source URL",
    sourceKey: "originalNameSourceUrl",
  },
  {
    key: "englishName",
    label: "English name source URL",
    sourceKey: "englishNameSourceUrl",
  },
  {
    key: "year",
    label: "Year source URL",
    sourceKey: "yearSourceUrl",
  },
  {
    key: "developers",
    label: "Developer source URL",
    sourceKey: "developersSourceUrl",
  },
  {
    key: "publishers",
    label: "Publisher source URL",
    sourceKey: "publishersSourceUrl",
  },
  {
    key: "genres",
    label: "Genre source URL",
    sourceKey: "genresSourceUrl",
  },
  {
    key: "platforms",
    label: "Platform source URL",
    sourceKey: "platformsSourceUrl",
  },
];

const MULTI_ITEM_FIELD_KEYS = ["developers", "publishers", "genres", "platforms"];

const ARTICLE_PARAMETER_GROUPS = [
  new ArticleParameterGroup("titles", "Titles", [
    new ArticleParameterField("name", "Name", "name"),
    new ArticleParameterField(
      "originalName",
      "Original name",
      "originalName",
      SOURCE_REFERENCE_FIELDS[0],
    ),
    new ArticleParameterField(
      "englishName",
      "English name",
      "englishName",
      SOURCE_REFERENCE_FIELDS[1],
    ),
  ]),
  new ArticleParameterGroup("attribution", "Attribution", [
    new ArticleParameterField(
      "year",
      "Year",
      "year",
      SOURCE_REFERENCE_FIELDS[2],
    ),
    new ArticleParameterField(
      "developers",
      "Developer(s)",
      "companies.developers",
      SOURCE_REFERENCE_FIELDS[3],
    ),
    new ArticleParameterField(
      "publishers",
      "Publisher(s)",
      "companies.publishers",
      SOURCE_REFERENCE_FIELDS[4],
    ),
    new ArticleParameterField(
      "genres",
      "Genre(s)",
      "genres",
      SOURCE_REFERENCE_FIELDS[5],
    ),
    new ArticleParameterField(
      "platforms",
      "Platform(s)",
      "platforms",
      SOURCE_REFERENCE_FIELDS[6],
    ),
  ]),
];

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
 * @param {object} params.companyMetadata - Company text and metadata.
 * @param {string} params.leadNameText - Lead article name text.
 * @param {object} params.platformMetadata - Platform text and metadata.
 * @param {Array<object>} params.sourceReferences - Named source references.
 * @param {object} params.yearGenreMetadata - Year/genre text and metadata.
 * @returns {string} Generated Chinese wikitext.
 */
export function buildStubText(params) {
  const intro =
    `${params.leadNameText}是${buildVideoGameText(params)}。` +
    params.platformMetadata.text;

  return [
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
  return uniqueValues([
    ...params.companyMetadata.categories,
    ...params.platformMetadata.categories,
    ...params.yearGenreMetadata.categories,
  ])
    .map(buildCategoryLink)
    .join("\n");
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

  textbox.value = text;
  $(textbox).trigger("input").trigger("change");
  textbox.focus();
}

/**
 * Opens the mounted Codex dialog.
 *
 * @param {object} open - Vue reference controlling dialog visibility.
 * @param {boolean} open.value - Current dialog visibility state.
 * @returns {void}
 */
function openDialog(open) {
  open.value = true;
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
 * Creates empty form values keyed by input field name.
 *
 * @returns {object} Initial dialog form values.
 */
function createFormValues() {
  return {
    ...Object.fromEntries(
    [...getArticleFields(), ...SOURCE_REFERENCE_FIELDS].map(getEmptyFieldValue),
    ),
    name: getDefaultName(),
    originalLanguage: "ja",
    publishers: "=",
  };
}

/**
 * Flattens article parameter groups into field metadata.
 *
 * @returns {Array<object>} Dialog field definitions.
 */
function getArticleFields() {
  return ARTICLE_PARAMETER_GROUPS.flatMap(getGroupFields);
}

/**
 * Gets the fields from an article parameter group.
 *
 * @param {object} group - Article parameter group.
 * @param {Array<object>} group.fields - Field definitions in the group.
 * @returns {Array<object>} Field definitions for the group.
 */
function getGroupFields(group) {
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
function getEmptyFieldValue(field) {
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
function getFieldValueKey(field) {
  return field.sourceKey || field.key;
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
 * Checks whether a field accepts multiple list items.
 *
 * @param {object} field - Dialog field definition.
 * @param {string} field.key - Form key for the field.
 * @returns {boolean} Whether the field accepts multiple items.
 */
function isMultiItemField(field) {
  return MULTI_ITEM_FIELD_KEYS.includes(field.key);
}

/**
 * Normalizes a pasted multiline field value.
 *
 * @param {string} value - Raw form field value.
 * @returns {string} Normalized form field value.
 */
function normalizeMultilineFieldValue(value) {
  if (!isMultilineFieldValue(value)) {
    return normalizeEnglishListValue(value);
  }

  return normalizeEnglishListValue(value)
    .split(/[\r\n]+/u)
    .map(trimFieldValue)
    .filter(Boolean)
    .join(", ");
}

/**
 * Normalizes English list endings in a field value.
 *
 * @param {string} value - Raw form field value.
 * @returns {string} Normalized form field value.
 */
function normalizeEnglishListValue(value) {
  return value.replace(/,\s+and\s+/giu, ", ").replace(/\s+and\s+/giu, ", ");
}

/**
 * Checks whether a field value contains multiple lines.
 *
 * @param {string} value - Raw form field value.
 * @returns {boolean} Whether the value is multiline.
 */
function isMultilineFieldValue(value) {
  return /[\r\n]/u.test(value);
}

/**
 * Trims leading and trailing whitespace from a field value.
 *
 * @param {string} value - Raw field item value.
 * @returns {string} Trimmed field item value.
 */
function trimFieldValue(value) {
  return value.trim();
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
 * Creates the Vue component definition for the Codex dialog.
 *
 * @param {object} Vue - ResourceLoader Vue module.
 * @returns {object} Vue component options.
 */
function createDialogComponent(Vue) {
  const activeTab = Vue.ref(ARTICLE_PARAMETER_GROUPS[0].key);
  const form = Vue.reactive(createFormValues());
  const sourceFetchState = Vue.reactive({
    error: "",
    loading: false,
  });
  const open = Vue.ref(false);

  window.createVgStubDialog = {
    open: openDialog.bind(null, open),
  };

  return {
    methods: {
      /**
       * Closes the Codex dialog without writing text.
       *
       * @returns {void}
       */
      closeDialog() {
        open.value = false;
      },

      /**
       * Inserts generated wikitext into the editor.
       *
       * @returns {Promise<void>} Resolves after generated text is written.
       */
      async insertText() {
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
          open.value = false;
        } catch (error) {
          sourceFetchState.error = error.message;
        } finally {
          sourceFetchState.loading = false;
        }
      },

      /**
       * Normalizes multiline article field values.
       *
       * @param {object} field - Article parameter field.
       * @param {string} field.key - Form key for the field.
       * @returns {void}
       */
      normalizeFieldValue(field) {
        form[field.key] = trimFieldValue(form[field.key]);

        if (!isMultiItemField(field)) {
          return;
        }

        form[field.key] = normalizeMultilineFieldValue(form[field.key]);
      },

      /**
       * Trims pasted source URL field values.
       *
       * @param {object} field - Source reference field.
       * @param {string} field.sourceKey - Form key for the source URL.
       * @returns {void}
       */
      trimSourceValue(field) {
        form[field.sourceKey] = trimFieldValue(form[field.sourceKey]);
      },

      /**
       * Trims one form value by key.
       *
       * @param {string} key - Form value key.
       * @returns {void}
       */
      trimFormValue(key) {
        form[key] = trimFieldValue(form[key]);
      },

      /**
       * Normalizes pasted multiline article field values.
       *
       * @param {object} field - Article parameter field.
       * @param {string} field.key - Form key for the field.
       * @param {*} event - Clipboard paste event.
       * @returns {void}
       */
      normalizePastedFieldValue(field, event) {
        if (!isMultiItemField(field)) {
          return;
        }

        const clipboardData = event.clipboardData || event.originalEvent.clipboardData;
        const text = clipboardData.getData("text");

        if (!isMultilineFieldValue(text)) {
          return;
        }

        event.preventDefault();
        form[field.key] = normalizeMultilineFieldValue(text);
      },
    },
    /**
     * Exposes dialog state and actions to the template.
     *
     * @returns {object} Component state consumed by the template.
     */
    setup() {
      return {
        activeTab,
        defaultAction: {
          label: "Cancel",
        },
        groups: ARTICLE_PARAMETER_GROUPS,
        form,
        open,
        primaryAction: {
          actionType: "progressive",
          label: sourceFetchState.loading ? "Fetching" : "Insert",
        },
        sourceFetchState,
      };
    },
    template: `
      <cdx-dialog
        v-model:open="open"
        title="Create video game stub"
        :primary-action="primaryAction"
        :default-action="defaultAction"
        @primary="insertText"
        @default="closeDialog"
      >
        <cdx-tabs
          v-model:active="activeTab"
          framed
        >
          <cdx-tab
            v-for="group in groups"
            :key="group.key"
            :name="group.key"
            :label="group.label"
          >
            <div
              style="padding-top: 12px;"
            >
              <cdx-field
                v-for="field in group.fields"
                :key="field.key"
              >
                <cdx-text-input
                  v-if="field.key === 'originalName'"
                  v-model="form.originalLanguage"
                  placeholder="Language code"
                  @change="trimFormValue('originalLanguage')"
                />
                <cdx-text-input
                  v-model="form[field.key]"
                  @change="normalizeFieldValue(field)"
                  @paste="normalizePastedFieldValue(field, $event)"
                />
                <template #label>{{ field.label }}</template>
                <cdx-text-input
                  v-if="field.sourceField"
                  v-model="form[field.sourceField.sourceKey]"
                  :placeholder="field.sourceField.label"
                  @change="trimSourceValue(field.sourceField)"
                />
              </cdx-field>
            </div>
          </cdx-tab>
        </cdx-tabs>
        <p v-if="sourceFetchState.error">
          {{ sourceFetchState.error }}
        </p>
      </cdx-dialog>
    `,
  };
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
  return SOURCE_REFERENCE_FIELDS.filter((field) =>
    Boolean(form[field.sourceKey].trim()),
  );
}

/**
 * Fetches one source reference citation.
 *
 * @param {object} form - Dialog form values.
 * @param {object} field - Source reference field.
 * @param {string} field.key - Source reference section key.
 * @param {string} field.sourceKey - Form key for the source URL.
 * @returns {Promise<object>} Source reference data.
 */
async function fetchSourceReference(form, field) {
  return {
    citation: await fetchCiteTemplate(trimFieldValue(form[field.sourceKey])),
    key: field.key,
  };
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
  const app = Vue.createMwApp(createDialogComponent(Vue));

  app.component("CdxDialog", Codex.CdxDialog);
  app.component("CdxButton", Codex.CdxButton);
  app.component("CdxField", Codex.CdxField);
  app.component("CdxTab", Codex.CdxTab);
  app.component("CdxTabs", Codex.CdxTabs);
  app.component("CdxTextArea", Codex.CdxTextArea);
  app.component("CdxTextInput", Codex.CdxTextInput);
  app.mount(createHost());
  addToolboxLink();
}

if (isNewPageEdit()) {
  mw.loader.using(["mediawiki.util", "vue", "@wikimedia/codex"]).then(init);
}
