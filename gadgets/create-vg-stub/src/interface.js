/* eslint-disable */

/**
 * Builds the create-vg-stub dialog form.
 */

export class StyleSheet {
  constructor() {
    this.rules = [];
  }

  /**
   * Adds one CSS rule.
   *
   * @param {string|Array<string>} selectors - Rule selector or selectors.
   * @param {object} declarations - CSS declarations.
   * @returns {StyleSheet} Current stylesheet.
   */
  add(selectors, declarations) {
    this.rules.push({
      declarations,
      selectors: Array.isArray(selectors) ? selectors : [selectors],
      type: "rule",
    });

    return this;
  }

  /**
   * Adds a nested media query.
   *
   * @param {string} condition - Media query condition.
   * @param {Function} buildRules - Nested rule builder.
   * @returns {StyleSheet} Current stylesheet.
   */
  media(condition, buildRules) {
    const sheet = new StyleSheet();

    buildRules(sheet);
    this.rules.push({
      condition,
      rules: sheet.rules,
      type: "media",
    });

    return this;
  }

  /**
   * Serializes the stylesheet.
   *
   * @returns {string} Stylesheet text.
   */
  toString() {
    return renderStyleRules(this.rules);
  }
}

const DIALOG_CSS = new StyleSheet()
  .add(".create-vg-stub-dialog.cdx-dialog", {
    maxWidth: "min(96vw, 960px)",
    width: "min(96vw, 960px)",
  })
  .add(".create-vg-stub-category-view-dialog.cdx-dialog", {
    maxWidth: "min(96vw, 960px)",
    width: "min(96vw, 960px)",
  })
  .add(".create-vg-stub-category-view", {
    border: "1px solid #a2a9b1",
    height: "70vh",
    width: "100%",
  })
  .add(".create-vg-stub-tab-panel", {
    paddingTop: "12px",
  })
  .add([".create-vg-stub-field-row", ".create-vg-stub-name-row"], {
    alignItems: "center",
    display: "grid",
    gap: "12px",
  })
  .add(".create-vg-stub-field-row", {
    gridTemplateColumns: "5.75rem minmax(0, 1fr)",
    marginBottom: "12px",
  })
  .add(".create-vg-stub-field-separator", {
    border: "0",
    borderTop: "1px solid #eaecf0",
    gridColumn: "1 / -1",
    margin: "16px 0",
  })
  .add(".create-vg-stub-field-separator-compact", {
    margin: "16px 0 12px",
  })
  .add(".create-vg-stub-name-row", {
    borderBottom: "1px solid #eaecf0",
    gridTemplateColumns: "minmax(0, 1fr)",
    marginBottom: "16px",
    paddingBottom: "16px",
  })
  .add(".create-vg-stub-field-label", {
    fontWeight: "600",
    lineHeight: "1.35",
    overflowWrap: "anywhere",
  })
  .add(
    [".create-vg-stub-field-controls", ".create-vg-stub-name-controls"],
    {
      display: "grid",
      gap: "0",
      minWidth: "0",
    },
  )
  .add(".create-vg-stub-steam-helper", {
    display: "grid",
    gap: "8px",
    gridTemplateColumns: "minmax(0, 1fr) auto",
    marginBottom: "16px",
  })
  .add(".create-vg-stub-steam-actions", {
    display: "flex",
    flexWrap: "wrap",
    gap: "8px",
    gridColumn: "1 / -1",
  })
  .add(".create-vg-stub-steam-suggestion", {
    color: "#54595d",
    fontSize: "12px",
    gridColumn: "1 / -1",
    overflowWrap: "anywhere",
  })
  .add(
    [
      ".create-vg-stub-source-url textarea",
      "textarea.create-vg-stub-source-url",
    ],
    {
      fontSize: "12px",
      height: "32px",
      minHeight: "32px",
      resize: "vertical",
    },
  )
  .add(".create-vg-stub-wikitext-preview", {
    color: "#72777d",
    fontFamily: "monospace",
    fontSize: "12px",
    lineHeight: "1.35",
    marginTop: "4px",
    overflowWrap: "anywhere",
  })
  .add(".create-vg-stub-field-note", {
    margin: "-8px 0 12px",
  })
  .add(".create-vg-stub-category-grid", {
    display: "grid",
    gap: "4px",
    gridTemplateColumns:
      "auto minmax(4.2rem, 0.35fr) minmax(12rem, 1.6fr) auto auto auto",
    marginBottom: "12px",
  })
  .add(".create-vg-stub-category-status", {
    alignItems: "center",
    alignSelf: "center",
    background: "#f8f9fa",
    border: "1px solid #a2a9b1",
    borderRadius: "2px",
    color: "#202122",
    display: "inline-flex",
    fontSize: "0.875em",
    fontWeight: "600",
    height: "28px",
    justifyContent: "center",
    lineHeight: "1",
    minWidth: "28px",
    padding: "0 6px",
  })
  .add(".create-vg-stub-company-category-text textarea", {
    fontFamily: "monospace",
  })
  .add(".create-vg-stub-error", {
    color: "#d73333",
  })
  .media("(max-width: 640px)", (sheet) => {
    sheet.add([".create-vg-stub-field-row", ".create-vg-stub-name-row"], {
      gridTemplateColumns: "1fr",
    });
    sheet.add(".create-vg-stub-steam-helper", {
      gridTemplateColumns: "1fr",
    });
  })
  .toString();

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
   * @param {boolean} [options.multiline] - Whether to use a textarea.
   * @param {string} [options.previewKey] - Shared preview group key.
   */
  constructor(key, label, path, sourceField, options = {}) {
    this.breakBefore = Boolean(options.breakBefore);
    this.compact = Boolean(options.compact);
    this.heading = options.heading;
    this.key = key;
    this.label = label;
    this.multiline = Boolean(options.multiline);
    this.path = path;
    this.placeholder = options.placeholder;
    this.previewKey = options.previewKey;
    this.readonly = Boolean(options.readonly);
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
  {
    key: "additionalProse",
    label: "Additional prose source URLs",
    sourceKey: "additionalProseSourceUrl",
  },
];

