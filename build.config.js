/* eslint-disable */

export const minifiedOutput = {
  prefix: "/* <nowiki> */",
  suffix: "/* </nowiki> */",
};

/**
 * Wraps minified gadget code for publishing on MediaWiki.
 *
 * @param {string} code - Minified JavaScript.
 * @returns {string} Wrapped JavaScript.
 */
export function formatMinifiedOutput(code) {
  return `${minifiedOutput.prefix}${code}${minifiedOutput.suffix}`;
}
