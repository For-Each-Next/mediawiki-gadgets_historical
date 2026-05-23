/* eslint-disable jsdoc/no-missing-syntax, jsdoc/require-jsdoc */

const FIELD_NAMES = [
  ["name", "Name"],
  ["year", "Year"],
  ["genres", "Genres"],
  ["developers", "Developers"],
  ["publishers", "Publishers"],
  ["platforms", "Platforms"],
];

function isNewPageEdit() {
  return (
    mw.config.get("wgAction") === "edit" && mw.config.get("wgArticleId") === 0
  );
}

function buildStubText(values) {
  return (
    `《'''${values.name}'''》是${values.year}年${values.genres}类` +
    `[[电子游戏]]，由${values.developers}开发、` +
    `${values.publishers}发行。游戏对应${values.platforms}平台。`
  );
}

function writeEditText(text) {
  const textbox = document.getElementById("wpTextbox1");

  textbox.value = text;
  $(textbox).trigger("input").trigger("change");
  textbox.focus();
}

function openDialog(open) {
  open.value = true;
}

function createHost() {
  const host = document.createElement("div");

  document.body.append(host);

  return host;
}

function createFormValues() {
  return Object.fromEntries(FIELD_NAMES.map(([key]) => [key, ""]));
}

function getField(field) {
  const [key, label] = field;

  return { key, label };
}

function createDialogComponent(Vue) {
  const form = Vue.reactive(createFormValues());
  const open = Vue.ref(false);

  window.createVgStubDialog = {
    open: openDialog.bind(null, open),
  };

  return {
    methods: {
      closeDialog() {
        open.value = false;
      },

      insertText() {
        writeEditText(buildStubText(form));
        open.value = false;
      },
    },
    setup() {
      return {
        defaultAction: {
          label: "Cancel",
        },
        fields: FIELD_NAMES.map(getField),
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
        <cdx-field
          v-for="field in fields"
          :key="field.key"
        >
          <cdx-text-input v-model="form[field.key]" />
          <template #label>{{ field.label }}</template>
        </cdx-field>
      </cdx-dialog>
    `,
  };
}

function handleToolboxClick(event) {
  event.preventDefault();
  window.createVgStubDialog.open();
}

function addToolboxLink() {
  const link = mw.util.addPortletLink(
    "p-tb",
    "#",
    "Create video game stub",
    "t-create-vg-stub",
  );

  link.addEventListener("click", handleToolboxClick);
}

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