const MULTI_ITEM_FIELD_KEYS = [
  "developers",
  "publishers",
  "genres",
  "platforms",
];
const NAME_GROUP_KEYS = ["localizedNames", "officialNames", "commonNames"];
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
const STEAM_NAME_CHOICES = [
  {
    key: "none",
    label: "None",
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
    key: "both",
    label: "Both",
  },
  {
    key: "merge",
    label: "Merge same",
  },
  {
    key: "other",
    label: "Other name",
  },
];
const ARTICLE_PARAMETER_GROUPS = [
  new ArticleParameterGroup("titles", "Titles", [
    new ArticleParameterField(
      "enwikiTitle",
      "Enwiki",
      "enwikiTitle",
      null,
      {
        placeholder: "Page title in English Wikipedia",
      },
    ),
    new ArticleParameterField("name", "Title", "name", null, {
      breakBefore: true,
      placeholder: "Leave blank to use the page title",
    }),
    new ArticleParameterField(
      "originalName",
      "Original title",
      "originalName",
      SOURCE_REFERENCE_FIELDS[0],
      {
        placeholder: "ja:タイトル or en:Title",
      },
    ),
    new ArticleParameterField(
      "englishName",
      "English title",
      "englishName",
      SOURCE_REFERENCE_FIELDS[1],
      {
        placeholder: "Localized title",
        previewKey: "names",
      },
    ),
    new ArticleParameterField("sortKey", "Sort key", "sortKey", null, {
      placeholder: "Leave blank to use the generated value",
    }),
    new ArticleParameterField(
      "metacriticScore",
      "Score",
      "scores.metacriticScore",
      SOURCE_REFERENCE_FIELDS[8],
      {
        breakBefore: true,
        compact: true,
        heading: "MC score",
        placeholder: "ps4:95 or 95",
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
        previewKey: "score",
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
        previewKey: "attribution",
      },
    ),
  ]),
  new ArticleParameterGroup("prose", "Prose", [
    new ArticleParameterField(
      "additionalProse",
      "Additional prose",
      "additionalProse",
      SOURCE_REFERENCE_FIELDS[10],
      {
        multiline: true,
        placeholder: "Text appended after the generated prose",
      },
    ),
  ]),
  new ArticleParameterGroup("localizedNames", "Names", [], "localizedNames"),
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
 * @param {Function} options.getCategoryPageUrl - Category page URL builder.
 * @param {object} [options.initialForm] - Initial form values.
 * @param {number} [options.citationPrefetchDelay] - Citation prefetch debounce delay.
 * @param {Function} [options.getFieldPreview] - Field wikitext preview builder.
 * @param {Function} options.getHistoryEntries - Form history entry provider.
 * @param {Function} options.onCategoryRowsRefresh - Category refresh handler.
 * @param {Function} options.onClearHistory - Form history clear handler.
 * @param {Function} options.onCreateCategoryRow - Category row factory.
 * @param {Function} options.onDeleteHistoryEntry - Form history delete handler.
 * @param {Function} options.onFormChange - Form change handler.
 * @param {Function} options.onMoveTarget - New-page target opener.
 * @param {Function} options.onPrepareCompanyCategory - Company category text builder.
 * @param {Function} options.onSaveCompanyCategory - Company category save handler.
 * @param {Function} options.onEnwikiTitleChange - Enwiki metadata lookup handler.
 * @param {Function} options.onFill - Editor fill handler.
 * @param {Function} options.onPreSavePrepare - Follow-up action builder.
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
  const companyCategoryOpen = Vue.ref(false);
  const companyCategoryState = Vue.reactive({
    category: "",
    company: "",
    error: "",
    loading: false,
    text: "",
  });
  const categoryViewOpen = Vue.ref(false);
  const categoryViewState = Vue.reactive({
    category: "",
    url: "",
  });
  const historyEntries = Vue.ref(options.getHistoryEntries());
  const historyOpen = Vue.ref(false);
  const moveTarget = Vue.ref(options.defaultName);
  const moveOpen = Vue.ref(false);
  const preSaveMoveEnabled = Vue.ref(false);
  const preSaveMoveTitle = Vue.ref(options.defaultName);
  const preSaveOpen = Vue.ref(false);
  const preSaveActions = Vue.reactive([]);
  const enwikiLookupSerial = Vue.ref(0);
  const fetchedSteamNameRows = Vue.ref([]);
  const steamUrl = Vue.ref("");
  const sourceFetchState = Vue.reactive({
    error: "",
    loading: false,
  });
  const open = Vue.ref(options.initialOpen === true);
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
       * Fills the MediaWiki editor after category review without submitting it.
       *
       * @returns {Promise<void>} Resolves after generated text is inserted.
       */
      async fillForm() {
        if (activeTab.value !== "categories") {
          activeTab.value = "categories";
          await refreshCategoryRows();
          return;
        }

        await refreshCategoryRows();
        options.onSubmitHistory(form, getCurrentTitle());
        historyEntries.value = options.getHistoryEntries();
        await options.onFill(form, sourceFetchState, this.closeDialog);
      },

      /**
       * Opens the pre-save checklist after category review.
       *
       * @returns {Promise<void>} Resolves after checklist preparation.
       */
      async submitForm() {
        if (activeTab.value !== "categories") {
          activeTab.value = "categories";
          await refreshCategoryRows();
          return;
        }

        await refreshCategoryRows();
        sourceFetchState.error = "";
        sourceFetchState.loading = true;
        preSaveMoveTitle.value = getCurrentTitle();
        preSaveOpen.value = true;

        try {
          const prepared = await options.onPreSavePrepare(
            form,
            getCurrentTitle(),
          );

          preSaveActions.splice(
            0,
            preSaveActions.length,
            ...(prepared.actions || []),
          );
          preSaveMoveEnabled.value = prepared.move?.enabled === true;
          preSaveMoveTitle.value =
            trimFieldValue(prepared.move?.to) || getCurrentTitle();
        } catch (error) {
          sourceFetchState.error = error.message || String(error);
        } finally {
          sourceFetchState.loading = false;
        }
      },

      /**
       * Saves the article after confirming the pre-save fixes.
       *
       * @returns {Promise<void>} Resolves after save submission starts.
       */
      async confirmSubmit() {
        options.onSubmitHistory(form, getCurrentTitle());
        historyEntries.value = options.getHistoryEntries();

        const moveTitle = trimFieldValue(preSaveMoveTitle.value);

        if (
          preSaveMoveEnabled.value &&
          moveTitle !== "" &&
          moveTitle !== getCurrentTitle()
        ) {
          await options.onMoveTarget(form, moveTitle, sourceFetchState);

          if (sourceFetchState.error === "") {
            preSaveOpen.value = false;
          }

          return;
        }

        await options.onSubmit(form, sourceFetchState, this.closeDialog, {
          actions: preSaveActions,
          move: {
            enabled: false,
            to: getCurrentTitle(),
          },
        });

        if (sourceFetchState.error === "") {
          preSaveOpen.value = false;
        }
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
        moveTarget.value = getCurrentTitle();
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
       * Updates the move target title from live input.
       *
       * @param {string} value - Raw input value.
       * @returns {void}
       */
      updateMoveTarget(value) {
        moveTarget.value = trimFieldValue(value);
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
        form[field.key] = normalizeArticleFieldValue(field, form[field.key]);
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
       * Updates one article field from live input.
       *
       * @param {object} field - Article parameter field.
       * @param {string} value - Raw input value.
       * @returns {void}
       */
      updateFieldValue(field, value) {
        form[field.key] = normalizeArticleFieldValue(field, value);

        if (field.key === "enwikiTitle") {
          refreshEnwikiMetadata();
        }
      },

      /**
       * Updates one source URL field from live input.
       *
       * @param {object} field - Source reference field.
       * @param {string} value - Raw input value.
       * @returns {void}
       */
      updateSourceValue(field, value) {
        form[field.sourceKey] = trimFieldValue(value);
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
       * Updates one form value by key from live input.
       *
       * @param {string} key - Form value key.
       * @param {string} value - Raw input value.
       * @returns {void}
       */
      updateFormValue(key, value) {
        form[key] = trimFieldValue(value);
      },

      /**
       * Refreshes English Wikipedia metadata after the enwiki title changes.
       *
       * @returns {Promise<void>} Resolves after metadata is refreshed.
       */
      async updateEnwikiTitle() {
        await refreshEnwikiMetadata();
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

        if (!hasFirstLevelFieldSeparator(text)) {
          return;
        }

        event.preventDefault();
        form[field.key] = normalizeArticleFieldValue(field, text);
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
       * Updates a localized name row value from live input.
       *
       * @param {string} key - Localized name group key.
       * @param {number} index - Row index.
       * @param {string} field - Row field key.
       * @param {string} value - Raw input value.
       * @returns {void}
       */
      updateNameRowValue(key, index, field, value) {
        form[key][index][field] = trimFieldValue(value);
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
       * Updates the Steam helper URL.
       *
       * @param {string} value - Raw Steam URL.
       * @returns {void}
       */
      updateSteamUrl(value) {
        steamUrl.value = trimFieldValue(value);
        fetchedSteamNameRows.value = [];
      },

      /**
       * Fetches Steam names and stores them as helper suggestions.
       *
       * @returns {Promise<void>} Resolves after rows are fetched.
       */
      async addSteamNames() {
        if (options.onSteamNamesFetch == null) {
          return;
        }

        sourceFetchState.error = "";
        sourceFetchState.loading = true;

        try {
          const rows = await options.onSteamNamesFetch(steamUrl.value);

          fetchedSteamNameRows.value = rows;
        } catch (error) {
          sourceFetchState.error = error.message;
        } finally {
          sourceFetchState.loading = false;
        }
      },

      /**
       * Applies one Steam name helper suggestion choice.
       *
       * @param {string} choice - Steam helper choice key.
       * @returns {void}
       */
      applySteamNameChoice(choice) {
        if (choice !== "none") {
          if (form.localizedNames.every((row) => !hasEnteredNameRowValue(row))) {
            form.localizedNames.splice(0, form.localizedNames.length);
          }

          buildSteamNameChoiceRows(fetchedSteamNameRows.value, choice).forEach(
            (row) => {
              fillNameRow(form.localizedNames, row);
            },
          );
        }

        fetchedSteamNameRows.value = [];
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
          trimFieldValue(category),
        );
      },

      /**
       * Opens a prefilled editor for one missing company category.
       *
       * @param {object} row - Company category review row.
       * @returns {Promise<void>} Resolves after the category text is prepared.
       */
      async openCompanyCategory(row) {
        Object.assign(companyCategoryState, {
          category: row.category,
          company: row.company,
          error: "",
          loading: true,
          text: "",
        });
        companyCategoryOpen.value = true;

        try {
          companyCategoryState.text =
            await options.onPrepareCompanyCategory(row);
        } catch (error) {
          companyCategoryState.error = error.message || String(error);
        } finally {
          companyCategoryState.loading = false;
        }
      },

      /**
       * Closes the company category editor.
       *
       * @returns {void}
       */
      closeCompanyCategory() {
        companyCategoryOpen.value = false;
      },

      /**
       * Saves the company category and refreshes category status.
       *
       * @returns {Promise<void>} Resolves after the category is saved.
       */
      async saveCompanyCategory() {
        companyCategoryState.error = "";
        companyCategoryState.loading = true;

        try {
          await options.onSaveCompanyCategory(
            companyCategoryState.category,
            companyCategoryState.text,
          );
          companyCategoryOpen.value = false;
          await refreshCategoryRows({
            bypassCache: true,
          });
        } catch (error) {
          companyCategoryState.error = error.message || String(error);
        } finally {
          companyCategoryState.loading = false;
        }
      },

      /**
       * Checks whether a category row supports the company helper.
       *
       * @param {object} row - Category review row.
       * @returns {boolean} Whether the helper should be shown.
       */
      canCreateCompanyCategory(row) {
        return trimFieldValue(row.company) !== "" && row.status !== "OK";
      },

      /**
       * Opens one category page in the viewer dialog.
       *
       * @param {object} row - Category review row.
       * @returns {void}
       */
      openCategoryView(row) {
        categoryViewState.category = trimFieldValue(row.category);
        categoryViewState.url = options.getCategoryPageUrl(
          categoryViewState.category,
        );
        categoryViewOpen.value = true;
      },

      /**
       * Closes the category page viewer.
       *
       * @returns {void}
       */
      closeCategoryView() {
        categoryViewOpen.value = false;
      },

      /**
       * Formats a category row source as a compact badge label.
       *
       * @param {string} source - Category row source.
       * @returns {string} Compact source label.
       */
      formatCategorySourceLabel(source) {
        return formatCategorySourceLabel(source);
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
        categoryViewOpen,
        categoryViewState,
        companyCategoryOpen,
        companyCategoryState,
        groups: ARTICLE_PARAMETER_GROUPS,
        form,
        fetchedSteamNameRows,
        formatSteamNameSuggestion,
        getArticleField,
        getFieldPlaceholder: options.getFieldPlaceholder.bind(null, form),
        getFieldPreview,
        getWikidataText,
        historyEntries,
        historyOpen,
        moveOpen,
        moveTarget,
        nameMarkets: NAME_MARKETS,
        open,
        preSaveMoveEnabled,
        preSaveMoveTitle,
        preSaveOpen,
        preSaveActions,
        sourceFetchState,
        steamNameChoices: STEAM_NAME_CHOICES,
        steamUrl,
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

  /**
   * Gets the entered title, falling back to the current page title.
   *
   * @returns {string} Current article title.
   */
  function getCurrentTitle() {
    return trimFieldValue(form.name) || options.defaultName;
  }

  /**
   * Builds a small wikitext preview for one field.
   *
   * @param {object} field - Article parameter field.
   * @returns {string} Preview wikitext, or an empty string.
   */
  function getFieldPreview(field) {
    if (options.getFieldPreview == null) {
      return "";
    }

    return options.getFieldPreview(form, field.previewKey || field.key) || "";
  }

  /**
   * Gets the Wikidata note text.
   *
   * @returns {string} Wikidata ID or lookup status text.
   */
  function getWikidataText() {
    return (
      form.wikidataId ||
      options.getFieldPlaceholder(form, {
        key: "wikidataId",
      }) ||
      ""
    );
  }

  /**
   * Refreshes form values derived from the English Wikipedia title.
   *
   * @returns {Promise<void>} Resolves after the lookup is handled.
   */
  async function refreshEnwikiMetadata() {
    const title = trimFieldValue(form.enwikiTitle);
    const serial = enwikiLookupSerial.value + 1;

    enwikiLookupSerial.value = serial;
    form.wikidataId = "";

    if (title === "" || options.onEnwikiTitleChange == null) {
      return;
    }

    let metadata;

    try {
      metadata = await options.onEnwikiTitleChange(title);
    } catch (_error) {
      metadata = {};
    }

    if (serial !== enwikiLookupSerial.value) {
      return;
    }

    form.wikidataId = trimFieldValue(metadata.wikidataId);

    if (trimFieldValue(form.englishName) === "") {
      form.englishName = getBasePageTitle(metadata.title);
    }
  }
}

/**
 * Formats a category row source as a compact badge label.
 *
 * @param {string} source - Category row source.
 * @returns {string} Compact source label.
 */
function formatCategorySourceLabel(source) {
  const value = String(source || "").trim();
  const modified = value.endsWith("†");
  const base = modified ? value.replace(/\s*†$/u, "") : value;
  const labels = {
    found: "Found",
    known: "Data",
    manual: "Manual",
    suggested: "Built",
  };
  const label = labels[base] || base;

  return modified ? `${label}†` : label;
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
    createPreSaveDialogTemplate(),
    createCompanyCategoryDialogTemplate(),
    createCategoryViewDialogTemplate(),
    createMoveDialogTemplate(),
    createHistoryDialogTemplate(),
  ]);
}

/**
 * Creates the category page viewer dialog.
 *
 * @returns {object} Category viewer dialog template node.
 */
function createCategoryViewDialogTemplate() {
  return createElement(
    "cdx-dialog",
    {
      class: "create-vg-stub-category-view-dialog",
      "v-bind:title": "'Category:' + categoryViewState.category",
      "v-model:open": "categoryViewOpen",
    },
    [
      createElement("iframe", {
        class: "create-vg-stub-category-view",
        "v-bind:src": "categoryViewState.url",
        "v-bind:title": "'Category:' + categoryViewState.category",
      }),
      createElement(
        "template",
        {
          "v-slot:footer": "",
        },
        [
          createActionFooterTemplate([
            createElement(
              "cdx-button",
              {
                "v-on:click": "closeCategoryView",
              },
              [createText("Close")],
            ),
          ]),
        ],
      ),
    ],
  );
}

/**
 * Creates the missing company category editor dialog.
 *
 * @returns {object} Company category dialog template node.
 */
function createCompanyCategoryDialogTemplate() {
  return createElement(
    "cdx-dialog",
    {
      "v-bind:title": "'Create Category:' + companyCategoryState.category",
      "v-model:open": "companyCategoryOpen",
    },
    [
      createElement("cdx-text-area", {
        class: "create-vg-stub-company-category-text",
        rows: "10",
        "v-bind:disabled": "companyCategoryState.loading",
        "v-model": "companyCategoryState.text",
      }),
      createElement(
        "p",
        {
          class: "create-vg-stub-error",
          "v-if": "companyCategoryState.error",
        },
        [createText("{{ companyCategoryState.error }}")],
      ),
      createElement(
        "template",
        {
          "v-slot:footer": "",
        },
        [
          createActionFooterTemplate([
            createElement(
              "cdx-button",
              {
                "v-bind:disabled": "companyCategoryState.loading",
                "v-on:click": "closeCompanyCategory",
              },
              [createText("Cancel")],
            ),
            createElement(
              "cdx-button",
              {
                action: "progressive",
                "v-bind:disabled":
                  "companyCategoryState.loading || !companyCategoryState.text.trim()",
                "v-on:click": "saveCompanyCategory",
                weight: "primary",
              },
              [
                createText(
                  "{{ companyCategoryState.loading ? 'Working' : 'Save' }}",
                ),
              ],
            ),
          ]),
        ],
      ),
    ],
  );
}

/**
 * Creates the pre-save fixes dialog.
 *
 * @returns {object} Pre-save fixes dialog template node.
 */
function createPreSaveDialogTemplate() {
  return createElement(
    "cdx-dialog",
    {
      "v-model:open": "preSaveOpen",
      title: "Pre-save fixes",
    },
    [
      createElement("p", {}, [
        createText(
          "Choose fixes to run after the article is submitted. The generated text will use the final title.",
        ),
      ]),
      createElement(
        "cdx-checkbox",
        {
          "v-model": "preSaveMoveEnabled",
        },
        [createText("Use this title before saving")],
      ),
      createElement(
        "div",
        {
          "v-if": "preSaveMoveEnabled",
          style: {
            display: "grid",
            gap: "8px",
            marginLeft: "28px",
          },
        },
        [
          createElement("cdx-text-input", {
            placeholder: "Final article title",
            "v-model": "preSaveMoveTitle",
          }),
        ],
      ),
      createElement(
        "div",
        {
          style: {
            display: "grid",
            gap: "8px",
            marginTop: "12px",
          },
        },
        [
          createElement(
            "cdx-checkbox",
            {
              "v-bind:key": "action.id",
              "v-for": "action in preSaveActions",
              "v-model": "action.selected",
            },
            [createText("{{ action.label }}")],
          ),
        ],
      ),
      createElement(
        "p",
        {
          class: "create-vg-stub-error",
          "v-if": "sourceFetchState.error",
        },
        [createText("{{ sourceFetchState.error }}")],
      ),
      createElement(
        "template",
        {
          "v-slot:footer": "",
        },
        [
          createActionFooterTemplate([
            createElement(
              "cdx-button",
              {
                "v-bind:disabled": "sourceFetchState.loading",
                "v-on:click": "preSaveOpen = false",
              },
              [createText("Back")],
            ),
            createElement(
              "cdx-button",
              {
                action: "progressive",
                "v-bind:disabled": "sourceFetchState.loading",
                "v-on:click": "confirmSubmit",
                weight: "primary",
              },
              [
                createText(
                  "{{ sourceFetchState.loading ? 'Working' : (preSaveMoveEnabled ? 'Continue' : 'Save') }}",
                ),
              ],
            ),
          ]),
        ],
      ),
    ],
  );
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
      class: "create-vg-stub-dialog",
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
              "v-on:click": "fillForm",
            },
            [
              createText(
                "{{ sourceFetchState.loading ? 'Fetching' : 'Fill' }}",
              ),
            ],
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
                "{{ sourceFetchState.loading ? 'Fetching' : 'Submit' }}",
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
        "v-bind:model-value": "moveTarget",
        "v-on:update:model-value": "updateMoveTarget($event)",
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
      createElement(
        "span",
        {
          class: "create-vg-stub-category-status",
          "v-bind:title": "row.source",
        },
        [createText("{{ formatCategorySourceLabel(row.source) }}")],
      ),
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
      createElement(
        "cdx-button",
        {
          "v-if": "canCreateCompanyCategory(row)",
          "v-on:click": "openCompanyCategory(row)",
        },
        [createText("Create")],
      ),
      createElement(
        "cdx-button",
        {
          "v-else-if": "row.category",
          "v-on:click": "openCategoryView(row)",
        },
        [createText("View")],
      ),
      createElement("span", {
        "v-else": "",
      }),
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
    [
      createSteamNameHelperTemplate(),
      createNameRowTemplate(),
      createNameActionsTemplate(),
    ],
  );
}

/**
 * Creates the Steam localized name helper template node.
 *
 * @returns {object} Steam helper template node.
 */
function createSteamNameHelperTemplate() {
  return createElement(
    "div",
    {
      class: "create-vg-stub-steam-helper",
    },
    [
      createElement("cdx-text-input", {
        placeholder: "Steam app URL",
        "v-bind:model-value": "steamUrl",
        "v-on:update:model-value": "updateSteamUrl($event)",
      }),
      createElement(
        "cdx-button",
        {
          "v-bind:disabled": "sourceFetchState.loading",
          "v-on:click": "addSteamNames",
        },
        [createText("Add Steam names")],
      ),
      createElement(
        "div",
        {
          class: "create-vg-stub-steam-suggestion",
          "v-if": "fetchedSteamNameRows.length",
        },
        [createText("{{ formatSteamNameSuggestion(fetchedSteamNameRows) }}")],
      ),
      createElement(
        "div",
        {
          class: "create-vg-stub-steam-actions",
          "v-if": "fetchedSteamNameRows.length",
        },
        [
          createElement(
            "cdx-button",
            {
              "v-bind:key": "choice.key",
              "v-for": "choice in steamNameChoices",
              "v-on:click": "applySteamNameChoice(choice.key)",
            },
            [createText("{{ choice.label }}")],
          ),
        ],
      ),
    ],
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
          "v-model": "row.official",
        },
        [createText("Official")],
      ),
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
        "v-bind:model-value": "row.name",
        "v-on:change": "updateNameRow(group.nameGroupKey, index, 'name')",
        "v-on:update:model-value":
          "updateNameRowValue(group.nameGroupKey, index, 'name', $event)",
      }),
      createSourceUrlInputTemplate({
        placeholder: "Source URLs",
        model: "row.sourceUrl",
        change: "updateNameRow(group.nameGroupKey, index, 'sourceUrl')",
        update:
          "updateNameRowValue(group.nameGroupKey, index, 'sourceUrl', $event)",
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
 * @param {string} options.update - Input update handler expression.
 * @param {boolean} [options.bindPlaceholder] - Whether placeholder is a Vue binding.
 * @returns {object} Source URL textarea node.
 */
function createSourceUrlInputTemplate(options) {
  const attributes = {
    class: "create-vg-stub-source-url",
    rows: "1",
    "v-bind:model-value": options.model,
    "v-on:change": options.change,
    "v-on:update:model-value": options.update,
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
        [
          createCompactFieldTemplate(),
          createStandardFieldTemplate(),
          createWikidataNoteTemplate(),
          createFieldPreviewTemplate(),
        ],
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
      "v-if": "field.compact",
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
            "v-bind:model-value": "form[field.key]",
            "v-on:change": "normalizeFieldValue(field)",
            "v-on:update:model-value": "updateFieldValue(field, $event)",
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
                update: "updateSourceValue(field.sourceField, $event)",
              }),
            ],
          ),
        ],
      ),
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
          createElement(
            "template",
            {
              "v-if": "field.multiline",
            },
            [
              createElement("cdx-text-area", {
                rows: "5",
                "v-bind:placeholder":
                  "getFieldPlaceholder(field) || field.placeholder",
                "v-bind:model-value": "form[field.key]",
                "v-on:change": "normalizeFieldValue(field)",
                "v-on:update:model-value": "updateFieldValue(field, $event)",
              }),
            ],
          ),
          createElement(
            "template",
            {
              "v-else": "",
            },
            [
              createElement("cdx-text-input", {
                "v-bind:placeholder":
                  "getFieldPlaceholder(field) || field.placeholder",
                "v-bind:readonly": "field.readonly",
                "v-bind:model-value": "form[field.key]",
                "v-on:change": "normalizeFieldValue(field)",
                "v-on:paste": "normalizePastedFieldValue(field, $event)",
                "v-on:update:model-value": "updateFieldValue(field, $event)",
              }),
            ],
          ),
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
                update: "updateSourceValue(field.sourceField, $event)",
              }),
            ],
          ),
        ],
      ),
    ],
  );
}

