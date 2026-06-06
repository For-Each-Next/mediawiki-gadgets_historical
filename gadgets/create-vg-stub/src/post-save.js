/* eslint-disable */

/**
 * Builds and runs optional tasks after a generated article is saved.
 */

import { addEditSummarySuffix } from "./edit-summary.js";
import { buildTemplateCall, buildTemplateText } from "./utils.js";

export const TALK_PAGE_BANNER = buildTemplateText(
  "WikiProject banner shell",
  [
    ["class", "unassessed"],
    ["1", buildTemplateCall("WikiProject Video games")],
  ],
  "block",
);

/**
 * Builds the selectable post-save action rows.
 *
 * @param {object} pending - Stored post-save data.
 * @param {object} pending.form - Submitted dialog form.
 * @param {string} pending.title - Saved article title.
 * @returns {Array<object>} Selectable action rows.
 */
export function buildPostSaveActions(pending, existingRedirectTitles = []) {
  const form = pending.form || {};
  const title = normalizeTitle(pending.title);
  const existingKeys = new Set(existingRedirectTitles.map(normalizeTitleKey));
  const actions = [];

  if (normalizeTitle(form.wikidataId) !== "") {
    actions.push({
      id: "interwiki",
      label: `Connect ${title} to ${normalizeTitle(form.wikidataId)}`,
      selected: true,
      type: "interwiki",
      wikidataId: normalizeTitle(form.wikidataId),
    });
  }

  buildRedirectTitles(form, title).forEach((redirectTitle) => {
    const exists = existingKeys.has(normalizeTitleKey(redirectTitle));

    actions.push({
      id: `redirect:${redirectTitle}`,
      exists,
      label: exists
        ? `Redirect: ${redirectTitle} (page already exists)`
        : `Redirect other Chinese name: ${redirectTitle} -> ${title}`,
      redirectTitle,
      selected: !exists,
      type: "redirect",
    });
  });

  actions.push({
    id: "talk-banner",
    label: `Add WikiProject Video games banner to Talk:${title}`,
    selected: true,
    type: "talk-banner",
  });

  return actions;
}

/**
 * Gets unique localized aliases suitable for redirect pages.
 *
 * @param {object} form - Submitted dialog form.
 * @param {string} articleTitle - Saved article title.
 * @returns {Array<string>} Redirect page titles.
 */
export function buildRedirectTitles(form, articleTitle) {
  const targetKey = normalizeTitleKey(articleTitle);
  const names = [
    ...(form.localizedNames || []).filter(isChineseNameRow).map((row) => row.name),
    ...(form.officialNames || []).filter(isChineseNameRow).map((row) => row.name),
    ...(form.commonNames || []).filter(isChineseNameRow).map((row) => row.name),
  ];
  const seen = new Set();

  return names
    .map(normalizeTitle)
    .filter((title) => {
      const key = normalizeTitleKey(title);

      if (key === "" || key === targetKey || seen.has(key)) {
        return false;
      }

      seen.add(key);
      return true;
    });
}

/**
 * Fetches redirect candidate titles that already exist.
 *
 * @param {object} api - MediaWiki API client.
 * @param {Array<string>} titles - Redirect candidate titles.
 * @returns {Promise<Array<string>>} Existing page titles.
 */
export async function fetchExistingPageTitles(api, titles) {
  if (titles.length === 0) {
    return [];
  }

  const data = await api.get({
    action: "query",
    titles: titles.join("|"),
  });

  return Object.values(data?.query?.pages || {})
    .filter((page) => page.missing == null)
    .map((page) => normalizeTitle(page.title));
}

/**
 * Runs selected post-save actions in order.
 *
 * @param {Array<object>} actions - Action rows.
 * @param {object} options - Execution options.
 * @param {object} options.api - MediaWiki API client.
 * @param {object} [options.wikidataApi] - Wikidata API client.
 * @param {string} options.title - Saved article title.
 * @returns {Promise<Array<object>>} Completed action rows.
 */
export async function runPostSaveActions(actions, options) {
  const completed = [];

  for (const action of actions.filter((item) => item.selected)) {
    await runPostSaveAction(action, options);
    action.selected = false;
    completed.push(action);
  }

  return completed;
}

