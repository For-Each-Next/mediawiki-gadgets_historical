/* eslint-disable */

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
   * @param {string} form.year - Release year.
   */
  constructor(form) {
    this.companies = {
      developers: form.developers,
      publishers: form.publishers,
    };
    this.genres = form.genres;
    this.name = form.name;
    this.platforms = form.platforms;
    this.year = form.year;
    this.genreReferences = getGenreReferences(this.genres);
    this.yearReference = getYearReference(this.year);
  }
}

const FIELD_REFERENCE_DATA = __CREATE_VG_STUB_FIELD_DATA__;

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
 * @param {object} params.companies - Company-related parameters.
 * @param {string} params.companies.developers - Developer names.
 * @param {string} params.companies.publishers - Publisher names.
 * @param {Array<object>} params.genreReferences - Matched genre metadata.
 * @param {string} params.name - Game title.
 * @param {string} params.platforms - Platform names.
 * @param {string} params.year - Release year.
 * @param {object} params.yearReference - Matched year metadata.
 * @returns {string} Generated Chinese wikitext.
 */
function buildStubText(params) {
  const intro =
    `《'''${params.name}'''》是${buildYearGenreText(params)}` +
    `[[电子游戏]]，由${params.companies.developers}开发、` +
    `${params.companies.publishers}发行。` +
    `游戏对应${params.platforms}平台。`;

  return [intro, buildCategoryText(params), buildStubTagText(params)]
    .filter(Boolean)
    .join("\n\n");
}

/**
 * Builds the year and genre phrase for the intro sentence.
 *
 * @param {object} params - Normalized article parameters.
 * @param {Array<object>} params.genreReferences - Matched genre metadata.
 * @param {string} params.genres - Raw genre text.
 * @param {object} params.yearReference - Matched year metadata.
 * @returns {string} Year and genre phrase.
 */
function buildYearGenreText(params) {
  return `${params.yearReference.phrase}${buildGenreText(params)}类`;
}

/**
 * Builds genre-aware text for the genre phrase.
 *
 * @param {object} params - Normalized article parameters.
 * @param {Array<object>} params.genreReferences - Matched genre metadata.
 * @param {string} params.genres - Raw genre text.
 * @returns {string} Genre phrase wikitext.
 */
function buildGenreText(params) {
  const [genreReference] = params.genreReferences;

  if (genreReference == null || genreReference.page == null) {
    return params.genres;
  }

  return buildLinkText(
    genreReference.page.title,
    removeGameSuffix(genreReference.page.label),
  );
}

/**
 * Builds category wikitext from accepted article metadata.
 *
 * @param {object} params - Normalized article parameters.
 * @param {Array<object>} params.genreReferences - Matched genre metadata.
 * @returns {string} Category wikitext.
 */
function buildCategoryText(params) {
  const categories = [
    ...getReferenceValues(params.genreReferences, "categories"),
    ...params.yearReference.categories,
  ];

  return uniqueValues(categories).map(buildCategoryLink).join("\n");
}

/**
 * Builds stub tag wikitext from accepted article metadata.
 *
 * @param {object} params - Normalized article parameters.
 * @param {Array<object>} params.genreReferences - Matched genre metadata.
 * @returns {string} Stub tag wikitext.
 */
function buildStubTagText(params) {
  return uniqueValues(getReferenceValues(params.genreReferences, "stubTags"))
    .map(buildTemplateCall)
    .join("\n");
}

/**
 * Builds a category link.
 *
 * @param {string} category - Category title without namespace.
 * @returns {string} Category wikitext.
 */
function buildCategoryLink(category) {
  return `[[Category:${category}]]`;
}

/**
 * Builds a template call.
 *
 * @param {string} template - Template title without braces.
 * @returns {string} Template wikitext.
 */
function buildTemplateCall(template) {
  return `{{${template}}}`;
}

/**
 * Builds wiki link text.
 *
 * @param {string} title - Link target.
 * @param {string} label - Link label.
 * @returns {string} Link wikitext.
 */
function buildLinkText(title, label) {
  return `[[${title}|${label}]]`;
}

/**
 * Removes Chinese video game suffixes from display labels.
 *
 * @param {string} value - Display label.
 * @returns {string} Display label without the game suffix.
 */
