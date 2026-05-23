/* eslint-disable */

/**
 * Mounts the create-vg-stub gadget and builds generated article wikitext.
 */

import { buildCompanyMetadata } from "./companies.js";
import { fetchCiteTemplate } from "./citations.js";
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
   */
  constructor(key, label, path) {
    this.key = key;
    this.label = label;
    this.path = path;
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
   * @param {string} form.genres - Game genre text.
   * @param {string} form.name - Game title.
   * @param {string} form.platforms - Platform names.
   * @param {string} form.publishers - Publisher names.
   * @param {string} form.citation - Citation template wikitext.
   * @param {string} form.year - Release year.
   */
  constructor(form) {
    this.citation = form.citation;
    this.companies = {
      developers: form.developers,
      publishers: form.publishers,
    };
    this.companyMetadata = buildCompanyMetadata(this.companies);
    this.genres = form.genres;
    this.name = form.name;
    this.platforms = form.platforms;
    this.platformMetadata = buildPlatformMetadata(this.platforms);
    this.year = form.year;
    this.yearGenreMetadata = buildYearGenreMetadata({
      genres: this.genres,
      year: this.year,
    });
  }
}

const ARTICLE_PARAMETER_GROUPS = [
  new ArticleParameterGroup("titles", "Titles", [
    new ArticleParameterField("name", "Name", "name"),
  ]),
  new ArticleParameterGroup("attribution", "Attribution", [
    new ArticleParameterField("year", "Year", "year"),
    new ArticleParameterField(
      "developers",
      "Developer(s)",
      "companies.developers",
    ),
    new ArticleParameterField(
      "publishers",
      "Publisher(s)",
      "companies.publishers",
    ),
    new ArticleParameterField("genres", "Genre(s)", "genres"),
    new ArticleParameterField("platforms", "Platform(s)", "platforms"),
  ]),
];

const CITATION_PARAMETER_FIELDS = [
  new ArticleParameterField("citationUrl", "URL", "citationUrl"),
  new ArticleParameterField("citation", "Citation template", "citation"),
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
 * @param {string} params.name - Game title.
 * @param {object} params.platformMetadata - Platform text and metadata.
 * @param {object} params.yearGenreMetadata - Year/genre text and metadata.
 * @returns {string} Generated Chinese wikitext.
 */
export function buildStubText(params) {
  const intro =
    `《'''${params.name}'''》是${buildVideoGameText(params)}` +
    `${buildCitationReferenceText(params.citation)}。` +
    params.platformMetadata.text;

  return [
    intro,
    buildReferencesText(params.citation),
    buildCategoryText(params),
    buildStubTagText(params),
  ]
    .filter(Boolean)
    .join("\n\n");
}

/**
 * Builds reference wikitext for one generated citation template.
 *
 * @param {string} citation - Citation template wikitext.
 * @returns {string} Reference wikitext, or an empty string.
 */
function buildCitationReferenceText(citation) {
  if (citation == null || citation.trim() === "") {
    return "";
  }

  return `<ref>${citation.trim()}</ref>`;
}

/**
 * Builds the references section for generated citations.
 *
 * @param {string} citation - Citation template wikitext.
 * @returns {string} References section, or an empty string.
 */
function buildReferencesText(citation) {
  if (citation == null || citation.trim() === "") {
    return "";
  }

  return "== 参考资料 ==\n{{reflist}}";
}

/**
 * Builds the video game noun phrase.
 *
 * @param {object} params - Normalized article parameters.
 * @param {object} params.companyMetadata - Company text and metadata.
 * @param {object} params.yearGenreMetadata - Year/genre text and metadata.
 * @returns {string} Video game noun phrase.
 */
function buildVideoGameText(params) {
  return params.yearGenreMetadata.text + params.companyMetadata.text;
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
  return Object.fromEntries(
    [...getArticleFields(), ...CITATION_PARAMETER_FIELDS].map(
      getEmptyFieldValue,
    ),
  );
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
 * @param {string} field.key - Form key for the field.
 * @returns {Array<string>} Field key paired with an empty string.
 */
function getEmptyFieldValue(field) {
  return [field.key, ""];
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
  const form = Vue.reactive(createFormValues());
  const citationFetchState = Vue.reactive({
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
       * @returns {void}
       */
      insertText() {
        writeEditText(buildStubText(createArticleParams(form)));
        open.value = false;
      },

      /**
       * Fetches citation metadata for the entered URL.
       *
       * @returns {Promise<void>} Resolves after citation text is updated.
       */
      async fetchCitation() {
        citationFetchState.error = "";
        citationFetchState.loading = true;

        try {
          form.citation = await fetchCiteTemplate(form.citationUrl);
        } catch (error) {
          citationFetchState.error = error.message;
        } finally {
          citationFetchState.loading = false;
        }
      },
    },
    /**
     * Exposes dialog state and actions to the template.
     *
     * @returns {object} Component state consumed by the template.
     */
    setup() {
      return {
        defaultAction: {
          label: "Cancel",
        },
        citationFields: CITATION_PARAMETER_FIELDS,
        citationFetchState,
        fetchCitationAction: {
          actionType: "progressive",
          label: "Fetch",
        },
        groups: ARTICLE_PARAMETER_GROUPS,
        form,
        open,
        primaryAction: {
          actionType: "progressive",
          label: "Insert",
        },
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
        <section
          v-for="group in groups"
          :key="group.key"
        >
          <h3>{{ group.label }}</h3>
          <cdx-field
            v-for="field in group.fields"
            :key="field.key"
          >
            <cdx-text-input v-model="form[field.key]" />
            <template #label>{{ field.label }}</template>
          </cdx-field>
        </section>
        <section>
          <h3>Citation</h3>
          <cdx-field>
            <cdx-text-input v-model="form.citationUrl" />
            <template #label>{{ citationFields[0].label }}</template>
          </cdx-field>
          <cdx-button
            :action="fetchCitationAction.actionType"
            :disabled="citationFetchState.loading"
            @click="fetchCitation"
          >
            {{ citationFetchState.loading ? "Fetching" : fetchCitationAction.label }}
          </cdx-button>
          <cdx-field>
            <cdx-text-area v-model="form.citation" />
            <template #label>{{ citationFields[1].label }}</template>
          </cdx-field>
          <p v-if="citationFetchState.error">
            {{ citationFetchState.error }}
          </p>
        </section>
      </cdx-dialog>
    `,
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
  app.component("CdxTextArea", Codex.CdxTextArea);
  app.component("CdxTextInput", Codex.CdxTextInput);
  app.mount(createHost());
  addToolboxLink();
}

if (isNewPageEdit()) {
  mw.loader.using(["mediawiki.util", "vue", "@wikimedia/codex"]).then(init);
}