/**
 * Runs one post-save action.
 *
 * @param {object} action - Action row.
 * @param {object} options - Execution options.
 * @param {object} options.api - MediaWiki API client.
 * @param {object} [options.wikidataApi] - Wikidata API client.
 * @param {string} options.title - Saved article title.
 * @returns {Promise<void>} Resolves after the action succeeds.
 */
async function runPostSaveAction(action, options) {
  if (action.type === "interwiki") {
    await connectWikidataSitelink(
      options.wikidataApi || options.api,
      action.wikidataId,
      options.title,
    );
    return;
  }

  if (action.type === "redirect") {
    await createRedirect(options.api, action.redirectTitle, options.title);
    return;
  }

  if (action.type === "talk-banner") {
    await addTalkPageBanner(options.api, options.title);
  }
}

/**
 * Connects the saved Chinese Wikipedia page to a Wikidata item.
 *
 * @param {object} api - MediaWiki API client.
 * @param {string} wikidataId - Wikidata entity ID.
 * @param {string} title - Chinese Wikipedia article title.
 * @returns {Promise<void>} Resolves after the sitelink is saved.
 */
export async function connectWikidataSitelink(api, wikidataId, title) {
  await api.postWithToken("csrf", {
    action: "wbsetsitelink",
    id: wikidataId,
    linksite: "zhwiki",
    linktitle: title,
    summary: addEditSummarySuffix(`Connect zhwiki sitelink to [[${title}]]`),
  });
}

/**
 * Creates one redirect without overwriting an existing page.
 *
 * @param {object} api - MediaWiki API client.
 * @param {string} redirectTitle - Redirect page title.
 * @param {string} targetTitle - Redirect target.
 * @returns {Promise<void>} Resolves after the redirect is created.
 */
export async function createRedirect(api, redirectTitle, targetTitle) {
  await api.postWithToken("csrf", {
    action: "edit",
    createonly: true,
    summary: addEditSummarySuffix(`Redirect to [[${targetTitle}]]`),
    text: `#REDIRECT [[${targetTitle}]]`,
    title: redirectTitle,
  });
}

/**
 * Adds the video game project banner when it is not already present.
 *
 * @param {object} api - MediaWiki API client.
 * @param {string} articleTitle - Article title.
 * @returns {Promise<void>} Resolves after the talk page is updated.
 */
export async function addTalkPageBanner(api, articleTitle) {
  const title = `Talk:${articleTitle}`;
  const data = await api.get({
    action: "query",
    prop: "revisions",
    rvprop: "content",
    rvslots: "main",
    titles: title,
  });
  const page = Object.values(data?.query?.pages || {})[0];
  const text =
    page?.revisions?.[0]?.slots?.main?.content ||
    page?.revisions?.[0]?.["*"] ||
    "";

  if (/WikiProject\s+Video games/iu.test(text)) {
    return;
  }

  await api.postWithToken("csrf", {
    action: "edit",
    appendtext: `${text === "" ? "" : "\n\n"}${TALK_PAGE_BANNER}`,
    summary: addEditSummarySuffix("Add WikiProject Video games banner"),
    title,
  });
}

/**
 * Normalizes title whitespace.
 *
 * @param {*} value - Raw title value.
 * @returns {string} Normalized title.
 */
function normalizeTitle(value) {
  return String(value || "").trim().replace(/_/gu, " ");
}

/**
 * Builds a case-insensitive key for title comparison.
 *
 * @param {*} value - Raw title value.
 * @returns {string} Comparison key.
 */
function normalizeTitleKey(value) {
  return normalizeTitle(value).toLocaleLowerCase();
}

/**
 * Checks whether a localized name row represents a Chinese name.
 *
 * @param {object} row - Localized name row.
 * @returns {boolean} Whether the row is a Chinese-name redirect candidate.
 */
function isChineseNameRow(row) {
  const hasChineseMarket = ["hans", "hant", "cn", "tw", "hk"].some(
    (market) => row[market] === true,
  );

  return hasChineseMarket || /\p{Script=Han}/u.test(normalizeTitle(row.name));
}