function removeGameSuffix(value) {
  return value.replace(/(?:[电電]子)?[游遊][戏戲]$/u, "");
}

/**
 * Gets an array property from matched reference definitions.
 *
 * @param {Array<object>} references - Matched reference definitions.
 * @param {string} key - Reference array key.
 * @returns {Array<string>} Flattened reference values.
 */
function getReferenceValues(references, key) {
  return references.flatMap((reference) => reference[key] || []);
}

/**
 * Removes duplicate values while preserving order.
 *
 * @param {Array<string>} values - Values to deduplicate.
 * @returns {Array<string>} Unique values.
 */
function uniqueValues(values) {
  return Array.from(new Set(values));
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
  return Object.fromEntries(getArticleFields().map(getEmptyFieldValue));
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
 * Gets reference metadata for the genre parameter.
 *
 * @param {string} value - User-entered genre value.
 * @returns {Array<object>} Matched linked pages, categories, and tags.
 */
function getGenreReferences(value) {
  return splitFieldValues(value)
    .map(getReferenceDefinition.bind(null, FIELD_REFERENCE_DATA.genres))
    .filter(Boolean);
}

/**
 * Gets category and display metadata for a year value.
 *
 * @param {string} value - User-entered year value.
 * @returns {object} Year phrase and categories.
 */
function getYearReference(value) {
  const year = trimValue(value);

  if (year === "") {
    return {
      categories: [],
      phrase: "一款",
    };
  }

  if (year === "~") {
    return {
      categories: ["未来电子游戏"],
      phrase: "尚未推出的",
    };
  }

  if (year.startsWith("~")) {
    return getPlannedYearReference(year.slice(1));
  }

  return {
    categories: getYearCategories(year),
    phrase: `${year}年`,
  };
}

/**
 * Gets display and category metadata for a planned release year.
 *
 * @param {string} value - Planned release year.
 * @returns {object} Planned year phrase and categories.
 */
function getPlannedYearReference(value) {
  const year = trimValue(value);

  return {
    categories: uniqueValues(["未来电子游戏", ...getYearCategories(year)]),
    phrase: `预定于${year}年推出的`,
  };
}

/**
 * Gets category titles for a year.
 *
 * @param {string} year - Release year.
 * @returns {Array<string>} Year category titles.
 */
function getYearCategories(year) {
  return FIELD_REFERENCE_DATA.years[year] || [];
}

/**
 * Gets one reference definition by canonical genre label or alias.
 *
 * @param {object} definitions - Reference definitions for a lookup field.
 * @param {string} value - User-entered field item.
 * @returns {object|undefined} Matched reference definition.
 */
function getReferenceDefinition(definitions, value) {
  return (
    definitions[value] || getReferenceDefinitionByAlias(definitions, value)
  );
}

/**
 * Gets one reference definition by alias.
 *
 * @param {object} definitions - Reference definitions for a lookup field.
 * @param {string} alias - User-entered alias.
 * @returns {object|undefined} Matched reference definition.
 */
function getReferenceDefinitionByAlias(definitions, alias) {
  return Object.values(definitions).find((definition) =>
    (definition.aliases || []).includes(alias),
  );
}

/**
 * Splits one user-entered field into reusable lookup values.
 *
 * @param {string} value - User-entered field value.
 * @returns {Array<string>} Individual lookup values.
 */
function splitFieldValues(value) {
  return value
    .split(/[、,，;；/]+/u)
    .map(trimValue)
    .filter(Boolean);
}

/**
 * Trims a lookup value.
 *
 * @param {string} value - Raw lookup value.
 * @returns {string} Trimmed lookup value.
 */
function trimValue(value) {
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
 * @param {string} form.year - Release year.
 * @returns {object} Normalized article parameters.
 */
function createArticleParams(form) {
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
  app.component("CdxField", Codex.CdxField);
  app.component("CdxTextInput", Codex.CdxTextInput);
  app.mount(createHost());
  addToolboxLink();
}

if (isNewPageEdit()) {
  mw.loader.using(["mediawiki.util", "vue", "@wikimedia/codex"]).then(init);
}