/**
 * Creates the Wikidata note template node after the Enwiki title field.
 *
 * @returns {object} Wikidata note template node.
 */
function createWikidataNoteTemplate() {
  return createElement(
    "div",
    {
      class: "create-vg-stub-wikitext-preview create-vg-stub-field-note",
      "v-if": "field.key === 'enwikiTitle'",
    },
    [createText("Wikidata: {{ getWikidataText() }}")],
  );
}

/**
 * Creates the wikitext preview template node for one article field.
 *
 * @param {string} [fieldExpression] - Vue expression resolving to a field.
 * @returns {object} Wikitext preview template node.
 */
function createFieldPreviewTemplate(fieldExpression = "field") {
  const previewExpression = `getFieldPreview(${fieldExpression})`;

  return createElement(
    "div",
    {
      class: "create-vg-stub-wikitext-preview create-vg-stub-field-note",
      "v-if": `${fieldExpression}.previewKey && ${previewExpression}`,
    },
    [createText(`{{ ${previewExpression} }}`)],
  );
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
 * Serializes a stylesheet rule object.
 *
 * @param {Array<object>} rules - Structured CSS rules.
 * @returns {string} Stylesheet text.
 */
export function renderStyleRules(rules) {
  return rules.map(renderStyleRule).join("\n\n");
}

/**
 * Serializes one stylesheet rule or nested at-rule.
 *
 * @param {object} rule - Structured CSS rule.
 * @returns {string} Stylesheet rule text.
 */
function renderStyleRule(rule) {
  if (rule.type === "media") {
    return `@media ${rule.condition} {\n${indentStyleText(
      renderStyleRules(rule.rules),
    )}\n}`;
  }

  const selector = rule.selectors.join(",\n");
  const body = Object.entries(rule.declarations)
    .map(([name, value]) => `  ${toKebabCase(name)}: ${value};`)
    .join("\n");

  return `${selector} {\n${body}\n}`;
}

/**
 * Indents nested stylesheet text.
 *
 * @param {string} text - Stylesheet text.
 * @returns {string} Indented stylesheet text.
 */
function indentStyleText(text) {
  return text
    .split("\n")
    .map((line) => `  ${line}`)
    .join("\n");
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
    localizedNames: [createNameRow()],
    name: "",
    publishers: "=",
    sortKey: "",
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
function createNameRow(selectedMarkets = [], options = {}) {
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
 * Creates one localized name row from fetched helper values.
 *
 * @param {object} values - Localized name values.
 * @returns {object} Localized name row.
 */
function createNameRowFromValues(values) {
  return {
    ...createNameRow(getNameRowSelectedMarkets(values)),
    ...values,
  };
}

/**
 * Formats fetched Steam names with market labels.
 *
 * @param {Array<object>} rows - Fetched Steam name rows.
 * @returns {string} Labeled Steam name suggestion text.
 */
function formatSteamNameSuggestion(rows) {
  return rows.map(formatSteamNameSuggestionRow).join(" | ");
}

/**
 * Formats one fetched Steam name row with its market label.
 *
 * @param {object} row - Fetched Steam name row.
 * @returns {string} Labeled Steam name suggestion item.
 */
function formatSteamNameSuggestionRow(row) {
  return `${formatSteamNameMarkets(row)}: ${row.name}`;
}

/**
 * Formats selected Steam name markets.
 *
 * @param {object} row - Fetched Steam name row.
 * @returns {string} Market label.
 */
function formatSteamNameMarkets(row) {
  return getNameRowSelectedMarkets(row)
    .map(formatSteamNameMarket)
    .join("/");
}

/**
 * Formats one Steam name market key.
 *
 * @param {string} market - Market key.
 * @returns {string} Market label.
 */
function formatSteamNameMarket(market) {
  const item = NAME_MARKETS.find((entry) => entry.key === market);

  return item?.label || market;
}

/**
 * Builds localized name rows from a Steam helper choice.
 *
 * @param {Array<object>} rows - Fetched Steam name rows.
 * @param {string} choice - Steam helper choice key.
 * @returns {Array<object>} Localized name rows to apply.
 */
function buildSteamNameChoiceRows(rows, choice) {
  const hans = findSteamNameRow(rows, "hans");
  const hant = findSteamNameRow(rows, "hant");

  if (choice === "hans") {
    return hans == null ? [] : [hans];
  }

  if (choice === "hant") {
    return hant == null ? [] : [hant];
  }

  if (choice === "both") {
    return [hans, hant].filter(Boolean);
  }

  if (choice === "merge") {
    return [mergeSteamNameRows(hans, hant, false)].filter(Boolean);
  }

  if (choice === "other") {
    return [mergeSteamNameRows(hans, hant, true)].filter(Boolean);
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
function findSteamNameRow(rows, market) {
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
function mergeSteamNameRows(hans, hant, blankName) {
  const rows = [hans, hant].filter(Boolean);

  if (rows.length === 0) {
    return undefined;
  }

  return {
    hans: Boolean(hans),
    hant: Boolean(hant),
    name: blankName ? "" : trimFieldValue(hans?.name || hant?.name),
    official: true,
    sourceUrl: rows.map((row) => row.sourceUrl).filter(Boolean).join("\n"),
  };
}

/**
 * Gets selected market keys from a row-like object.
 *
 * @param {object} values - Localized name values.
 * @returns {Array<string>} Selected market keys.
 */
function getNameRowSelectedMarkets(values) {
  return values.markets || NAME_MARKETS
    .filter((market) => values[market.key])
    .map((market) => market.key);
}

/**
 * Fills a matching empty name row or appends a new one.
 *
 * @param {Array<object>} rows - Existing localized name rows.
 * @param {object} values - Localized name values.
 * @returns {void}
 */
function fillNameRow(rows, values) {
  const selectedMarkets = getNameRowSelectedMarkets(values);
  const matchingRow = rows.find((row) => (
    !hasEnteredNameRowValue(row) &&
    Boolean(row.official) === Boolean(values.official) &&
    selectedMarkets.every((market) => row[market])
  ));

  if (matchingRow == null) {
    rows.push(createNameRowFromValues(values));
    return;
  }

  Object.assign(matchingRow, createNameRowFromValues(values));
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
 * Normalizes an article field value for live form input.
 *
 * @param {object} field - Dialog field definition.
 * @param {string} field.key - Form key for the field.
 * @param {*} value - Raw form field value.
 * @returns {string} Normalized form field value.
 */
function normalizeArticleFieldValue(field, value) {
  const trimmed = trimFieldValue(value);

  if (field.key === "year") {
    return normalizeYearValue(trimmed);
  }

  if (isMultiItemField(field)) {
    return normalizeMultilineFieldValue(trimmed);
  }

  return trimmed;
}

/**
 * Converts a full date-like value to a bare year.
 *
 * @param {string} value - Trimmed form field value.
 * @returns {string} Year field value.
 */
function normalizeYearValue(value) {
  const match = value.match(/\b\d{4}\b/u);

  return match == null ? value : match[0];
}

/**
 * Normalizes pasted field values with first-level separators.
 *
 * @param {string} value - Raw form field value.
 * @returns {string} Normalized form field value.
 */
function normalizeMultilineFieldValue(value) {
  if (!hasFirstLevelFieldSeparator(value)) {
    return value;
  }

  return value
    .split(/\s*[;；]\s*|[\r\n]+/u)
    .map(trimFieldValue)
    .filter(Boolean)
    .join("; ");
}

/**
 * Checks whether a field value contains multiple lines.
 *
 * @param {string} value - Raw form field value.
 * @returns {boolean} Whether the value has a first-level separator.
 */
function hasFirstLevelFieldSeparator(value) {
  return /[;；\r\n]/u.test(value);
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
 * Removes a trailing parenthesized disambiguator from a page title.
 *
 * @param {string} title - Page title.
 * @returns {string} Base page title.
 */
function getBasePageTitle(title) {
  return trimFieldValue(title).replace(/ \(.+?\)$/u, "");
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
  Object.assign(form, normalizeReceivedFormValues(values));
}

/**
 * Normalizes received form values for the current dialog shape.
 *
 * @param {object} values - Received form values.
 * @returns {object} Normalized form values.
 */
function normalizeReceivedFormValues(values) {
  const normalized = cloneValue(values);

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
