/* eslint-disable */

/**
 * Builds the pre-save checklist and runs its selected follow-up actions.
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
 * Builds the selectable pre-save action rows.
 *
 * @param {object} selection - Current pre-save selection data.
 * @param {object} selection.form - Submitted dialog form.
 * @param {string} selection.title - Article title.
 * @returns {Array<object>} Selectable action rows.
 */
export function buildPreSaveActions(selection, existingRedirectTitles = []) {
  const form = selection.form || {};
  const title = normalizeTitle(selection.title);
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
 * Builds the default title fix for an English-titled article.
 *
 * @param {object} form - Submitted dialog form.
 * @param {string} articleTitle - Current article title.
 * @returns {object} Default page move settings.
 */
export function buildTitleFix(form, articleTitle) {
  const title = normalizeTitle(articleTitle);
  const chineseTitle = buildRedirectTitles(form, title)[0] || "";
  const enabled = isEnglishTitle(title) && chineseTitle !== "";

  return {
    enabled,
    to: enabled ? chineseTitle : title,
  };
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
 * Runs selected follow-up actions in order.
 *
 * @param {Array<object>} actions - Action rows.
 * @param {object} options - Execution options.
 * @param {object} options.api - MediaWiki API client.
 * @param {object} [options.move] - Optional page move settings.
 * @param {boolean} options.move.enabled - Whether to move the page.
 * @param {boolean} options.move.leaveRedirect - Whether to leave a redirect.
 * @param {string} options.move.to - Destination page title.
 * @param {Function} [options.onMoveComplete] - Successful move callback.
 * @param {object} [options.wikidataApi] - Wikidata API client.
 * @param {string} options.title - Saved article title.
 * @returns {Promise<object>} Completed action rows and final title.
 */
export async function runSelectedActions(actions, options) {
  const completed = [];
  const originalTitle = normalizeTitle(options.title);
  const moveTitle = normalizeTitle(options.move?.to);
  const shouldMove =
    options.move?.enabled === true &&
    moveTitle !== "" &&
    normalizeTitleKey(moveTitle) !== normalizeTitleKey(originalTitle);
  const finalTitle = shouldMove ? moveTitle : originalTitle;

  if (shouldMove) {
    await movePage(options.api, originalTitle, finalTitle, {
      leaveRedirect: options.move.leaveRedirect,
    });
    options.onMoveComplete?.(finalTitle);
  }

  for (const action of actions.filter((item) => item.selected)) {
    if (
      action.type === "redirect" &&
      normalizeTitleKey(action.redirectTitle) === normalizeTitleKey(finalTitle)
    ) {
      action.selected = false;
      continue;
    }

    await runSelectedAction(action, {
      ...options,
      title: finalTitle,
    });
    action.selected = false;
    completed.push(action);
  }

  return {
    completed,
    title: finalTitle,
  };
}

/**
 * Moves the saved article before running follow-up edits.
 *
 * @param {object} api - MediaWiki API client.
 * @param {string} from - Current page title.
 * @param {string} to - Destination page title.
 * @param {object} options - Move options.
 * @param {boolean} options.leaveRedirect - Whether to leave a redirect.
 * @returns {Promise<void>} Resolves after the page is moved.
 */
export async function movePage(api, from, to, options) {
  const params = {
    action: "move",
    from,
    reason: addEditSummarySuffix(`Rename to [[${to}]]`),
    to,
  };

  if (!options.leaveRedirect) {
    params.noredirect = true;
  }

  await api.postWithToken("csrf", params);
}

/**
 * Runs one selected follow-up action.
 *
 * @param {object} action - Action row.
 * @param {object} options - Execution options.
 * @param {object} options.api - MediaWiki API client.
 * @param {object} [options.wikidataApi] - Wikidata API client.
 * @param {string} options.title - Saved article title.
 * @returns {Promise<void>} Resolves after the action succeeds.
 */
async function runSelectedAction(action, options) {
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

/**
 * Checks whether a title uses Latin text without Han characters.
 *
 * @param {string} title - Article title.
 * @returns {boolean} Whether the title appears to be English.
 */
function isEnglishTitle(title) {
  return (
    /\p{Script=Latin}/u.test(title) && !/\p{Script=Han}/u.test(title)
  );
}
