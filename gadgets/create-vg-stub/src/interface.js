/* eslint-disable */

/**
 * Builds the create-vg-stub dialog form.
 */

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

.create-vg-stub-category-grid {
  display: grid;
  grid-template-columns: auto minmax(5rem, 0.6fr) minmax(12rem, 1.6fr) auto auto;
  gap: 4px;
  margin-bottom: 12px;
}

.create-vg-stub-error {
  color: #d73333;
}

@media (max-width: 640px) {
  .create-vg-stub-field-row,
  .create-vg-stub-name-row {
    grid-template-columns: 1fr;
  }
}
`;

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
   * @param {object} [options] - Field display options.
   */
  constructor(key, label, path, sourceField, options = {}) {
    this.breakBefore = Boolean(options.breakBefore);
    this.compact = Boolean(options.compact);
    this.heading = options.heading;
    this.key = key;
    this.label = label;
    this.path = path;
    this.placeholder = options.placeholder;
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
   * @param {object} [options] - Group display options.
   */
  constructor(key, label, fields, nameGroupKey, options = {}) {
    this.categoryReview = Boolean(options.categoryReview);
    this.fields = fields;
    this.key = key;
    this.label = label;
    this.nameGroupKey = nameGroupKey;
  }
}

export const SOURCE_REFERENCE_FIELDS = [
  {
    key: "originalName",
    label: "Original title source URLs",
    sourceKey: "originalNameSourceUrl",
  },
  {
    key: "englishName",
    label: "English title source URLs",
    sourceKey: "englishNameSourceUrl",
  },
  {
    key: "year",
    label: "Year source URLs",
    sourceKey: "yearSourceUrl",
  },
  {
    key: "developers",
    label: "Dev source URLs",
    sourceKey: "developersSourceUrl",
  },
  {
    key: "publishers",
    label: "Pub source URLs",
    sourceKey: "publishersSourceUrl",
  },
  {
    key: "series",
    label: "Series source URLs",
    sourceKey: "seriesSourceUrl",
  },
  {
    key: "genres",
    label: "Genre source URLs",
    sourceKey: "genresSourceUrl",
  },
  {
    key: "platforms",
    label: "Plat source URLs",
    sourceKey: "platformsSourceUrl",
  },
  {
    key: "metacriticScore",
    label: "MC score source URLs",
    sourceKey: "metacriticScoreSourceUrl",
  },
  {
    key: "openCriticRecommend",
    label: "OC score source URLs",
    sourceKey: "openCriticRecommendSourceUrl",
  },
];

const MULTI_ITEM_FIELD_KEYS = [
  "developers",
  "publishers",
  "genres",
  "platforms",
];
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
      "Original title",
      "originalName",
      SOURCE_REFERENCE_FIELDS[0],
      {
        placeholder: "Native title",
      },
    ),
    new ArticleParameterField(
      "englishName",
      "English title",
      "englishName",
      SOURCE_REFERENCE_FIELDS[1],
      {
        placeholder: "Localized title",
      },
    ),
    new ArticleParameterField("sortKey", "Sort key", "sortKey", null, {
      placeholder: "Leave blank to use the generated value",
    }),
    new ArticleParameterField(
      "metacriticPlatform",
      "Platform",
      "scores.metacriticPlatform",
      null,
      {
        breakBefore: true,
        compact: true,
        heading: "MC score",
        placeholder: "Platform",
      },
    ),
    new ArticleParameterField(
      "metacriticScore",
      "Score",
      "scores.metacriticScore",
      SOURCE_REFERENCE_FIELDS[8],
      {
        compact: true,
        placeholder: "Score",
      },
    ),
    new ArticleParameterField(
      "openCriticRecommend",
      "Critics Recommend",
      "scores.openCriticRecommend",
      SOURCE_REFERENCE_FIELDS[9],
      {
        compact: true,
        heading: "OC score",
        placeholder: "Recommend rate",
      },
    ),
  ]),
  new ArticleParameterGroup("attribution", "Attribution", [
    new ArticleParameterField(
      "developers",
      "Dev",
      "companies.developers",
      SOURCE_REFERENCE_FIELDS[3],
      {
        placeholder: "Names",
      },
    ),
    new ArticleParameterField(
      "publishers",
      "Pub",
      "companies.publishers",
      SOURCE_REFERENCE_FIELDS[4],
      {
        placeholder: "Names",
      },
    ),
    new ArticleParameterField(
      "series",
      "Series",
      "series",
      SOURCE_REFERENCE_FIELDS[5],
      {
        placeholder: "Title",
      },
    ),
    new ArticleParameterField(
      "platforms",
      "Plat",
      "platforms",
      SOURCE_REFERENCE_FIELDS[7],
      {
        placeholder: "Names",
      },
    ),
    new ArticleParameterField(
      "year",
      "Year",
      "year",
      SOURCE_REFERENCE_FIELDS[2],
      {
        placeholder: "YYYY",
      },
    ),
    new ArticleParameterField(
      "genres",
      "Genre",
      "genres",
      SOURCE_REFERENCE_FIELDS[6],
      {
        placeholder: "Names",
      },
    ),
  ]),
  new ArticleParameterGroup("officialNames", "Official", [], "officialNames"),
  new ArticleParameterGroup("commonNames", "Common", [], "commonNames"),
  new ArticleParameterGroup("categories", "Categories", [], null, {
    categoryReview: true,
  }),
];

/**
 * Adds dialog styles to the current page.
 *
 * @returns {void}
 */
export function addDialogStyles() {
  mw.util.addCSS(DIALOG_CSS);
}

/**
 * Creates the Vue component definition for the Codex dialog.
 *
 * @param {object} Vue - ResourceLoader Vue module.
 * @param {object} options - Dialog options.
 * @param {string} options.defaultName - Default article title.
 * @param {Function} options.getFieldPlaceholder - Field placeholder builder.
 * @param {object} [options.initialForm] - Initial form values.
 * @param {number} [options.citationPrefetchDelay] - Citation prefetch debounce delay.
 * @param {Function} options.getHistoryEntries - Form history entry provider.
 * @param {Function} options.onCategoryRowsRefresh - Category refresh handler.
 * @param {Function} options.onClearHistory - Form history clear handler.
 * @param {Function} options.onCreateCategoryRow - Category row factory.
 * @param {Function} options.onDeleteHistoryEntry - Form history delete handler.
 * @param {Function} options.onFormChange - Form change handler.
 * @param {Function} options.onMoveTarget - New-page target opener.
 * @param {Function} options.onResetCategoryRow - Category row reset handler.
 * @param {Function} [options.onSourceUrlChange] - Source URL change handler.
 * @param {Function} options.onSubmit - Submit handler.
 * @param {Function} options.onSubmitHistory - Form history submit handler.
 * @param {Function} options.onUpdateCategoryRowCategory - Category title update handler.
 * @returns {object} Vue component options.
 */
export function createDialogComponent(Vue, options) {
  const activeTab = Vue.ref(ARTICLE_PARAMETER_GROUPS[0].key);
  const form = Vue.reactive(createFormValues(options.defaultName));
  const categoryState = Vue.reactive({
    error: "",
    loading: false,
  });
  const historyEntries = Vue.ref(options.getHistoryEntries());
  const historyOpen = Vue.ref(false);
  const moveTarget = Vue.ref(options.defaultName);
  const moveOpen = Vue.ref(false);
  const sourceFetchState = Vue.reactive({
    error: "",
    loading: false,
  });
  const open = Vue.ref(false);
  const initialForm = options.initialForm;

  if (initialForm != null) {
    replaceFormValues(form, initialForm);
  }

  const queueCitationPrefetch = createCitationPrefetchQueue(options);

  Vue.watch(
    form,
    (currentForm) => {
      options.onFormChange(currentForm);
      queueCitationPrefetch(currentForm);
    },
    {
      deep: true,
    },
  );
  queueCitationPrefetch(form);
  Vue.watch(activeTab, (tab) => {
    if (tab === "categories") {
      refreshCategoryRows();
    }
  });

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
        await refreshCategoryRows();
        options.onSubmitHistory(form, form.name);
        historyEntries.value = options.getHistoryEntries();
        await options.onSubmit(form, sourceFetchState, this.closeDialog);
      },

      /**
       * Opens the form history dialog.
       *
       * @returns {void}
       */
      openHistoryDialog() {
        historyEntries.value = options.getHistoryEntries();
        historyOpen.value = true;
      },

      /**
       * Closes the form history dialog.
       *
       * @returns {void}
       */
      closeHistoryDialog() {
        historyOpen.value = false;
      },

      /**
       * Fills the current form from a history entry.
       *
       * @param {object} entry - History entry.
       * @param {object} entry.form - Stored form values.
       * @returns {void}
       */
      fillHistoryEntry(entry) {
        replaceFormValues(form, entry.form);
        historyOpen.value = false;
      },

      /**
       * Deletes one history entry.
       *
       * @param {string} id - History entry ID.
       * @returns {void}
       */
      deleteHistoryEntry(id) {
        options.onDeleteHistoryEntry(id);
        historyEntries.value = options.getHistoryEntries();
      },

      /**
       * Clears all form history entries.
       *
       * @returns {void}
       */
      clearHistory() {
        options.onClearHistory();
        historyEntries.value = options.getHistoryEntries();
      },

      /**
       * Opens the move target dialog.
       *
       * @returns {void}
       */
      openMoveDialog() {
        moveTarget.value = form.name;
        moveOpen.value = true;
      },

      /**
       * Closes the move target dialog.
       *
       * @returns {void}
       */
      closeMoveDialog() {
        moveOpen.value = false;
      },

      /**
       * Generates current data and opens it in the target page editor.
       *
       * @returns {Promise<void>} Resolves after navigation starts.
       */
      async submitMoveTarget() {
        await refreshCategoryRows();
        options.onSubmitHistory(form, moveTarget.value);
        historyEntries.value = options.getHistoryEntries();
        await options.onMoveTarget(form, moveTarget.value, sourceFetchState);
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

        const clipboardData =
          event.clipboardData || event.originalEvent.clipboardData;
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
       * Removes localized name rows without a name or source URL.
       *
       * @param {string} key - Localized name group key.
       * @returns {void}
       */
      removeBlankNameRows(key) {
        form[key] = form[key].filter(hasEnteredNameRowValue);
      },

      /**
       * Refreshes generated category rows.
       *
       * @returns {Promise<void>} Resolves after category rows are refreshed.
       */
      async refreshCategoryRows() {
        await refreshCategoryRows();
      },

      /**
       * Rebuilds category rows, bypassing the stored category query cache.
       *
       * @returns {Promise<void>} Resolves after category rows are rebuilt.
       */
      async rebuildCategoryRows() {
        await refreshCategoryRows({
          bypassCache: true,
        });
      },

      /**
       * Adds one manual category row.
       *
       * @returns {void}
       */
      addCategoryRow() {
        form.categoryRows.push(options.onCreateCategoryRow());
      },

      /**
       * Resets one generated category row to its automatic value.
       *
       * @param {number} index - Category row index.
       * @returns {void}
       */
      resetCategoryRow(index) {
        form.categoryRows[index] = options.onResetCategoryRow(form.categoryRows[index]);
      },

      /**
       * Updates one category row title and its modified marker.
       *
       * @param {number} index - Category row index.
       * @param {string} category - New category title.
       * @returns {void}
       */
      updateCategoryRowCategory(index, category) {
        form.categoryRows[index] = options.onUpdateCategoryRowCategory(
          form.categoryRows[index],
          category,
        );
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
        categoryState,
        groups: ARTICLE_PARAMETER_GROUPS,
        form,
        getArticleField,
        getFieldPlaceholder: options.getFieldPlaceholder.bind(null, form),
        historyEntries,
        historyOpen,
        moveOpen,
        moveTarget,
        nameMarkets: NAME_MARKETS,
        open,
        sourceFetchState,
      };
    },
    template: createDialogTemplate(),
  };

  /**
   * Refreshes category rows through the owning module.
   *
   * @returns {Promise<void>} Resolves after rows are refreshed.
   */
  async function refreshCategoryRows(refreshOptions) {
    await options.onCategoryRowsRefresh(form, categoryState, refreshOptions);
  }
}

/**
 * Creates a debounced citation prefetch queue.
 *
 * @param {object} options - Dialog options.
 * @param {number} [options.citationPrefetchDelay] - Citation prefetch debounce delay.
 * @param {Function} [options.onSourceUrlChange] - Source URL change handler.
 * @returns {Function} Citation prefetch queue function.
 */
function createCitationPrefetchQueue(options) {
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
 * Gets all currently entered source URLs.
 *
 * @param {object} form - Dialog form values.
 * @returns {Array<string>} Entered source URLs.
 */
function getEnteredSourceUrls(form) {
  return uniqueFieldValues([
    ...SOURCE_REFERENCE_FIELDS.flatMap((field) =>
      splitSourceUrls(form[field.sourceKey]),
    ),
    ...NAME_GROUP_KEYS.flatMap((key) =>
      (form[key] || []).flatMap((row) => splitSourceUrls(row.sourceUrl)),
    ),
  ]).filter(Boolean);
}

/**
 * Gets unique trimmed field values.
 *
 * @param {Array<*>} values - Raw field values.
 * @returns {Array<string>} Unique trimmed values.
 */
function uniqueFieldValues(values) {
  return [...new Set(values.map(trimFieldValue))];
}

/**
 * Creates the Vue dialog template as a serialized markup tree.
 *
 * @returns {string} Dialog template markup.
 */
function createDialogTemplate() {
  return renderTemplate([
    createDialogTemplateRoot(),
    createMoveDialogTemplate(),
    createHistoryDialogTemplate(),
  ]);
}

/**
 * Creates the root Codex dialog template node.
 *
 * @returns {object} Root dialog template node.
 */
function createDialogTemplateRoot() {
  return createElement(
    "cdx-dialog",
    {
      "v-model:open": "open",
      title: "Create video game stub",
    },
    [
      createTabsTemplate(),
      createElement(
        "p",
        {
          "v-if": "sourceFetchState.error",
        },
        [createText("{{ sourceFetchState.error }}")],
      ),
      createMainDialogFooterTemplate(),
    ],
  );
}

/**
 * Creates the main dialog footer actions.
 *
 * @returns {object} Dialog footer template node.
 */
function createMainDialogFooterTemplate() {
  return createElement(
    "template",
    {
      "v-slot:footer": "",
    },
    [
      createSplitActionFooterTemplate(
        createElement(
          "cdx-button",
          {
            "v-bind:disabled": "sourceFetchState.loading",
            "v-on:click": "openHistoryDialog",
          },
          [createText("History")],
        ),
        [
          createElement(
            "cdx-button",
            {
              "v-on:click": "closeDialog",
            },
            [createText("Cancel")],
          ),
          createElement(
            "cdx-button",
            {
              "v-bind:disabled": "sourceFetchState.loading",
              "v-on:click": "openMoveDialog",
            },
            [createText("Move")],
          ),
          createElement(
            "cdx-button",
            {
              action: "progressive",
              "v-bind:disabled": "sourceFetchState.loading",
              "v-on:click": "submitForm",
              weight: "primary",
            },
            [
              createText(
                "{{ sourceFetchState.loading ? 'Fetching' : 'Insert' }}",
              ),
            ],
          ),
        ],
      ),
    ],
  );
}

/**
 * Creates a dialog action footer with one left-aligned action.
 *
 * @param {object} leadingAction - Left-aligned footer action node.
 * @param {Array<object>} actions - Right-aligned footer action nodes.
 * @returns {object} Dialog action footer node.
 */
function createSplitActionFooterTemplate(leadingAction, actions) {
  return createElement(
    "div",
    {
      style: {
        alignItems: "center",
        display: "flex",
        justifyContent: "space-between",
        width: "100%",
      },
    },
    [
      leadingAction,
      createActionFooterTemplate(actions, {
        width: "auto",
      }),
    ],
  );
}

/**
 * Creates the form history dialog.
 *
 * @returns {object} History dialog template node.
 */
function createHistoryDialogTemplate() {
  return createElement(
    "cdx-dialog",
    {
      "v-model:open": "historyOpen",
      title: "Form history",
    },
    [
      createElement(
        "p",
        {
          "v-if": "historyEntries.length === 0",
        },
        [createText("No saved form history.")],
      ),
      createHistoryEntryListTemplate(),
      createHistoryDialogFooterTemplate(),
    ],
  );
}

/**
 * Creates the history entry list.
 *
 * @returns {object} History entry list template node.
 */
function createHistoryEntryListTemplate() {
  return createElement(
    "div",
    {
      "v-if": "historyEntries.length > 0",
      style: {
        display: "grid",
        gap: "8px",
      },
    },
    [createHistoryEntryTemplate()],
  );
}

/**
 * Creates one history entry row.
 *
 * @returns {object} History entry row template node.
 */
function createHistoryEntryTemplate() {
  return createElement(
    "div",
    {
      "v-bind:key": "entry.id",
      "v-for": "(entry, index) in historyEntries",
      style: {
        alignItems: "center",
        borderBottom: "1px solid #eaecf0",
        display: "grid",
        gap: "8px",
        gridTemplateColumns: "1fr auto auto",
        padding: "8px 0",
      },
    },
    [
      createElement("div", {}, [
        createElement("div", {}, [
          createText("{{ index + 1 }}. {{ entry.page }}"),
        ]),
        createElement(
          "div",
          {
            style: {
              color: "#54595d",
              fontSize: "12px",
            },
          },
          [createText("{{ entry.savedAt }}")],
        ),
      ]),
      createElement(
        "cdx-button",
        {
          "v-on:click": "fillHistoryEntry(entry)",
        },
        [createText("Fill")],
      ),
      createElement(
        "cdx-button",
        {
          "v-if": "!entry.temporary",
          "v-on:click": "deleteHistoryEntry(entry.id)",
        },
        [createText("Delete")],
      ),
    ],
  );
}

/**
 * Creates the history dialog footer actions.
 *
 * @returns {object} History dialog footer template node.
 */
function createHistoryDialogFooterTemplate() {
  return createElement(
    "template",
    {
      "v-slot:footer": "",
    },
    [
      createActionFooterTemplate([
        createElement(
          "cdx-button",
          {
            "v-bind:disabled": "historyEntries.length === 0",
            "v-on:click": "clearHistory",
          },
          [createText("Clear")],
        ),
        createElement(
          "cdx-button",
          {
            "v-on:click": "closeHistoryDialog",
          },
          [createText("Close")],
        ),
      ]),
    ],
  );
}

/**
 * Creates the move target dialog.
 *
 * @returns {object} Move dialog template node.
 */
function createMoveDialogTemplate() {
  return createElement(
    "cdx-dialog",
    {
      "v-model:open": "moveOpen",
      title: "Move stub text",
    },
    [
      createElement("cdx-text-input", {
        placeholder: "Target page title",
        "v-model": "moveTarget",
      }),
      createElement(
        "p",
        {
          "v-if": "sourceFetchState.error",
        },
        [createText("{{ sourceFetchState.error }}")],
      ),
      createMoveDialogFooterTemplate(),
    ],
  );
}

/**
 * Creates the move dialog footer actions.
 *
 * @returns {object} Move dialog footer template node.
 */
function createMoveDialogFooterTemplate() {
  return createElement(
    "template",
    {
      "v-slot:footer": "",
    },
    [
      createActionFooterTemplate([
        createElement(
          "cdx-button",
          {
            "v-on:click": "closeMoveDialog",
          },
          [createText("Cancel")],
        ),
        createElement(
          "cdx-button",
          {
            action: "progressive",
            "v-bind:disabled": "sourceFetchState.loading",
            "v-on:click": "submitMoveTarget",
            weight: "primary",
          },
          [
            createText(
              "{{ sourceFetchState.loading ? 'Fetching' : 'Open target page' }}",
            ),
          ],
        ),
      ]),
    ],
  );
}

/**
 * Creates a dialog action footer.
 *
 * @param {Array<object>} actions - Footer action button nodes.
 * @param {object} [style] - Extra footer style properties.
 * @returns {object} Dialog action footer node.
 */
function createActionFooterTemplate(actions, style = {}) {
  return createElement(
    "div",
    {
      style: {
        display: "flex",
        gap: "8px",
        justifyContent: "flex-end",
        width: "100%",
        ...style,
      },
    },
    actions,
  );
}

/**
 * Creates the tab container template node.
 *
 * @returns {object} Tab container template node.
 */
function createTabsTemplate() {
  return createElement(
    "cdx-tabs",
    {
      framed: "",
      "v-model:active": "activeTab",
    },
    [
      createElement(
        "cdx-tab",
        {
          "v-bind:key": "group.key",
          "v-bind:label": "group.label",
          "v-bind:name": "group.key",
          "v-for": "group in groups",
        },
        [
          createElement(
            "div",
            {
              class: "create-vg-stub-tab-panel",
            },
            [
              createCategoryGroupTemplate(),
              createNameGroupTemplate(),
              createFieldGroupTemplate(),
            ],
          ),
        ],
      ),
    ],
  );
}

/**
 * Creates the category review grid template node.
 *
 * @returns {object} Category review grid node.
 */
function createCategoryGroupTemplate() {
  return createElement(
    "template",
    {
      "v-if": "group.categoryReview",
    },
    [
      createElement(
        "div",
        {
          class: "create-vg-stub-category-grid",
        },
        [createCategoryRowTemplate()],
      ),
      createElement(
        "p",
        {
          class: "create-vg-stub-error",
          "v-if": "categoryState.error",
        },
        [createText("{{ categoryState.error }}")],
      ),
      createActionFooterTemplate([
        createElement(
          "cdx-button",
          {
            "v-bind:disabled": "categoryState.loading",
            "v-on:click": "addCategoryRow",
          },
          [createText("Add")],
        ),
        createElement(
          "cdx-button",
          {
            action: "progressive",
            "v-bind:disabled": "categoryState.loading",
            "v-on:click": "refreshCategoryRows",
          },
          [
            createText(
              "{{ categoryState.loading ? 'Checking' : 'Check categories' }}",
            ),
          ],
        ),
        createElement(
          "cdx-button",
          {
            action: "progressive",
            "v-bind:disabled": "categoryState.loading",
            "v-on:click": "rebuildCategoryRows",
            weight: "primary",
          },
          [
            createText(
              "{{ categoryState.loading ? 'Rebuilding' : 'Rebuild' }}",
            ),
          ],
        ),
      ]),
    ],
  );
}

/**
 * Creates category row template nodes.
 *
 * @returns {object} Category rows template node.
 */
function createCategoryRowTemplate() {
  return createElement(
    "template",
    {
      "v-bind:key": "index",
      "v-for": "(row, index) in form.categoryRows",
    },
    [
      createElement("cdx-checkbox", {
        "v-model": "row.enabled",
      }),
      createElement("cdx-text-input", {
        readonly: "",
        "v-model": "row.source",
      }),
      createElement("cdx-text-input", {
        "v-bind:model-value": "row.category",
        "v-on:update:model-value": "updateCategoryRowCategory(index, $event)",
      }),
      createElement(
        "cdx-button",
        {
          "v-bind:disabled": "row.source === 'manual'",
          "v-on:click": "resetCategoryRow(index)",
        },
        [createText("↺")],
      ),
      createElement("cdx-checkbox", {
        "v-bind:disabled": "!row.stubTag",
        "v-bind:title": "row.stubTag",
        "v-model": "row.stubTagEnabled",
      }),
    ],
  );
}

/**
 * Creates the localized name group template node.
 *
 * @returns {object} Localized name group template node.
 */
function createNameGroupTemplate() {
  return createElement(
    "template",
    {
      "v-if": "group.nameGroupKey",
    },
    [createNameRowTemplate(), createNameActionsTemplate()],
  );
}

/**
 * Creates localized name row action buttons.
 *
 * @returns {object} Localized name action button group node.
 */
function createNameActionsTemplate() {
  return createElement(
    "div",
    {
      style: {
        display: "flex",
        gap: "8px",
      },
    },
    [
      createElement(
        "cdx-button",
        {
          action: "progressive",
          "v-on:click": "addNameRow(group.nameGroupKey)",
          weight: "primary",
        },
        [createText("Add")],
      ),
      createElement(
        "cdx-button",
        {
          "v-on:click": "removeBlankNameRows(group.nameGroupKey)",
        },
        [createText("Remove blank")],
      ),
    ],
  );
}

/**
 * Creates a localized name row template node.
 *
 * @returns {object} Localized name row template node.
 */
function createNameRowTemplate() {
  return createElement(
    "div",
    {
      class: "create-vg-stub-name-row",
      "v-bind:key": "index",
      "v-for": "(row, index) in form[group.nameGroupKey]",
    },
    [
      createElement(
        "div",
        {
          class: "create-vg-stub-name-controls",
        },
        [createNameMarketTemplate(), createNameInputTemplate()],
      ),
    ],
  );
}

/**
 * Creates the localized name market checkbox group template node.
 *
 * @returns {object} Localized name market checkbox group node.
 */
function createNameMarketTemplate() {
  return createElement(
    "div",
    {
      style: {
        display: "flex",
        flexWrap: "wrap",
        gap: "12px",
        marginBottom: "8px",
      },
    },
    [
      createElement(
        "cdx-checkbox",
        {
          "v-bind:key": "market.key",
          "v-for": "market in nameMarkets",
          "v-model": "row[market.key]",
        },
        [createText("{{ market.label }}")],
      ),
    ],
  );
}

/**
 * Creates the localized name text input group template node.
 *
 * @returns {object} Localized name text input group node.
 */
function createNameInputTemplate() {
  return createElement(
    "div",
    {
      class: "create-vg-stub-field-controls",
    },
    [
      createElement("cdx-text-input", {
        placeholder: "Title",
        "v-model": "row.name",
        "v-on:change": "updateNameRow(group.nameGroupKey, index, 'name')",
      }),
      createSourceUrlInputTemplate({
        placeholder: "Source URLs",
        model: "row.sourceUrl",
        change: "updateNameRow(group.nameGroupKey, index, 'sourceUrl')",
      }),
    ],
  );
}

/**
 * Creates a source URL textarea template node.
 *
 * @param {object} options - Source URL field options.
 * @param {string} options.change - Change handler expression.
 * @param {string} options.model - Vue model expression.
 * @param {string} options.placeholder - Placeholder text or expression.
 * @param {boolean} [options.bindPlaceholder] - Whether placeholder is a Vue binding.
 * @returns {object} Source URL textarea node.
 */
function createSourceUrlInputTemplate(options) {
  const attributes = {
    class: "create-vg-stub-source-url",
    rows: "1",
    "v-model": options.model,
    "v-on:change": options.change,
  };

  if (options.bindPlaceholder) {
    attributes["v-bind:placeholder"] = options.placeholder;
  } else {
    attributes.placeholder = options.placeholder;
  }

  return createElement("cdx-text-area", attributes);
}

/**
 * Creates the article field group template node.
 *
 * @returns {object} Article field group template node.
 */
function createFieldGroupTemplate() {
  return createElement(
    "template",
    {
      "v-if": "!group.categoryReview && !group.nameGroupKey",
    },
    [
      createElement(
        "template",
        {
          "v-bind:key": "field.key",
          "v-for": "field in group.fields",
        },
        [createCompactFieldTemplate(), createStandardFieldTemplate()],
      ),
    ],
  );
}

/**
 * Creates a compact article field template node.
 *
 * @returns {object} Compact article field template node.
 */
function createCompactFieldTemplate() {
  return createElement(
    "div",
    {
      class: "create-vg-stub-field-row",
      "v-if": "field.compact && field.key !== 'metacriticScore'",
    },
    [
      createFieldSeparatorTemplate("compact"),
      createElement(
        "div",
        {
          class: "create-vg-stub-field-label",
        },
        [createText("{{ field.heading || field.label }}")],
      ),
      createElement(
        "div",
        {
          class: "create-vg-stub-field-controls",
        },
        [
          createElement("cdx-text-input", {
            "v-bind:placeholder": "field.placeholder",
            "v-model": "form[field.key]",
            "v-on:change": "normalizeFieldValue(field)",
          }),
          createMetacriticScoreTemplate(),
          createElement(
            "template",
            {
              "v-if": "field.sourceField",
            },
            [
              createSourceUrlInputTemplate({
                placeholder: "Source URLs",
                model: "form[field.sourceField.sourceKey]",
                change: "trimSourceValue(field.sourceField)",
              }),
            ],
          ),
        ],
      ),
    ],
  );
}

/**
 * Creates the Metacritic score companion fields template node.
 *
 * @returns {object} Metacritic companion fields template node.
 */
function createMetacriticScoreTemplate() {
  return createElement(
    "template",
    {
      "v-if": "field.key === 'metacriticPlatform'",
    },
    [
      createElement("cdx-text-input", {
        "v-bind:placeholder": "getArticleField('metacriticScore').placeholder",
        "v-model": "form.metacriticScore",
        "v-on:change":
          "normalizeFieldValue(getArticleField('metacriticScore'))",
      }),
      createSourceUrlInputTemplate({
        placeholder: "Source URLs",
        model: "form.metacriticScoreSourceUrl",
        change:
          "trimSourceValue(getArticleField('metacriticScore').sourceField)",
      }),
    ],
  );
}

/**
 * Creates a standard article field template node.
 *
 * @returns {object} Standard article field template node.
 */
function createStandardFieldTemplate() {
  return createElement(
    "div",
    {
      class: "create-vg-stub-field-row",
      "v-else-if": "!field.compact",
    },
    [
      createFieldSeparatorTemplate(),
      createElement(
        "div",
        {
          class: "create-vg-stub-field-label",
        },
        [createText("{{ field.label }}")],
      ),
      createElement(
        "div",
        {
          class: "create-vg-stub-field-controls",
        },
        [
          createOriginalLanguageTemplate(),
          createElement("cdx-text-input", {
            "v-bind:placeholder":
              "getFieldPlaceholder(field) || field.placeholder",
            "v-model": "form[field.key]",
            "v-on:change": "normalizeFieldValue(field)",
            "v-on:paste": "normalizePastedFieldValue(field, $event)",
          }),
          createElement(
            "template",
            {
              "v-if": "field.sourceField",
            },
            [
              createSourceUrlInputTemplate({
                placeholder: "Source URLs",
                model: "form[field.sourceField.sourceKey]",
                change: "trimSourceValue(field.sourceField)",
              }),
            ],
          ),
        ],
      ),
    ],
  );
}

/**
 * Creates the original language input template node.
 *
 * @returns {object} Original language input template node.
 */
function createOriginalLanguageTemplate() {
  return createElement("cdx-text-input", {
    placeholder: "Original title language code",
    "v-if": "field.key === 'originalName'",
    "v-model": "form.originalLanguage",
    "v-on:change": "trimFormValue('originalLanguage')",
  });
}

/**
 * Creates a field separator template node.
 *
 * @param {string} [variant] - Separator display variant.
 * @returns {object} Field separator template node.
 */
function createFieldSeparatorTemplate(variant) {
  return createElement("hr", {
    class: [
      "create-vg-stub-field-separator",
      variant === "compact" ? "create-vg-stub-field-separator-compact" : "",
    ]
      .filter(Boolean)
      .join(" "),
    "v-if": "field.breakBefore",
  });
}

/**
 * Creates a template element object with attributes and children.
 *
 * @param {string} tagName - Tag name.
 * @param {object} [attributes] - Element attributes.
 * @param {Array<object|string>} [children] - Child nodes.
 * @returns {object} Created template element object.
 */
function createElement(tagName, attributes = {}, children = []) {
  return {
    attributes,
    children,
    tagName,
  };
}

/**
 * Creates a template text node.
 *
 * @param {string} value - Text content.
 * @returns {string} Created text node.
 */
function createText(value) {
  return value;
}

/**
 * Serializes a template node to markup.
 *
 * @param {object|Array<object>} node - Template node.
 * @returns {string} Template markup.
 */
function renderTemplate(node) {
  if (Array.isArray(node)) {
    return node.map(renderNode).join("");
  }

  return renderElement(node);
}

/**
 * Serializes a template child node to markup.
 *
 * @param {object|string} node - Template child node.
 * @returns {string} Template child markup.
 */
function renderNode(node) {
  if (typeof node === "string") {
    return node;
  }

  return renderElement(node);
}

/**
 * Serializes a template element object to markup.
 *
 * @param {object} element - Template element object.
 * @param {object} element.attributes - Element attributes.
 * @param {Array<object|string>} element.children - Child nodes.
 * @param {string} element.tagName - Tag name.
 * @returns {string} Element markup.
 */
function renderElement(element) {
  const attributes = renderAttributes(element.attributes);
  const children = element.children.map(renderNode).join("");

  if (element.tagName === "hr") {
    return `<${element.tagName}${attributes}>`;
  }

  return `<${element.tagName}${attributes}>${children}</${element.tagName}>`;
}

/**
 * Serializes element attributes to markup.
 *
 * @param {object} attributes - Element attributes.
 * @returns {string} Attribute markup.
 */
function renderAttributes(attributes) {
  return Object.entries(attributes).map(renderAttribute).join("");
}

/**
 * Serializes one element attribute to markup.
 *
 * @param {Array<string|object>} entry - Attribute name and value.
 * @returns {string} Attribute markup.
 */
function renderAttribute(entry) {
  const [name, value] = entry;
  const renderedValue = name === "style" ? renderStyle(value) : value;

  if (renderedValue === "") {
    return ` ${name}`;
  }

  return ` ${name}="${escapeAttribute(renderedValue)}"`;
}

/**
 * Serializes a style declaration object.
 *
 * @param {object} style - Style declaration object.
 * @returns {string} Style declaration text.
 */
function renderStyle(style) {
  return `${Object.entries(style).map(renderStyleDeclaration).join("; ")};`;
}

/**
 * Serializes one style declaration.
 *
 * @param {Array<string>} entry - Style property and value.
 * @returns {string} Style declaration text.
 */
function renderStyleDeclaration(entry) {
  const [name, value] = entry;

  return `${toKebabCase(name)}: ${value}`;
}

/**
 * Converts a camelCase JavaScript name to a kebab-case CSS name.
 *
 * @param {string} value - JavaScript property name.
 * @returns {string} CSS property name.
 */
function toKebabCase(value) {
  return value.replace(/[A-Z]/gu, (letter) => `-${letter.toLowerCase()}`);
}

/**
 * Escapes an attribute value for template markup.
 *
 * @param {string} value - Raw attribute value.
 * @returns {string} Escaped attribute value.
 */
function escapeAttribute(value) {
  return value.replace(/&/gu, "&amp;").replace(/"/gu, "&quot;");
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
      [...getArticleFields(), ...SOURCE_REFERENCE_FIELDS].map(
        getEmptyFieldValue,
      ),
    ),
    categoryRows: [],
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
 * Checks whether a localized name row has entered text.
 *
 * @param {object} row - Localized name row.
 * @param {string} row.name - Localized name value.
 * @param {string} row.sourceUrl - Localized name source URL.
 * @returns {boolean} Whether the row should be kept.
 */
function hasEnteredNameRowValue(row) {
  return (
    Boolean(trimFieldValue(row.name)) || Boolean(trimFieldValue(row.sourceUrl))
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
 * Gets an article field definition by form key.
 *
 * @param {string} key - Form key for the field.
 * @returns {object} Matching field definition.
 */
function getArticleField(key) {
  return getArticleFields().find((field) => field.key === key);
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
 * @param {*} value - Raw field item value.
 * @returns {string} Trimmed field item.
 */
export function trimFieldValue(value) {
  if (value == null) {
    return "";
  }

  return String(value).trim();
}

/**
 * Splits a source URL field into one trimmed URL per nonblank line.
 *
 * @param {*} value - Raw source URL field value.
 * @returns {Array<string>} Source URLs.
 */
export function splitSourceUrls(value) {
  return trimFieldValue(value)
    .split(/[\r\n]+/u)
    .map(trimFieldValue)
    .filter(Boolean);
}

/**
 * Gets source reference fields for localized name rows with URLs.
 *
 * @param {object} form - Dialog form values.
 * @returns {Array<object>} Entered localized name source fields.
 */
export function getEnteredNameSourceReferenceFields(form) {
  return NAME_GROUP_KEYS.flatMap((key) =>
    (form[key] || [])
      .flatMap((row, index) =>
        splitSourceUrls(row.sourceUrl).map((sourceUrl) => ({
          key: buildNameSourceReferenceKey(key, index),
          name: row.name,
          sourceUrl,
        })),
      )
      .filter(
        (field) =>
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
 * Replaces a reactive form object with received form values.
 *
 * @param {object} form - Reactive form object.
 * @param {object} values - Received form values.
 * @returns {void}
 */
function replaceFormValues(form, values) {
  Object.keys(form).forEach((key) => {
    delete form[key];
  });
  Object.assign(form, cloneValue(values));
}

/**
 * Clones a plain JSON-compatible value.
 *
 * @param {*} value - Value to clone.
 * @returns {*} Cloned value.
 */
function cloneValue(value) {
  return JSON.parse(JSON.stringify(value));
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
