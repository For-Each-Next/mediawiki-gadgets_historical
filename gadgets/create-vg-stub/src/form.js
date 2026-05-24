/* eslint-disable */

/**
 * Builds the create-vg-stub dialog form.
 */

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
   * @param {string} [nameGroupKey] - Localized name row form key.
   */
  constructor(key, label, fields, nameGroupKey) {
    this.fields = fields;
    this.key = key;
    this.label = label;
    this.nameGroupKey = nameGroupKey;
  }
}

export const SOURCE_REFERENCE_FIELDS = [
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
const NAME_GROUP_KEYS = ["officialNames", "commonNames"];
const NAME_MARKETS = [
  {
    key: "ww",
    label: "WW",
  },
  {
    key: "hans",
    label: "Hans",
  },
  {
    key: "hant",
    label: "Hant",
  },
  {
    key: "cn",
    label: "CN",
  },
  {
    key: "tw",
    label: "TW",
  },
  {
    key: "hk",
    label: "HK",
  },
];

const ARTICLE_PARAMETER_GROUPS = [
  new ArticleParameterGroup("titles", "Titles", [
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
    new ArticleParameterField("sortKey", "Sort key", "sortKey"),
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
  new ArticleParameterGroup("officialNames", "Official", [], "officialNames"),
  new ArticleParameterGroup("commonNames", "Common", [], "commonNames"),
];

/**
 * Creates the Vue component definition for the Codex dialog.
 *
 * @param {object} Vue - ResourceLoader Vue module.
 * @param {object} options - Dialog options.
 * @param {string} options.defaultName - Default article title.
 * @param {Function} options.getFieldPlaceholder - Field placeholder builder.
 * @param {Function} options.onSubmit - Submit handler.
 * @returns {object} Vue component options.
 */
export function createDialogComponent(Vue, options) {
  const activeTab = Vue.ref(ARTICLE_PARAMETER_GROUPS[0].key);
  const form = Vue.reactive(createFormValues(options.defaultName));
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
       * Submits form data to the owning module.
       *
       * @returns {Promise<void>} Resolves after generated text is written.
       */
      async submitForm() {
        await options.onSubmit(form, sourceFetchState, this.closeDialog);
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

      /**
       * Trims a localized name row value.
       *
       * @param {string} key - Localized name group key.
       * @param {number} index - Row index.
       * @param {string} field - Row field key.
       * @returns {void}
       */
      updateNameRow(key, index, field) {
        form[key][index][field] = trimFieldValue(form[key][index][field]);
      },

      /**
       * Appends a blank localized name row.
       *
       * @param {string} key - Localized name group key.
       * @returns {void}
       */
      addNameRow(key) {
        form[key].push(createNameRow());
      },

      /**
       * Removes a localized name row.
       *
       * @param {string} key - Localized name group key.
       * @param {number} index - Row index.
       * @returns {void}
       */
      removeNameRow(key, index) {
        form[key].splice(index, 1);
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
        getFieldPlaceholder: options.getFieldPlaceholder.bind(null, form),
        nameMarkets: NAME_MARKETS,
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
        @primary="submitForm"
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
              <template
                v-if="group.nameGroupKey"
              >
                <div
                  v-for="(row, index) in form[group.nameGroupKey]"
                  :key="index"
                  style="border-bottom: 1px solid #eaecf0; margin-bottom: 16px; padding-bottom: 16px;"
                >
                  <div
                    style="font-weight: 600; margin-bottom: 8px;"
                  >
                    {{ group.label }} name {{ index + 1 }}
                  </div>
                  <div
                    style="display: flex; flex-wrap: wrap; gap: 12px; margin-bottom: 8px;"
                  >
                    <cdx-checkbox
                      v-for="market in nameMarkets"
                      :key="market.key"
                      v-model="row[market.key]"
                    >
                      {{ market.label }}
                    </cdx-checkbox>
                  </div>
                  <cdx-text-input
                    v-model="row.name"
                    placeholder="Name"
                    style="margin-bottom: 8px;"
                    @change="updateNameRow(group.nameGroupKey, index, 'name')"
                  />
                  <cdx-text-input
                    v-model="row.sourceUrl"
                    placeholder="Source URL"
                    style="margin-bottom: 8px;"
                    @change="updateNameRow(group.nameGroupKey, index, 'sourceUrl')"
                  />
                  <cdx-button
                    action="destructive"
                    weight="quiet"
                    @click="removeNameRow(group.nameGroupKey, index)"
                  >
                    Remove
                  </cdx-button>
                </div>
                <cdx-button
                  @click="addNameRow(group.nameGroupKey)"
                >
                  Add
                </cdx-button>
              </template>
              <template
                v-else
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
                    :placeholder="getFieldPlaceholder(field)"
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
              </template>
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
 * Creates empty form values keyed by input field name.
 *
 * @param {string} defaultName - Default article title.
 * @returns {object} Initial dialog form values.
 */
function createFormValues(defaultName) {
  return {
    ...Object.fromEntries(
    [...getArticleFields(), ...SOURCE_REFERENCE_FIELDS].map(getEmptyFieldValue),
    ),
    commonNames: [createNameRow(), createNameRow()],
    name: defaultName,
    officialNames: [createNameRow(["hans"]), createNameRow(["hant"])],
    originalLanguage: "ja",
    publishers: "=",
    sortKey: "",
  };
}

/**
 * Creates one localized name row.
 *
 * @param {Array<string>} [selectedMarkets] - Initially selected market codes.
 * @returns {object} Localized name row.
 */
function createNameRow(selectedMarkets = []) {
  return {
    ...Object.fromEntries(
      NAME_MARKETS.map((market) => [
        market.key,
        selectedMarkets.includes(market.key),
      ]),
    ),
    name: "",
    sourceUrl: "",
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
 * @returns {string} Trimmed field item.
 */
export function trimFieldValue(value) {
  return value.trim();
}

/**
 * Gets source reference fields for localized name rows with URLs.
 *
 * @param {object} form - Dialog form values.
 * @returns {Array<object>} Entered localized name source fields.
 */
export function getEnteredNameSourceReferenceFields(form) {
  return NAME_GROUP_KEYS.flatMap((key) =>
    form[key]
      .map((row, index) => ({
        key: buildNameSourceReferenceKey(key, index),
        name: row.name,
        sourceUrl: row.sourceUrl,
      }))
      .filter((field) =>
        Boolean(trimFieldValue(field.name)) &&
          Boolean(trimFieldValue(field.sourceUrl)),
      ),
  );
}

/**
 * Builds a source reference key for one localized name row.
 *
 * @param {string} key - Localized name group key.
 * @param {number} index - Row index.
 * @returns {string} Source reference key.
 */
export function buildNameSourceReferenceKey(key, index) {
  return `${key}.${index}`;
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
